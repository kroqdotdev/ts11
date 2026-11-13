/**
 * "Floodlit": the stadium scoreboard is the hero. Scores, kick-off times and the
 * team sheet are lit up on a dot-matrix board in a heavy housing.
 */
import type { ReactNode } from "react";
import { alpha, contrast, luminance, mix } from "@/lib/color";
import type { Colors } from "@/lib/types";
import { SubsLine } from "../LineupList";
import { balance, Crest, Footer, Heading, MatchMeta } from "../parts";
import { fit, minText, type Theme, legible } from "../theme";
import { GLYPH_H as GLYPH_ROWS } from "@/lib/lofi/font";
import { displayName, formatMatchDate } from "@/lib/format";
import { placedStarters } from "../selection";
import { LedCanvas, LedRow, ledClip, ledScale, ledWidth, type LedPart } from "./Led";
import {
  benchNames,
  facts,
  finalScore,
  FitText,
  fitName,
  goalFacts,
  headingHeight,
  NameBlock,
  textHeight,
  litAccent,
  playerInitials,
  scoreLine,
  scorerLines,
  shortOf,
  starterRows,
  type LayoutProps,
} from "./shared";
import { fixtureRows } from "../selection";

export const BOARD = "#06080b";
export const WHITE = "#fff1d6";
export const DIM = "rgba(255,255,255,0.07)";
const DIM_WHITE = "rgba(255,241,214,0.5)";

/** Lit colour for scores and labels: the club accent when it glows, else stadium amber. */
export function amber(theme: Theme): string {
  return litAccent(theme, BOARD);
}

/** The kit colour that shows up best as lit dots on a black board. */
function chip(colors: Colors): string {
  const c =
    luminance(colors.primary) > luminance(colors.secondary) ? colors.primary : colors.secondary;
  return contrast(c, BOARD) < 2.2 ? mix(c, "#ffffff", 0.35) : c;
}

/**
 * Floodlights: warm light falling from the top corners, so the look stays lit
 * even when the club colour is near black and the backdrop glow disappears.
 */
export function NightLights({ theme }: { theme: Theme }) {
  const { w, h, u } = theme;
  const full = h + theme.bleedTop + theme.bleedBottom;
  const dark = luminance(theme.primary) < 0.05;
  const a = dark ? 0.24 : 0.12;
  const warm = (k: number) => `rgba(255, 236, 196, ${k})`;
  const lamp = (side: "left" | "right") => (
    <div
      key={side}
      style={{
        position: "absolute",
        top: -theme.bleedTop + 22 * u,
        [side]: 22 * u,
        display: "grid",
        gridTemplateColumns: `repeat(4, ${10 * u}px)`,
        gap: 4 * u,
      }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          style={{
            width: 10 * u,
            height: 10 * u,
            background: "#fff6dc",
            boxShadow: `0 0 ${14 * u}px ${warm(0.9)}`,
          }}
        />
      ))}
    </div>
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -theme.bleedTop,
          height: full,
          pointerEvents: "none",
          background: [
            `radial-gradient(${w * 0.7}px ${full * 0.55}px at 4% 0%, ${warm(a)} 0%, ${warm(0)} 70%)`,
            `radial-gradient(${w * 0.7}px ${full * 0.55}px at 96% 0%, ${warm(a)} 0%, ${warm(0)} 70%)`,
            `radial-gradient(${w * 1.1}px ${full * 0.4}px at 50% -6%, ${warm(a * 0.6)} 0%, ${warm(0)} 70%)`,
          ].join(", "),
        }}
      />
      {lamp("left")}
      {lamp("right")}
    </>
  );
}

/** Where content goes: one column, or (wide, no cut-out) an info column beside the board. */
function frame(theme: Theme, design: LayoutProps["design"]) {
  const { w, pad, wide } = theme;
  const split = wide && !design.featureImage;
  const right = design.featureImage ? (wide ? w * 0.5 : w * 0.62) : theme.right;
  return {
    split,
    info: { left: pad, width: split ? w * 0.36 : right - pad },
    board: { left: split ? w * 0.42 : pad, width: split ? w * 0.58 - pad : right - pad },
  };
}

