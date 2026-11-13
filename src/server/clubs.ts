import "server-only";
import { and, asc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { env } from "./env";

/**
 * What a device sends: changed clubs (or deletions) plus the studio state. Each change
 * names the revision it was based on (`baseRev`, 0 for something new). The server
 * hands out revisions itself, so a device's clock never decides anything.
 */
export const pushSchema = z.object({
  clubs: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        baseRev: z.number().int().nonnegative(),
        deleted: z.boolean().optional(),
        data: z.record(z.string(), z.unknown()).nullable().optional(),
      }),
    )
    .max(200),
  state: z
    .object({
      baseRev: z.number().int().nonnegative(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
});
export type Push = z.infer<typeof pushSchema>;

export interface ClubRow {
  id: string;
  data: unknown;
  rev: number;
  deleted: boolean;
}

export interface StateRow {
  data: unknown;
  rev: number;
}

export interface PushResult {
  /** Saved changes and the revision each now has. */
  accepted: { id: string; rev: number }[];
  /** Changes that couldn't be saved, with a reason the studio can show. */
  rejected: { id: string; reason: "too-large" | "inline-image" | "too-many" | "bad-data" }[];
  /**
   * Changes based on an old revision: someone else saved in between. The device gets
   * the current copy and decides (the studio keeps its own edit and saves again).
   */
  conflicts: ClubRow[];
  state: { rev: number } | { conflict: StateRow } | null;
}

/** Any data: URL long enough to be an image. Clubs hold links to uploads, not images. */
const INLINE_IMAGE = /"data:[^"]{2048,}/i;
/** Old deletion records kept per account; enough for any device to catch up. */
const MAX_TOMBSTONES = 200;

function nextRev(tx: Pick<typeof db, "insert">, userId: string): number {
  const row = tx
    .insert(schema.syncCounter)
    .values({ userId, rev: 1 })
    .onConflictDoUpdate({
      target: schema.syncCounter.userId,
      set: { rev: sql`${schema.syncCounter.rev} + 1` },
    })
    .returning({ rev: schema.syncCounter.rev })
    .get();
  return row.rev;
}

/** Clubs (and deletions) changed after revision `since`. */
export function listClubs(userId: string, since = 0): ClubRow[] {
  return db
    .select({
      id: schema.club.id,
      data: schema.club.data,
      rev: schema.club.rev,
      deletedAt: schema.club.deletedAt,
    })
    .from(schema.club)
    .where(and(eq(schema.club.userId, userId), gt(schema.club.rev, since)))
    .orderBy(asc(schema.club.rev))
    .all()
    .map((r) => ({ id: r.id, data: r.data, rev: r.rev, deleted: r.deletedAt !== null }));
}

export function getState(userId: string): StateRow | null {
  return (
    db
      .select({ data: schema.studioState.data, rev: schema.studioState.rev })
      .from(schema.studioState)
      .where(eq(schema.studioState.userId, userId))
      .get() ?? null
  );
}

export function currentRev(userId: string): number {
  return (
    db
      .select({ rev: schema.syncCounter.rev })
      .from(schema.syncCounter)
      .where(eq(schema.syncCounter.userId, userId))
      .get()?.rev ?? 0
  );
}

