import type { ReactNode } from "react";
import { alpha, COAL, contrast, readableOn, SNOW, tonal } from "@/lib/color";
import { formatMatchDate } from "@/lib/format";
import { fixtureRows } from "../selection";
import type { Theme } from "../theme";
import {
  isLight,
  minText,
  motmName,
  on,
  Roundel,
  splitLines,
  subRows,
  subsHeadline,
  whenLine,
  fit,
  KitCrest,
  surnameOf,
} from "./kitShared";
import {
  benchNames,
  Cutout,
  facts,
  goalFacts,
  Ground,
  type LayoutProps,
  pairNames,
  scoreLine,
  scorerLines,
  shortOf,
  sideNames,
  starterRows,
  versusLine,
  finalScore,
} from "./shared";

/*
 * Sash: a poster built on the diagonal. The sash is the layout's axis and carries
 * the hero (teams and kick-off, the score, the scorer); the two triangles either
 * side hold the rest, each line as wide as the triangle allows at its height.
 * Nothing ever sits half on the band.
 */

interface Ink {
  ground: string;
  band: string;
  pin: string;
  onGround: string;
  softOnGround: string;
  accentOnGround: string;
  onBand: string;
  photo: boolean;
}

function inks(theme: Theme, photo: boolean): Ink {
  const { primary, secondary } = theme;
  const ground = photo ? COAL : primary;
  const band =
    contrast(secondary, primary) >= 1.6
      ? secondary
      : isLight(primary)
        ? COAL
        : tonal(primary, 0.45);
  const onGround = photo ? SNOW : readableOn(ground);
  return {
    ground,
    band,
    pin: alpha(onGround, 0.85),
    onGround,
    softOnGround: alpha(onGround, 0.78),
    accentOnGround: !photo && contrast(band, ground) >= 3 ? band : onGround,
    onBand: readableOn(band),
    photo,
  };
}

interface Geo {
  angle: number;
  sin: number;
  cos: number;
  T: number;
  cx: number;
  cy: number;
  L: number;
  /** Rightmost x a top-left line may reach when its bottom edge is at y. */
  tlMax: (y: number) => number;
  /** Leftmost x a bottom-right line may start at when its top edge is at y. */
  brMin: (y: number) => number;
}

function geometry(theme: Theme): Geo {
  const { w, h, u, wide } = theme;
  const angle = Math.atan(h / w) * 0.82;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const T = Math.min(w, h) * (wide ? 0.31 : 0.28);
  const cx = w / 2;
  const cy = h / 2;
  const gap = 30 * u;
  const halfX = (cx - (T / 2) * sin) / cos;
  const halfY = (cy - (T / 2) * cos) / sin;
  return {
    angle,
    sin,
    cos,
    T,
    cx,
    cy,
    L: 2 * (Math.min(halfX, halfY) - 34 * u),
    tlMax: (y) => cx + (-T / 2 - gap - (y - cy) * cos) / sin,
    brMin: (y) => cx + (T / 2 + gap - (y - cy) * cos) / sin,
  };
}

/** One line of type in a triangle. */
interface Item {
  text: string;
  max: number;
  color: string;
  heavy?: boolean;
  /** A coloured lead-in, e.g. a shirt number, printed before the text. */
  lead?: { text: string; color: string };
  /** Space after the line, as a fraction of its size. */
  after?: number;
  /** Allow a break onto two lines when one line would be too small. */
  wrap?: boolean;
  /** Keep mixed case (notes, quotes). */
  plain?: boolean;
  /** Shorter texts to fall back on, in order, before going below the minimum. */
  alts?: string[];
  /** Leave the line out when it can't be set at the minimum size. */
  optional?: boolean;
  /** Lines in one group (a line-up) share one size across both triangles. */
  group?: string;
  /** Stay smaller than a group: at most `ratio` of its size (a fixture's date line). */
  follow?: { group: string; ratio: number };
}

interface Placed {
  key: number;
  lines: string[];
  size: number;
  y: number;
  item: Item;
}

const LH = 1.02;

