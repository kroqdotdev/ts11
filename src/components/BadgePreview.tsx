import { ShieldIcon } from "@phosphor-icons/react/ssr";
import { contrast, readableOn } from "@/lib/color";
import { initials } from "@/lib/format";
import type { Colors } from "@/lib/types";

/** The shield a club gets until it adds a crest: its colours and initials. */
export function BadgePreview({
  name,
  colors,
  size = 56,
}: {
  name: string;
  colors: Colors;
  size?: number;
}) {
  const ring =
    contrast(colors.secondary, colors.primary) >= 1.3
      ? colors.secondary
      : readableOn(colors.primary);
  const letters = name.trim() ? initials(name) : "";
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <ShieldIcon
        weight="fill"
        size={size}
        color={ring}
        style={{ position: "absolute", inset: 0 }}
      />
      <ShieldIcon
        weight="fill"
        size={size * 0.8}
        color={colors.primary}
        style={{ position: "absolute", left: size * 0.1, top: size * 0.085 }}
      />
      <span
        className="absolute inset-0 grid place-items-center font-signage"
        style={{
          paddingBottom: size * 0.06,
          color: readableOn(colors.primary),
          fontSize: size * (letters.length > 2 ? 0.22 : 0.3),
        }}
      >
        {letters}
      </span>
    </span>
  );
}
