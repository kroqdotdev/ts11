"use client";

import { flushStorage, useStudio } from "@/lib/store";
import type { Design, Team } from "@/lib/types";
import { applyRemote, emptyMeta, planLink, type RemoteClub, type SyncMeta } from "./merge";
import { useSyncState } from "./state";
import { uploadInlineImages, UploadBlocked } from "./upload";

/**
 * Keeps this browser's studio data and the account in step.
 *
 * The studio keeps working from localStorage exactly as before. The engine watches it,
 * uploads images that are still inline, and saves changed clubs a moment after an edit.
 * It pulls changes made on other devices when the tab regains focus and every minute.
 * The server numbers every save, so device clocks never decide anything; if two
 * devices edit the same club at once, the later save wins and nothing is merged.
 */

const DEBOUNCE_MS = 1200;
const PULL_EVERY_MS = 60_000;
const RETRY_MS = [3000, 10_000, 30_000, 60_000];
/** Which account the studio data in this browser belongs to (absent: made signed out). */
export const OWNER_KEY = "ts11:owner";

interface Pull {
  clubs: RemoteClub[];
  state: { data: { design?: Design }; rev: number } | null;
  rev: number;
}

interface PushResponse {
  accepted: { id: string; rev: number }[];
  rejected: { id: string; reason: string }[];
  conflicts: RemoteClub[];
  state: { rev: number } | { conflict: { data: { design?: Design }; rev: number } } | null;
  rev: number;
}

const metaKey = (userId: string) => `ts11:sync:${userId}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // Storage full: the worst case is re-fetching, which is safe.
  }
}

export function ownerOfLocalData(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

/** FNV-1a over the JSON: enough to tell whether a club changed since the last save. */
export function hashOf(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const err = new Error(body.message ?? `Request failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = body.error;
    throw err;
  }
  return (await res.json()) as T;
}

const REASONS: Record<string, string> = {
  "too-large": "A club is too big to save. Remove some players or images from it.",
  "inline-image": "An image couldn't be uploaded, so that club wasn't saved.",
  "too-many": "Your account has the most clubs it can hold (50). Delete one to save a new one.",
  "bad-data": "A club couldn't be read and wasn't saved.",
};

let current: { userId: string; push: () => Promise<void> } | null = null;

type Studio = ReturnType<typeof useStudio.getState>;

/** "Start over" (the store's resetAll) is the only way back to a not-set-up studio. */
const startedOver = (s: Studio, prev: Studio) => prev.onboarded && !s.onboarded;

let watching = false;

/**
 * While no account is syncing in this tab, a club deleted here is noted for the
 * account this browser's clubs belong to, so that account deletes it too when it
 * signs in here again. Starting over lets go of that account's clubs instead.
 */
export function watchSignedOut(): void {
  if (watching) return;
  watching = true;
  useStudio.subscribe((s, prev) => {
    if (current) return;
    const owner = ownerOfLocalData();
    if (!owner) return;
    if (startedOver(s, prev)) {
      write(OWNER_KEY, null);
      return;
    }
    if (s.teams === prev.teams) return;
    const m = read<SyncMeta>(metaKey(owner));
    if (!m?.known) return;
    const pending = m.pendingDeletes ?? [];
    const now = new Set(s.teams.map((t) => t.id));
    const gone = prev.teams
      .map((t) => t.id)
      .filter((id) => !now.has(id) && m.known[id]?.rev && !pending.includes(id));
    if (!gone.length) return;
    m.pendingDeletes = [...pending, ...gone];
    write(metaKey(owner), m);
  });
}

/** Saves pending changes straight away, e.g. before signing out. */
export async function syncNow(): Promise<void> {
  await current?.push();
}

