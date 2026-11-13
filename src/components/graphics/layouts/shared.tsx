import type { CSSProperties } from "react";
import { contrast } from "@/lib/color";
import { displayName, formatMatchDate, initials } from "@/lib/format";
import { matchScore, scorerLabel, spotlightGoal } from "@/lib/score";
import type { Design, Goal, Team } from "@/lib/types";
import { sides, type Side } from "../Fixture";
import { benchPlayers, placedStarters } from "../selection";
import { balance } from "../parts";
import { fit, minText, type Theme, legible } from "../theme";

export interface LayoutProps {
  team: Team;
  design: Design;
  theme: Theme;
}

export const fill: CSSProperties = { position: "absolute", inset: 0 };

/** The player cut-out, for layouts that paint over the shared backdrop. */
export function Cutout({
  design,
  theme,
  style,
}: {
  design: Design;
  theme: Theme;
  style?: CSSProperties;
}) {
  if (!design.featureImage) return null;
  return (
    <img
      src={design.featureImage}
      alt=""
      style={{
        position: "absolute",
        right: 0,
        bottom: -theme.bleedBottom,
        height: (theme.h + theme.bleedTop + theme.bleedBottom) * (theme.wide ? 1 : 0.74),
        width: theme.wide ? "52%" : "64%",
        objectFit: "contain",
        objectPosition: "right bottom",
        maskImage: "linear-gradient(90deg, transparent 0%, #000 22%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 22%)",
        ...style,
      }}
    />
  );
}

/** A full-bleed ground for layouts that paint over the shared backdrop, story safe area included. */
export function Ground({ theme, color }: { theme: Theme; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: -theme.bleedTop,
        bottom: -theme.bleedBottom,
        background: color,
      }}
    />
  );
}

