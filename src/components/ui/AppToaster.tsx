"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

const WIDE = "(min-width: 1024px)";

function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

/**
 * Toasts sit bottom-left on desktop, clear of the export button and its menu (top
 * right) and the size picker under the preview; on phones they drop in at the top,
 * clear of the bottom tab bar.
 */
export function AppToaster() {
  const wide = useWide();
  return (
    <Toaster
      position={wide ? "bottom-left" : "top-center"}
      offset={{ bottom: 20, left: 20 }}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[4px] !border-2 !border-edge !bg-paper !text-ink !font-sans !shadow-[4px_4px_0_var(--edge)]",
          title: "!font-semibold",
          description: "!text-ink-soft",
        },
      }}
    />
  );
}