/** The scoreboard housing: a heavy frame with a club-colour cap and a pair of struts. */
export function Housing({
  theme,
  pitch,
  children,
}: {
  theme: Theme;
  pitch: number;
  children: ReactNode;
}) {
  const { u, primary, secondary } = theme;
  const edge = mix(primary, "#0b0e12", 0.6);
  // A near-black club would cast no glow; light the board warm instead.
  const halo = luminance(primary) < 0.04 ? "#ffcf6e" : primary;
  const cap = contrast(secondary, BOARD) >= 1.5 ? secondary : mix(halo, "#ffffff", 0.2);
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          background: BOARD,
          border: `${Math.round(10 * u)}px solid ${edge}`,
          borderTop: `${Math.round(16 * u)}px solid ${cap}`,
          padding: pitch,
          boxShadow: `0 0 0 ${Math.round(3 * u)}px ${alpha("#000000", 0.6)}, 0 ${40 * u}px ${90 * u}px ${alpha("#000000", 0.55)}, 0 0 ${120 * u}px ${alpha(halo, 0.35)}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
      {/* Bolts in the corners of the cap. */}
      {[0.03, 0.97].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            top: 4 * u,
            left: `calc(${x * 100}% - ${4 * u}px)`,
            width: 8 * u,
            height: 8 * u,
            borderRadius: 8 * u,
            background: alpha("#000000", 0.35),
          }}
        />
      ))}
    </div>
  );
}

/**
 * Sizes the dots so the widest row (`needed` dots) spans the board, but never
 * past `maxPitch`px a dot. Returns the dot pitch and the board's width in dots.
 */
function fitBoard(width: number, theme: Theme, needed: number, maxPitch: number) {
  const frame = Math.round(10 * theme.u) * 2;
  const pitch = Math.max(3, Math.min(maxPitch, (width - frame) / (needed + 2)));
  return { pitch, cols: Math.floor((width - frame) / pitch) - 2 };
}

/** Dots taken by a team row: pad, colour chip, gap, name, and the score if any. */
function teamNeed(name: string, score: string | null) {
  return 1 + 3 + 4 + ledWidth(name) + (score ? 6 + ledWidth(score, 2) : 0) + 1;
}

function Blank({ cols, pitch }: { cols: number; pitch: number }) {
  return <LedRow parts={[]} cols={cols} pitch={pitch} padY={0} scale={1} dim={DIM} />;
}

/** One team on the board: colour chip, name, and optionally a score at the right. */
function teamParts(
  full: string,
  colors: Colors,
  cols: number,
  score: string | null,
  theme: Theme,
  short = "",
): { parts: LedPart[]; scale: number } {
  const scoreW = score ? ledWidth(score, 2) + 6 : 0;
  const room = cols - 2 - 3 - 4 - scoreW;
  // A name too long for the board is shown by its short name, not cut off.
  const name = ledWidth(full) > room && short ? short : full;
  const scale = ledScale(name, room, 2);
  const parts: LedPart[] = [
    { block: 3, color: chip(colors), scale: 1 },
    { text: ledClip(name, room, scale), color: WHITE, scale },
  ];
  if (score !== null) parts.push({ text: score, color: amber(theme), scale: 2 });
  return { parts, scale };
}

function InfoColumn({
  theme,
  left,
  width,
  children,
}: {
  theme: Theme;
  left: number;
  width: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        width,
        top: theme.pad,
        bottom: theme.pad,
        display: "flex",
        flexDirection: "column",
        gap: 22 * theme.u,
      }}
    >
      {children}
    </div>
  );
}

function Competition({ text, theme }: { text: string; theme: Theme }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontSize: legible(theme, 32 * theme.u),
        color: theme.accent,
        fontWeight: theme.font.heavy,
      }}
    >
      {text}
    </div>
  );
}

/* ---------------------------------------------------------------- Matchday */

export function NightFixture({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const f = facts(team);
  const box = frame(theme, design);
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    Math.max(
      Math.min(teamNeed(f.home.name, null), 96),
      f.versus ? Math.min(teamNeed(f.away.name, null), 96) : 0,
      ledWidth("KO") + 4 + ledWidth(f.kickoff, 2) + 2,
      ledWidth(f.date) + 2,
      54,
    ),
    Math.min(15 * u, (h - pad * 2 - fixtureReserve()) / (f.versus ? 62 : 42)),
  );
  // Everything above and below the board in one column: headline, competition, venue, footer.
  function fixtureReserve() {
    if (box.split) return 60 * u;
    const w = box.info.width;
    return (
      headingHeight(design.headlines.fixture, w, 200 * u, theme) +
      textHeight(f.competition, legible(theme, 32 * u), w, theme) +
      textHeight(f.venue, legible(theme, 34 * u), w, theme) +
      (design.footer ? legible(theme, 30 * u) * 1.4 : 0) +
      22 * u * 4 +
      70 * u
    );
  }
  const home = teamParts(f.home.name, f.home.colors, cols, null, theme, shortOf(team, f.home));
  const away = teamParts(f.away.name, f.away.colors, cols, null, theme, shortOf(team, f.away));

  const board = (
    <Housing theme={theme} pitch={pitch}>
      <LedRow parts={home.parts} cols={cols} pitch={pitch} scale={home.scale} padY={2} dim={DIM} />
      {f.versus && (
        <>
          <LedRow
            parts={[{ text: "V", color: amber(theme) }]}
            cols={cols}
            pitch={pitch}
            align="left"
            padX={2}
            dim={DIM}
          />
          <LedRow
            parts={away.parts}
            cols={cols}
            pitch={pitch}
            scale={away.scale}
            padY={2}
            dim={DIM}
          />
        </>
      )}
      <Blank cols={cols} pitch={pitch} />
      {f.kickoff && (
        <LedRow
          parts={[
            { text: "KO", color: alpha(WHITE, 0.6) },
            { text: f.kickoff, color: amber(theme), scale: 2 },
          ]}
          cols={cols}
          pitch={pitch}
          padY={1}
          dim={DIM}
        />
      )}
      <LedRow
        parts={[{ text: ledClip(f.date, cols - 2), color: WHITE }]}
        cols={cols}
        pitch={pitch}
        padY={1}
        dim={DIM}
      />
    </Housing>
  );

  const head = (
    <>
      <Heading
        text={design.headlines.fixture}
        width={box.info.width}
        max={(box.split ? 170 : 200) * u}
        theme={theme}
      />
      <Competition text={f.competition} theme={theme} />
    </>
  );
  const venue = f.venue && (
    <div
      style={{ fontSize: legible(theme, 34 * u), color: theme.muted, fontWeight: theme.font.heavy }}
    >
      {f.venue}
    </div>
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          {head}
          <div style={{ flex: 1 }} />
          {venue}
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {board}
        </div>
      </>
    );
  }
  return (
    <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
      {head}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{board}</div>
      {venue}
      <Footer theme={theme} design={design} />
    </InfoColumn>
  );
}

/* ---------------------------------------------------------------- Full time / Half time */

export function NightResult({
  team,
  design,
  theme,
  half = false,
}: LayoutProps & { half?: boolean }) {
  const { u, pad, h } = theme;
  const f = facts(team, half);
  const box = frame(theme, design);
  const s = finalScore(team, half);
  const homeScore = String(f.home.us ? s.us : s.them);
  const awayScore = String(f.home.us ? s.them : s.us);
  const score = f.versus ? `${homeScore}-${awayScore}` : homeScore;
  const label = half ? "HALF TIME" : "FULL TIME";

  // Team names share one row under the score, home left and away right; long
  // names give way to the short names so neither gets cut.
  const namesNeed = (a: string, b: string) =>
    2 + 7 + ledWidth(a) + (f.versus ? 8 + ledWidth(b) + 7 : 0);
  const fullNeed = namesNeed(f.home.name, f.away.name);
  const cols0 = Math.max(64, ledWidth(label) + 2, Math.min(fullNeed, 110));
  const useShort = fullNeed > cols0;
  const homeName = useShort ? shortOf(team, f.home) : f.home.name;
  const awayName = useShort ? shortOf(team, f.away) : f.away.name;
  const scale = ledScale(score, Math.floor(cols0 * 0.66), 8);
  const dotsTall = 9 + 4 + GLYPH_ROWS * scale + 4 + 9 + 4;

  // Scorers: one size for every line (the longest has to fit its column), wrapping
  // at the minimum size rather than shrinking to micro text.
  const sideList = f.versus ? [f.home, f.away] : [f.home];
  const scorerSets = sideList.map((side) => scorerLines(team, design, side.goals));
  const colW =
    ((box.split ? box.board.width : box.info.width) - (f.versus ? 40 * u : 0)) / sideList.length;
  const longestScorer = scorerSets
    .flat()
    .map((l) => `${l.name} ${l.minute}'`)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
  const scorerMax = (box.split ? 30 : theme.tall ? 36 : 32) * u;
  const scorerSize = legible(
    theme,
    Math.min(scorerMax, fit(longestScorer, colW, scorerMax, theme)),
  );
  const scorerWrap = fit(longestScorer, colW, scorerMax, theme) < scorerSize - 0.5;
  const scorerH = Math.max(
    0,
    ...scorerSets.map((ls) =>
      ls.reduce(
        (sum, l) =>
          sum + textHeight(`${l.name} ${l.minute}'`, scorerSize, colW, theme, 1.15) + 8 * u,
        0,
      ),
    ),
  );
  const metaH = legible(theme, 26 * u) * 2.8;
  const footH = design.footer ? legible(theme, 30 * u) * 1.4 : 0;
  const availH = box.split
    ? h - pad * 2 - scorerH - 36 * u - 40 * u
    : h -
      pad * 2 -
      headingHeight(
        half ? design.headlines.halftime : design.headlines.result,
        box.info.width,
        (theme.tall ? 200 : 170) * u,
        theme,
      ) -
      scorerH -
      metaH -
      footH -
      22 * u * 4 -
      40 * u -
      60 * u;
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    cols0,
    Math.min(15 * u, availH / dotsTall),
  );
  // The competition rides along the top row only when it fits beside the label.
  const ticker = ledWidth(label) + 6 + ledWidth(f.competition) + 2 <= cols ? f.competition : "";
  const nameParts: LedPart[] = [
    { block: 3, color: chip(f.home.colors), scale: 1 },
    { text: ledClip(homeName, cols - 12), color: WHITE },
  ];
  if (f.versus)
    nameParts.push(
      { text: ledClip(awayName, cols - 12 - ledWidth(homeName)), color: WHITE },
      { block: 3, color: chip(f.away.colors), scale: 1 },
    );

  const board = (
    <Housing theme={theme} pitch={pitch}>
      <LedRow
        parts={[
          { text: label, color: amber(theme) },
          { text: ticker, color: alpha(WHITE, 0.55) },
        ]}
        cols={cols}
        pitch={pitch}
        align="spread"
        padY={1}
        dim={DIM}
      />
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={2} scale={0} dim={DIM} />
      <LedRow
        parts={[{ text: score, color: amber(theme) }]}
        cols={cols}
        pitch={pitch}
        scale={scale}
        align="center"
        padY={2}
        dim={DIM}
      />
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={2} scale={0} dim={DIM} />
      <LedRow
        parts={nameParts}
        cols={cols}
        pitch={pitch}
        align={f.versus ? "spread" : "center"}
        rightCount={2}
        gapDots={3}
        padX={2}
        padY={1}
        dim={DIM}
      />
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={2} scale={0} dim={DIM} />
    </Housing>
  );

  const scorers = (
    <div data-check-list="scorers" style={{ display: "flex", gap: 40 * u }}>
      {sideList.map((side, i) => {
        const lines = scorerSets[i];
        const right = i === 1;
        return (
          <div
            key={side.us ? "us" : "them"}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: right ? "flex-end" : "flex-start",
              textAlign: right ? "right" : "left",
              gap: 8 * u,
            }}
          >
            {lines.map((l) => (
              <div
                key={l.id}
                style={{
                  fontSize: scorerSize,
                  whiteSpace: scorerWrap ? "normal" : "nowrap",
                  lineHeight: 1.15,
                }}
              >
                {l.name}
                {l.minute && <span style={{ color: theme.muted }}> {l.minute}&prime;</span>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const heading = (
    <Heading
      text={half ? design.headlines.halftime : design.headlines.result}
      width={box.info.width}
      max={(box.split ? 160 : theme.tall ? 200 : 170) * u}
      theme={theme}
    />
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          {heading}
          <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} showVersus={false} />
          <div style={{ flex: 1 }} />
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 36 * u,
          }}
        >
          {board}
          {scorers}
        </div>
      </>
    );
  }
  return (
    <>
      <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
        {heading}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 40 * u,
          }}
        >
          {board}
          {scorers}
        </div>
        <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} showVersus={false} />
        <Footer theme={theme} design={design} />
      </InfoColumn>
    </>
  );
}

