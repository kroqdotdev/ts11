"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckIcon, CloudSlashIcon, WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSyncState, type SyncProblem, type SyncStatus } from "@/lib/sync/state";
import { useFormatBytes } from "./messages";

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

const LABELS = ["loading", "merging", "saving", "saved", "offline"] as const;
const hasLabel = (s: SyncStatus): s is (typeof LABELS)[number] =>
  (LABELS as readonly string[]).includes(s);

/** Why a save was refused, in words. */
function useReason() {
  const t = useTranslations("sync.reason");
  const formatBytes = useFormatBytes();
  return (detail: SyncProblem | null) => {
    if (!detail) return t("refused");
    if (detail.reason === "imageTooLarge") {
      return detail.max ? t("imageTooLarge", { size: formatBytes(detail.max) }) : t("refused");
    }
    if (detail.reason === "imageTooBig") {
      return detail.max ? t("imageTooBig", { side: detail.max }) : t("refused");
    }
    return t(detail.reason);
  };
}

/**
 * Whether the studio is saved to the account. Nothing at all while signed out or
 * before the email is confirmed: the banner covers that.
 */
export function SyncChip() {
  const status = useSyncState((s) => s.status);
  const detail = useSyncState((s) => s.detail);
  const t = useTranslations("sync.chip");

  if (status === "off" || status === "unverified") return null;
  if (status === "blocked") return <NotSaved detail={detail} />;

  const label = hasLabel(status) ? t(status) : "";
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
function NotSaved({ detail }: { detail: SyncProblem | null }) {
  const t = useTranslations("sync.notSaved");
  const reason = useReason();
  // Storage and the club count are both managed on the account page.
  const storage = detail?.reason !== "badData";
  return (
    <Popover.Root>
      <Popover.Trigger
        className={clsx(
          chip,
          "lofi-press border-card-ink bg-card text-card-ink shadow-[2px_2px_0_var(--card-ink)]",
        )}
      >
        <WarningIcon size={15} weight="bold" aria-hidden />
        {t("label")}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(19rem,calc(100vw-1.5rem))] origin-(--transform-origin) flex-col gap-2 rounded-[4px] border-2 border-edge bg-paper p-4 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Popover.Title className="text-sm font-semibold">{t("label")}</Popover.Title>
            <Popover.Description className="text-sm leading-relaxed text-ink">
              {t("body", { reason: reason(detail) })}
            </Popover.Description>
            {storage && (
              <Link
                href="/account"
                className="self-start text-sm font-semibold text-ink underline underline-offset-4 hover:text-ink-soft"
              >
                {t("link")}
              </Link>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
