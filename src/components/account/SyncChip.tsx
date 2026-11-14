"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckIcon, CloudSlashIcon, WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useSyncState, type SyncStatus } from "@/lib/sync/state";

const chip =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[3px] border-2 px-2 text-[13px] font-medium whitespace-nowrap";
const quiet = "border-chalk/20 text-chalk/85";

/** A pixel that blinks in two hard steps while something is on its way. */
function Blink() {
  return (
    <span
      aria-hidden
      className="block size-2 bg-card motion-safe:animate-[pixel-blink_1s_steps(1,end)_infinite]"
    />
  );
}

const LABELS: Partial<Record<SyncStatus, string>> = {
  loading: "Loading…",
  merging: "Choose what to keep",
  saving: "Saving…",
  saved: "Saved",
  offline: "Offline, will retry",
};

/**
 * Whether the studio is saved to the account. Nothing at all while signed out or
 * before the email is confirmed: the banner covers that.
 */
export function SyncChip() {
  const status = useSyncState((s) => s.status);
  const detail = useSyncState((s) => s.detail);

  if (status === "off" || status === "unverified") return null;
  if (status === "blocked") return <NotSaved detail={detail} />;

  const label = LABELS[status] ?? "";
  return (
    <span role="status" aria-live="polite" className={clsx(chip, quiet)}>
      {status === "saved" ? (
        <CheckIcon size={14} weight="bold" aria-hidden />
      ) : status === "offline" ? (
        <CloudSlashIcon size={15} weight="bold" aria-hidden />
      ) : (
        <Blink />
      )}
      {label}
    </span>
  );
}

/** A save was refused: what happened, why, and where to fix it. */
function NotSaved({ detail }: { detail: string | null }) {
  // Storage and the club count are both managed on the account page.
  const storage = !detail || /storage|image|most clubs/i.test(detail);
  return (
    <Popover.Root>
      <Popover.Trigger
        className={clsx(
          chip,
          "lofi-press border-card-ink bg-card text-card-ink shadow-[2px_2px_0_var(--card-ink)]",
        )}
      >
        <WarningIcon size={15} weight="bold" aria-hidden />
        Not saved
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(19rem,calc(100vw-1.5rem))] origin-(--transform-origin) flex-col gap-2 rounded-[4px] border-2 border-edge bg-paper p-4 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Popover.Title className="text-sm font-semibold">Not saved</Popover.Title>
            <Popover.Description className="text-sm leading-relaxed text-ink">
              {detail ?? "Your account refused the last change."} Everything is still in this
              browser.
            </Popover.Description>
            {storage && (
              <Link
                href="/account"
                className="self-start text-sm font-semibold text-ink underline underline-offset-4 hover:text-ink-soft"
              >
                Go to storage and account
              </Link>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
