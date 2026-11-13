import type { Team } from "@/lib/types";
import type { MergePrompt } from "./state";

/** A club as the server returns it. */
export interface RemoteClub {
  id: string;
  data: unknown;
  rev: number;
  deleted: boolean;
}

/**
 * What this browser knows about the account, per signed-in user. `known` holds the
 * server revision each club was last seen at and a hash of the content at that
 * point: a club whose current hash differs has unsaved edits.
 */
export interface SyncMeta {
  linked: boolean;
  /** Everything up to this account revision has been fetched. */
  rev: number;
  known: Record<string, { rev: number; hash: string }>;
  state: { rev: number; hash: string } | null;
  /** Clubs deleted here that the account hasn't recorded yet. */
  pendingDeletes: string[];
}

export function emptyMeta(): SyncMeta {
  return { linked: false, rev: 0, known: {}, state: null, pendingDeletes: [] };
}

export type LinkPlan =
  /** This browser holds another account's clubs: show this account's, never mix. */
  | { kind: "replace"; teams: Team[] }
  /** Nothing to decide: these are the clubs to show. */
  | { kind: "use"; teams: Team[]; localOnly: Team[] }
  /** Both sides have clubs the other lacks; the person chooses (merging is the default). */
  | { kind: "ask"; prompt: MergePrompt; merged: Team[]; accountOnly: Team[]; localOnly: Team[] };

const label = (t: Team) => t.name.trim() || "Unnamed club";

/**
 * The first time this browser meets an account. `owner` is the account the local
 * studio data was last synced with (null for data made while signed out).
 */
export function planLink(
  local: Team[],
  onboarded: boolean,
  owner: string | null,
  userId: string,
  remote: RemoteClub[],
): LinkPlan {
  const account = remote.filter((r) => !r.deleted && r.data).map((r) => r.data as Team);
  if (owner && owner !== userId) return { kind: "replace", teams: account };

  const ids = new Set(account.map((t) => t.id));
  // A browser that was never set up only holds the example club: not worth keeping.
  const own = onboarded ? local : [];
  const localOnly = own.filter((t) => !ids.has(t.id));
  if (account.length === 0) return { kind: "use", teams: own, localOnly };
  if (localOnly.length === 0) return { kind: "use", teams: account, localOnly: [] };
  return {
    kind: "ask",
    prompt: { localNames: localOnly.map(label), accountNames: account.map(label) },
    merged: [...account, ...localOnly],
    accountOnly: account,
    localOnly,
  };
}

/**
 * Brings in changes saved elsewhere. A club with unsaved edits here keeps them (they
 * are saved next, on top of the newer revision), including over a deletion made
 * elsewhere: an edit is never lost to a delete. Mutates `meta`.
 */
export function applyRemote(
  teams: Team[],
  meta: SyncMeta,
  rows: RemoteClub[],
  hashOf: (v: unknown) => string,
): { teams: Team[]; changed: boolean; keptLocal: boolean } {
  let next = teams;
  let changed = false;
  let keptLocal = false;
  for (const r of rows) {
    const k = meta.known[r.id];
    if (k && k.rev >= r.rev) continue;
    const i = next.findIndex((t) => t.id === r.id);
    const here = i >= 0 ? next[i] : null;
    const dirty = here !== null && (!k || hashOf(here) !== k.hash);

    if (dirty) {
      // Keep this browser's edit; it is saved against the newer revision next.
      meta.known[r.id] = { rev: r.rev, hash: k?.hash ?? "" };
      keptLocal = true;
      continue;
    }
    if (r.deleted) {
      if (here && next.length > 1) {
        next = next.filter((t) => t.id !== r.id);
        changed = true;
        delete meta.known[r.id];
      } else if (here) {
        // The studio always needs one club: keep it here, unsaved, until it's edited.
        meta.known[r.id] = { rev: r.rev, hash: hashOf(here) };
      }
      continue;
    }
    const team = r.data as Team;
    next = i >= 0 ? next.map((t, j) => (j === i ? team : t)) : [...next, team];
    meta.known[r.id] = { rev: r.rev, hash: hashOf(team) };
    changed = true;
  }
  return { teams: next, changed, keptLocal };
}