/* ---------------------------------------------------------------- Goal */

export function NightGoal({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const g = goalFacts(team, design);
  const box = frame(theme, design);
  const headline = design.headlines.goal;
  const score = g ? scoreLine(team, g.us, g.them, true) : "";
  const minute = g?.minute ? `${g.minute}'` : "";
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    Math.max(ledWidth(score) + (minute ? 8 + ledWidth(minute) : 0) + 4, 64),
    Math.min(
      14 * u,
      (h -
        pad * 2 -
        (box.split
          ? 60 * u
          : 96 * u +
            fitName(g?.scorer ?? "", box.info.width, 170 * u, theme).lines.length * 170 * u * 0.95 +
            (design.footer ? legible(theme, 30 * u) * 1.4 : 0) +
            22 * u * 3 +
            60 * u) -
        30 * u) /
        // Dots tall at the largest headline: blank, GOAL (x4), blank, score line, frame.
        (7 + (7 * 4 + 2) + 7 + 11 + 2),
    ),
  );
  const scale = ledScale(headline, cols - 4, 4);

  const board = (
    <Housing theme={theme} pitch={pitch}>
      <Blank cols={cols} pitch={pitch} />
      <LedRow
        parts={[{ text: ledClip(headline, cols - 4, scale), color: amber(theme) }]}
        cols={cols}
        pitch={pitch}
        scale={scale}
        align="center"
        padY={1}
        dim={DIM}
      />
      <Blank cols={cols} pitch={pitch} />
      {(score || minute) && (
        <LedRow
          parts={[
            { text: score, color: WHITE },
            { text: minute, color: amber(theme) },
          ]}
          cols={cols}
          pitch={pitch}
          align={score ? "spread" : "center"}
          padX={2}
          padY={2}
          dim={DIM}
        />
      )}
    </Housing>
  );

  const nameW = box.split ? box.info.width : box.info.width;
  const scorer = g?.scorer ? (
    <NameBlock name={g.scorer} width={nameW} max={(box.split ? 150 : 170) * u} theme={theme} />
  ) : null;
  const club = (
    <div style={{ display: "flex", alignItems: "center", gap: 24 * u }}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={96 * u}
        theme={theme}
      />
      <FitText
        options={
          g && !g.ours
            ? [team.match.opponent, team.match.opponentShort]
            : [team.name, team.shortName]
        }
        width={(box.split ? box.info.width : box.board.width) - 130 * u}
        max={44 * u}
        theme={theme}
        style={{ fontWeight: theme.font.heavy, color: theme.accent, minWidth: 0 }}
      />
    </div>
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          {club}
          <div style={{ flex: 1 }} />
          {scorer}
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {board}
        </div>
      </>
    );
  }
  return (
    <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
      {club}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{board}</div>
      {scorer}
      <Footer theme={theme} design={design} />
    </InfoColumn>
  );
}

