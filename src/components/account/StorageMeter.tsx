"use client";

import NumberFlow from "@number-flow/react";
import { WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { INTL_LOCALE } from "@/i18n/routing";
import { sizeParts, useFormatBytes } from "./messages";

const BLOCKS = 24;

/**
 * Storage as a row of pixel blocks, like the stadium's LED boards: ink while there's
 * room, yellow past 80%, red when full. No track, no smooth bar.
 */
export function PixelMeter({ used, limit }: { used: number; limit: number }) {
  const ratio = limit > 0 ? used / limit : 0;
  const filled = used <= 0 ? 0 : Math.min(BLOCKS, Math.max(1, Math.round(ratio * BLOCKS)));
  const fill = ratio >= 1 ? "bg-danger" : ratio > 0.8 ? "bg-card" : "bg-ink";
  const t = useTranslations("account.storage");
  const formatBytes = useFormatBytes();
  return (
    <div
      role="meter"
      aria-label={t("meter")}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      aria-valuetext={t("meterValue", { used: formatBytes(used), limit: formatBytes(limit) })}
      className="flex gap-[3px]"
    >
      {Array.from({ length: BLOCKS }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(
            "h-4 min-w-0 flex-1 rounded-[1px] border-2 transition-colors duration-300",
            i < filled ? clsx(fill, "border-card-ink") : "border-ink/25",
          )}
        />
      ))}
    </div>
  );
}

/** The storage readout: the number counts down when an image is deleted. */
export function StorageMeter({
  used,
  limit,
  clubs,
  clubLimit,
}: {
  used: number;
  limit: number;
  clubs: number;
  clubLimit: number;
}) {
  const size = sizeParts(used);
  const full = used >= limit;
  const t = useTranslations("account.storage");
  const locale = useLocale();
  const formatBytes = useFormatBytes();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <NumberFlow
          value={size.value}
          suffix={` ${size.unit}`}
          locales={INTL_LOCALE[locale]}
          format={{ maximumFractionDigits: size.digits, minimumFractionDigits: size.digits }}
          className="font-signage text-[44px] leading-none text-ink"
        />
        <span className="text-sm text-ink-soft">{t("used", { limit: formatBytes(limit) })}</span>
      </div>
      <p className="text-sm text-ink-soft">
        {t.rich("clubs", {
          clubs,
          limit: clubLimit,
          n: (chunks) => <span className="font-semibold text-ink tabular-nums">{chunks}</span>,
        })}
      </p>
      <PixelMeter used={used} limit={limit} />
      {full ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed font-medium text-danger">
          <WarningIcon size={18} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
          {t("full")}
        </p>
      ) : (
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{t("counts")}</p>
      )}
    </div>
  );
}
