import type { Issue } from "@/lib/issues";
import { useUi } from "@/lib/store";

const CONTROL = "input, select, textarea, button, [tabindex]:not([tabindex='-1'])";

/** Set while "Fix it" presses an add button, so the new row it focuses gets the ring. */
let flashNext = false;

/**
 * Waits for an element to render and settle, then scrolls to it, focuses it (or the
 * first control inside it) and flashes a ring round it. The ring stays until focus
 * leaves, so it is never missed.
 */
export function focusWhenReady(id: string, options: { flash?: boolean } = {}) {
  const flash = options.flash ?? flashNext;
  flashNext = false;
  let tries = 0;
  let lastTop: number | undefined;
  const seek = () => {
    const el = document.getElementById(id);
    // Hidden panels keep their content mounted; wait until this one is visible.
    // The old panel can linger for a frame, so also wait until the field stops moving.
    const top = el?.getClientRects()[0]?.top;
    if (!el || top === undefined || top !== lastTop) {
      lastTop = top;
      if (++tries < 40) requestAnimationFrame(seek);
      return;
    }
    // "Add" buttons are pointed at when a list is empty: press it, and its handler
    // moves focus into the new row.
    if (el.dataset.fix === "add") {
      flashNext = flash;
      el.click();
      flashNext = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = el.matches(CONTROL) ? el : el.querySelector<HTMLElement>(CONTROL);
    (target ?? el).focus({ preventScroll: true });
    // scroll-margin (globals.css) keeps it clear of the sticky preview and the tab bar.
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    if (!flash) return;
    el.removeAttribute("data-flash");
    void el.offsetWidth;
    el.setAttribute("data-flash", "");
    const clear = () => {
      if (el.contains(document.activeElement)) return;
      el.removeAttribute("data-flash");
      el.removeEventListener("focusout", later);
    };
    const later = () => window.setTimeout(clear, 0);
    el.addEventListener("focusout", later);
    window.setTimeout(clear, 2400);
  };
  requestAnimationFrame(seek);
}

/** Opens the tab that fixes an issue, then focuses and flashes its field. */
export function fixIssue(issue: Issue) {
  useUi.getState().setPanel(issue.panel);
  if (issue.field) focusWhenReady(issue.field, { flash: true });
}
