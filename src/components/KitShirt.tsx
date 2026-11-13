import { TShirtIcon } from "@phosphor-icons/react/ssr";
import { useId } from "react";
import { luminance } from "@/lib/color";
import type { LookId } from "@/lib/types";

/**
 * A shirt in club colours, wearing the kit pattern. The Phosphor shirt is filled
 * with an SVG paint server, so stripes and hoops follow the shirt's outline.
 */
export function KitShirt({
  primary,
  secondary,
  look,
  size = 48,
  className,
}: {
  primary: string;
  secondary: string;
  look: LookId;
  size?: number;
  className?: string;
}) {
  const id = `kit-${useId().replace(/:/g, "")}`;
  let paint: React.ReactNode = null;
  let fill = primary;

  if (look === "stripes" || look === "hoops") {
    const vertical = look === "stripes";
    fill = `url(#${id})`;
    paint = (
      <pattern
        id={id}
        patternUnits="userSpaceOnUse"
        width={vertical ? 44 : 256}
        height={vertical ? 256 : 40}
      >
        <rect width="256" height="256" fill={primary} />
        <rect width={vertical ? 22 : 256} height={vertical ? 256 : 20} fill={secondary} />
      </pattern>
    );
  } else if (look === "halves") {
    fill = `url(#${id})`;
    paint = (
      <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.5" stopColor={primary} />
        <stop offset="0.5" stopColor={secondary} />
      </linearGradient>
    );
  } else if (look === "sash") {
    fill = `url(#${id})`;
    paint = (
      <linearGradient id={id} x1="0" x2="1" y1="1" y2="0">
        <stop offset="0.38" stopColor={primary} />
        <stop offset="0.38" stopColor={secondary} />
        <stop offset="0.6" stopColor={secondary} />
        <stop offset="0.6" stopColor={primary} />
      </linearGradient>
    );
  }

  // An all-dark shirt gets a light outline and an all-light one a dark outline, so
  // neither disappears on the dark big screen or the light panels.
  const shown = look === "block" || look === "clean" ? [primary] : [primary, secondary];
  const lum = shown.map(luminance);
  const outline =
    Math.max(...lum) < 0.05
      ? "rgb(255 255 255 / 0.75)"
      : Math.min(...lum) > 0.7
        ? "rgb(17 22 29 / 0.55)"
        : null;

  return (
    <TShirtIcon
      weight="fill"
      size={size}
      color={fill}
      className={className}
      stroke={outline ?? undefined}
      strokeWidth={outline ? 12 : undefined}
      strokeLinejoin="round"
      // A light halo and a dark shadow, so black shirts show on dark screens and white on light.
      style={{
        overflow: "visible",
        filter:
          "drop-shadow(0 0 0.5px rgb(255 255 255 / 0.95)) drop-shadow(0 0 0.5px rgb(255 255 255 / 0.95)) drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.4))",
      }}
    >
      {paint && <defs>{paint}</defs>}
    </TShirtIcon>
  );
}
