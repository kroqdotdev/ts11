import { WarningIcon } from "@phosphor-icons/react";
import { contrast, readableOn } from "@/lib/color";
import type { Colors } from "@/lib/types";

const TRIMS = [
  { label: "White", hex: "#f7f7f4" },
  { label: "Black", hex: "#111418" },
  { label: "Gold", hex: "#e9b62c" },
];

/**
 * Shown wherever kit colours are picked, when the two are too alike to read on each
 * other. Offers a trim colour in one click, so the club ends up with something usable.
 */
export function KitWarning({
  colors,
  onSecondary,
}: {
  colors: Colors;
  /** Sets the second colour; the trim buttons only show when this is given. */
  onSecondary?: (hex: string) => void;
}) {
  if (contrast(colors.primary, colors.secondary) >= 1.6) return null;
  const best = readableOn(colors.primary);
  const options = [
    ...TRIMS.filter((t) => contrast(t.hex, colors.primary) >= 2.2),
    // The plainest readable trim leads when the presets don't suit this kit.
    { label: "Best contrast", hex: best },
  ].filter((t, i, all) => all.findIndex((o) => o.hex === t.hex) === i);
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-[4px] border-2 border-card-ink bg-card px-3 py-2 text-[13px] leading-snug font-medium text-card-ink"
    >
      <p className="flex items-start gap-2">
        <WarningIcon size={16} weight="bold" className="mt-px shrink-0" aria-hidden />
        These two colours are very close, so names and numbers on your graphics will be hard to
        read. Pick a trim colour for the second one:
      </p>
      {onSecondary && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {options.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onSecondary(t.hex)}
              className="flex h-9 items-center gap-1.5 rounded-[3px] border-2 border-card-ink bg-paper px-2 text-[13px] font-semibold text-ink shadow-[2px_2px_0_var(--card-ink)] hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              <span
                aria-hidden
                className="size-4 rounded-[2px] border border-card-ink/60"
                style={{ background: t.hex }}
              />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
