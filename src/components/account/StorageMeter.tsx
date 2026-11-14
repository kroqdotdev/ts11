"use client";

import NumberFlow from "@number-flow/react";
import { WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { formatBytes, sizeParts } from "./messages";

const BLOCKS = 24;

/**
 * Storage as a row of pixel blocks, like the stadium's LED boards: ink while there's
 * room, yellow past 80%, red when full. No track, no smooth bar.
 */
export function PixelMeter({ used, limit }: { used: number; limit: number }) {
  const ratio = limit > 0 ? used / limit : 0;
  const filled = used <= 0 ? 0 : Math.min(BLOCKS, Math.max(1, Math.round(ratio * BLOCKS)));
  const fill = ratio >= 1 ? "bg-danger" : ratio > 0.8 ? "bg-card" : "bg-ink";
  return (
    <div
      role="meter"
      aria-label="Storage used"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      aria-valuetext={`${formatBytes(used)} of ${formatBytes(limit)}`}
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <NumberFlow
          value={size.value}
          suffix={` ${size.unit}`}
          format={{ maximumFractionDigits: size.digits, minimumFractionDigits: size.digits }}
          className="font-signage text-[44px] leading-none text-ink"
        />
        <span className="text-sm text-ink-soft">of {formatBytes(limit)} used</span>
      </div>
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink tabular-nums">{clubs}</span> of {clubLimit} clubs
        saved
      </p>
      <PixelMeter used={used} limit={limit} />
      {full ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed font-medium text-danger">
          <WarningIcon size={18} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
          Your storage is full. Delete images you no longer use to make room; the studio keeps
          everything in this browser until then.
        </p>
      ) : (
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          Crests, background photos, player cut-outs and sponsor logos you upload count towards
          this. Squads and match details don&apos;t.
        </p>
      )}
    </div>
  );
}
