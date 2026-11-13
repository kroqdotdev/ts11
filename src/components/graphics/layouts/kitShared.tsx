import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { COAL, contrast, luminance, readableOn, tonal } from "@/lib/color";
import { displayName, formatMatchDate, initials } from "@/lib/format";
import type { Design, Team } from "@/lib/types";
import { Crest } from "../parts";
import { fit as fitAverage, type Theme } from "../theme";

/**
 * How much wider than an average glyph a piece of text runs: W and M are wide,
 * I, 1 and punctuation narrow. Names like "WOLVERHAMPTON" otherwise overflow.
 */
function widthFactor(text: string): number {
  const t = text.toUpperCase();
  if (!t.length) return 1;
  let sum = 0;
  for (const ch of t) {
    if ("WM@".includes(ch)) sum += 1.4;
    else if ("ODQGCNHUAVK0".includes(ch)) sum += 1.08;
    else if ("I1.,:;'!|() -".includes(ch)) sum += 0.5;
    else sum += 1;
  }
  return Math.max(1, (sum / t.length) * 1.15);
}

/**
 * Largest size at which `text` fits `width` on one line: the theme's estimate,
 * corrected for the letters actually in the text.
 */
export function fit(text: string, width: number, max: number, theme: Theme, factor = 1): number {
  return fitAverage(text, width, max, theme, factor * widthFactor(text));
}

/**
 * The smallest type a kit layout prints: 22px on a 1080px post. Wide posts are shown
 * at about the same width on a phone, so it scales with the width, not the height.
 */
export function minText(theme: Theme): number {
  return Math.ceil((22 * theme.w) / 1080);
}

/**
 * A fallback crest's initials are a logo mark, sized as a fraction of the shield
 * (a fifth for three letters). Below this size they read as small print, so the
 * layouts keep crests at least this big where they have room.
 */
export function crestMin(theme: Theme): number {
  return Math.ceil(minText(theme) / 0.2);
}

/**
 * The club crest. Where a layout has to set a fallback crest smaller than
 * `crestMin`, its initials are a logo mark rather than reading text, so the
 * layout check is told to let them be small.
 */
export function KitCrest(props: ComponentProps<typeof Crest>) {
  const letters = props.name.trim() ? initials(props.name) : "";
  const letterSize = props.size * (letters.length > 2 ? 0.2 : 0.26);
  if (props.src || !letters || letterSize >= minText(props.theme)) return <Crest {...props} />;
  return (
    <div data-check-allow="small" style={{ display: "contents" }}>
      <Crest {...props} />
    </div>
  );
}

/** Splits text into `n` balanced lines at spaces (or hyphens for one long word). */
export function splitLines(text: string, n: number): string[] {
  if (n <= 1) return [text.trim()];
  if (n === 2) return splitTwo(text);
  const words = text.trim().split(/\s+/);
  if (words.length < n) return splitTwo(text);
  const target = text.length / n;
  const out: string[] = [];
  let cur: string[] = [];
  for (const word of words) {
    const next = [...cur, word].join(" ");
    if (cur.length && next.length > target * 1.15 && out.length < n - 1) {
      out.push(cur.join(" "));
      cur = [word];
    } else cur.push(word);
  }
  out.push(cur.join(" "));
  return out;
}

/** True for white and near-white shirts, whose colour comes from the trim. */
export function isLight(hex: string): boolean {
  return luminance(hex) > 0.62;
}

/**
 * The club colour with presence: the shirt colour, or the trim for a white kit
 * (a white/navy club reads as navy, not as a white page).
 */
export function strongOf(theme: Theme): string {
  const { primary, secondary } = theme;
  if (!isLight(primary)) return primary;
  return contrast(secondary, primary) >= 2.2 ? secondary : COAL;
}

/** A second colour that stays distinct from `base`: the other club colour, else a tone of it. */
export function partnerOf(base: string, other: string, amount = 0.32): string {
  if (contrast(base, other) >= 1.45) return other;
  return tonal(base, amount);
}

/** A theme whose ground is `ground`, for Crest outlines on a coloured panel. */
export function on(theme: Theme, ground: string): Theme {
  return { ...theme, ground, fg: readableOn(ground) };
}

export interface Fitted {
  lines: string[];
  size: number;
}