/* ---------------------------------------------------------------- Starting XI */

export function NightLineup({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const box = frame(theme, design);
  const rows = starterRows(team, design);
  const bench = benchNames(team, design);
  const headerH = box.split ? 0 : 190 * u;
  const footerH =
    (bench.length ? 120 : 40) * u + (design.footer || design.sponsorImage ? 70 * u : 0);
  const availH = h - pad * 2 - headerH - (box.split ? 0 : footerH) - 60 * u;
  const dotsTall = Math.max(rows.length, 1) * 9 + 2 + 2;
  // A squad without shirt numbers gets no empty number column.
  const showNums = design.showNumbers && rows.some((r) => r.number.trim());
  const numW = showNums ? ledWidth("00") + 5 : 0;
  // The board is sized for the typical name, not the longest: one long name
  // falls back to its surname instead of shrinking every dot on the board.
  const widths = rows
    .map((r) => ledWidth(r.name.replace(/\. /g, ".")) + (r.captain ? 4 + ledWidth("C") : 0))
    .sort((a, b) => a - b);
  const longest = widths[Math.floor((widths.length - 1) * 0.8)] ?? 0;
  const byHeight = (availH - 30 * u) / dotsTall;
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    Math.max(2 + numW + longest, 40),
    Math.min(byHeight, 14 * u),
  );

  const board = (
    <Housing theme={theme} pitch={pitch}>
      <Blank cols={cols} pitch={pitch} />
      {rows.map((r) => {
        const nameRoom = cols - 2 - numW - (r.captain ? 4 + 5 : 0);
        const parts: LedPart[] = [];
        if (showNums) parts.push({ text: r.number, color: amber(theme), minWidth: ledWidth("00") });
        // Signboards drop the space after an initial: "T.HADLEY".
        const full = r.name.replace(/\. /g, ".");
        const surname = full.split(/[ .]/).at(-1) ?? full;
        const label =
          ledWidth(full) <= nameRoom
            ? full
            : ledWidth(surname) <= nameRoom
              ? surname
              : ledClip(surname, nameRoom);
        parts.push({ text: label, color: WHITE });
        if (r.captain) parts.push({ text: "C", color: amber(theme) });
        return (
          <LedRow
            key={r.id}
            parts={parts}
            cols={cols}
            pitch={pitch}
            gapDots={5}
            padX={1}
            padY={1}
            dim={DIM}
          />
        );
      })}
      <Blank cols={cols} pitch={pitch} />
    </Housing>
  );

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 28 * u }}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={150 * u}
        theme={theme}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * u, minWidth: 0 }}>
        <Heading
          text={design.headlines.lineup}
          width={box.info.width - 180 * u}
          max={120 * u}
          theme={theme}
        />
        <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} />
      </div>
    </div>
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={150 * u}
            theme={theme}
          />
          <Heading
            text={design.headlines.lineup}
            width={box.info.width}
            max={130 * u}
            theme={theme}
          />
          <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} />
          <div style={{ flex: 1 }} />
          <SubsLine team={team} design={design} theme={theme} size={legible(theme, 28 * u)} />
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {board}
        </div>
      </>
    );
  }
  return (
    <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
      {header}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{board}</div>
      <SubsLine team={team} design={design} theme={theme} size={legible(theme, 28 * u)} />
      <Footer theme={theme} design={design} />
    </InfoColumn>
  );
}

/* ---------------------------------------------------------------- Shared header */

function NightHeader({
  team,
  theme,
  headline,
  width,
  meta = true,
}: Omit<LayoutProps, "design"> & { headline: string; width: number; meta?: boolean }) {
  const { u, tall } = theme;
  const crest = (tall ? 170 : 140) * u;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 * u, flexShrink: 0 }}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={crest}
        theme={theme}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * u, minWidth: 0 }}>
        <Heading
          text={headline}
          width={width - crest - 28 * u}
          max={(tall ? 140 : 116) * u}
          theme={theme}
          twoLines
        />
        {meta && (
          <MatchMeta team={team} theme={theme} size={legible(theme, (tall ? 30 : 26) * u)} />
        )}
      </div>
    </div>
  );
}

/** Height reserved for the header row (crest and two-line headline). */
function headerH(theme: Theme) {
  return (theme.tall ? 220 : 180) * theme.u;
}

