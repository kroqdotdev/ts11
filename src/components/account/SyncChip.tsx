"use client";

import { Popover } from "@base-ui/react/popover";
import {
  CheckIcon,
  CircleNotchIcon,
  CloudSlashIcon,
  EnvelopeSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useSyncState, type SyncStatus } from "@/lib/sync/state";

const LOOK: Partial<
  Record<SyncStatus, { icon: ReactNode; label: string; tone: "quiet" | "warn" }>
> = {
  loading: {
    icon: (
      <CircleNotchIcon
        size={14}
        weight="bold"
        className="animate-spin motion-reduce:animate-none"
      />
    ),
    label: "Loading…",
    tone: "quiet",
  },
  merging: {
    icon: <WarningIcon size={14} weight="bold" />,
    label: "Waiting for you",
    tone: "warn",
  },
  saving: {
    icon: (
      <CircleNotchIcon
        size={14}
        weight="bold"
        className="animate-spin motion-reduce:animate-none"
      />
    ),
    label: "Saving…",
    tone: "quiet",
  },
  saved: { icon: <CheckIcon size={14} weight="bold" />, label: "Saved", tone: "quiet" },
  offline: {
    icon: <CloudSlashIcon size={14} weight="bold" />,
    label: "Offline, will retry",
    tone: "quiet",
  },
  blocked: { icon: <WarningIcon size={14} weight="bold" />, label: "Not saved", tone: "warn" },
  unverified: {
    icon: <EnvelopeSimpleIcon size={14} weight="bold" />,
    label: "Confirm email",
    tone: "warn",
  },
};

const chip =
  "inline-flex h-7 items-center gap-1.5 rounded-[3px] border-2 px-2 text-xs font-semibold whitespace-nowrap";

/** How the account sync is doing. Hidden when nobody is signed in. */
export function SyncChip({ className }: { className?: string }) {
  const status = useSyncState((s) => s.status);
  const detail = useSyncState((s) => s.detail);
  const look = LOOK[status];

  return (
    <span aria-live="polite" className={clsx("inline-flex", className)}>
      {look &&
        (look.tone === "warn" && detail ? (
          <Popover.Root>
            <Popover.Trigger
              className={clsx(chip, "border-card-ink bg-card text-card-ink hover:brightness-105")}
            >
              {look.icon}
              {look.label}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="end" className="z-50">
                <Popover.Popup className="w-[min(18rem,calc(100vw-1.5rem))] origin-(--transform-origin) rounded-[4px] border-2 border-edge bg-paper p-3 text-sm leading-relaxed text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                  <Popover.Title className="mb-1 font-semibold">{look.label}</Popover.Title>
                  <Popover.Description>{detail}</Popover.Description>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <span
            title={detail ?? undefined}
            className={clsx(
              chip,
              look.tone === "warn"
                ? "border-card-ink bg-card text-card-ink"
                : "border-chalk/20 text-chalk/80",
            )}
          >
            {look.icon}
            {look.label}
          </span>
        ))}
    </span>
  );
}
