import { ShieldIcon } from "@phosphor-icons/react/ssr";
import type { CSSProperties, ReactNode } from "react";
import {
  alpha,
  COAL,
  contrast,
  huedTint,
  luminance,
  mix,
  readableOn,
  shade,
  SNOW,
  tonal,
} from "@/lib/color";
import { formatMatchDate, initials } from "@/lib/format";
import type { Colors, Design, Team } from "@/lib/types";
import { PixelBackdrop, StadiumBackdrop } from "./LofiBackdrops";
import { fit, type Theme } from "./theme";

/**
 * Smallest text the graphics print, in native pixels: about 20px on a 1080 post,
 * scaled by width for wide posts (they show at the same width on a phone).
 */
export function minPx(theme: Theme): number {
  return Math.ceil((21 * Math.max(theme.w, 1080)) / 1080);
}

/** `size`, but never below the readable minimum. */
export function px(theme: Theme, size: number): number {
  return Math.max(size, minPx(theme));
}

// Uppercase widths relative to an average capital (measured on Archivo Black; the
// condensed fonts keep similar proportions), so wide letters (M, W, O) and narrow
// ones (I, 1, spaces) fit honestly instead of on a flat per-character guess.
const UNITS: Record<string, number> = {
  A: 1.06,
  B: 1.02,
  C: 1.05,
  D: 1.05,
  E: 0.95,
  F: 0.83,
  G: 1.11,
  H: 1.06,
  I: 0.52,
  J: 0.91,
  K: 1.05,
  L: 0.87,
  M: 1.42,
  N: 1.07,
  O: 1.13,
  P: 0.99,
  Q: 1.13,
  R: 1.04,
  S: 0.96,
  T: 0.97,
  U: 1.04,
  V: 1.0,
  W: 1.47,
  X: 1.02,
  Y: 1.0,
  Z: 0.97,
  "0": 0.9,
  "1": 0.77,
  "2": 0.88,
  "3": 0.89,
  "4": 0.88,
  "5": 0.89,
  "6": 0.9,
  "7": 0.81,
  "8": 0.88,
  "9": 0.9,
  " ": 0.24,
  ".": 0.45,
  ",": 0.45,
  "-": 0.5,
  "'": 0.43,
  "’": 0.43,
  "&": 1.14,
  "(": 0.76,
  ")": 0.76,
  "′": 0.36,
  ":": 0.46,
  "+": 1.06,
  "/": 0.6,
};
function charUnits(c: string): number {
  return UNITS[c] ?? 1.05;
}

/** Width of `text` in average-capital units (the font's `glyph` em each). */
export function textUnits(text: string): number {
  let n = 0;
  for (const c of text.toUpperCase()) n += charUnits(c);
  // A little slack for kerning and tracking differences between fonts.
  return Math.max(n * 1.03, 1);
}

/** Largest size at which `text` fits `width` on one line, capped at `max`. */
export function fitText(text: string, width: number, max: number, theme: Theme): number {
  return Math.min(max, width / (textUnits(text) * theme.font.glyph));
}

export function Frame({
  theme,
  design,
  team,
  children,
  id,
  lettering,
}: {
  theme: Theme;
  design: Design;
  team: Team;
  children: ReactNode;
  id?: string;
  /** Outline text behind everything; defaults to the club's short name. */
  lettering?: string;
}) {
  return (
    <div
      id={id}
      data-graphic
      style={{
        position: "relative",
        width: theme.w,
        height: theme.h,
        overflow: "hidden",
        background: theme.ground,
        color: theme.fg,
        fontFamily: theme.font.family,
        fontStretch: theme.font.stretch,
        fontWeight: theme.font.light,
        letterSpacing: theme.font.tracking,
        lineHeight: 1,
        textTransform: "uppercase",
        isolation: "isolate",
      }}
    >
      <Backdrop theme={theme} design={design} team={team} lettering={lettering} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>{children}</div>
    </div>
  );
}