/* ---------------------------------------------------------------- Team news */

const PITCH_LINE = "#4fae6c";

/** Where the dot-matrix pitch sits, shared with the studio's drag handles. */
export function nightPitchGeometry(theme: Theme, design: LayoutProps["design"], count: number) {
  const { u, pad, h } = theme;
  const box = frame(theme, design);
  const top = box.split ? pad : pad + headerH(theme) + 40 * u;
  const bottom =
    h - pad - (box.split ? 0 : (design.showSubs ? 120 : 30) * u + (design.footer ? 60 * u : 0));
  const area = { left: box.board.left, width: box.board.width, top, height: bottom - top };
  const cols = 64;
  const rows = 88;
  const borderX = Math.round(10 * u) * 2;
  const borderY = Math.round(16 * u) + Math.round(10 * u);
  // Stories stack the key under the board (two columns), so names stay big.
  const stack = theme.tall && !box.split;
  // Wide boards are height-bound, so the key can take more of the width for names.
  const keyW = stack ? area.width : Math.max(area.width * (theme.wide ? 0.46 : 0.36), 300 * u);
  const boardMaxW = stack ? area.width : area.width - keyW - 30 * u;
  const boardMaxH = stack ? area.height * 0.66 : area.height;
  const dot = Math.max(
    3,
    Math.min((boardMaxW - borderX) / (cols + 2), (boardMaxH - borderY) / (rows + 2)),
  );
  const boardW = (cols + 2) * dot + borderX;
  const boardH = (rows + 2) * dot + borderY;
  const boardTop = stack ? area.top : area.top + (area.height - boardH) / 2;
  const boardLeft = stack ? area.left + (area.width - boardW) / 2 : area.left;
  const key = stack
    ? {
        left: area.left,
        width: area.width,
        top: boardTop + boardH + 30 * u,
        height: area.top + area.height - (boardTop + boardH + 30 * u),
      }
    : {
        left: boardLeft + boardW + 30 * u,
        width: area.left + area.width - (boardLeft + boardW + 30 * u),
        top: boardTop,
        height: boardH,
      };
  return {
    stack,
    box,
    area,
    cols,
    rows,
    dot,
    board: { left: boardLeft, top: boardTop, width: boardW, height: boardH },
    key,
    /** The pitch in canvas pixels: the dot canvas inside the housing. */
    rect: {
      x: boardLeft + Math.round(10 * u) + dot,
      y: boardTop + Math.round(16 * u) + dot,
      w: cols * dot,
      h: rows * dot,
    },
    count,
  };
}

