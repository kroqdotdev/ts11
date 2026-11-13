"use client";

import { create } from "zustand";

/**
 * What the account sync is doing, for the studio header and the account page.
 * - off: not signed in; everything stays in this browser.
 * - unverified: signed in, email not confirmed yet; nothing is saved to the account.
 * - loading: fetching the account's clubs.
 * - merging: waiting for the person to choose what to do with this browser's clubs.
 * - saving / saved: changes are on their way / safely in the account.
 * - offline: the last save failed; it retries on its own.
 * - blocked: a save was refused (storage full, club too big); `detail` says why.
 */
export type SyncStatus =
  "off" | "unverified" | "loading" | "merging" | "saving" | "saved" | "offline" | "blocked";

/** Shown when this browser has clubs the account doesn't, the first time they meet. */
export interface MergePrompt {
  localNames: string[];
  accountNames: string[];
}

interface SyncState {
  status: SyncStatus;
  detail: string | null;
  lastSavedAt: number | null;
  merge: MergePrompt | null;
  /** Called by the merge dialog: true adds this browser's clubs, false drops them. */
  resolveMerge: ((keepLocal: boolean) => void) | null;
  set: (patch: Partial<Omit<SyncState, "set">>) => void;
}

export const useSyncState = create<SyncState>()((set) => ({
  status: "off",
  detail: null,
  lastSavedAt: null,
  merge: null,
  resolveMerge: null,
  set: (patch) => set(patch),
}));