/**
 * Sets a column of lines into a triangle. Top-left lines hang from the top and
 * left edge; bottom-right lines stack up from the bottom against the right edge.
 * Each line takes the biggest size its row of the triangle allows.
 */
function setTriangle(items: Item[], corner: "tl" | "br", g: Geo, theme: Theme): Placed[] {
  const { w, h, pad } = theme;
  const floor = minText(theme);
  const out: Placed[] = [];
  const widthAt = (yTop: number, yBottom: number) =>
    corner === "tl" ? g.tlMax(yBottom) - pad : w - pad - g.brMin(yTop);
  const sizeFor = (text: string, n: number, y: number, max: number) => {
    let s = max;
    for (let i = 0; i < 4; i++) {
      const span = s * LH * n;
      const avail = corner === "tl" ? widthAt(y, y + span) : widthAt(y - span, y);
      s = Math.min(max, fit(text, Math.max(avail, 1), max, theme));
    }
    return s;
  };
  /** The best setting of one text: one line, or (when allowed) two or three. */
  const setText = (item: Item, text: string, y: number, max: number) => {
    const lead = item.lead ? item.lead.text + " " : "";
    let best = { lines: [text], size: sizeFor(lead + text, 1, y, max) };
    if (!item.wrap) return best;
    for (const n of [2, 3]) {
      if (best.size >= max * 0.75 && best.size >= floor) break;
      const parts = splitLines(text, n);
      if (parts.length < n || Math.min(...parts.map((p) => p.length)) < 3) continue;
      const longest = parts.reduce((a, b) => (b.length > a.length ? b : a));
      const size = sizeFor(lead + longest, n, y, max);
      if (size > best.size * 1.12) best = { lines: parts, size };
    }
    return best;
  };
  let y = corner === "tl" ? pad : h - pad;
  const order = corner === "tl" ? items : [...items].reverse();
  order.forEach((item, k) => {
    const max = Math.max(item.max, floor);
    let set = setText(item, item.text, y, max);
    for (const alt of item.alts ?? []) {
      if (set.size >= floor) break;
      const next = setText(item, alt, y, max);
      if (next.size > set.size) set = next;
    }
    if (set.size < floor) {
      if (item.optional) return;
      set = { ...set, size: floor };
    }
    const { lines, size } = set;
    const span = size * LH * lines.length;
    const top = corner === "tl" ? y : y - span;
    out.push({ key: corner === "tl" ? k : items.length - 1 - k, lines, size, y: top, item });
    const after = (item.after ?? 0.35) * size;
    y = corner === "tl" ? y + span + after : y - span - after;
  });
  return out;
}

/**
 * Places both triangles. Lines in a group (a line-up's names) are then evened out
 * to the smallest size any of them got, so the list reads as one block.
 */
function placeTriangles(design: LayoutProps["design"], theme: Theme, tl: Item[], br: Item[]) {
  const { h, u } = theme;
  const g = geometry(theme);
  const sponsorH = design.sponsorImage ? 70 * u : 0;
  const brTheme = { ...theme, h: h - sponsorH - (sponsorH ? 16 * u : 0) };
  let top = tl;
  let bottom = br;
  let placedTl = setTriangle(top, "tl", g, theme);
  let placedBr = setTriangle(bottom, "br", g, brTheme);
  for (let pass = 0; pass < 3; pass++) {
    const groups = new Map<string, number>();
    for (const p of [...placedTl, ...placedBr])
      if (p.item.group)
        groups.set(p.item.group, Math.min(groups.get(p.item.group) ?? Infinity, p.size));
    const uneven = [...placedTl, ...placedBr].some(
      (p) =>
        (p.item.group && p.size > (groups.get(p.item.group) ?? 0) + 0.5) ||
        (p.item.follow &&
          p.size > (groups.get(p.item.follow.group) ?? Infinity) * p.item.follow.ratio + 0.5),
    );
    if (!uneven) break;
    const even = (it: Item) =>
      it.group
        ? { ...it, max: Math.min(it.max, groups.get(it.group) ?? it.max) }
        : it.follow
          ? {
              ...it,
              max: Math.min(it.max, (groups.get(it.follow.group) ?? Infinity) * it.follow.ratio),
            }
          : it;
    top = top.map(even);
    bottom = bottom.map(even);
    placedTl = setTriangle(top, "tl", g, theme);
    placedBr = setTriangle(bottom, "br", g, brTheme);
  }
  return { placedTl, placedBr };
}

