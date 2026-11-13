import { COAL, SNOW, alpha, contrast, luminance, mix, readableOn, shade } from "@/lib/color";
import { GRAPHIC_FONTS, type GraphicFont } from "@/lib/fonts";
import type { Colors, Design, FormatId, LookId } from "@/lib/types";

export const FORMATS: Record<FormatId, { w: number; h: number; label: string; ratio: string }> = {
  square: { w: 1080, h: 1080, label: "Square", ratio: "1:1" },
  portrait: { w: 1080, h: 1350, label: "Portrait", ratio: "4:5" },
  story: { w: 1080, h: 1920, label: "Story", ratio: "9:16" },
  wide: { w: 1600, h: 900, label: "Wide", ratio: "16:9" },
};

export const LOOKS: Record<LookId, { label: string; hint: string }> = {
  block: { label: "Panel", hint: "Club colour with a cut-away panel" },
  stripes: { label: "Stripes", hint: "Vertical kit stripes" },
  hoops: { label: "Hoops", hint: "Horizontal kit hoops" },
  halves: { label: "Halves", hint: "A shirt split down the middle" },
  sash: { label: "Sash", hint: "A diagonal band across the chest" },
  night: { label: "Floodlit", hint: "Dark, lit from above" },
  clean: { label: "Clean", hint: "Light ground, club-colour type" },
  pixel: { label: "Pixel", hint: "8-bit checks and a chunky frame" },
  stadium: { label: "Stadium", hint: "Your crowd, in your colours, in pixels" },
};

export interface Theme {
  w: number;
  h: number;
  /** Scale unit: 1 at 1080px on the short side. */
  u: number;
  wide: boolean;
  tall: boolean;
  pad: number;
  look: LookId;
  primary: string;
  secondary: string;
  /** Solid colour that best represents the background, used for contrast decisions. */
  ground: string;
  fg: string;
  muted: string;
  accent: string;
  rule: string;
  /** Shirt fill for pitch tokens, and the goalkeeper's alternate. */
  kit: string;
  kitAlt: string;
  font: GraphicFont;
  /** Right edge of the content area. The Panel style keeps its stripe outside it. */
  right: number;
  /**
   * How far the frame runs past the content box at the top and bottom (the story
   * safe area). Layouts that paint their own full-bleed ground extend by this much.
   */
  bleedTop: number;
  bleedBottom: number;
}

/** Stadium amber: the fallback accent when a kit has no colour of its own to light up. */
export const AMBER = "#ffb627";

/** Spread between the strongest and weakest channel: near 0 for greys. */
function chroma(hex: string): number {
  const c = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => Number.parseInt(c.slice(i, i + 2), 16) || 0);
  return Math.max(...rgb) - Math.min(...rgb);
}

function pickAccent(candidates: string[], ground: string, min: number): string {
  return candidates.find((c) => contrast(c, ground) >= min) ?? readableOn(ground);
}

export function resolveColors(design: Design, club: Colors): Colors {
  return design.colors ?? club;
}

