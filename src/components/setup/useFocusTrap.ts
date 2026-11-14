"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const POPUP = "[role='dialog'], [role='menu'], [role='listbox'], [data-side]";

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

/**
 * While `active`, keeps keyboard focus inside `ref` (Tab wraps round, focus that
 * lands outside is pulled back) and calls `onEscape` on Escape. When it ends,
 * focus goes back to where it was before, or to `fallback` if that has gone.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  { onEscape, fallback }: { onEscape?: () => void; fallback?: string } = {},
) {
  const escape = useEffectEvent(() => onEscape?.());

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const before = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        // Leave popups (colour pickers, menus) to close themselves first.
        if (document.querySelector("[data-open][role='dialog'], [data-popup-open]")) return;
        e.preventDefault();
        escape();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(root);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      // Let an open popup handle Tab itself; it hands focus back when it closes.
      if (at && !root.contains(at) && at.closest(POPUP)) return;
      if (e.shiftKey && (at === first || !root.contains(at))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !root.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (!target || root.contains(target)) return;
      // Popups opened from inside the setup (the colour picker) render in a portal
      // outside it. Focus moving into one is still part of the setup.
      if (target.closest?.(POPUP)) return;
      focusables(root)[0]?.focus();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      // Wait a frame so whatever replaces the setup (e.g. the hero panels) is back.
      requestAnimationFrame(() => {
        const back =
          before?.isConnected && before !== document.body
            ? before
            : fallback
              ? document.querySelector<HTMLElement>(fallback)
              : null;
        back?.focus({ preventScroll: true });
      });
    };
  }, [active, ref, fallback]);
}