export function pushClubs(userId: string, push: Push): PushResult {
  const result: PushResult = { accepted: [], rejected: [], conflicts: [], state: null };
  const now = Date.now();

  db.transaction((tx) => {
    const existing = new Map(
      tx
        .select()
        .from(schema.club)
        .where(eq(schema.club.userId, userId))
        .all()
        .map((r) => [r.id, r]),
    );
    let live = [...existing.values()].filter((r) => r.deletedAt === null).length;

    for (const c of push.clubs) {
      const prev = existing.get(c.id);
      // Someone saved this club since the device last saw it. (A device that thinks a
      // club exists here when it doesn't, e.g. after old deletions were cleared, just
      // creates it again.)
      if (prev && prev.rev !== c.baseRev) {
        result.conflicts.push({
          id: prev.id,
          data: prev.data,
          rev: prev.rev,
          deleted: prev.deletedAt !== null,
        });
        continue;
      }

      if (c.deleted) {
        // Deleting something the account never had needs no record.
        if (!prev || prev.deletedAt !== null) {
          result.accepted.push({ id: c.id, rev: prev?.rev ?? 0 });
          continue;
        }
        const rev = nextRev(tx, userId);
        tx.update(schema.club)
          .set({ deletedAt: now, updatedAt: now, data: {}, rev })
          .where(and(eq(schema.club.userId, userId), eq(schema.club.id, c.id)))
          .run();
        live--;
        result.accepted.push({ id: c.id, rev });
        continue;
      }

      if (!c.data || (c.data as { id?: unknown }).id !== c.id) {
        result.rejected.push({ id: c.id, reason: "bad-data" });
        continue;
      }
      const json = JSON.stringify(c.data);
      if (Buffer.byteLength(json) > env.limits.clubBytes) {
        result.rejected.push({ id: c.id, reason: "too-large" });
        continue;
      }
      if (INLINE_IMAGE.test(json)) {
        result.rejected.push({ id: c.id, reason: "inline-image" });
        continue;
      }
      const isNew = !prev || prev.deletedAt !== null;
      if (isNew && live >= env.limits.clubsPerAccount) {
        result.rejected.push({ id: c.id, reason: "too-many" });
        continue;
      }

      const rev = nextRev(tx, userId);
      tx.insert(schema.club)
        .values({ userId, id: c.id, data: c.data, rev, updatedAt: now, deletedAt: null })
        .onConflictDoUpdate({
          target: [schema.club.userId, schema.club.id],
          set: { data: c.data, rev, updatedAt: now, deletedAt: null },
        })
        .run();
      if (isNew) live++;
      result.accepted.push({ id: c.id, rev });
    }

    if (push.state) {
      const json = JSON.stringify(push.state.data);
      const prev = tx
        .select({ data: schema.studioState.data, rev: schema.studioState.rev })
        .from(schema.studioState)
        .where(eq(schema.studioState.userId, userId))
        .get();
      if (Buffer.byteLength(json) <= env.limits.clubBytes && !INLINE_IMAGE.test(json)) {
        if ((prev?.rev ?? 0) !== push.state.baseRev && prev) {
          result.state = { conflict: prev };
        } else {
          const rev = nextRev(tx, userId);
          tx.insert(schema.studioState)
            .values({ userId, data: push.state.data, rev, updatedAt: now })
            .onConflictDoUpdate({
              target: schema.studioState.userId,
              set: { data: push.state.data, rev, updatedAt: now },
            })
            .run();
          result.state = { rev };
        }
      }
    }

    // Keep the newest deletion records only.
    const tombstones = tx
      .select({ id: schema.club.id })
      .from(schema.club)
      .where(and(eq(schema.club.userId, userId), isNotNull(schema.club.deletedAt)))
      .orderBy(asc(schema.club.rev))
      .all();
    for (const t of tombstones.slice(0, Math.max(0, tombstones.length - MAX_TOMBSTONES))) {
      tx.delete(schema.club)
        .where(and(eq(schema.club.userId, userId), eq(schema.club.id, t.id)))
        .run();
    }
  });

  return result;
}

/** Live (not deleted) clubs per account, for the storage page. */
export function countClubs(userId: string): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.club)
    .where(and(eq(schema.club.userId, userId), isNull(schema.club.deletedAt)))
    .get();
  return row?.n ?? 0;
}

/** Image ids linked from the account's saved clubs and studio state. */
export function imagesInUse(userId: string): Set<string> {
  const used = new Set<string>();
  const scan = (data: unknown) => {
    for (const m of JSON.stringify(data).matchAll(/\/api\/images\/([a-f0-9]{20,32})/g))
      used.add(m[1]);
  };
  for (const c of listClubs(userId)) if (!c.deleted) scan(c.data);
  const state = getState(userId);
  if (state) scan(state.data);
  return used;
}