export function buildTheme(design: Design, club: Colors): Theme {
  const { w, h } = FORMATS[design.format];
  const u = Math.min(w, h) / 1080;
  const { primary, secondary } = resolveColors(design, club);
  const font = GRAPHIC_FONTS[design.font];

  let ground: string;
  switch (design.look) {
    case "night":
      ground = mix(primary, "#05070b", 0.84);
      break;
    case "clean":
      ground = "#f3f3ef";
      break;
    case "stadium":
      ground = mix(primary, "#05070b", 0.72);
      break;
    default:
      ground = primary;
  }

  const fg =
    design.look === "clean"
      ? contrast(primary, ground) >= 4
        ? shade(primary, -0.15)
        : COAL
      : // A near-white kit reads as club-coloured type in its trim, not plain black.
        luminance(primary) > 0.62 && contrast(secondary, ground) >= 7
        ? secondary
        : readableOn(ground);

  // Accent text (opponent line, competition, kick-off) must read as text on the
  // ground: try each club colour, then deeper versions of it (darker on light
  // grounds, lighter on dark), so white or black kits never end up grey on grey.
  const deeper = (c: string) => {
    const dir = fg === SNOW ? 1 : -1;
    return [c, shade(c, 0.3 * dir), shade(c, 0.55 * dir)];
  };
  const accent =
    design.look === "clean"
      ? pickAccent([secondary, ...deeper(primary), ...deeper(secondary).slice(1)], ground, 4)
      : design.look === "night"
        ? // Under floodlights a grey accent (white or black kits) reads as unlit text:
          // only coloured candidates count, else the stadium's amber.
          ([...deeper(secondary), shade(primary, 0.45), ...deeper(primary)].find(
            (c) => chroma(c) >= 48 && contrast(c, ground) >= 4.5,
          ) ?? AMBER)
        : pickAccent([...deeper(secondary), ...deeper(primary)], ground, 4);

  const kit = contrast(primary, ground) >= 1.7 ? primary : secondary;
  // The keeper needs a shirt that stands out from the outfield kit and the background.
  const keeperOptions = [kit === primary ? secondary : primary, "#e8c030", "#1f9d55", COAL, SNOW];
  const kitAlt =
    keeperOptions.find((c) => contrast(c, kit) >= 1.6 && contrast(c, ground) >= 1.6) ??
    (contrast(COAL, ground) > contrast(SNOW, ground) ? COAL : SNOW);
  const wide = w / h > 1.2;

  return {
    w,
    h,
    u,
    wide,
    tall: h / w > 1.5,
    pad: Math.round(72 * u),
    look: design.look,
    primary,
    secondary,
    ground,
    fg,
    muted: alpha(fg, 0.72),
    accent,
    rule: alpha(fg, 0.22),
    kit,
    kitAlt,
    font,
    right:
      design.look === "block" && !design.background.image
        ? Math.round(w * (wide ? 0.84 : 0.82))
        : w - Math.round(72 * u),
    bleedTop: 0,
    bleedBottom: 0,
  };
}

/** Largest font size (px) at which `text` fits `width` on one line, capped at `max`. */
export function fit(text: string, width: number, max: number, theme: Theme, factor = 1): number {
  const chars = Math.max(text.length, 1);
  return Math.min(max, width / (chars * theme.font.glyph * factor));
}

/**
 * Smallest text a graphic should print: about 24px on a 1080px post, which still
 * reads on a phone feed. Layouts clamp captions and labels to this.
 */
export function minText(theme: Theme): number {
  // Wide posts are shown at the same width as square ones, so scale by width.
  return Math.round(24 * Math.max(theme.u, theme.w / 1080));
}

/**
 * The floor every printed line must clear (`pnpm check:graphics` fails below about
 * 20px on a 1080 post, scaled by width for wide posts). Labels, captions and
 * badges clamp to this; headline sizes are untouched.
 */
export function legible(theme: Theme, px: number): number {
  return Math.max(px, Math.ceil((21 * theme.w) / 1080));
}

/**
 * Space kept clear at the top and bottom of a format, where the app's own
 * interface sits over a post. Instagram and TikTok stories cover roughly the
 * top 250px (profile, progress bar) and bottom 300px (reply bar) of 1920.
 */
export function safeArea(format: FormatId): { top: number; bottom: number } {
  return format === "story" ? { top: 250, bottom: 300 } : { top: 0, bottom: 0 };
}

/**
 * The theme content is laid out with: the safe area's height, and sized like a
 * portrait post when the story's safe area makes it one. The backdrop keeps the
 * full theme so photos and patterns still run edge to edge.
 */
export function contentTheme(theme: Theme, format: FormatId): Theme {
  const safe = safeArea(format);
  if (!safe.top && !safe.bottom) return theme;
  // Layouts keep their own `pad` inside the box they get, so the box reaches a
  // pad into the safe zones: the content itself then starts exactly at the safe
  // line instead of a further pad below it.
  const top = Math.max(0, safe.top - theme.pad);
  const bottom = Math.max(0, safe.bottom - theme.pad);
  const h = theme.h - top - bottom;
  // Still a story: layouts use their tall sizes (bigger type, more air) so the
  // safe box is filled like a story, not a portrait post shrunk into it.
  return { ...theme, h, tall: true, bleedTop: top, bleedBottom: bottom };
}