/** Splits text into two similar lines at a space, or at a hyphen for one long word. */
export function splitTwo(text: string): string[] {
  const t = text.trim();
  const words = t.split(/\s+/);
  let best: string[] = [t];
  if (words.length >= 2) {
    let diff = Infinity;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(" ");
      const b = words.slice(k).join(" ");
      const d = Math.abs(a.length - b.length);
      if (d < diff) {
        diff = d;
        best = [a, b];
      }
    }
    if (Math.max(best[0].length, best[1].length) < t.length * 0.75) return best;
  }
  // A long hyphenated word ("Pritchard-Montgomery") breaks better at its hyphen.
  const cuts = [...t.matchAll(/-/g)].map((m) => m.index ?? 0).filter((i) => i > 0);
  if (cuts.length === 0) return best;
  const mid = t.length / 2;
  const at = cuts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [t.slice(0, at + 1), t.slice(at + 1)];
}

/**
 * Fits one name or phrase to a width: one line if it is comfortable, otherwise
 * two lines when that makes the type meaningfully bigger.
 */
export function fitWrap(
  text: string,
  width: number,
  max: number,
  theme: Theme,
  maxLines = 2,
): Fitted {
  const one = fit(text, width, max, theme);
  if (maxLines < 2 || one >= max * 0.82) return { lines: [text], size: one };
  const parts = splitTwo(text);
  // Never strand an initial ("H." / "Lund") on a line of its own.
  if (parts.length < 2 || Math.min(...parts.map((p) => p.length)) < 3)
    return { lines: [text], size: one };
  const two = Math.min(max, ...parts.map((p) => fit(p, width, max, theme)));
  return two > one * 1.12 ? { lines: parts, size: two } : { lines: [text], size: one };
}

/**
 * Fits a secondary line (a competition, a venue) at the largest size up to `max`,
 * on as few lines as keep it at or above the minimum. Null when even `maxLines`
 * lines would be too small: leave it out rather than print small print.
 */
export function fitBlock(
  text: string,
  width: number,
  max: number,
  theme: Theme,
  maxLines = 3,
): Fitted | null {
  const t = text.trim();
  if (!t) return null;
  const floor = minText(theme);
  const cap = Math.max(max, floor);
  for (let n = 1; n <= maxLines; n++) {
    const lines = splitLines(t, n);
    if (lines.length < n && n > 1) break;
    const size = Math.min(cap, ...lines.map((l) => fit(l, width, cap, theme)));
    if (size >= floor) return { lines, size };
  }
  return null;
}

export interface ListItem {
  text: string;
  /** A shorter form to fall back on (the surname) before going below the minimum. */
  alt?: string;
  /** Width for this row, when rows differ (a captain mark, say). */
  width?: number;
}

/**
 * Sets a whole list (a line-up, the fixtures) at ONE size, so it reads as a block.
 * Tries, in order: every row in full on one line; every row in its shorter form;
 * full rows allowed onto two lines; short rows on two lines. The first that stays
 * at a comfortable size wins (else the biggest); nothing goes below the minimum.
 * The whole list switches form together, so names never mix "Oskar Harper" with "Okafor".
 */
export function listFit(
  items: ListItem[],
  width: number,
  base: number,
  rowH: number,
  theme: Theme,
): { size: number; rows: string[][]; ok: boolean } {
  const floor = minText(theme);
  const good = Math.max(floor * 1.15, base * 0.6);
  // Two lines are allowed whenever the row can hold two lines of minimum type.
  const twoOk = rowH >= floor * 2.05;
  const hasAlt = items.some((it) => it.alt && it.alt !== it.text);
  const modes: { alt: boolean; two: boolean }[] = [
    { alt: false, two: false },
    ...(hasAlt ? [{ alt: true, two: false }] : []),
    ...(twoOk ? [{ alt: false, two: true }] : []),
    ...(twoOk && hasAlt ? [{ alt: true, two: true }] : []),
  ];
  const plan = ({ alt, two }: { alt: boolean; two: boolean }) => {
    const rows = items.map((it) => {
      const text = alt && it.alt ? it.alt : it.text;
      const w = it.width ?? width;
      const one = { lines: [text], size: fit(text, w, base, theme) };
      if (!two || one.size >= good) return one;
      const parts = splitTwo(text);
      if (parts.length < 2 || Math.min(...parts.map((x) => x.length)) < 3) return one;
      const size = Math.min(base, rowH / 2.05, ...parts.map((x) => fit(x, w, base, theme)));
      return size > one.size ? { lines: parts, size } : one;
    });
    return { rows, size: Math.min(base, ...rows.map((r) => r.size)) };
  };
  const plans = modes.map(plan);
  const pick =
    plans.find((p) => p.size >= good) ?? plans.reduce((a, b) => (b.size > a.size ? b : a));
  const size = Math.max(floor, pick.size);
  return {
    size,
    // Rows that fit one line at the common size stay on one line.
    rows: pick.rows.map((r, i) =>
      r.lines.length > 1 && fit(r.lines.join(" "), items[i].width ?? width, base, theme) >= size
        ? [r.lines.join(" ")]
        : r.lines,
    ),
    ok: pick.size >= floor - 0.5,
  };
}

