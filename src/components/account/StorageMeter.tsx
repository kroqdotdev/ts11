"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { Window } from "@/components/lofi/Window";

const MB = 1024 * 1024;
const BLOCKS = 25;

/** "12.4 MB" style sizes for single images. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export type MeterLevel = "ok" | "warn" | "full";

export function meterLevel(used: number, limit: number): MeterLevel {
  if (limit > 0 && used >= limit) return "full";
  if (limit > 0 && used / limit > 0.8) return "warn";
  return "ok";
}

/**
 * The storage readout: a scoreboard-style number and a meter made of pixel
 * blocks, like the LED boards round the pitch. Green while there's room, yellow
 * card past 80%, red card when full.
 */
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
  const level = meterLevel(used, limit);
  const share = limit > 0 ? Math.min(1, used / limit) : 0;
  // Any use at all lights the first block, so a small upload still shows.
  const lit = used > 0 ? Math.max(1, Math.round(share * BLOCKS)) : 0;
  const limitMb = Math.round(limit / MB);

  return (
    <Window title="Storage" bodyClassName="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-2 text-ink">
          <span className="font-signage text-[52px] leading-[0.85] tabular-nums">
            {/* Small totals read better in KB than as 0.0 MB. */}
            {used < MB ? (
              <NumberFlow value={Math.round(used / 1024)} suffix=" KB" />
            ) : (
              <NumberFlow
                value={used / MB}
                format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                suffix=" MB"
              />
            )}
          </span>
          <span className="text-sm text-ink-soft">of {limitMb} MB used</span>
        </p>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">{clubs}</span> of {clubLimit} clubs
          saved
        </p>
      </div>

      <div
        role="meter"
        aria-label="Image storage used"
        aria-valuemin={0}
        aria-valuemax={limitMb}
        aria-valuenow={Math.round((used / MB) * 10) / 10}
        aria-valuetext={`${used < MB ? `${Math.round(used / 1024)} KB` : `${(used / MB).toFixed(1)} MB`} of ${limitMb} MB`}
        className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[3px]"
      >
        {Array.from({ length: BLOCKS }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={clsx(
              "h-5 rounded-[1px] border-2 transition-colors duration-300",
              i < lit
                ? level === "full"
                  ? "border-card-ink bg-danger"
                  : level === "warn"
                    ? "border-card-ink bg-card"
                    : "border-card-ink bg-grass-mown"
                : "border-ink/20 bg-transparent",
            )}
          />
        ))}
      </div>

      {level !== "ok" && (
        <p
          role="status"
          className={clsx(
            "border-2 px-3 py-2 text-sm font-semibold",
            level === "full"
              ? "border-danger bg-danger/10 text-danger"
              : "border-card-ink bg-card text-card-ink",
          )}
        >
          {level === "full"
            ? "Storage is full. New uploads are blocked until you delete some images."
            : "Storage is nearly full. Delete images you no longer use to keep room for new ones."}
        </p>
      )}

      <p className="max-w-[60ch] text-sm leading-relaxed text-ink-soft">
        Crests, background photos, player cut-outs and sponsor logos you upload count towards this.
        Squads and match details don&apos;t.
      </p>
    </Window>
  );
}