export function NightPitch({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const placed = placedStarters(team).filter((p) => p.player);
  const g = nightPitchGeometry(theme, design, placed.length);
  const { cols, rows, dot } = g;
  const bench = benchNames(team, design);

  const board = (
    <div style={{ position: "absolute", left: g.board.left, top: g.board.top }}>
      <Housing theme={theme} pitch={dot}>
        <LedCanvas
          cols={cols}
          rows={rows}
          pitch={dot}
          dim={DIM}
          paint={({ dot: put, text }) => {
            const line = (x0: number, y0: number, x1: number, y1: number) => {
              for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) put(PITCH_LINE, x, y);
            };
            const R = cols - 1;
            const B = rows - 1;
            line(0, 0, R, 0);
            line(0, B, R, B);
            line(0, 0, 0, B);
            line(R, 0, R, B);
            // Centre circle (its lower half) on the halfway line at the top.
            const cx = R / 2;
            const rad = cols * 0.17;
            for (let a = 0; a <= 180; a += 4) {
              const t = (a * Math.PI) / 180;
              put(PITCH_LINE, cx + Math.cos(t) * rad, Math.sin(t) * rad);
            }
            // Penalty area, six-yard box and spot.
            const bw = Math.round(cols * 0.3);
            const bh = Math.round(rows * 0.17);
            line(Math.round(cx - bw), B - bh, Math.round(cx - bw), B);
            line(Math.round(cx + bw), B - bh, Math.round(cx + bw), B);
            line(Math.round(cx - bw), B - bh, Math.round(cx + bw), B - bh);
            const sw = Math.round(cols * 0.13);
            const sh = Math.round(rows * 0.06);
            line(Math.round(cx - sw), B - sh, Math.round(cx - sw), B);
            line(Math.round(cx + sw), B - sh, Math.round(cx + sw), B);
            line(Math.round(cx - sw), B - sh, Math.round(cx + sw), B - sh);
            put(PITCH_LINE, cx, B - Math.round(rows * 0.12));
            // Each player is their shirt number, lit where they stand.
            for (const pl of placed) {
              const label = pl.player!.number.trim() || playerInitials(pl.player!.name);
              const wDots = ledWidth(label);
              const x = (pl.x / 100) * R - wDots / 2;
              const y = (pl.y / 100) * B - GLYPH_ROWS / 2;
              const keeper = pl.slot.index === 0;
              // A dark surround so a number never merges with a pitch line.
              for (let yy = -1; yy <= GLYPH_ROWS; yy++)
                for (let xx = -1; xx <= wDots; xx++) put(BOARD, x + xx, y + yy);
              text(label, x, y, keeper ? WHITE : amber(theme));
            }
          }}
        />
      </Housing>
    </div>
  );

  // The key: number and name, one row per player, from keeper to attack.
  const keyCols = g.stack ? 2 : 1;
  const perCol = Math.ceil(placed.length / keyCols);
  const colW = (g.key.width - (keyCols - 1) * 40 * u) / keyCols;
  const keyRow = Math.min(g.key.height / Math.max(perCol, 1), 70 * u);
  // Sized for the typical name, not the longest: one long name must not shrink
  // the whole key. Names that still don't fit drop to the surname, then clip.
  const floor = minText(theme) * 1.15;
  const keyNames0 = placed.map((pl) => displayName(pl.player!, design.nameStyle));
  const sorted = [...keyNames0].sort((a, b) => a.length - b.length);
  const typical = sorted[Math.floor((sorted.length - 1) * 0.8)] ?? "";
  const keySize = Math.max(
    Math.min(floor, keyRow * 0.62),
    Math.min(keyRow * 0.62, fit(typical + "   ", colW * 0.86, 999, theme)),
  );
  // Each name: in full if it fits, else the surname, else the surname over two
  // lines at its hyphen; a last few percent are taken up by condensing the line.
  const textW = (t: string, size: number) => t.length * size * theme.font.glyph * 1.08;
  const keyFont = legible(theme, keySize);
  const capW = (id: string) =>
    design.showCaptain && team.lineup.captainId === id
      ? keyFont * 0.7 * 3 * 0.6 + keyFont * 0.5
      : 0;
  const keyRows = placed.map((pl, i) => {
    const avail = colW - keyFont * 1.3 - keyFont * 0.5 - capW(pl.player!.id) - 4 * u;
    const surname = displayName(pl.player!, "surname");
    const twoLines = keyRow >= keyFont * 1.9;
    const options: string[][] = [[keyNames0[i]], [surname]];
    if (twoLines) {
      const parts = surname.includes("-")
        ? [
            surname.slice(0, surname.lastIndexOf("-") + 1),
            surname.slice(surname.lastIndexOf("-") + 1),
          ]
        : surname.includes(" ")
          ? balance(surname)
          : [surname];
      if (parts.length > 1) options.push(parts);
    }
    const widest = (ls: string[]) => Math.max(...ls.map((l) => textW(l, keyFont)));
    const lines =
      options.find((ls) => widest(ls) <= avail) ??
      options.reduce((a, b) => (widest(b) < widest(a) ? b : a));
    return { lines, squeeze: Math.max(0.6, Math.min(1, avail / widest(lines))) };
  });
  const key = (
    <div
      style={{
        position: "absolute",
        left: g.key.left,
        width: g.key.width,
        top: g.key.top,
        height: g.key.height,
        display: "grid",
        gridTemplateColumns: `repeat(${keyCols}, ${colW}px)`,
        gridTemplateRows: `repeat(${perCol}, ${keyRow}px)`,
        gridAutoFlow: "column",
        columnGap: 40 * u,
        alignContent: "center",
      }}
    >
      {placed.map((pl, i) => (
        <div
          key={pl.slot.index}
          style={{
            height: keyRow,
            display: "flex",
            alignItems: "center",
            gap: keyFont * 0.5,
            fontSize: keyFont,
            fontWeight: theme.font.heavy,
            whiteSpace: "nowrap",
            borderBottom: `${Math.max(1, 2 * u)}px solid ${alpha(theme.fg, 0.1)}`,
          }}
        >
          <span
            style={{
              width: keyFont * 1.3,
              textAlign: "right",
              color: pl.slot.index === 0 ? theme.fg : amber(theme),
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {pl.player!.number}
          </span>
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              lineHeight: 0.95,
              transform: keyRows[i].squeeze < 1 ? `scaleX(${keyRows[i].squeeze})` : undefined,
              transformOrigin: "left center",
              marginRight:
                keyRows[i].squeeze < 1 ? `-${(1 - keyRows[i].squeeze) * 100}%` : undefined,
            }}
          >
            {keyRows[i].lines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </span>
          {design.showCaptain && team.lineup.captainId === pl.player!.id && (
            <span style={{ color: amber(theme), fontSize: legible(theme, keyFont * 0.7) }}>
              (C)
            </span>
          )}
        </div>
      ))}
    </div>
  );

  const info = g.box.split ? (
    <InfoColumn theme={theme} left={g.box.info.left} width={g.box.info.width}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={130 * u}
        theme={theme}
      />
      <Heading text={design.headlines.pitch} width={g.box.info.width} max={130 * u} theme={theme} />
      <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} />
      <div
        style={{
          fontSize: legible(theme, 30 * u),
          color: amber(theme),
          fontWeight: theme.font.heavy,
        }}
      >
        {team.lineup.formation}
      </div>
      <div style={{ flex: 1 }} />
      {bench.length > 0 && (
        <SubsLine team={team} design={design} theme={theme} size={legible(theme, 28 * u)} />
      )}
      <Footer theme={theme} design={design} />
    </InfoColumn>
  ) : (
    <>
      <div style={{ position: "absolute", left: pad, top: pad, width: g.box.info.width }}>
        <NightHeader
          team={team}
          theme={theme}
          headline={design.headlines.pitch}
          width={g.box.info.width}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          width: g.box.info.width,
          bottom: pad,
          top: Math.min(h - pad, g.board.top + g.board.height + 26 * u),
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 20 * u,
        }}
      >
        <SubsLine
          team={team}
          design={design}
          theme={theme}
          size={legible(theme, (theme.tall ? 30 : 26) * u)}
        />
        <Footer theme={theme} design={design} />
      </div>
    </>
  );

  return (
    <>
      {info}
      {placed.length > 0 && board}
      {key}
    </>
  );
}

/* ---------------------------------------------------------------- Substitutions */

const RED = "#ff4b3e";
const GREEN = "#3ee27f";

function Triangle({ up, size, color }: { up: boolean; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden style={{ flexShrink: 0 }}>
      <path d={up ? "M5 1 L9.5 9 L0.5 9 Z" : "M5 9 L9.5 1 L0.5 1 Z"} fill={color} />
    </svg>
  );
}

