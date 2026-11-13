"use client";

import dynamic from "next/dynamic";

/**
 * The account sync (auth client, sync engine, merge dialog) is loaded after the page
 * is interactive, so pages that don't need it right away, like the landing page and
 * the privacy page, paint without waiting for it.
 */
const SyncProvider = dynamic(() => import("./SyncProvider").then((m) => m.SyncProvider), {
  ssr: false,
});

export function LazySync() {
  return <SyncProvider />;
}