/** The surname, for a list that has to fall back to shorter names. */
export function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : name.trim();
}

/**
 * Sizes one list row on its own, so a single long name never shrinks the rest of
 * the list. Wraps the long one onto two lines when the row is tall enough.
 */
export function rowFit(text: string, width: number, base: number, rowH: number, theme: Theme) {
  const one = fit(text, width, base, theme);
  const floor = Math.min(base, minText(theme) * 1.25);
  if (one >= floor || rowH < base * 1.5) return { lines: [text], size: one };
  const parts = splitTwo(text);
  if (parts.length < 2 || Math.min(...parts.map((p) => p.length)) < 3)
    return { lines: [text], size: one };
  const two = Math.min(base, rowH * 0.44, ...parts.map((p) => fit(p, width, base, theme)));
  return two > one * 1.1 ? { lines: parts, size: two } : { lines: [text], size: one };
}

export function Lines({ fitted, style }: { fitted: Fitted; style?: CSSProperties }) {
  return (
    <div style={{ fontSize: fitted.size, whiteSpace: "nowrap", ...style }}>
      {fitted.lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

/** A solid triangle, pointing up (came on) or down (went off). */
export function Arrow({ up, size, color }: { up: boolean; size: number; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 0,
        height: 0,
        flexShrink: 0,
        borderLeft: `${size * 0.5}px solid transparent`,
        borderRight: `${size * 0.5}px solid transparent`,
        [up ? "borderBottom" : "borderTop"]: `${size * 0.8}px solid ${color}`,
      }}
    />
  );
}

export function Roundel({
  size,
  bg,
  fg,
  border,
  children,
  style,
}: {
  size: number;
  bg: string;
  fg: string;
  border?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: bg,
        color: fg,
        border,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** "Sat 14 Nov · 15:00 · Vale Park Lane", leaving out what is not filled in. */
export function whenLine(team: Team, withVenue = true): string {
  const m = team.match;
  return [formatMatchDate(m.date), m.kickoff, withVenue ? m.venue : ""]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
}

export interface SubRow {
  id: string;
  minute: string;
  on: string;
  off: string;
}

/** Substitutions with at least one player picked; empty rows never print. */
export function subRows(team: Team, design: Design, max = 5): SubRow[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const label = (id: string | null) => {
    const p = id ? byId.get(id) : undefined;
    if (!p) return "";
    return `${design.showNumbers && p.number ? `${p.number} ` : ""}${displayName(p, design.nameStyle)}`;
  };
  return team.match.subs
    .map((s) => ({ id: s.id, minute: s.minute.trim(), on: label(s.onId), off: label(s.offId) }))
    .filter((s) => s.on || s.off)
    .slice(0, max);
}

/** "Substitution" for a single change when the headline is still the default. */
export function subsHeadline(design: Design, count: number): string {
  return count === 1 && design.headlines.subs === "Substitutions"
    ? "Substitution"
    : design.headlines.subs;
}

/** Rough height of a wrapped paragraph, for reserving space without measuring. */
export function paragraphHeight(text: string, width: number, size: number, theme: Theme) {
  if (!text) return 0;
  const perLine = Math.max(1, Math.floor(width / (size * theme.font.glyph * 1.02)));
  return Math.ceil(text.length / perLine) * size * 1.25;
}

/** The player of the match, split into a first line and the big surname. */
export function motmName(team: Team) {
  const player = team.players.find((p) => p.id === team.match.motmId);
  if (!player) return null;
  const parts = player.name.trim().split(/\s+/).filter(Boolean);
  const shirt = player.shirtName?.trim();
  return {
    player,
    first: shirt ? "" : parts.length > 1 ? parts.slice(0, -1).join(" ") : "",
    last: shirt || parts.at(-1) || "",
  };
}