export function NightSubs({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const box = frame(theme, design);
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const subs = team.match.subs.slice(0, 5);
  const headline =
    subs.length === 1 && design.headlines.subs === "Substitutions"
      ? "Substitution"
      : design.headlines.subs;
  const listTop = box.split ? pad : pad + headerH(theme) + 50 * u;
  const listBottom = h - pad - (box.split ? 0 : design.footer ? 80 * u : 20 * u);
  const gap = 28 * u;
  const rowH = Math.min(
    (listBottom - listTop - gap * (subs.length - 1)) / Math.max(subs.length, 1),
    (theme.tall ? 380 : 320) * u,
  );
  // The fourth official's board: the number going off in red, coming on in green.
  const cols = 2 + ledWidth("00", 3) + 2;
  const borderY = Math.round(16 * u) + Math.round(10 * u);
  const dot = Math.max(2.5, (rowH - borderY) / (2 * (GLYPH_ROWS * 3 + 2) + 2));
  const boardW = (cols + 2) * dot + Math.round(10 * u) * 2;
  const textW = box.board.width - boardW - 36 * u;
  const names = subs
    .flatMap((s) => [s.onId, s.offId])
    .map((id) => {
      const p = id ? byId.get(id) : undefined;
      return p ? displayName(p, design.nameStyle) : "";
    });
  const longest = names.reduce((a, b) => (b.length > a.length ? b : a), "");
  const nameSize = Math.min(rowH * 0.27, fit(longest + "  ", textW - rowH * 0.2, 999, theme));

  const list = (
    <div
      style={{
        position: "absolute",
        left: box.board.left,
        width: box.board.width,
        top: listTop,
        height: listBottom - listTop,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap,
      }}
    >
      {subs.map((s) => {
        const on = s.onId ? byId.get(s.onId) : undefined;
        const off = s.offId ? byId.get(s.offId) : undefined;
        // No shirt number: the board shows the player's initials instead of dashes.
        const num = (p: typeof on) =>
          p?.number?.trim() ? p.number : p ? playerInitials(p.name) : "";
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 36 * u }}>
            <Housing theme={theme} pitch={dot}>
              <LedRow
                parts={[{ text: num(off), color: RED, scale: 3 }]}
                cols={cols}
                pitch={dot}
                scale={3}
                align="center"
                padY={1}
                dim={DIM}
              />
              <LedRow
                parts={[{ text: num(on), color: GREEN, scale: 3 }]}
                cols={cols}
                pitch={dot}
                scale={3}
                align="center"
                padY={1}
                dim={DIM}
              />
            </Housing>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: nameSize * 0.35,
              }}
            >
              {s.minute && (
                <div
                  style={{
                    fontSize: legible(theme, nameSize * 0.62),
                    color: amber(theme),
                    fontWeight: theme.font.heavy,
                  }}
                >
                  {s.minute}&prime;
                </div>
              )}
              {[
                { p: off, up: false, color: RED },
                { p: on, up: true, color: GREEN },
              ].map(({ p, up, color }) => (
                <div
                  key={up ? "on" : "off"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: nameSize * 0.35,
                    fontSize: legible(theme, nameSize),
                    fontWeight: theme.font.heavy,
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                    color: up ? theme.fg : theme.muted,
                  }}
                >
                  <Triangle up={up} size={nameSize * 0.6} color={color} />
                  {p ? displayName(p, design.nameStyle) : ""}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={130 * u}
            theme={theme}
          />
          <Heading text={headline} width={box.info.width} max={130 * u} theme={theme} twoLines />
          <MatchMeta team={team} theme={theme} size={legible(theme, 26 * u)} />
          <div style={{ flex: 1 }} />
          <Footer theme={theme} design={design} />
        </InfoColumn>
        {list}
      </>
    );
  }
  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad, width: box.info.width }}>
        <NightHeader team={team} theme={theme} headline={headline} width={box.info.width} />
      </div>
      {list}
      <div style={{ position: "absolute", left: pad, width: box.info.width, bottom: pad }}>
        <Footer theme={theme} design={design} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Player of the match */

export function NightMotm({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const box = frame(theme, design);
  const player = team.players.find((p) => p.id === team.match.motmId);
  const s = finalScore(team);
  const fullLine = scoreLine(team, s.us, s.them, true);
  const number = player?.number.trim() ?? "";
  const name = player ? displayName(player, "surname") : "";
  const top = box.split ? pad : pad + headerH(theme) + 40 * u;
  const bottom = h - pad - (box.split ? 0 : (team.match.motmNote ? 160 : 70) * u);

  // The surname is never cut on the board: one row if it fits, else split at its
  // hyphen (or between words) onto two rows, widening the board in dots if needed.
  const nameRows = !name
    ? []
    : ledWidth(name) <= 58
      ? [name]
      : name.includes("-")
        ? ledHyphenRows(name)
        : name.includes(" ")
          ? balance(name)
          : [name];
  const cols0 = Math.min(120, Math.max(64, ...nameRows.map((r) => ledWidth(r) + 6)));
  const numScale = number ? ledScale(number, Math.floor(64 * 0.6), 9) : 0;
  const nameScale = nameRows.length
    ? Math.min(...nameRows.map((r) => ledScale(r, cols0 - 6, nameRows.length > 1 ? 2 : 3)))
    : 1;
  const dotsTall =
    4 +
    (number ? GLYPH_ROWS * numScale + 4 : 0) +
    nameRows.length * (GLYPH_ROWS * nameScale + 4) +
    (fullLine ? 9 : 0) +
    4;
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    cols0,
    Math.min(15 * u, (bottom - top - 40 * u) / dotsTall),
  );
  // The result rides under the name only when it fits whole.
  const line = ledWidth(fullLine) <= cols - 4 ? fullLine : "";

  const board = player ? (
    <Housing theme={theme} pitch={pitch}>
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={2} scale={0} dim={DIM} />
      {number && (
        <LedRow
          parts={[{ text: number, color: amber(theme) }]}
          cols={cols}
          pitch={pitch}
          scale={numScale}
          align="center"
          padY={2}
          dim={DIM}
        />
      )}
      {nameRows.map((row) => (
        <LedRow
          key={row}
          parts={[{ text: row, color: WHITE }]}
          cols={cols}
          pitch={pitch}
          scale={nameScale}
          align="center"
          padY={2}
          dim={DIM}
        />
      ))}
      {line && (
        <LedRow
          parts={[{ text: ledClip(line, cols - 4), color: alpha(WHITE, 0.55) }]}
          cols={cols}
          pitch={pitch}
          align="center"
          padY={1}
          dim={DIM}
        />
      )}
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={2} scale={0} dim={DIM} />
    </Housing>
  ) : null;

  const fullName = player ? displayName(player, "full") : "";
  const note = team.match.motmNote.trim();
  const caption = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 * u }}>
      {fullName && fullName.toLowerCase() !== name.toLowerCase() && (
        <NameBlock name={fullName} width={box.info.width} max={56 * u} theme={theme} />
      )}
      {note && (
        <div
          style={{
            fontSize: legible(theme, (theme.tall ? 32 : 28) * u),
            color: theme.muted,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={130 * u}
            theme={theme}
          />
          <Heading
            text={design.headlines.motm}
            width={box.info.width}
            max={130 * u}
            theme={theme}
            twoLines
          />
          {caption}
          <div style={{ flex: 1 }} />
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {board}
        </div>
      </>
    );
  }
  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad, width: box.info.width }}>
        <NightHeader
          team={team}
          theme={theme}
          headline={design.headlines.motm}
          width={box.info.width}
          meta={false}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: box.board.left,
          width: box.board.width,
          top,
          height: bottom - top,
          display: "flex",
          alignItems: "center",
        }}
      >
        {board}
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          width: box.info.width,
          bottom: pad,
          display: "flex",
          flexDirection: "column",
          gap: 24 * u,
        }}
      >
        {caption}
        <Footer theme={theme} design={design} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Fixtures */