function Backdrop({
  theme,
  design,
  team,
  lettering,
}: {
  theme: Theme;
  design: Design;
  team: Team;
  lettering?: string;
}) {
  const { w, h, primary, secondary, ground, fg, u } = theme;
  const layers: ReactNode[] = [];
  // A white (or near-white) shirt: darker tones of it are just grey. Real white
  // kits get their pattern from the trim colour, so build it from that instead.
  const light = luminance(primary) > 0.62;
  const trim = contrast(secondary, primary) >= 2.2 ? secondary : COAL;
  /** The pattern's second tone: a darker shirt colour, or a tint of the trim on white. */
  const tone = (amount: number) =>
    light ? huedTint(trim, 0.92 - amount * 0.3) : tonal(primary, amount);
  // Pale tints of the trim that keep its hue (pale navy, not grey). Dark type stays
  // legible on them, so they can sit behind text; full-strength trim stays in margins.
  const pale = huedTint(trim, 0.87);
  const hem = (key: string, at: "top" | "bottom", height: number) => (
    <div
      key={key}
      style={{ position: "absolute", left: 0, right: 0, [at]: 0, height, background: trim }}
    />
  );

  if (design.background.image) {
    layers.push(<PhotoLayer key="photo" theme={theme} design={design} />);
  } else if (theme.look === "pixel") {
    layers.push(<PixelBackdrop key="pixel" theme={theme} />);
  } else if (theme.look === "stadium") {
    layers.push(<StadiumBackdrop key="stadium" theme={theme} design={design} team={team} />);
  } else if (theme.look === "block") {
    // A cut-away panel on the right, edged in the second club colour.
    // Kept outside the content area (theme.right), so it never cuts through type.
    const top = w * (theme.wide ? 0.95 : 0.95);
    const bottom = theme.right + 24 * u;
    const edge = 14 * u;
    // Each layer's box starts where its shape does, not at the frame's left edge, so
    // contrast checkers (which ignore clip-path) don't read the edging as the ground
    // behind the type.
    const x0 = Math.min(top, bottom);
    layers.push(
      <div
        key="panel"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x0,
          right: 0,
          background: light
            ? `linear-gradient(160deg, ${trim}, ${tonal(trim, 0.25)})`
            : `linear-gradient(160deg, ${tonal(primary, 0.2)}, ${tonal(primary, 0.36)})`,
          // The gradient still spans the whole frame, as before.
          backgroundSize: `${w}px 100%`,
          backgroundPosition: `${-x0}px 0`,
          clipPath: `polygon(${top - x0}px 0, 100% 0, 100% 100%, ${bottom - x0}px 100%)`,
        }}
      />,
      <div
        key="edge"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x0,
          width: Math.abs(top - bottom) + edge,
          background: light ? mix(trim, primary, 0.55) : secondary,
          clipPath: `polygon(${top - x0}px 0, ${top - x0 + edge}px 0, ${bottom - x0 + edge}px 100%, ${bottom - x0}px 100%)`,
        }}
      />,
    );
    if (light) layers.push(hem("hem", "bottom", 16 * u));
  } else if (theme.look === "stripes") {
    const band = Math.round(w / 9);
    if (light) {
      // A white shirt with pinstripes in the trim: pale-tinted stripes behind the
      // type, the real trim colour in the right-hand margin, and a trim hem.
      const pin = Math.max(5, Math.round(8 * u));
      const stripes = (c: string) =>
        `repeating-linear-gradient(90deg, transparent 0 ${band - pin}px, ${c} ${band - pin}px ${band}px)`;
      const margin = `linear-gradient(90deg, transparent 0%, transparent ${(theme.right / w) * 100}%, #000 ${Math.min(100, (theme.right / w) * 100 + 2)}%)`;
      layers.push(
        <div key="tint" style={{ position: "absolute", inset: 0, background: stripes(pale) }} />,
        <div
          key="pins"
          style={{
            position: "absolute",
            inset: 0,
            background: stripes(trim),
            maskImage: margin,
            WebkitMaskImage: margin,
          }}
        />,
        hem("hem", "bottom", 18 * u),
        hem("cap", "top", 10 * u),
      );
    } else {
      layers.push(
        <div
          key="stripes"
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(90deg, ${primary} 0 ${band}px, ${tonal(primary, 0.14)} ${band}px ${band * 2}px)`,
          }}
        />,
        <div
          key="fade"
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, ${alpha(shade(primary, -0.5), 0)} 35%, ${alpha(shade(primary, -0.55), 0.85)} 100%)`,
          }}
        />,
      );
    }
  } else if (theme.look === "hoops") {
    // Tonal hoops with a pinline in the second colour. Both stay quiet behind the
    // type on the left and come through at full strength toward the right edge.
    const band = Math.round(h / 8);
    // Pale hued hoops can run at full strength (dark type reads on them); tonal
    // hoops on a coloured shirt stay quiet behind the type.
    const quiet = light
      ? "linear-gradient(#000, #000)"
      : `linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.22) 50%, #000 92%)`;
    layers.push(
      <div
        key="hoops"
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(180deg, ${primary} 0 ${band}px, ${light ? pale : tone(0.18)} ${band}px ${band * 2}px)`,
          maskImage: quiet,
          WebkitMaskImage: quiet,
        }}
      />,
      <div
        key="pinlines"
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(180deg, transparent 0 ${band * 2 - 5 * u}px, ${light ? trim : secondary} ${band * 2 - 5 * u}px ${band * 2}px)`,
          maskImage: `linear-gradient(90deg, transparent 0%, transparent 72%, #000 96%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent 0%, transparent 72%, #000 96%)`,
        }}
      />,
    );
  } else if (theme.look === "halves") {
    const split = theme.wide ? 0.5 : 0.62;
    layers.push(
      <div
        key="half"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${split * 100}%`,
          right: 0,
          background: light ? huedTint(trim, 0.8) : tone(0.3),
        }}
      />,
      <div
        key="seam-top"
        style={{
          position: "absolute",
          top: 0,
          height: (light ? 110 : 70) * u,
          left: `calc(${split * 100}% - ${5 * u}px)`,
          width: 10 * u,
          background: light ? trim : secondary,
        }}
      />,
      <div
        key="seam-bottom"
        style={{
          position: "absolute",
          bottom: 0,
          height: (light ? 110 : 70) * u,
          left: `calc(${split * 100}% - ${5 * u}px)`,
          width: 10 * u,
          background: light ? trim : secondary,
        }}
      />,
    );
    if (light) layers.push(hem("hem", "bottom", 16 * u));
  } else if (theme.look === "sash") {
    // A diagonal sash from bottom left to top right. The body is a colour the type
    // stays legible on (a hued tint on white shirts, a darker tone otherwise), so it
    // can pass behind the footer, subs and names. Its edging, in the trim colour,
    // only shows where the sash enters and leaves the frame, inside the margins.
    const thick = Math.min(w, h) * 0.24;
    const len = Math.hypot(w, h) * 1.2;
    const angle = (-Math.atan2(h, w) * 180) / Math.PI;
    const edge = 9 * u;
    const box = {
      position: "absolute",
      left: w / 2 - len / 2,
      top: h * 0.5 - thick / 2,
      width: len,
      height: thick,
      rotate: `${angle}deg`,
    } as const;
    const body = light ? huedTint(trim, 0.82) : tonal(primary, 0.3);
    const quiet = `linear-gradient(90deg, #000 0%, #000 14%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.55) 70%, #000 86%, #000 100%)`;
    const ends = `linear-gradient(90deg, #000 0%, #000 10%, transparent 12.5%, transparent 87.5%, #000 90%, #000 100%)`;
    const edging = light ? trim : secondary;
    layers.push(
      <div
        key="sash"
        style={{ ...box, background: body, maskImage: quiet, WebkitMaskImage: quiet }}
      />,
      <div
        key="sash-edge"
        style={{
          ...box,
          background: `linear-gradient(180deg, ${edging} 0 ${edge}px, transparent ${edge}px calc(100% - ${edge}px), ${edging} calc(100% - ${edge}px))`,
          maskImage: ends,
          WebkitMaskImage: ends,
        }}
      />,
    );
  } else if (theme.look === "night") {
    layers.push(
      <div
        key="glow"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(${w * 0.9}px ${h * 0.75}px at 50% -8%, ${alpha(primary, 0.75)} 0%, ${alpha(primary, 0.18)} 45%, ${alpha(ground, 0)} 75%)`,
        }}
      />,
      <div
        key="floor"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 10 * u,
          background: secondary,
        }}
      />,
    );
  } else {
    layers.push(
      <div
        key="bar"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: 20 * u,
          background: primary,
        }}
      />,
      <div
        key="bar2"
        style={{
          position: "absolute",
          left: 0,
          top: 20 * u,
          right: 0,
          height: 8 * u,
          background: secondary,
        }}
      />,
    );
  }

  const word = (lettering ?? (design.showLettering ? team.shortName : "")).trim().toUpperCase();
  if (word) {
    const size = fit(word, w * 1.08, h * 0.55, theme, 0.95);
    layers.push(
      <div
        key="lettering"
        data-decor
        aria-hidden
        style={{
          position: "absolute",
          right: -0.02 * w,
          bottom: -0.11 * size,
          fontSize: size,
          fontWeight: theme.font.heavy,
          lineHeight: 0.8,
          whiteSpace: "nowrap",
          color: "transparent",
          WebkitTextStroke: `${Math.max(2, 2.5 * u)}px ${alpha(fg, theme.look === "clean" ? 0.12 : 0.16)}`,
        }}
      >
        {word}
      </div>,
    );
  }

  if (design.featureImage) {
    layers.push(
      <img
        key="feature"
        src={design.featureImage}
        alt=""
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          height: theme.wide ? "100%" : "74%",
          width: theme.wide ? "52%" : "64%",
          objectFit: "contain",
          objectPosition: "right bottom",
          maskImage: "linear-gradient(90deg, transparent 0%, #000 22%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 22%)",
        }}
      />,
    );
  }

  return <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>{layers}</div>;
}

/** Full-bleed background photo with a club-colour overlay that keeps type legible. */
function PhotoLayer({ theme, design }: { theme: Theme; design: Design }) {
  const bg = design.background;
  const { ground, primary, w, h } = theme;
  const k = bg.strength;
  const full = { position: "absolute", inset: 0 } as const;
  const overlays: ReactNode[] = [];

  if (bg.overlay === "duotone") {
    overlays.push(
      <div key="duo" style={{ ...full, background: primary, mixBlendMode: "multiply" }} />,
      <div
        key="duo-lift"
        style={{ ...full, background: shade(primary, -0.7), mixBlendMode: "lighten" }}
      />,
    );
  }
  if (bg.overlay === "tint" || bg.overlay === "duotone") {
    overlays.push(
      <div
        key="tint"
        style={{ ...full, background: alpha(ground, bg.overlay === "tint" ? k : k * 0.45) }}
      />,
    );
  }
  if (bg.overlay === "fade") {
    // Text sits left and along the bottom, so the photo clears toward the top right.
    overlays.push(
      <div
        key="side"
        style={{
          ...full,
          background: `linear-gradient(${theme.wide ? 90 : 100}deg, ${alpha(ground, k)} 0%, ${alpha(ground, k * 0.82)} 38%, ${alpha(ground, k * 0.1)} 78%)`,
        }}
      />,
      <div
        key="foot"
        style={{
          ...full,
          background: `linear-gradient(180deg, ${alpha(ground, k * 0.35)} 0%, ${alpha(ground, 0)} 30%, ${alpha(ground, 0)} 55%, ${alpha(ground, Math.min(1, k * 1.1))} 100%)`,
        }}
      />,
    );
  }

  const zoom = Math.max(1, bg.zoom);
  return (
    <div style={{ ...full, overflow: "hidden", background: ground }}>
      <img
        src={bg.image!}
        alt=""
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          objectFit: "cover",
          objectPosition: `${bg.x}% ${bg.y}%`,
          transform: zoom > 1 ? `scale(${zoom})` : undefined,
          transformOrigin: `${bg.x}% ${bg.y}%`,
          filter: bg.mono || bg.overlay === "duotone" ? "grayscale(1) contrast(1.08)" : undefined,
        }}
      />
      {overlays}
    </div>
  );
}

export function Crest({
  src,
  name,
  colors,
  size,
  theme,
  kind,
}: {
  src: string | null;
  name: string;
  colors: Colors;
  size: number;
  theme: Theme;
  /** How the uploaded crest was saved (see Team.crestKind); decides the plate. */
  kind?: Team["crestKind"];
}) {
  if (src) {
    const img = (s: number) => (
      <img
        src={src}
        alt=""
        style={{ width: s, height: s, objectFit: "contain", flexShrink: 0, display: "block" }}
      />
    );
    // A crest saved on a solid (usually white) square looks like a mistake on a dark
    // or coloured ground, so it sits on a light rounded plate: an intentional badge
    // sticker. A cut-out crest is drawn as it is. Old saves don't know which they
    // have, so they keep the plate on darker grounds.
    const plate = kind === "opaque" || (kind === undefined && luminance(theme.ground) <= 0.55);
    if (!plate) return img(size);
    return (
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          background: mix(SNOW, theme.primary, 0.05),
          borderRadius: size * 0.2,
          boxShadow: `0 ${size * 0.03}px ${size * 0.09}px ${alpha("#000000", 0.28)}`,
        }}
      >
        {img(size * 0.8)}
      </div>
    );
  }
  // Fallback badge: the club's shield in its own colours with initials.
  const ring =
    contrast(colors.secondary, colors.primary) >= 1.3
      ? colors.secondary
      : readableOn(colors.primary);
  // An unnamed side (no opponent yet) gets a plain shield, not a "?". Letters too
  // small to read on a little badge are left off: the name is printed beside it.
  const raw = name.trim() ? initials(name) : "";
  const letterSize = size * (raw.length > 2 ? 0.22 : 0.27);
  const letters = letterSize >= minPx(theme) ? raw : "";
  // When neither shield colour shows against the graphic, outline it in the text colour.
  const lost = contrast(ring, theme.ground) < 1.5 && contrast(colors.primary, theme.ground) < 1.5;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <ShieldIcon
        weight="fill"
        size={size}
        color={ring}
        style={{ position: "absolute", inset: 0 }}
      />
      {lost && (
        <ShieldIcon
          weight="bold"
          size={size}
          color={theme.fg}
          style={{ position: "absolute", inset: 0 }}
        />
      )}
      <ShieldIcon
        weight="fill"
        size={size * 0.8}
        color={colors.primary}
        style={{ position: "absolute", left: size * 0.1, top: size * 0.085 }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: size * 0.06,
          color: readableOn(colors.primary),
          fontFamily: theme.font.family,
          fontWeight: theme.font.heavy,
          fontSize: letterSize,
          letterSpacing: "0.02em",
        }}
      >
        {letters}
      </div>
    </div>
  );
}

/** Splits a phrase into two lines of similar length at a space. */
export function balance(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text];
  let best = [text];
  let bestDiff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" ");
    const b = words.slice(k).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

export function Heading({
  text,
  width,
  max,
  theme,
  color,
  style,
  twoLines = false,
}: {
  text: string;
  width: number;
  max: number;
  theme: Theme;
  color?: string;
  style?: CSSProperties;
  /** Break long headlines over two balanced lines instead of shrinking them. */
  twoLines?: boolean;
}) {
  const lines = twoLines && text.length > 11 ? balance(text) : [text];
  const longest = lines.reduce((a, b) => (textUnits(b) > textUnits(a) ? b : a), "");
  const size = fitText(longest, width, max, theme);
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: theme.font.heavy,
        lineHeight: 0.86 * theme.font.leading,
        whiteSpace: "nowrap",
        color: color ?? theme.fg,
        ...style,
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

/** Opponent, date, kick-off and venue as compact lines under a headline. */
export function MatchMeta({
  team,
  theme,
  size,
  showVersus = true,
}: {
  team: Team;
  theme: Theme;
  size: number;
  showVersus?: boolean;
}) {
  const m = team.match;
  const when = [formatMatchDate(m.date), m.kickoff].filter(Boolean).join("  ");
  size = px(theme, size);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.32 }}>
      {showVersus && m.opponent.trim() && (
        <div style={{ fontSize: size * 1.25, fontWeight: theme.font.heavy, color: theme.accent }}>
          {m.isHome ? "vs" : "at"} {m.opponent}
        </div>
      )}
      <div
        style={{
          fontSize: size,
          color: theme.muted,
          display: "flex",
          flexWrap: "wrap",
          columnGap: size * 0.9,
        }}
      >
        {when && <span>{when}</span>}
        {m.venue && <span>{m.venue}</span>}
      </div>
    </div>
  );
}

export function Footer({
  theme,
  design,
  left,
  style,
}: {
  theme: Theme;
  design: Design;
  left?: ReactNode;
  style?: CSSProperties;
}) {
  const size = px(theme, 30 * theme.u);
  if (!design.footer && !design.sponsorImage && !left) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: size,
        fontSize: size,
        color: theme.muted,
        ...style,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: size * 0.4 }}>
        {left}
        {design.footer && (
          <span style={{ color: theme.fg, fontWeight: theme.font.heavy, textTransform: "none" }}>
            {design.footer}
          </span>
        )}
      </div>
      {design.sponsorImage && (
        <img
          src={design.sponsorImage}
          alt=""
          style={{
            height: 74 * theme.u,
            maxWidth: 300 * theme.u,
            objectFit: "contain",
            objectPosition: "right bottom",
          }}
        />
      )}
    </div>
  );
}
