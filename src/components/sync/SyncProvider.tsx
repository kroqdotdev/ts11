"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useHydrated, useStudio } from "@/lib/store";
import { startSync } from "@/lib/sync/engine";
import { useSyncState } from "@/lib/sync/state";
import { MergeDialog } from "./MergeDialog";

/**
 * Runs the account sync on every page while someone is signed in with a
 * confirmed email. Signed out, the app is exactly as before: browser only.
 */
export function SyncProvider() {
  const { data } = useSession();
  const hydrated = useHydrated();
  const userId = data?.user.id ?? null;
  const verified = data?.user.emailVerified ?? false;

  useEffect(() => {
    // Hooks for the end-to-end tests; not part of the production bundle's behaviour.
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TS11_TEST_HOOKS === "1") {
      const w = window as unknown as Record<string, unknown>;
      w.__ts11SyncStatus = () => useSyncState.getState();
      w.__ts11Studio = () => useStudio.getState();
    }
  }, []);

  useEffect(() => {
    const set = useSyncState.getState().set;
    if (!userId) {
      set({ status: "off", detail: null });
      return;
    }
    if (!verified) {
      set({ status: "unverified", detail: null });
      return;
    }
    if (!hydrated) return;
    return startSync(userId);
  }, [userId, verified, hydrated]);

  return <MergeDialog />;
}