/** A departures board: one fixture per line, kick-off or score on the right. */
export function NightFixtures({ team, design, theme }: LayoutProps) {
  const { u, pad, h } = theme;
  const box = frame(theme, design);
  const rows = fixtureRows(team).slice(0, theme.tall ? 8 : 6);
  const top = box.split ? pad : pad + headerH(theme) + 40 * u;
  const bottom = h - pad - (box.split ? 0 : design.footer ? 80 * u : 20 * u);
  // "21 NOV": the weekday would crowd out the opponent on the board.
  const dateText = (iso: string) => formatMatchDate(iso).split(" ").slice(1).join(" ");
  const right = (f: (typeof rows)[number]) => f.score.trim() || f.kickoff;
  const dateW = Math.max(...rows.map((f) => ledWidth(dateText(f.date))), 0);
  const rightW = Math.max(...rows.map((f) => ledWidth(right(f))), 0);
  // Pad, date, H/A, opponent, the score or time, and the gaps between them.
  const fixed = 4 + dateW + 4 + ledWidth("H") + 4 + 6 + rightW;
  const need = Math.max(56, ...rows.map((f) => fixed + Math.min(ledWidth(f.opponent), 96)));
  const perRow = 11 + 9 + 3;
  const dotsTall = 9 + 3 + perRow * Math.max(rows.length, 1);
  const { pitch, cols } = fitBoard(
    box.board.width,
    theme,
    Math.min(need, 200),
    Math.min(13 * u, (bottom - top - 40 * u) / dotsTall),
  );

  const board = rows.length ? (
    <Housing theme={theme} pitch={pitch}>
      <LedRow
        parts={[
          { text: "NEXT UP", color: amber(theme) },
          { text: team.shortName || team.name, color: DIM_WHITE },
        ]}
        cols={cols}
        pitch={pitch}
        align="spread"
        padX={2}
        padY={1}
        dim={DIM}
      />
      <LedRow parts={[]} cols={cols} pitch={pitch} padY={1} scale={0} dim={DIM} />
      {rows.map((f) => {
        const r = right(f);
        const oppRoom = cols - fixed;
        return (
          <div key={f.id}>
            <LedRow
              parts={[
                { text: dateText(f.date), color: WHITE, minWidth: dateW },
                { text: f.isHome ? "H" : "A", color: amber(theme) },
                { text: ledClip(f.opponent, oppRoom), color: WHITE },
                { text: r, color: f.score.trim() ? GREEN : amber(theme) },
              ]}
              cols={cols}
              pitch={pitch}
              align="spread"
              padX={2}
              padY={2}
              dim={DIM}
            />
            <LedRow
              parts={[
                { text: "", color: DIM_WHITE, minWidth: dateW },
                { text: ledClip(f.competition, cols - dateW - 10), color: DIM_WHITE },
              ]}
              cols={cols}
              pitch={pitch}
              padX={2}
              padY={1}
              dim={DIM}
            />
            <LedRow parts={[]} cols={cols} pitch={pitch} padY={1} scale={0} dim={DIM} />
          </div>
        );
      })}
    </Housing>
  ) : null;

  if (box.split) {
    return (
      <>
        <InfoColumn theme={theme} left={box.info.left} width={box.info.width}>
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={130 * u}
            theme={theme}
          />
          <Heading
            text={design.headlines.fixtures}
            width={box.info.width}
            max={130 * u}
            theme={theme}
          />
          <div
            style={{
              fontSize: legible(theme, 30 * u),
              color: theme.muted,
              fontWeight: theme.font.heavy,
            }}
          >
            {team.name}
          </div>
          <div style={{ flex: 1 }} />
          <Footer theme={theme} design={design} />
        </InfoColumn>
        <div
          style={{
            position: "absolute",
            left: box.board.left,
            width: box.board.width,
            top: pad,
            height: h - pad * 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {board}
        </div>
      </>
    );
  }
  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad, width: box.info.width }}>
        <NightHeader
          team={team}
          theme={theme}
          headline={design.headlines.fixtures}
          width={box.info.width}
          meta={false}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: box.board.left,
          width: box.board.width,
          top,
          height: bottom - top,
          display: "flex",
          alignItems: "center",
        }}
      >
        {board}
      </div>
      <div style={{ position: "absolute", left: pad, width: box.info.width, bottom: pad }}>
        <Footer theme={theme} design={design} />
      </div>
    </>
  );
}

/** A long hyphenated surname as two board rows, split at the middle-most hyphen. */
function ledHyphenRows(name: string): string[] {
  const cuts = [...name.matchAll(/-/g)].map((m) => m.index ?? 0);
  const mid = cuts.reduce((a, b) =>
    Math.abs(b - name.length / 2) < Math.abs(a - name.length / 2) ? b : a,
  );
  return [name.slice(0, mid + 1), name.slice(mid + 1)];
}