export function startSync(userId: string): () => void {
  const ui = useSyncState.getState().set;
  const meta: SyncMeta = { ...emptyMeta(), ...read<SyncMeta>(metaKey(userId)) };
  meta.pendingDeletes ??= [];
  let stopped = false;
  let applying = false;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retry = 0;
  let pushing: Promise<void> | null = null;
  let again = false;

  const studio = () => useStudio.getState();
  const save = () => write(metaKey(userId), meta);

  function apply(patch: { teams?: Team[]; design?: Design; reset?: boolean }) {
    applying = true;
    if (patch.reset) studio().resetAll();
    if (patch.teams || patch.design) {
      const s = studio();
      const teams = patch.teams ?? s.teams;
      useStudio.setState({
        teams,
        activeTeamId: teams.some((t) => t.id === s.activeTeamId) ? s.activeTeamId : teams[0].id,
        ...(patch.design ? { design: patch.design } : {}),
        ...(patch.teams?.length && !patch.reset ? { onboarded: true } : {}),
      });
    }
    flushStorage();
    applying = false;
  }

  /** Brings in the account's design, unless this browser has unsaved design edits. */
  function takeState(state: Pull["state"]): Design | null {
    if (!state || (meta.state && meta.state.rev >= state.rev)) return null;
    const localDirty = meta.state ? hashOf(studio().design) !== meta.state.hash : false;
    if (localDirty || !state.data.design) {
      meta.state = { rev: state.rev, hash: meta.state?.hash ?? "" };
      return null;
    }
    meta.state = { rev: state.rev, hash: hashOf(state.data.design) };
    return state.data.design;
  }

  async function link() {
    const remote = await api<Pull>("/api/sync?since=0");
    if (stopped) return;
    const s = studio();
    const owner = ownerOfLocalData();
    const previous = owner && owner !== userId ? read<SyncMeta>(metaKey(owner)) : null;
    const plan = planLink(
      s.teams,
      s.onboarded,
      owner,
      userId,
      remote.clubs,
      previous?.known ?? null,
      hashOf,
    );
    // Kept from before: clubs this account deleted here and edits put aside for it.
    const deleted = meta.pendingDeletes ?? [];
    const parked = meta.parked ?? [];
    if (previous && owner && plan.parked.length) {
      const ids = new Set(plan.parked.map((t) => t.id));
      previous.parked = [...(previous.parked ?? []).filter((t) => !ids.has(t.id)), ...plan.parked];
      write(metaKey(owner), previous);
    }
    let teams: Team[];
    let keepLocalDesign: boolean;

    if (plan.kind === "replace") {
      teams = plan.teams;
      keepLocalDesign = false;
    } else if (plan.kind === "ask") {
      ui({ status: "merging", merge: plan.prompt });
      const keepLocal = await new Promise<boolean>((resolve) => ui({ resolveMerge: resolve }));
      ui({ merge: null, resolveMerge: null });
      if (stopped) return;
      teams = keepLocal ? plan.merged : plan.accountOnly;
      keepLocalDesign = keepLocal;
    } else {
      teams = plan.teams;
      keepLocalDesign = plan.localOnly.length > 0;
    }
    // Another account's design stays with it.
    if (plan.fromOther) keepLocalDesign = false;

    teams = teams.filter((t) => !deleted.includes(t.id));
    for (const p of parked) {
      const i = teams.findIndex((t) => t.id === p.id);
      teams = i >= 0 ? teams.map((t, j) => (j === i ? p : t)) : [...teams, p];
    }

    Object.assign(meta, emptyMeta(), { linked: true, rev: remote.rev });
    for (const c of remote.clubs) {
      if (!c.deleted) meta.known[c.id] = { rev: c.rev, hash: hashOf(c.data) };
    }
    // Still to delete in the account, and the put-aside edits to save on top of it.
    meta.pendingDeletes = deleted.filter((id) => meta.known[id]);
    for (const p of parked) {
      meta.known[p.id] = { rev: remote.clubs.find((c) => c.id === p.id)?.rev ?? 0, hash: "" };
    }
    let design: Design | undefined;
    if (remote.state) {
      if (keepLocalDesign && s.onboarded) {
        // This browser's design is saved over the account's on the next push.
        meta.state = { rev: remote.state.rev, hash: "" };
      } else {
        design = remote.state.data.design;
        meta.state = { rev: remote.state.rev, hash: design ? hashOf(design) : "" };
      }
    }

    if (teams.length === 0) {
      // Nothing of this account's or this browser's own: a fresh studio after another
      // account's data (club setup runs), else the example club stays, unsaved until
      // it's edited.
      apply({ reset: plan.fromOther });
      for (const t of studio().teams) meta.known[t.id] = { rev: 0, hash: hashOf(t) };
      meta.state ??= { rev: 0, hash: hashOf(studio().design) };
    } else {
      apply({ teams, design });
    }
    write(OWNER_KEY, userId);
    save();
  }

  async function pull() {
    const remote = await api<Pull>(`/api/sync?since=${meta.rev}`);
    if (stopped) return;
    const r = applyRemote(studio().teams, meta, remote.clubs, hashOf);
    const design = takeState(remote.state);
    meta.rev = Math.max(meta.rev, remote.rev);
    save();
    if (r.changed || design) {
      apply({ teams: r.changed ? r.teams : undefined, design: design ?? undefined });
    }
    if (r.keptLocal) schedule();
  }

  async function pushOnce() {
    await uploadInlineImages();
    if (stopped) return;
    const s = studio();
    const changed = s.teams.filter((t) => meta.known[t.id]?.hash !== hashOf(t));
    const designHash = hashOf(s.design);
    const designDirty = !meta.state || meta.state.hash !== designHash;
    const deletes = meta.pendingDeletes.filter((id) => !s.teams.some((t) => t.id === id));
    if (!changed.length && !deletes.length && !designDirty) {
      ui({ status: "saved", detail: null });
      return;
    }
    ui({ status: "saving" });
    const sent = new Map(changed.map((t) => [t.id, hashOf(t)]));
    const res = await api<PushResponse>("/api/sync", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clubs: [
          ...changed.map((t) => ({ id: t.id, baseRev: meta.known[t.id]?.rev ?? 0, data: t })),
          ...deletes.map((id) => ({ id, baseRev: meta.known[id]?.rev ?? 0, deleted: true })),
        ],
        state: designDirty
          ? { baseRev: meta.state?.rev ?? 0, data: { design: s.design } }
          : undefined,
      }),
    });

    const dropDelete = (id: string) => {
      delete meta.known[id];
      meta.pendingDeletes = meta.pendingDeletes.filter((x) => x !== id);
    };
    for (const a of res.accepted) {
      if (deletes.includes(a.id)) dropDelete(a.id);
      else meta.known[a.id] = { rev: a.rev, hash: sent.get(a.id) ?? "" };
    }
    let conflict = false;
    if (res.conflicts.length) {
      conflict = true;
      for (const c of res.conflicts.filter((c) => deletes.includes(c.id))) {
        // Already deleted elsewhere: done. Edited elsewhere after this delete: delete
        // that newer version too (the delete was made here deliberately).
        if (c.deleted) dropDelete(c.id);
        else meta.known[c.id] = { rev: c.rev, hash: "" };
      }
      // Another device saved first: take its version where nothing changed here,
      // otherwise this browser's edit is saved on top of it next.
      const others = res.conflicts.filter((c) => !deletes.includes(c.id));
      const r = applyRemote(studio().teams, meta, others, hashOf);
      if (r.changed) apply({ teams: r.teams });
    }
    if (res.state && "rev" in res.state) meta.state = { rev: res.state.rev, hash: designHash };
    else if (res.state && "conflict" in res.state) {
      conflict = true;
      const design = takeState(res.state.conflict);
      if (design) apply({ design });
    }
    save();
    retry = 0;
    if (res.rejected.length) {
      ui({ status: "blocked", detail: REASONS[res.rejected[0].reason] ?? REASONS["bad-data"] });
    } else if (!conflict) {
      ui({ status: "saved", detail: null, lastSavedAt: Date.now() });
    }
    if (conflict) again = true;
  }

  async function runPush() {
    try {
      let rounds = 0;
      do {
        again = false;
        await pushOnce();
      } while (again && !stopped && ++rounds < 5);
    } catch (e) {
      if (e instanceof UploadBlocked) {
        ui({ status: "blocked", detail: e.message });
        return;
      }
      const err = e as Error & { status?: number; code?: string };
      if (err.status === 401) ui({ status: "off" });
      else if (err.code === "unverified") ui({ status: "unverified" });
      else {
        ui({ status: "offline", detail: err.message });
        schedule(RETRY_MS[Math.min(retry++, RETRY_MS.length - 1)]);
      }
    }
  }

  function push(): Promise<void> {
    if (!ready || stopped) return Promise.resolve();
    if (pushing) {
      again = true;
      return pushing;
    }
    pushing = runPush().finally(() => {
      pushing = null;
    });
    return pushing;
  }

  function schedule(ms = DEBOUNCE_MS) {
    if (stopped || !ready) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void push();
    }, ms);
  }

  /**
   * "Start over" in this browser is never a deletion: the browser lets go of the
   * account's clubs and loads them from the account again.
   */
  async function relink() {
    if (timer) clearTimeout(timer);
    timer = null;
    ready = false;
    Object.assign(meta, emptyMeta());
    save();
    write(OWNER_KEY, null);
    await pushing;
    if (!stopped) void boot();
  }

  const unsubscribe = useStudio.subscribe((s, prev) => {
    if (applying || stopped) return;
    if (startedOver(s, prev)) {
      void relink();
      return;
    }
    if (s.teams !== prev.teams) {
      // Only a club removed in this tab counts as a deletion, never one that's just
      // missing (another tab's stale copy, a failed write).
      const now = new Set(s.teams.map((t) => t.id));
      for (const t of prev.teams) {
        if (!now.has(t.id) && meta.known[t.id]?.rev && !meta.pendingDeletes.includes(t.id)) {
          meta.pendingDeletes.push(t.id);
        }
      }
      save();
    }
    if (s.teams !== prev.teams || s.design !== prev.design) schedule();
  });

  async function refresh() {
    if (stopped || !ready || pushing || timer) return;
    try {
      await pull();
    } catch {
      // Pulling is best effort; saving reports its own problems.
    }
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  document.addEventListener("visibilitychange", onVisible);
  const interval = setInterval(() => void refresh(), PULL_EVERY_MS);

  async function boot(attempt = 0) {
    if (stopped) return;
    ui({ status: "loading", detail: null });
    try {
      if (!meta.linked || ownerOfLocalData() !== userId) await link();
      else await pull();
      if (stopped) return;
      ready = true;
      await push();
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (err.code === "unverified") ui({ status: "unverified" });
      else if (err.status === 401) ui({ status: "off" });
      else {
        ui({ status: "offline", detail: err.message });
        setTimeout(() => void boot(attempt + 1), RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
      }
    }
  }
  void boot();
  current = { userId, push };

  return function stop() {
    stopped = true;
    if (current?.userId === userId) current = null;
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    // An open merge question resolves as "keep both", so nothing is lost.
    useSyncState.getState().resolveMerge?.(true);
    ui({ merge: null, resolveMerge: null });
  };
}