/** The smallest size the lines of a group end up at, once placed. */
function groupSize(
  design: LayoutProps["design"],
  theme: Theme,
  tl: Item[],
  br: Item[],
  group: string,
) {
  const { placedTl, placedBr } = placeTriangles(design, theme, tl, br);
  return Math.min(
    ...[...placedTl, ...placedBr].filter((p) => p.item.group === group).map((p) => p.size),
  );
}

function Triangle({
  placed,
  corner,
  theme,
}: {
  placed: Placed[];
  corner: "tl" | "br";
  theme: Theme;
}) {
  const { pad, w } = theme;
  return (
    <>
      {placed.map((p) => (
        <div
          key={`${corner}${p.key}`}
          style={{
            position: "absolute",
            top: p.y,
            ...(corner === "tl" ? { left: pad } : { right: pad }),
            maxWidth: w - 2 * pad,
            fontSize: p.size,
            lineHeight: LH,
            color: p.item.color,
            fontWeight: p.item.heavy ? theme.font.heavy : theme.font.light,
            textAlign: corner === "tl" ? "left" : "right",
            textTransform: p.item.plain ? "none" : undefined,
            whiteSpace: "nowrap",
          }}
        >
          {p.lines.map((l, i) => (
            <div key={i}>
              {i === 0 && p.item.lead && (
                <span style={{ color: p.item.lead.color }}>{p.item.lead.text} </span>
              )}
              {l}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function footerItems(design: LayoutProps["design"], theme: Theme, k: Ink): Item[] {
  return design.footer
    ? [{ text: design.footer, max: 34 * theme.u, color: k.onGround, heavy: true, plain: true }]
    : [];
}

function Poster({
  design,
  theme,
  band,
  tl,
  br,
}: LayoutProps & {
  /** Content along the band, laid out in a box `L` wide and `T` tall. */
  band: (L: number, T: number) => ReactNode;
  tl: Item[];
  br: Item[];
}) {
  const { w, h, u } = theme;
  const photo = !!design.background.image;
  const k = inks(theme, photo);
  const g = geometry(theme);
  const cut = !!design.featureImage;
  const deg = (-g.angle * 180) / Math.PI;
  const span = Math.hypot(w, h + theme.bleedTop + theme.bleedBottom) * 1.3;
  const pinGap = 14 * u;
  const pinW = 8 * u;

  // With a player cut-out in the bottom corner, its lines move up to the other triangle.
  const top = cut ? [...tl, ...br] : tl;
  const bottom = cut ? [] : br;
  const footer = footerItems(design, theme, k);
  const sponsorH = design.sponsorImage ? 70 * u : 0;
  const { placedTl, placedBr } = placeTriangles(
    design,
    theme,
    cut ? [...top, ...footer] : top,
    cut ? [] : [...bottom, ...footer],
  );

  const bandBox = {
    position: "absolute" as const,
    left: g.cx - span / 2,
    top: g.cy,
    width: span,
    height: 0,
    transform: `rotate(${deg}deg)`,
    transformOrigin: "center",
  };

  return (
    <>
      {!photo && <Ground theme={theme} color={k.ground} />}
      {photo && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -theme.bleedTop,
            bottom: -theme.bleedBottom,
            background: alpha(COAL, 0.5),
          }}
        />
      )}
      {cut && <Cutout design={design} theme={theme} />}
      {/* The sash, with a pinline either side, running past the frame. */}
      <div style={bandBox}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -g.T / 2 - pinGap - pinW,
            height: g.T + 2 * (pinGap + pinW),
            borderTop: `${pinW}px solid ${k.pin}`,
            borderBottom: `${pinW}px solid ${k.pin}`,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -g.T / 2,
            height: g.T,
            background: k.band,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: g.cx - g.L / 2,
          top: g.cy - g.T / 2,
          width: g.L,
          height: g.T,
          transform: `rotate(${deg}deg)`,
          transformOrigin: "center",
          color: k.onBand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {band(g.L, g.T)}
      </div>
      <Triangle placed={placedTl} corner="tl" theme={theme} />
      <Triangle placed={placedBr} corner="br" theme={theme} />
      {design.sponsorImage && (
        <img
          src={design.sponsorImage}
          alt=""
          style={{
            position: "absolute",
            right: theme.pad,
            bottom: theme.pad,
            height: sponsorH,
            maxWidth: 260 * u,
            objectFit: "contain",
            objectPosition: "right bottom",
          }}
        />
      )}
    </>
  );
}

/* ---------- Band contents ---------- */

/** Crest, name, the big middle (time or score), name, crest, along the band. */
function VersusBand({
  team,
  theme,
  ink,
  half,
  middle,
  L,
  T,
}: {
  team: LayoutProps["team"];
  theme: Theme;
  ink: Ink;
  half?: boolean;
  middle: string;
  L: number;
  T: number;
}) {
  const f = facts(team, half);
  const { u } = theme;
  const c = T * 0.46;
  const gap = 22 * u;
  const mid = middle ? Math.min(T * 0.56, fit(middle, L * 0.22, T * 0.56, theme)) : 0;
  // Digits and the colon run wider than the average glyph.
  const midW = middle ? mid * middle.length * theme.font.glyph * 1.3 : 0;
  const list = f.versus ? [f.home, f.away] : [team.match.isHome ? f.home : f.away];
  const nameW = f.versus ? (L - 2 * c - midW - 6 * gap) / 2 : L - c - midW - 4 * gap;
  const names = pairNames(sideNames(team, list), nameW, T * 0.28, theme);
  const crest = (i: number) => (
    <KitCrest
      src={list[i].crest}
      kind={list[i].us ? team.crestKind : undefined}
      name={list[i].name}
      colors={list[i].colors}
      size={c}
      theme={on(theme, ink.band)}
    />
  );
  const name = (i: number, align: "left" | "right") => (
    <div
      style={{
        width: nameW,
        fontSize: names.size,
        fontWeight: theme.font.heavy,
        lineHeight: 0.92,
        textAlign: align,
        whiteSpace: "nowrap",
      }}
    >
      {names.lines[i].map((l, j) => (
        <div key={j}>{l}</div>
      ))}
    </div>
  );
  const middleEl = middle ? (
    <div
      style={{
        fontSize: mid,
        fontWeight: theme.font.heavy,
        lineHeight: 0.9,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {middle}
    </div>
  ) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      {crest(0)}
      {name(0, f.versus ? "right" : "left")}
      {middleEl}
      {f.versus && name(1, "left")}
      {f.versus && crest(1)}
    </div>
  );
}

/** A headline (with an optional second line) set along the band behind a crest. */
function TitleBand({
  team,
  theme,
  ink,
  title,
  sub,
  L,
  T,
}: {
  team: LayoutProps["team"];
  theme: Theme;
  ink: Ink;
  title: string;
  sub?: string;
  L: number;
  T: number;
}) {
  const { u } = theme;
  const c = T * 0.62;
  const textW = L - c - 40 * u;
  const subSize = sub ? Math.max(minText(theme), fit(sub, textW, T * 0.15, theme)) : 0;
  const size = fit(title, textW, T * (sub ? 0.56 : 0.66), theme);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 * u }}>
      <KitCrest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={c}
        theme={on(theme, ink.band)}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: T * 0.04 }}>
        <div
          style={{
            fontSize: size,
            fontWeight: theme.font.heavy,
            lineHeight: 0.88,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {sub && <div style={{ fontSize: subSize, whiteSpace: "nowrap", opacity: 0.86 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Layouts ---------- */

export function PosterFixture(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const f = facts(team);
  const tl: Item[] = [
    {
      text: design.headlines.fixture,
      max: (tall ? 230 : 190) * u,
      color: k.onGround,
      heavy: true,
      wrap: true,
      after: 0.12,
    },
  ];
  if (f.competition)
    tl.push({
      text: f.competition,
      max: 40 * u,
      color: k.accentOnGround,
      heavy: true,
      wrap: true,
      optional: true,
    });
  const br: Item[] = [];
  if (f.date) br.push({ text: f.date, max: 64 * u, color: k.onGround, heavy: true });
  if (f.venue)
    br.push({ text: f.venue, max: 38 * u, color: k.softOnGround, wrap: true, optional: true });
  return (
    <Poster
      {...props}
      tl={tl}
      br={br}
      band={(L, T) => (
        <VersusBand team={team} theme={theme} ink={k} middle={f.kickoff} L={L} T={T} />
      )}
    />
  );
}

export function PosterResult(props: LayoutProps & { half?: boolean }) {
  const { team, design, theme, half = false } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const f = facts(team, half);
  const sideList = f.versus ? [f.home, f.away] : [team.match.isHome ? f.home : f.away];
  const tl: Item[] = [
    {
      text: half ? design.headlines.halftime : design.headlines.result,
      max: (tall ? 230 : 190) * u,
      color: k.onGround,
      heavy: true,
      wrap: true,
      after: 0.12,
    },
  ];
  if (f.competition)
    tl.push({
      text: f.competition,
      max: 40 * u,
      color: k.accentOnGround,
      heavy: true,
      wrap: true,
      optional: true,
    });
  // Scorers read as one list at one size; long names switch to surnames together.
  const scorers = (short: boolean): Item[] => {
    const out: Item[] = [];
    for (const s of sideList) {
      const goals = scorerLines(team, design, s.goals);
      if (!goals.length) continue;
      out.push({
        text: shortOf(team, s),
        max: 34 * u,
        color: k.accentOnGround,
        heavy: true,
        after: 0.1,
      });
      for (const g of goals)
        out.push({
          text: `${short ? surnameOf(g.name) : g.name}${g.minute ? ` ${g.minute}'` : ""}`,
          max: 42 * u,
          color: k.onGround,
          heavy: true,
          after: 0.12,
          group: "scorers",
        });
    }
    return out;
  };
  const full = scorers(false);
  const shortList = scorers(true);
  const sizeOf = (list: Item[]) =>
    list.some((i) => i.group) ? groupSize(design, theme, tl, list, "scorers") : Infinity;
  const br: Item[] =
    sizeOf(full) >= Math.max(minText(theme) * 1.3, 42 * u * 0.75) ||
    sizeOf(shortList) <= sizeOf(full)
      ? full
      : shortList;
  const when = [f.date, f.venue].filter(Boolean).join(" · ");
  if (when)
    br.push({
      text: when,
      alts: [f.date],
      max: 30 * u,
      color: k.softOnGround,
      wrap: true,
      optional: true,
    });
  const score = f.versus ? `${f.home.score}-${f.away.score}` : String(sideList[0].score);
  return (
    <Poster
      {...props}
      tl={tl}
      br={br}
      band={(L, T) => (
        <VersusBand team={team} theme={theme} ink={k} half={half} middle={score} L={L} T={T} />
      )}
    />
  );
}

export function PosterGoal(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const g = goalFacts(team, design);
  const tl: Item[] = [
    {
      text: design.headlines.goal,
      max: (tall ? 300 : 250) * u,
      color: k.onGround,
      heavy: true,
      wrap: true,
    },
  ];
  const br: Item[] = [];
  if (g) {
    const full = scoreLine(team, g.us, g.them);
    const short = scoreLine(team, g.us, g.them, true);
    if (full) {
      br.push({ text: full, max: 52 * u, color: k.onGround, heavy: true, wrap: true });
      // When the full line ends up small, the short one reads better.
      if (fit(full, theme.w * 0.45, 52 * u, theme) < minText(theme) * 1.3) br[0].text = short;
    }
  }
  const when = whenLine(team);
  if (when)
    br.push({
      text: when,
      alts: [whenLine(team, false)],
      max: 28 * u,
      color: k.softOnGround,
      wrap: true,
      optional: true,
    });
  return (
    <Poster
      {...props}
      tl={tl}
      br={br}
      band={(L, T) => {
        if (!g)
          return <TitleBand team={team} theme={theme} ink={k} title={team.name} L={L} T={T} />;
        const minute = g.minute ? `${g.minute}'` : "";
        const r = T * 0.7;
        const textW = L - (minute ? r + 36 * u : 0);
        const size = Math.min(T * 0.62, fit(g.scorer, textW, T * 0.62, theme));
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 36 * u }}>
            {minute && (
              <Roundel
                size={r}
                bg={k.onBand}
                fg={k.band}
                style={{ fontSize: r * 0.4, fontWeight: theme.font.heavy }}
              >
                {minute}
              </Roundel>
            )}
            <div style={{ fontSize: size, fontWeight: theme.font.heavy, whiteSpace: "nowrap" }}>
              {g.scorer}
            </div>
          </div>
        );
      }}
    />
  );
}

export function PosterLineup(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const rows = starterRows(team, design);
  const half = Math.ceil(rows.length / 2);
  const base = (tall ? 70 : 58) * u;
  // Every name in the line-up is one size and one line; when the full names would
  // make that size small, the whole list switches to surnames.
  const items = (short: boolean) =>
    rows.map((r): Item => ({
      text: `${short ? surnameOf(r.name) : r.name}${r.captain ? " (C)" : ""}`,
      lead:
        design.showNumbers && r.number ? { text: r.number, color: k.accentOnGround } : undefined,
      max: base,
      color: k.onGround,
      heavy: true,
      after: 0.28,
      group: "xi",
    }));
  const bench = benchNames(team, design);
  const benchItems: Item[] = [];
  for (let i = 0; i < bench.length; i += 2)
    benchItems.push({
      text: bench.slice(i, i + 2).join(", "),
      max: 34 * u,
      color: k.softOnGround,
      after: 0.15,
      wrap: true,
      lead: i === 0 ? { text: "Subs", color: k.accentOnGround } : undefined,
    });
  const footer = footerItems(design, theme, k);
  const cut = !!design.featureImage;
  const sizeWith = (list: Item[]) => {
    const tl = list.slice(0, half);
    const br = [...list.slice(half), ...benchItems];
    return groupSize(
      design,
      theme,
      cut ? [...tl, ...br, ...footer] : tl,
      cut ? [] : [...br, ...footer],
      "xi",
    );
  };
  const full = items(false);
  const short = items(true);
  const good = Math.max(minText(theme) * 1.3, base * 0.6);
  const names = sizeWith(full) >= good || sizeWith(short) <= sizeWith(full) ? full : short;
  return (
    <Poster
      {...props}
      tl={names.slice(0, half)}
      br={[...names.slice(half), ...benchItems]}
      band={(L, T) => (
        <TitleBand
          team={team}
          theme={theme}
          ink={k}
          title={design.headlines.lineup}
          sub={versusLine(team)}
          L={L}
          T={T}
        />
      )}
    />
  );
}

export function PosterSubs(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const rows = subRows(team, design);
  const toItems = (s: (typeof rows)[number]): Item[] => [
    ...(s.on
      ? [
          {
            text: s.on,
            lead: s.minute ? { text: `${s.minute}'`, color: k.accentOnGround } : undefined,
            max: (tall ? 96 : 84) * u,
            color: k.onGround,
            heavy: true,
            wrap: true,
            after: 0.08,
          },
        ]
      : []),
    ...(s.off
      ? [
          {
            text: s.off,
            lead: { text: s.on ? "for" : "off", color: k.softOnGround },
            max: (tall ? 54 : 46) * u,
            color: k.softOnGround,
            after: 0.7,
          },
        ]
      : []),
  ];
  const half = Math.ceil(rows.length / 2);
  return (
    <Poster
      {...props}
      tl={rows.slice(0, half).flatMap(toItems)}
      br={rows.slice(half).flatMap(toItems)}
      band={(L, T) => (
        <TitleBand
          team={team}
          theme={theme}
          ink={k}
          title={subsHeadline(design, rows.length)}
          sub={versusLine(team)}
          L={L}
          T={T}
        />
      )}
    />
  );
}

export function PosterMotm(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const who = motmName(team);
  const s = finalScore(team);
  const tl: Item[] = [
    {
      text: design.headlines.motm,
      max: (tall ? 170 : 140) * u,
      color: k.onGround,
      heavy: true,
      wrap: true,
    },
  ];
  const br: Item[] = [];
  const note = team.match.motmNote.trim();
  if (note) br.push({ text: note, max: 40 * u, color: k.onGround, wrap: true, plain: true });
  const full = scoreLine(team, s.us, s.them);
  if (full) {
    const short = scoreLine(team, s.us, s.them, true);
    const useShort = fit(full, theme.w * 0.45, 40 * u, theme) < minText(theme) * 1.3;
    br.push({
      text: useShort ? short : full,
      max: 40 * u,
      color: k.accentOnGround,
      heavy: true,
      wrap: true,
    });
  }
  return (
    <Poster
      {...props}
      tl={tl}
      br={br}
      band={(L, T) => {
        if (!who)
          return <TitleBand team={team} theme={theme} ink={k} title={team.name} L={L} T={T} />;
        const r = T * 0.74;
        const textW = L - (who.player.number ? r + 40 * u : 0);
        const firstSize = who.first
          ? Math.max(minText(theme), fit(who.first, textW, T * 0.16, theme))
          : 0;
        const lastSize = fit(who.last, textW, T * (who.first ? 0.52 : 0.62), theme);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 40 * u }}>
            {who.player.number && (
              <Roundel
                size={r}
                bg={k.onBand}
                fg={k.band}
                style={{ fontSize: r * 0.5, fontWeight: theme.font.heavy }}
              >
                <span data-check-slot="number">{who.player.number}</span>
              </Roundel>
            )}
            <div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap" }}>
              {who.first && <div style={{ fontSize: firstSize, opacity: 0.88 }}>{who.first}</div>}
              <div style={{ fontSize: lastSize, fontWeight: theme.font.heavy, lineHeight: 0.9 }}>
                {who.last}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}

export function PosterFixtures(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme, !!design.background.image);
  const { u, tall } = theme;
  const rows = fixtureRows(team).slice(0, tall ? 8 : 6);
  // Each opponent leads its row (its own group of one); the date line stays under it in size.
  const toItems =
    (withComp: boolean) =>
    (f: (typeof rows)[number], i: number): Item[] => [
      {
        text: [formatMatchDate(f.date), f.isHome ? "Home" : "Away", withComp ? f.competition : ""]
          .filter(Boolean)
          .join(" · "),
        alts: [[formatMatchDate(f.date), f.isHome ? "Home" : "Away"].join(" · ")],
        max: 32 * u,
        color: k.softOnGround,
        after: 0.15,
        wrap: true,
        follow: { group: `fx${i}`, ratio: 0.62 },
      },
      {
        text: f.opponent,
        lead: { text: f.score.trim() || f.kickoff, color: k.accentOnGround },
        max: (tall ? 80 : 70) * u,
        color: k.onGround,
        heavy: true,
        wrap: true,
        after: 0.55,
        group: `fx${i}`,
      },
    ];
  const half = Math.ceil(rows.length / 2);
  const split = (withComp: boolean) => {
    const items = rows.map(toItems(withComp));
    return { tl: items.slice(0, half).flat(), br: items.slice(half).flat() };
  };
  // The competition goes when it would make the opponents (the point of the list) small.
  const withComp = split(true);
  const noComp = split(false);
  const sizeOf = (v: { tl: Item[]; br: Item[] }) =>
    Math.min(
      ...rows.map((_, i) =>
        groupSize(design, theme, v.tl, [...v.br, ...footerItems(design, theme, k)], `fx${i}`),
      ),
    );
  const pick =
    sizeOf(withComp) >= Math.max(minText(theme) * 1.5, 70 * u * 0.6) ||
    sizeOf(noComp) <= sizeOf(withComp) * 1.05
      ? withComp
      : noComp;
  return (
    <Poster
      {...props}
      tl={pick.tl}
      br={pick.br}
      band={(L, T) => (
        <TitleBand
          team={team}
          theme={theme}
          ink={k}
          title={design.headlines.fixtures}
          sub={team.name}
          L={L}
          T={T}
        />
      )}
    />
  );
}
