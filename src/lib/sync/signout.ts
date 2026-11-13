"use client";

import { authClient } from "@/lib/auth-client";
import { useStudio } from "@/lib/store";
import { OWNER_KEY, syncNow } from "./engine";

/**
 * Signs out after saving anything still pending. With `clear`, the account's clubs
 * are also removed from this browser (for a shared computer); they stay in the account.
 */
export async function signOutSafely({ clear = false } = {}): Promise<{ ok: boolean }> {
  await syncNow().catch(() => undefined);
  const { error } = await authClient.signOut();
  if (error) return { ok: false };
  if (clear) {
    useStudio.getState().resetAll();
    try {
      for (const key of Object.keys(localStorage)) {
        if (key === OWNER_KEY || key.startsWith("ts11:sync:")) localStorage.removeItem(key);
      }
    } catch {
      // Nothing more to clear.
    }
  }
  return { ok: true };
}