/** The background photo cropped into a box, honouring the focal point and zoom. */
export function PhotoBox({ design, style }: { design: Design; style?: CSSProperties }) {
  const bg = design.background;
  if (!bg.image) return null;
  const zoom = Math.max(1, bg.zoom);
  return (
    <div style={{ position: "relative", overflow: "hidden", ...style }}>
      <img
        src={bg.image}
        alt=""
        style={{
          ...fill,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${bg.x}% ${bg.y}%`,
          transform: zoom > 1 ? `scale(${zoom})` : undefined,
          transformOrigin: `${bg.x}% ${bg.y}%`,
          filter: bg.mono ? "grayscale(1) contrast(1.08)" : undefined,
        }}
      />
    </div>
  );
}

export interface MatchFacts {
  home: Side;
  away: Side;
  /** Whether an opponent has been named; without one, layouts drop "v" and the away side. */
  versus: boolean;
  date: string;
  kickoff: string;
  venue: string;
  competition: string;
}

export function facts(team: Team, half = false): MatchFacts {
  const m = team.match;
  const [home, away] = sides(team, half);
  return {
    home,
    away,
    versus: !!m.opponent.trim(),
    date: formatMatchDate(m.date),
    kickoff: m.kickoff,
    venue: m.venue,
    competition: m.competition,
  };
}

/** A short name for tight spots: the club's own short name, else initials. */
export function shortOf(team: Team, side: Side): string {
  const typed = side.us ? team.shortName : team.match.opponentShort;
  if (typed.trim()) return typed.trim();
  return side.name.trim() ? initials(side.name) : "";
}

export interface ScorerLine {
  id: string;
  name: string;
  minute: string;
}

export function scorerLines(team: Team, design: Design, goals: Goal[]): ScorerLine[] {
  return goals.map((g) => ({
    id: g.id,
    name: scorerLabel(team, g, design.nameStyle),
    minute: g.minute.trim(),
  }));
}

export interface GoalFacts {
  scorer: string;
  minute: string;
  us: number;
  them: number;
  ours: boolean;
}

export function goalFacts(team: Team, design: Design): GoalFacts | null {
  const s = spotlightGoal(team);
  if (!s) return null;
  return {
    scorer: scorerLabel(team, s.goal, design.nameStyle),
    minute: s.goal.minute.trim(),
    us: s.us,
    them: s.them,
    ours: s.goal.side === "us",
  };
}

/** "Ashby Vale 1-0 Corrin Town" ordered home first; empty without an opponent. */
export function scoreLine(team: Team, us: number, them: number, short = false): string {
  const m = team.match;
  if (!m.opponent.trim()) return "";
  const ours = short ? team.shortName || initials(team.name) : team.name;
  const theirs = short ? m.opponentShort || initials(m.opponent) : m.opponent;
  return m.isHome ? `${ours} ${us}-${them} ${theirs}` : `${theirs} ${them}-${us} ${ours}`;
}

export function finalScore(team: Team, half = false) {
  const s = matchScore(team.match);
  return half ? { us: s.htUs, them: s.htThem } : { us: s.us, them: s.them };
}

export interface ListRow {
  id: string;
  number: string;
  name: string;
  captain: boolean;
}

export function starterRows(team: Team, design: Design): ListRow[] {
  return placedStarters(team)
    .filter((s) => s.player)
    .map((s) => ({
      id: s.player!.id,
      number: s.player!.number,
      name: displayName(s.player!, design.nameStyle),
      captain: design.showCaptain && team.lineup.captainId === s.player!.id,
    }));
}

export function benchNames(team: Team, design: Design): string[] {
  if (!design.showSubs) return [];
  return benchPlayers(team).map(
    (p) => `${design.showNumbers ? `${p.number} ` : ""}${displayName(p, design.nameStyle)}`,
  );
}

/** "vs Corrin Town" or "at Corrin Town"; empty without an opponent. */
export function versusLine(team: Team, short = false): string {
  const m = team.match;
  if (!m.opponent.trim()) return "";
  const name = short ? m.opponentShort.trim() || initials(m.opponent) : m.opponent;
  return `${m.isHome ? "vs" : "at"} ${name}`;
}

/** A club name set to fit: one or two lines, all of a pair at the same size. */
export interface NameFit {
  lines: string[][];
  size: number;
}

/**
 * Sizes a pair of club names (home and away) to one shared font size, so the
 * longer name never makes its club look like the minor side. Prefers the full
 * name on one line, then two balanced lines, then the short name.
 */
export function pairNames(
  names: { full: string; short: string }[],
  width: number,
  max: number,
  theme: Theme,
  maxLines = 2,
): NameFit {
  const live = names.map((n) => ({ full: n.full.trim(), short: n.short.trim() || n.full.trim() }));
  const good = max * 0.62;
  const sizeOf = (sets: string[][]) =>
    Math.min(max, ...sets.flat().map((line) => fit(line, width, max, theme)));

  const one = live.map((n) => [n.full]);
  const s1 = sizeOf(one);
  const shorts = live.map((n) => [n.short]);
  const sS = sizeOf(shorts);
  const floor = minText(theme) * 1.1;
  // Below the minimum text size, short names win: a readable "SBOB" beats a
  // full name nobody can read.
  const settle = (r: NameFit): NameFit =>
    r.size >= floor || sS <= r.size ? r : { lines: shorts, size: sS };
  if (s1 >= good) return { lines: one, size: s1 };
  if (maxLines >= 2) {
    // Two balanced lines, only for the names that need them.
    const two = live.map((n) =>
      fit(n.full, width, max, theme) >= good ? [n.full] : balance(n.full),
    );
    const s2 = sizeOf(two);
    if (s2 >= good * 0.85 || s2 * 1.3 >= sS) return settle({ lines: two, size: s2 });
  }
  return settle(s1 * 1.3 >= sS ? { lines: one, size: s1 } : { lines: shorts, size: sS });
}

/** Full and short name of each side, ready for `pairNames`. */
export function sideNames(team: Team, sides: Side[]): { full: string; short: string }[] {
  return sides.map((s) => ({ full: s.name, short: shortOf(team, s) }));
}

/** Renders the lines of one fitted name. */
export function NameLines({ lines, style }: { lines: string[]; style?: CSSProperties }) {
  return (
    <div style={{ whiteSpace: "nowrap", ...style }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

/**
 * The accent for text lit on a dark screen or board: the club accent, unless it
 * is a grey (black or white kits), which would read as unlit; then stadium amber.
 */
export function litAccent(theme: Theme, ground = "#06080b"): string {
  const c = theme.accent.replace("#", "");
  const rgb = [0, 2, 4].map((i) => Number.parseInt(c.slice(i, i + 2), 16) || 0);
  const grey = Math.max(...rgb) - Math.min(...rgb) < 48;
  return !grey && contrast(theme.accent, ground) >= 4 ? theme.accent : "#ffb627";
}

/**
 * Fits one line of caption text: the first option (e.g. with full club names) that
 * stays at least `minText` big, else the last option (e.g. short names) wrapped onto
 * up to two lines at the minimum size, so captions never shrink to micro text or
 * run off the edge.
 */
export function fitLine(
  options: string[],
  width: number,
  max: number,
  theme: Theme,
): { text: string; size: number; wrap: boolean } {
  const live = options.map((o) => o.trim()).filter(Boolean);
  const floor = Math.min(minText(theme), max);
  // An earlier (longer) option has to stay reasonably close to the intended size;
  // the last one only has to stay readable.
  for (const [i, text] of live.entries()) {
    const size = fit(text, width, max, theme);
    const need = i < live.length - 1 ? Math.max(floor, max * 0.7) : floor;
    if (size >= need) return { text, size, wrap: false };
  }
  return { text: live.at(-1) ?? "", size: floor, wrap: true };
}

/**
 * A caption fitted with `fitLine`: the first option that stays readable, else
 * the last one wrapped at the minimum size. Use for lines built from club names
 * (score lines, "vs …", venues) that can get arbitrarily long.
 */
export function FitText({
  options,
  width,
  max,
  theme,
  style,
}: {
  options: string[];
  width: number;
  max: number;
  theme: Theme;
  style?: CSSProperties;
}) {
  const line = fitLine(options, width, max, theme);
  if (!line.text) return null;
  return (
    <div
      style={{
        ...style,
        fontSize: legible(theme, line.size),
        whiteSpace: line.wrap ? "normal" : "nowrap",
        textWrap: line.wrap ? "balance" : undefined,
        overflowWrap: line.wrap ? "anywhere" : undefined,
      }}
    >
      {line.text}
    </div>
  );
}

/** Rough height of `text` set at `size` and wrapped to `width`, for budgeting space. */
export function textHeight(
  text: string,
  size: number,
  width: number,
  theme: Theme,
  leading = 1.2,
): number {
  if (!text.trim()) return 0;
  const perLine = Math.max(1, Math.floor(width / (size * theme.font.glyph * 1.05)));
  return Math.ceil(text.length / perLine) * size * leading;
}

/** Height of a Heading fitted to `width` (one line), for budgeting space. */
export function headingHeight(text: string, width: number, max: number, theme: Theme): number {
  return fit(text, width, max, theme) * 0.9 * theme.font.leading;
}

/** Splits a word at its middle-most hyphen ("Papadopoulos-" / "Wolverhampton"). */
function hyphenSplit(word: string): string[] {
  const cuts = [...word.matchAll(/-/g)].map((m) => m.index ?? 0);
  if (!cuts.length) return [word];
  const mid = cuts.reduce((a, b) =>
    Math.abs(b - word.length / 2) < Math.abs(a - word.length / 2) ? b : a,
  );
  return [word.slice(0, mid + 1), word.slice(mid + 1)];
}

/**
 * Fits a person's name into a box as big as it will go without cutting it: one
 * line, then two balanced lines, then the surname, then the surname split at its
 * hyphen. Every line shares one size, and the size never drops below `minText`.
 */
export function fitName(
  name: string,
  width: number,
  max: number,
  theme: Theme,
  maxLines = 2,
): { lines: string[]; size: number } {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return { lines: [], size: 0 };
  const words = clean.split(" ");
  const surname = words.at(-1) ?? clean;
  const candidates: string[][] = [[clean]];
  if (maxLines > 1) {
    if (words.length > 1) candidates.push(balance(clean));
    else candidates.push(hyphenSplit(clean));
  }
  if (words.length > 1) {
    candidates.push([surname]);
    if (maxLines > 1) candidates.push(hyphenSplit(surname));
  }
  const floor = Math.min(minText(theme), max);
  // Heavy capitals run wider than the average glyph; keep a margin.
  const sizeOf = (ls: string[]) => Math.min(max, ...ls.map((l) => fit(l, width * 0.9, max, theme)));
  const good = Math.max(floor, max * 0.45);
  for (const ls of candidates) if (sizeOf(ls) >= good) return { lines: ls, size: sizeOf(ls) };
  const best = candidates.reduce((a, b) => (sizeOf(b) > sizeOf(a) ? b : a));
  return { lines: best, size: Math.max(floor, sizeOf(best)) };
}

/** A name set with `fitName`: whole words only, one shared size, never cut. */
export function NameBlock({
  name,
  width,
  max,
  theme,
  maxLines = 2,
  style,
}: {
  name: string;
  width: number;
  max: number;
  theme: Theme;
  maxLines?: number;
  style?: CSSProperties;
}) {
  const { lines, size } = fitName(name, width, max, theme, maxLines);
  if (!lines.length) return null;
  return (
    <div
      style={{
        fontSize: legible(theme, size),
        fontWeight: theme.font.heavy,
        lineHeight: 0.92 * theme.font.leading,
        maxWidth: width,
        ...style,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {l}
        </div>
      ))}
    </div>
  );
}

export interface FittedRow {
  text: string;
  /** Horizontal condensing (scaleX) for the odd name that still doesn't fit. */
  squeeze: number;
  /** Estimated width before condensing, for pulling the next item back in. */
  width: number;
}

/**
 * One size for a whole list of names (a line-up, a key): set for the typical name,
 * not the longest, so one long name can't shrink the other ten. A name that doesn't
 * fit falls back to its surname, then is condensed (never below 60%), never cut.
 */
export function fitNameList(
  names: string[],
  width: number,
  max: number,
  theme: Theme,
): { size: number; rows: FittedRow[] } {
  const est = (t: string, size: number) => t.length * size * theme.font.glyph * 1.08;
  const sorted = [...names].sort((a, b) => a.length - b.length);
  const typical = sorted[Math.floor((sorted.length - 1) * 0.8)] ?? "";
  const floor = legible(theme, minText(theme));
  const size = Math.max(floor, Math.min(max, fit(typical, width * 0.92, max, theme)));
  const rows = names.map((full) => {
    const surname =
      full
        .trim()
        .split(/[\s.]+/)
        .at(-1) ?? full;
    const text = est(full, size) <= width ? full : surname;
    const w = est(text, size);
    return { text, squeeze: Math.max(0.6, Math.min(1, width / w)), width: w };
  });
  return { size, rows };
}

/** A name from `fitNameList`, condensed in place when it has to be. */
export function FittedName({ row, style }: { row: FittedRow; style?: CSSProperties }) {
  const squeezed = row.squeeze < 0.999;
  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        transform: squeezed ? `scaleX(${row.squeeze})` : undefined,
        transformOrigin: "left center",
        marginRight: squeezed ? -(1 - row.squeeze) * row.width : undefined,
        ...style,
      }}
    >
      {row.text}
    </span>
  );
}

/**
 * Scorer lines set as one list: one size for every line (both sides), the name in
 * full if every line fits, else surnames; a line that still doesn't fit wraps.
 */
export function fitScorers(
  sets: ScorerLine[][],
  width: number,
  max: number,
  theme: Theme,
): { size: number; sets: { id: string; text: string; minute: string }[][] } {
  const floor = legible(theme, 0);
  const label = (name: string, minute: string) => `${name}${minute ? ` ${minute}′` : ""}`;
  const sizeFor = (texts: string[]) =>
    Math.min(max, ...texts.map((t) => fit(t, width * 0.92, max, theme)));
  const full = sets.flat().map((l) => label(l.name, l.minute));
  const surnames = sets.flat().map((l) => label(l.name.split(/[\s.]+/).at(-1) ?? l.name, l.minute));
  const useFull = sizeFor(full) >= Math.max(floor, max * 0.75);
  const size = Math.max(floor, sizeFor(useFull ? full : surnames));
  return {
    size,
    sets: sets.map((ls) =>
      ls.map((l) => ({
        id: l.id,
        text: useFull ? l.name : (l.name.split(/[\s.]+/).at(-1) ?? l.name),
        minute: l.minute,
      })),
    ),
  };
}

/**
 * Type for a fixtures list: the opponent leads each row at one shared size (two
 * balanced lines rather than shrinking below a floor), the competition sits
 * smaller underneath, and only on rows with room for it.
 */
export function planFixtureRows(
  rows: { opponent: string; competition: string }[],
  oppW: number,
  rowH: number,
  theme: Theme,
) {
  const oppFloor = legible(theme, minText(theme) * 1.25);
  const oppMax = Math.max(oppFloor, rowH * 0.36);
  const oneLine = Math.min(oppMax, ...rows.map((f) => fit(f.opponent, oppW * 0.92, oppMax, theme)));
  const twoLine = Math.min(
    oppMax,
    ...rows.map((f) =>
      Math.min(...balance(f.opponent).map((l) => fit(l, oppW * 0.92, oppMax, theme))),
    ),
  );
  const two = oneLine < oppFloor && twoLine > oneLine;
  const oppSize = Math.max(oppFloor, two ? twoLine : oneLine);
  const compSize = legible(theme, Math.min(rowH * 0.15, oppSize * 0.62));
  const lines = (name: string) => (two && name.length > 14 ? balance(name) : [name]);
  const showComp = (f: { opponent: string; competition: string }) => {
    if (!f.competition.trim()) return false;
    const used = lines(f.opponent).length * oppSize * 0.95;
    const n = Math.round(textHeight(f.competition, compSize, oppW, theme, 1) / compSize);
    return used + n * compSize * 1.15 <= rowH * 0.88;
  };
  return { oppSize, compSize, lines, showComp };
}

/** Two letters for a player with no shirt number: "Dan Mbeki" → "DM". */
export function playerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words.at(-1)?.[0] ?? "")).toUpperCase();
}
