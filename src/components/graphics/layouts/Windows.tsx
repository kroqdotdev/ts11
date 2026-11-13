/**
 * "Pixel": the graphic as a little desktop. Each piece of the match sits in its
 * own window with a title bar and a hard drop shadow, stacked and offset like
 * windows left open, the same low-fi UI the app itself is built from.
 */
import type { Team } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";
import { COAL, contrast, readableOn, shade } from "@/lib/color";
import { displayName, formatMatchDate } from "@/lib/format";
import { minuteOf } from "@/lib/score";
import { Crest, Footer, Heading } from "../parts";
import { fit, type Theme, legible } from "../theme";
import {
  benchNames,
  facts,
  finalScore,
  goalFacts,
  fitName,
  fitNameList,
  fitScorers,
  FittedName,
  FitText,
  headingHeight,
  NameBlock,
  NameLines,
  textHeight,
  pairNames,
  playerInitials,
  planFixtureRows,
  scoreLine,
  sideNames,
  scorerLines,
  starterRows,
  versusLine,
  type LayoutProps,
} from "./shared";
import { PitchDiagram, type PitchSkin } from "./pitch";
import { fixtureRows } from "../selection";

export const PAPER = "#f6f1e3";

export interface Skin {
  paper: string;
  ink: string;
  bar: string;
  barInk: string;
  accent: string;
  soft: string;
}

export function skin(theme: Theme): Skin {
  const bar =
    contrast(theme.primary, COAL) >= 1.6 && contrast(theme.primary, PAPER) >= 1.6
      ? theme.primary
      : contrast(theme.secondary, PAPER) >= 1.6
        ? theme.secondary
        : shade(theme.primary, 0.3);
  const accent =
    [
      theme.primary,
      theme.secondary,
      shade(theme.primary, -0.35),
      shade(theme.secondary, -0.45),
    ].find((c) => contrast(c, PAPER) >= 3.6) ?? COAL;
  return { paper: PAPER, ink: COAL, bar, barInk: readableOn(bar), accent, soft: "#5b5a55" };
}

/** A window file name made from a headline: "Full time" → "full_time.txt". */
export function fileName(text: string, ext: string) {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${base || "untitled"}.${ext}`;
}

function Win({
  title,
  theme,
  s,
  children,
  style,
  body,
}: {
  title: string;
  theme: Theme;
  s: Skin;
  children: ReactNode;
  style?: CSSProperties;
  body?: CSSProperties;
}) {
  const { u } = theme;
  const b = Math.max(3, Math.round(4 * u));
  const shadow = Math.round(10 * u);
  const box = Math.round(18 * u);
  return (
    <div
      style={{
        background: s.paper,
        color: s.ink,
        border: `${b}px solid ${s.ink}`,
        boxShadow: `${shadow}px ${shadow}px 0 ${s.ink}`,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          height: 50 * u,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16 * u,
          padding: `0 ${12 * u}px 0 ${16 * u}px`,
          background: s.bar,
          color: s.barInk,
          borderBottom: `${b}px solid ${s.ink}`,
          fontSize: legible(theme, 28 * u),
          fontWeight: theme.font.heavy,
          textTransform: "none",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span>{title}</span>
        <span style={{ display: "flex", gap: 8 * u }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: box,
                height: box,
                border: `${b - 1}px solid ${s.ink}`,
                background: i === 2 ? s.paper : "transparent",
              }}
            />
          ))}
        </span>
      </div>
      <div
        style={{
          padding: 24 * u,
          display: "flex",
          flexDirection: "column",
          gap: 16 * u,
          flex: 1,
          minHeight: 0,
          ...body,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Content box inside the pixel frame; narrower beside a player cut-out. */
function area(theme: Theme, design: LayoutProps["design"]) {
  const { w, pad, wide } = theme;
  const right = design.featureImage ? (wide ? w * 0.52 : w * 0.62) : w - pad;
  return { left: pad, width: right - pad };
}

function Desk({
  theme,
  design,
  children,
  footer = true,
}: {
  theme: Theme;
  design: LayoutProps["design"];
  children: ReactNode;
  footer?: boolean;
}) {
  const a = area(theme, design);
  const { pad, u } = theme;
  return (
    <div
      style={{
        position: "absolute",
        left: a.left,
        width: a.width,
        top: pad,
        bottom: pad + 30 * u,
        display: "flex",
        flexDirection: "column",
        gap: (theme.h / theme.w < 1.1 ? 22 : 34) * u,
      }}
    >
      {children}
      {footer && <Footer theme={theme} design={design} />}
    </div>
  );
}

/** A football in pixels, eight by eight. */
export function PixelBall({ size, ink }: { size: number; ink: string }) {
  const rows = [
    "00111100",
    "01100110",
    "11011011",
    "10111101",
    "10111101",
    "11011011",
    "01100110",
    "00111100",
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="1" width="6" height="6" fill="#ffffff" />
      <rect x="0" y="2" width="8" height="4" fill="#ffffff" />
      <rect x="2" y="0" width="4" height="8" fill="#ffffff" />
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ink} /> : null,
        ),
      )}
    </svg>
  );
}

function TeamLine({
  name,
  crest,
  colors,
  theme,
  width,
  size,
  trailing,
  fitted,
  kind,
}: {
  name: string;
  kind?: Team["crestKind"];
  crest: string | null;
  colors: { primary: string; secondary: string };
  theme: Theme;
  width: number;
  size: number;
  trailing?: ReactNode;
  /** A shared fit for a pair of clubs, so both names print at the same size. */
  fitted?: { lines: string[]; size: number };
}) {
  const { u } = theme;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 * u }}>
      <Crest src={crest} kind={kind} name={name} colors={colors} size={size} theme={theme} />
      <NameLines
        lines={fitted?.lines ?? [name]}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: legible(
            theme,
            fitted?.size ?? fit(name, width - size * 1.6, size * 0.56, theme),
          ),
          fontWeight: theme.font.heavy,
          lineHeight: theme.font.leading,
        }}
      />
      {trailing}
    </div>
  );
}

/* ---------------------------------------------------------------- Matchday */

export function WindowFixture({ team, design, theme }: LayoutProps) {
  const { u, wide } = theme;
  const s = skin(theme);
  const f = facts(team);
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  // Square posts have less height to share between three windows; long names,
  // a long competition or venue scale the windows' contents down until they fit.
  const crest0 = (split ? 110 : theme.h / theme.w < 1.1 ? 96 : 150) * u;
  const versusW0 = split ? a.width * 0.5 : a.width * 0.9;
  const chrome = 50 * u + 48 * u + 10 * u;
  const headMax0 = (theme.h / theme.w < 1.1 ? 150 : 200) * u;
  const avail =
    theme.h -
    theme.pad * 2 -
    30 * u -
    (design.footer ? legible(theme, 30 * u) * 1.5 : 0) -
    (theme.h / theme.w < 1.1 ? 22 : 34) * u * 3;
  const heightAt = (k: number) => {
    const c = crest0 * k;
    const n = pairNames(
      sideNames(team, f.versus ? [f.home, f.away] : [f.home]),
      versusW0 - 50 * u - c * 1.6,
      c * 0.56,
      theme,
    );
    const team1 = Math.max(c, n.lines[0].length * n.size * theme.font.leading);
    const team2 = f.versus
      ? Math.max(c, (n.lines[1]?.length ?? 1) * n.size * theme.font.leading)
      : 0;
    const innerW = (split ? a.width * 0.48 : a.width) - 60 * u;
    const head =
      chrome +
      headingHeight(design.headlines.fixture, innerW, headMax0 * k, theme) +
      textHeight(f.competition, legible(theme, 32 * u), innerW, theme) +
      16 * u;
    const versusH = chrome + team1 + team2 + (f.versus ? legible(theme, 34 * u) * 1.2 + 36 * u : 0);
    const kickW = split ? innerW : a.width * 0.78 - 60 * u;
    const dateW = kickW - (f.kickoff ? fit(f.kickoff, kickW, 120 * u * k, theme) * 3 : 0);
    const kick =
      chrome +
      Math.max(
        f.kickoff ? legible(theme, 120 * u * k) * 0.9 : 0,
        legible(theme, 44 * u) * 1.2 +
          textHeight(f.venue, legible(theme, 28 * u), Math.max(dateW, kickW * 0.5), theme),
      );
    return split ? Math.max(head + kick + 34 * u, versusH) : head + versusH + kick;
  };
  const k = [1, 0.9, 0.8, 0.7, 0.6, 0.5].find((x) => heightAt(x) <= avail) ?? 0.5;
  const crest = crest0 * k;

  const head = (
    <Win title={fileName(design.headlines.fixture, "exe")} theme={theme} s={s}>
      <Heading
        text={design.headlines.fixture}
        width={(split ? a.width * 0.48 : a.width) - 60 * u}
        max={headMax0 * k}
        theme={theme}
        color={s.ink}
      />
      {f.competition && (
        <div
          style={{
            fontSize: legible(theme, 32 * u),
            color: s.accent,
            fontWeight: theme.font.heavy,
          }}
        >
          {f.competition}
        </div>
      )}
    </Win>
  );
  const versusW = split ? a.width * 0.5 : a.width * 0.9;
  const names = pairNames(
    sideNames(team, f.versus ? [f.home, f.away] : [f.home]),
    versusW - 50 * u - crest * 1.6,
    crest * 0.56,
    theme,
  );
  const versus = (
    <Win
      title={f.versus ? "versus.txt" : "club.txt"}
      theme={theme}
      s={s}
      style={{ width: versusW, alignSelf: split ? undefined : "flex-end" }}
      body={{ gap: 18 * u }}
    >
      <TeamLine
        {...f.home}
        kind={f.home.us ? team.crestKind : undefined}
        theme={theme}
        width={versusW - 50 * u}
        size={crest}
        fitted={{ lines: names.lines[0], size: names.size }}
      />
      {f.versus && (
        <>
          <div
            style={{
              fontSize: legible(theme, 34 * u),
              color: s.accent,
              fontWeight: theme.font.heavy,
              paddingLeft: crest * 0.36,
            }}
          >
            v
          </div>
          <TeamLine
            {...f.away}
            kind={f.away.us ? team.crestKind : undefined}
            theme={theme}
            width={versusW - 50 * u}
            size={crest}
            fitted={{ lines: names.lines[1], size: names.size }}
          />
        </>
      )}
    </Win>
  );
  const kickoff = (f.kickoff || f.date) && (
    <Win
      title="kickoff.ics"
      theme={theme}
      s={s}
      style={{ width: split ? undefined : a.width * 0.78 }}
      body={{ flexDirection: "row", alignItems: "flex-end", gap: 30 * u, flexWrap: "wrap" }}
    >
      {f.kickoff && (
        <span
          style={{
            fontSize: legible(theme, 120 * u * k),
            lineHeight: 0.85 * theme.font.leading,
            fontWeight: theme.font.heavy,
            color: s.accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {f.kickoff}
        </span>
      )}
      <span style={{ display: "flex", flexDirection: "column", gap: 8 * u, paddingBottom: 6 * u }}>
        <span style={{ fontSize: legible(theme, 44 * u), fontWeight: theme.font.heavy }}>
          {f.date}
        </span>
        {f.venue && (
          <span style={{ fontSize: legible(theme, 28 * u), color: s.soft }}>{f.venue}</span>
        )}
      </span>
    </Win>
  );

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}>
          <div
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 34 * u, minWidth: 0 }}
          >
            {head}
            {kickoff}
          </div>
          {versus}
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      {head}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34 * u,
        }}
      >
        {versus}
        {kickoff}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Full time / Half time */

export function WindowResult({
  team,
  design,
  theme,
  half = false,
}: LayoutProps & { half?: boolean }) {
  const { u, wide, h, pad } = theme;
  const s = skin(theme);
  const f = facts(team, half);
  const sc = finalScore(team, half);
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  const square = theme.h / theme.w < 1.1;
  const headline = half ? design.headlines.halftime : design.headlines.result;
  const crest = (split ? 90 : square ? 80 : 104) * u;
  const mainW = split ? a.width * 0.6 : a.width;
  const sidesList = f.versus ? [f.home, f.away] : [f.home];
  const homeScore = f.home.us ? sc.us : sc.them;
  const awayScore = f.home.us ? sc.them : sc.us;

  const lines = [f.home, f.away].flatMap((side) =>
    scorerLines(team, design, side.goals).map((l) => ({ ...l, us: side.us })),
  );
  lines.sort((x, y) => minuteOf(x.minute) - minuteOf(y.minute));

  // The score is the hero: whatever height the windows leave goes to it.
  const headSize = Math.min(
    fit(headline, mainW - 60 * u, (square ? 120 : 150) * u, theme),
    (square ? 120 : 150) * u,
  );
  // Square posts keep the scorers inside the window, leaving the height to the score.
  const inline = square && !split;
  // The log: one size for every line, surnames when the full names won't fit.
  const logW =
    (split ? a.width * 0.4 - 40 * u : a.width * 0.72) - 48 * u - 64 * u - 18 * u - 12 * u;
  const logFit = fitScorers([lines], logW, 32 * u, theme);
  const logText = logFit.sets[0];
  const inlineText = logText
    .map((l) => `${l.text}${l.minute ? ` ${l.minute}'` : ""}`)
    .join("  ·  ");
  const inlineSize = legible(theme, 26 * u);
  const logH = inline
    ? lines.length
      ? textHeight(inlineText, inlineSize, mainW - 60 * u, theme) + 20 * u
      : 0
    : !split && lines.length
      ? 50 * u +
        44 * u +
        logText.reduce(
          (sum, l) => sum + textHeight(`${l.text} 00'`, logFit.size, logW, theme, 1.15) + 8 * u,
          0,
        ) +
        34 * u
      : 0;
  const used =
    pad * 2 +
    30 * u +
    (design.footer || design.sponsorImage ? 70 * u : 0) +
    58 * u +
    48 * u +
    headSize * 0.9 * theme.font.leading +
    (f.competition ? 50 * u : 0) +
    crest +
    30 * u +
    20 * u * 4 +
    logH;
  const scoreText = f.versus ? `${homeScore}-${awayScore}` : String(homeScore);
  const scoreSize = Math.max(
    140 * u,
    Math.min(fit(scoreText, mainW - 80 * u, 9999, theme, 0.95), (h - used) / 0.9),
  );
  const names = pairNames(
    sideNames(team, sidesList),
    (f.versus ? (mainW - 60 * u) / 2 : mainW - 60 * u) - crest - 20 * u,
    crest * 0.5,
    theme,
  );

  const board = (
    <Win
      title={fileName(headline, "txt")}
      theme={theme}
      s={s}
      style={{ width: mainW }}
      body={{ gap: 20 * u }}
    >
      <Heading text={headline} width={mainW - 60 * u} max={headSize} theme={theme} color={s.ink} />
      {f.competition && (
        <div
          style={{
            fontSize: legible(theme, 30 * u),
            color: s.accent,
            fontWeight: theme.font.heavy,
          }}
        >
          {f.competition}
        </div>
      )}
      <div
        style={{
          fontSize: legible(theme, scoreSize),
          lineHeight: 0.86 * theme.font.leading,
          fontWeight: theme.font.heavy,
          color: s.accent,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          textShadow: `${Math.round(8 * u)}px ${Math.round(8 * u)}px 0 ${s.ink}`,
          padding: `${10 * u}px 0`,
        }}
      >
        {scoreText}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20 * u,
          borderTop: `${4 * u}px dashed ${s.ink}`,
          paddingTop: 18 * u,
        }}
      >
        {sidesList.map((side, i) => (
          <div
            key={side.us ? "us" : "them"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16 * u,
              flexDirection: i ? "row-reverse" : "row",
              textAlign: i ? "right" : "left",
              minWidth: 0,
            }}
          >
            <Crest
              src={side.crest}
              kind={side.us ? team.crestKind : undefined}
              name={side.name}
              colors={side.colors}
              size={crest}
              theme={theme}
            />
            <NameLines
              lines={names.lines[i]}
              style={{
                fontSize: legible(theme, names.size),
                fontWeight: theme.font.heavy,
                lineHeight: theme.font.leading,
              }}
            />
          </div>
        ))}
      </div>
      {inline && lines.length > 0 && (
        <div style={{ fontSize: inlineSize, color: s.soft, lineHeight: 1.2 }}>{inlineText}</div>
      )}
    </Win>
  );

  const log =
    lines.length && !inline ? (
      <Win
        title="scorers.log"
        theme={theme}
        s={s}
        style={{
          width: split ? undefined : a.width * 0.72,
          alignSelf: split ? undefined : "flex-end",
        }}
        body={{ gap: 8 * u, padding: `${18 * u}px ${24 * u}px` }}
      >
        <div
          data-check-list="scorers"
          style={{ display: "flex", flexDirection: "column", gap: 8 * u }}
        >
          {lines.map((l, i) => (
            <div
              key={l.id}
              style={{
                display: "flex",
                gap: 18 * u,
                fontSize: logFit.size,
                lineHeight: 1.15,
              }}
            >
              <span
                style={{
                  color: s.soft,
                  minWidth: 64 * u,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {l.minute ? `${l.minute}'` : ""}
              </span>
              <span
                style={{ fontWeight: theme.font.heavy, color: l.us ? s.ink : s.soft, minWidth: 0 }}
              >
                {logText[i]?.text || "Goal"}
              </span>
            </div>
          ))}
        </div>
      </Win>
    ) : null;

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}>
          {board}
          <div style={{ flex: 1, minWidth: 0 }}>{log}</div>
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34 * u,
        }}
      >
        {board}
        {log}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Goal */

export function WindowGoal({ team, design, theme }: LayoutProps) {
  const { u, wide } = theme;
  const s = skin(theme);
  const g = goalFacts(team, design);
  const a = area(theme, design);
  const mainW = wide && !design.featureImage ? a.width * 0.62 : a.width;
  const score = g ? scoreLine(team, g.us, g.them, true) : "";
  // Stories get everything bigger, and the match's scorers in a log below.
  const k = theme.tall && !wide ? 1.35 : 1;
  const log = k > 1 ? scorerLines(team, design, team.match.goals).filter((l) => l.name) : [];

  return (
    <Desk theme={theme} design={design}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: wide ? "flex-start" : "stretch",
          gap: 34 * u,
        }}
      >
        <Win
          title={fileName(design.headlines.goal, "exe")}
          theme={theme}
          s={s}
          style={{ width: mainW }}
          body={{ gap: 22 * u * k, padding: 34 * u * k }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 30 * u }}>
            <PixelBall size={130 * u * k} ink={s.ink} />
            <Heading
              text={design.headlines.goal}
              width={mainW - 260 * u * k}
              max={230 * u * k}
              theme={theme}
              color={s.accent}
            />
          </div>
          {g?.scorer && (
            <div
              style={{
                fontSize: legible(theme, fit(g.scorer, mainW - 80 * u, 150 * u * k, theme)),
                fontWeight: theme.font.heavy,
                lineHeight: 0.9 * theme.font.leading,
                whiteSpace: "nowrap",
              }}
            >
              {g.scorer}
            </div>
          )}
          {g?.minute && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16 * u,
                fontSize: legible(theme, 34 * u * k),
              }}
            >
              <span style={{ color: s.soft }}>{g.minute}&prime;</span>
              {/* A progress bar filled to the minute of the goal. */}
              <span
                style={{
                  flex: 1,
                  height: 28 * u * k,
                  border: `${4 * u}px solid ${s.ink}`,
                  background: `linear-gradient(90deg, ${s.accent} ${Math.min(100, (Number.parseInt(g.minute, 10) / 90) * 100)}%, transparent 0)`,
                }}
              />
              <span style={{ color: s.soft }}>90&prime;</span>
            </div>
          )}
        </Win>
        {score && (
          <Win
            title="score.txt"
            theme={theme}
            s={s}
            style={{
              alignSelf: wide ? "flex-start" : "flex-end",
              marginLeft: wide ? mainW * 0.3 : 0,
            }}
            body={{ padding: `${16 * u}px ${28 * u}px` }}
          >
            <span
              style={{
                fontSize: legible(theme, 56 * u * k),
                fontWeight: theme.font.heavy,
                whiteSpace: "nowrap",
              }}
            >
              {score}
            </span>
          </Win>
        )}
        {log.length > 0 && (
          <Win
            title="scorers.log"
            theme={theme}
            s={s}
            style={{ width: mainW * 0.78 }}
            body={{ gap: 8 * u, padding: `${18 * u}px ${28 * u}px` }}
          >
            {log.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  gap: 18 * u,
                  fontSize: legible(theme, fit(l.name + "  00'", mainW * 0.7, 40 * u, theme)),
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: s.soft, minWidth: 70 * u }}>
                  {l.minute && `${l.minute}′`}
                </span>
                {l.name}
              </div>
            ))}
          </Win>
        )}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Starting XI */

export function WindowLineup({ team, design, theme }: LayoutProps) {
  const { u, h, w, pad, wide } = theme;
  const s = skin(theme);
  const a = area(theme, design);
  const rows = starterRows(team, design);
  const bench = benchNames(team, design);
  const split = wide && !design.featureImage;
  const listW = split ? a.width * 0.56 : a.width;
  const twoCols = !split && h / w < 1.1;
  const perCol = twoCols ? Math.ceil(rows.length / 2) : rows.length;
  const vs = versusLine(team);
  // Everything that isn't the list, measured: header, subs window, chrome, footer, gaps.
  const benchText = bench.join(", ");
  const headTextW = (split ? a.width - listW - 40 * u : a.width) - 160 * u;
  const headerH = Math.max(
    130 * u,
    headingHeight(design.headlines.lineup, headTextW, 130 * u, theme) +
      12 * u +
      textHeight(vs, legible(theme, 34 * u), headTextW, theme),
  );
  const subsH = bench.length
    ? 50 * u +
      28 * u +
      8 * u +
      textHeight(benchText, legible(theme, 26 * u), a.width * 0.86 - 44 * u, theme, 1.3)
    : 0;
  const reservedPx = split
    ? 230 * u
    : headerH +
      subsH +
      50 * u +
      28 * u +
      12 * u +
      (theme.h / theme.w < 1.1 ? 22 : 34) * u * 2 +
      30 * u * 2 +
      30 * u +
      (design.footer ? legible(theme, 30 * u) * 1.5 : 0);
  const listH = h - pad * 2 - reservedPx;
  const rowH = Math.min(78 * u, listH / Math.max(perCol, 1));
  const colW = twoCols ? (listW - 90 * u) / 2 : listW - 50 * u;
  const fitted = fitNameList(
    rows.map((r) => r.name),
    colW - (design.showNumbers ? rowH * 0.95 : 0) - (rows.some((r) => r.captain) ? rowH * 0.8 : 0),
    Math.min(rowH * 0.7, 64 * u),
    theme,
  );
  const size = fitted.size;

  const list = (
    <Win
      title={fileName(design.headlines.lineup, "txt")}
      theme={theme}
      s={s}
      style={{ width: listW }}
      body={{ flexDirection: "row", gap: 40 * u, padding: `${14 * u}px ${24 * u}px` }}
    >
      <div data-check-list="starting xi" style={{ display: "flex", gap: 40 * u }}>
        {[rows.slice(0, perCol), rows.slice(perCol)]
          .filter((c) => c.length)
          .map((c, ci) => (
            <div key={ci} style={{ width: colW, display: "flex", flexDirection: "column" }}>
              {c.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    gap: size * 0.5,
                    fontSize: size,
                    fontWeight: theme.font.heavy,
                    whiteSpace: "nowrap",
                    borderTop: i ? `${3 * u}px dotted ${s.soft}` : undefined,
                  }}
                >
                  {design.showNumbers && (
                    <span
                      style={{
                        width: size * 1.3,
                        flexShrink: 0,
                        color: s.accent,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {r.number}
                    </span>
                  )}
                  <FittedName row={fitted.rows[rows.indexOf(r)]} />
                  {r.captain && (
                    <span
                      style={{
                        fontSize: legible(theme, size * 0.55),
                        border: `${3 * u}px solid ${s.ink}`,
                        background: s.bar,
                        color: s.barInk,
                        padding: `${2 * u}px ${8 * u}px`,
                      }}
                    >
                      C
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </Win>
  );

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 26 * u }}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={130 * u}
        theme={theme}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * u, minWidth: 0 }}>
        <Heading
          text={design.headlines.lineup}
          width={(split ? a.width - listW - 40 * u : a.width) - 160 * u}
          max={130 * u}
          theme={theme}
        />
        {vs && (
          <div
            style={{
              fontSize: legible(theme, 34 * u),
              fontWeight: theme.font.heavy,
              color: theme.accent,
            }}
          >
            {vs}
          </div>
        )}
      </div>
    </div>
  );

  const subs = bench.length ? (
    <Win
      title="subs.txt"
      theme={theme}
      s={s}
      style={{
        alignSelf: split ? "stretch" : "flex-end",
        width: split ? undefined : a.width * 0.86,
      }}
      body={{
        padding: `${14 * u}px ${22 * u}px`,
        fontSize: legible(theme, 26 * u),
        lineHeight: 1.3,
        display: "block",
      }}
    >
      {bench.join(", ")}
    </Win>
  ) : null;

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, minHeight: 0, alignItems: "center" }}>
          <div
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 34 * u, minWidth: 0 }}
          >
            {header}
            {subs}
          </div>
          {list}
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      {header}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30 * u,
        }}
      >
        {list}
        {subs}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Pixel bits */

/** A pixel arrow, five by five: up in green for on, down in red for off. */
function PixelArrow({ up, size }: { up: boolean; size: number }) {
  const rows = up
    ? ["00100", "01110", "11111", "01110", "01110"]
    : ["01110", "01110", "11111", "01110", "00100"];
  const fill = up ? "#2fbf5b" : "#e5483b";
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
          ) : null,
        ),
      )}
    </svg>
  );
}

/** A pixel trophy, nine by nine. */
function PixelCup({ size, color, ink }: { size: number; color: string; ink: string }) {
  const rows = [
    "111111111",
    "101111101",
    "101111101",
    "011111110",
    "001111100",
    "000111000",
    "000010000",
    "000111000",
    "001111100",
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={y === 0 || x === 0 || x === 8 ? ink : color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function footH(theme: Theme, design: LayoutProps["design"]) {
  return design.footer || design.sponsorImage ? 70 * theme.u : 0;
}

/* ---------------------------------------------------------------- Team news */

/** The Team news window and the pitch inside it; shared with the studio's drag handles. */
export function windowPitchGeometry(theme: Theme, design: LayoutProps["design"]) {
  const { u, pad, h, wide } = theme;
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  const b = Math.max(3, Math.round(4 * u));
  const win = {
    left: a.left,
    top: pad,
    width: a.width,
    height: h - pad * 2 - 30 * u - footH(theme, design),
  };
  const inner = {
    left: win.left + b + 24 * u,
    top: win.top + b + 50 * u + b + 24 * u,
    width: win.width - b * 2 - 48 * u,
    height: win.height - b * 3 - 50 * u - 48 * u,
  };
  let box: { left: number; top: number; width: number; height: number };
  let aspect: number;
  if (split) {
    // Wide: a broad pitch, so names have room side by side.
    const headW = inner.width * 0.36;
    box = { ...inner, left: inner.left + headW + 30 * u, width: inner.width - headW - 30 * u };
    aspect = 1.25;
  } else {
    const headH = (theme.tall ? 200 : 160) * u;
    const bench = design.showSubs ? 70 * u : 0;
    box = { ...inner, top: inner.top + headH, height: inner.height - headH - bench - 20 * u };
    aspect = theme.tall ? 0.86 : 1.3;
  }
  const pw = Math.min(box.width, box.height * aspect);
  const ph = Math.min(box.height, pw / aspect);
  return {
    split,
    win,
    inner,
    rect: { x: box.left + (box.width - pw) / 2, y: box.top + (box.height - ph) / 2, w: pw, h: ph },
  };
}

export function WindowPitch({ team, design, theme }: LayoutProps) {
  const { u, pad } = theme;
  const s = skin(theme);
  const g = windowPitchGeometry(theme, design);
  const b = Math.max(3, Math.round(4 * u));
  const green = ["#3c9446", "#43a04e"];
  const skinP: PitchSkin = {
    surface: `repeating-conic-gradient(${green[0]} 0 25%, ${green[1]} 0 50%) 0 0 / ${Math.round(24 * u)}px ${Math.round(24 * u)}px`,
    line: PAPER,
    lineWidth: Math.max(3, Math.round(5 * u)),
    scale: 0.66,
    token: ({ player, keeper, size, captain }) => {
      const kit = keeper ? theme.kitAlt : theme.kit;
      return (
        <div
          style={{
            width: size,
            height: size,
            background: kit,
            color: readableOn(kit),
            border: `${b}px solid ${s.ink}`,
            boxShadow: `${b}px ${b}px 0 ${s.ink}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: legible(theme, size * 0.46),
            fontWeight: theme.font.heavy,
            fontVariantNumeric: "tabular-nums",
            position: "relative",
          }}
        >
          {player.number.trim() || playerInitials(player.name)}
          {captain && (
            <span
              // The badge sits on the shirt's corner on its own plate, by design.
              data-check-allow="spill"
              style={{
                position: "absolute",
                right: -size * 0.2,
                top: -size * 0.2,
                // Big enough for its letter at the readable floor.
                width: Math.max(size * 0.36, legible(theme, size * 0.24) * 1.45),
                height: Math.max(size * 0.36, legible(theme, size * 0.24) * 1.45),
                background: "#f5c518",
                color: s.ink,
                border: `${b - 1}px solid ${s.ink}`,
                fontSize: legible(theme, size * 0.24),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              C
            </span>
          )}
        </div>
      );
    },
    label: {
      color: s.ink,
      background: PAPER,
      weight: theme.font.heavy,
      style: { border: `${Math.max(2, b - 1)}px solid ${s.ink}` },
    },
  };
  const bench = benchNames(team, design);
  const meta = [versusLine(team), team.lineup.formation].filter(Boolean).join(" · ");
  const head = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 * u }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 * u }}>
        <Crest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={(theme.tall ? 120 : 96) * u}
          theme={theme}
        />
        <Heading
          text={design.headlines.pitch}
          width={(g.split ? g.inner.width * 0.4 : g.inner.width) - 130 * u}
          max={(theme.tall ? 140 : 110) * u}
          theme={theme}
          color={s.ink}
        />
      </div>
      {meta && (
        <div
          style={{
            fontSize: legible(theme, 28 * u),
            color: s.accent,
            fontWeight: theme.font.heavy,
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
  const subs = bench.length ? (
    <div style={{ fontSize: legible(theme, 24 * u), lineHeight: 1.35, color: s.ink }}>
      <b style={{ color: s.accent }}>subs.txt </b>
      {bench.join(", ")}
    </div>
  ) : null;

  return (
    <>
      <Win
        title={fileName(design.headlines.pitch, "png")}
        theme={theme}
        s={s}
        style={{ position: "absolute", ...g.win }}
        body={{ gap: 16 * u, justifyContent: "space-between" }}
      >
        {g.split ? (
          <div
            style={{
              width: g.inner.width * 0.4,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {head}
            {subs}
          </div>
        ) : (
          <>
            {head}
            {subs}
          </>
        )}
      </Win>
      <div
        style={{
          position: "absolute",
          left: g.rect.x - b,
          top: g.rect.y - b,
          width: g.rect.w + b * 2,
          height: g.rect.h + b * 2,
          border: `${b}px solid ${s.ink}`,
          boxSizing: "border-box",
        }}
      />
      <PitchDiagram team={team} design={design} theme={theme} rect={g.rect} skin={skinP} />
      <div style={{ position: "absolute", left: g.win.left, width: g.win.width, bottom: pad }}>
        <Footer theme={theme} design={design} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Substitutions */

export function WindowSubs({ team, design, theme }: LayoutProps) {
  const { u, h, pad, wide } = theme;
  const s = skin(theme);
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const subs = team.match.subs.slice(0, 5);
  const headline =
    subs.length === 1 && design.headlines.subs === "Substitutions"
      ? "Substitution"
      : design.headlines.subs;
  const listW = split ? a.width * 0.56 : a.width;
  const avail = h - pad * 2 - 30 * u - footH(theme, design) - (split ? 0 : 300 * u) - 120 * u;
  const rowH = Math.min((theme.tall ? 300 : 260) * u, avail / Math.max(subs.length, 1));
  const tagW = rowH * 0.62;
  const names = subs
    .flatMap((x) => [x.onId, x.offId])
    .map((id) => {
      const p = id ? byId.get(id) : undefined;
      return p ? `${p.number} ${displayName(p, design.nameStyle)}` : "";
    });
  const longest = names.reduce((x, y) => (y.length > x.length ? y : x), "");
  const nameSize = Math.min(
    rowH * 0.32,
    fit(longest + "  ", listW - tagW - rowH * 0.5 - 80 * u, 999, theme),
  );

  const head = (
    <Win title={fileName(headline, "exe")} theme={theme} s={s} style={{ flexShrink: 0 }}>
      <Heading
        text={headline}
        width={(split ? a.width * 0.4 : a.width) - 60 * u}
        max={(theme.tall ? 170 : 140) * u}
        theme={theme}
        color={s.ink}
        twoLines={split}
      />
      {versusLine(team) && (
        <div
          style={{
            fontSize: legible(theme, 30 * u),
            color: s.accent,
            fontWeight: theme.font.heavy,
          }}
        >
          {versusLine(team)}
        </div>
      )}
    </Win>
  );
  const list = subs.length ? (
    <Win
      title="changes.log"
      theme={theme}
      s={s}
      style={{ width: listW, alignSelf: split ? undefined : "flex-end" }}
      body={{ gap: 0, padding: `${8 * u}px ${24 * u}px` }}
    >
      {subs.map((x, i) => {
        const row = (id: string | null, up: boolean) => {
          const p = id ? byId.get(id) : undefined;
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: nameSize * 0.4,
                fontSize: legible(theme, up ? nameSize : nameSize * 0.82),
                fontWeight: theme.font.heavy,
                color: up ? s.ink : s.soft,
                whiteSpace: "nowrap",
                lineHeight: 1.05,
              }}
            >
              <PixelArrow up={up} size={nameSize * 0.7} />
              {p && design.showNumbers && (
                <span style={{ color: up ? s.accent : s.soft, fontVariantNumeric: "tabular-nums" }}>
                  {p.number}
                </span>
              )}
              <span>{p ? displayName(p, design.nameStyle) : ""}</span>
            </div>
          );
        };
        return (
          <div
            key={x.id}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: rowH * 0.2,
              borderTop: i ? `${4 * u}px dashed ${s.ink}` : undefined,
            }}
          >
            <span
              style={{
                width: tagW,
                padding: `${8 * u}px 0`,
                background: s.bar,
                color: s.barInk,
                border: `${Math.max(3, Math.round(4 * u))}px solid ${s.ink}`,
                textAlign: "center",
                fontSize: legible(theme, rowH * 0.2),
                fontWeight: theme.font.heavy,
                flexShrink: 0,
              }}
            >
              {x.minute ? `${x.minute}'` : "--"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: nameSize * 0.25 }}>
              {row(x.onId, true)}
              {row(x.offId, false)}
            </div>
          </div>
        );
      })}
    </Win>
  ) : null;

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}>
          <div style={{ width: a.width * 0.4 }}>{head}</div>
          {list}
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      {head}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {list}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Player of the match */

export function WindowMotm({ team, design, theme }: LayoutProps) {
  const { u, wide } = theme;
  const s = skin(theme);
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  const player = team.players.find((p) => p.id === team.match.motmId);
  const parts = player?.name.trim().split(/\s+/) ?? [];
  const first = player?.shirtName ? "" : parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const last = player?.shirtName || parts.at(-1) || "";
  const sc = finalScore(team);
  const line = scoreLine(team, sc.us, sc.them);
  const note = team.match.motmNote.trim();
  const mainW = split ? a.width * 0.62 : a.width;
  // Stories stack the number tile above the name, both big, to fill the height.
  const stacked = theme.tall && !split;
  // No shirt number, no tile: the name takes the room instead of an empty box.
  const hasNumber = !!player?.number.trim();
  // A surname that needs two lines takes height from the stacked number tile.
  const twoLineName = stacked && fitName(last, a.width - 80 * u, 190 * u, theme).lines.length > 1;
  const tile = hasNumber
    ? (split ? 220 : stacked ? (twoLineName ? 230 : 340) : theme.h / theme.w < 1.1 ? 190 : 250) * u
    : 0;
  const nameW = stacked || !hasNumber ? mainW - 80 * u : mainW - tile - 100 * u;

  const award = (
    <Win
      title={fileName(design.headlines.motm, "exe")}
      theme={theme}
      s={s}
      style={{ width: mainW }}
      body={{ gap: 24 * u }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 * u }}>
        <PixelCup size={(theme.tall ? 110 : 88) * u} color="#f5c518" ink={s.ink} />
        <Heading
          text={design.headlines.motm}
          width={mainW - 180 * u}
          max={(theme.tall ? 120 : 96) * u}
          theme={theme}
          color={s.ink}
          twoLines
        />
      </div>
      {player && (
        <div
          style={{
            display: "flex",
            flexDirection: stacked ? "column" : "row",
            alignItems: "center",
            gap: (stacked ? 34 : 30) * u,
            padding: stacked ? `${20 * u}px 0` : 0,
          }}
        >
          {hasNumber && (
            <div
              data-check-slot="number"
              style={{
                width: tile,
                height: tile,
                flexShrink: 0,
                background: s.bar,
                color: s.barInk,
                border: `${Math.max(3, Math.round(5 * u))}px solid ${s.ink}`,
                boxShadow: `${10 * u}px ${10 * u}px 0 ${s.ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: legible(theme, tile * (player.number.length > 1 ? 0.6 : 0.72)),
                fontWeight: theme.font.heavy,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {player.number}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: stacked ? "center" : "flex-start",
              textAlign: stacked ? "center" : "left",
              minWidth: 0,
            }}
          >
            {first && (
              <div
                style={{
                  fontSize: legible(theme, fit(first, nameW, (stacked ? 84 : 64) * u, theme)),
                  color: s.accent,
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {first}
              </div>
            )}
            <NameBlock
              name={last}
              width={nameW}
              max={stacked ? 190 * u : Math.max(tile, 190 * u) * 0.62}
              theme={theme}
            />
          </div>
        </div>
      )}
    </Win>
  );
  const memo =
    note || line ? (
      <Win
        title="note.txt"
        theme={theme}
        s={s}
        style={{
          width: split ? undefined : a.width * 0.8,
          alignSelf: split ? undefined : "flex-end",
        }}
        body={{ gap: 10 * u }}
      >
        {note && (
          <div
            style={{
              fontSize: legible(theme, (stacked ? 40 : 34) * u),
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {note}
          </div>
        )}
        {line && (
          <FitText
            options={[line, scoreLine(team, sc.us, sc.them, true)]}
            width={(split ? a.width * 0.38 - 40 * u : a.width * 0.8) - 60 * u}
            max={(stacked ? 34 : 28) * u}
            theme={theme}
            style={{ color: s.accent, fontWeight: theme.font.heavy }}
          />
        )}
      </Win>
    ) : null;

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}>
          {award}
          <div style={{ flex: 1, minWidth: 0 }}>{memo}</div>
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40 * u,
        }}
      >
        {award}
        {memo}
      </div>
    </Desk>
  );
}

/* ---------------------------------------------------------------- Fixtures */

export function WindowFixtures({ team, design, theme }: LayoutProps) {
  const { u, h, pad, wide } = theme;
  const s = skin(theme);
  const a = area(theme, design);
  const split = wide && !design.featureImage;
  const rows = fixtureRows(team).slice(0, theme.tall ? 7 : 5);
  const listW = split ? a.width * 0.6 : a.width;
  const avail = h - pad * 2 - 30 * u - footH(theme, design) - (split ? 0 : 280 * u) - 110 * u;
  const rowH = Math.min((theme.tall ? 200 : 170) * u, avail / Math.max(rows.length, 1));
  const tile = rowH * 0.78;
  const b = Math.max(3, Math.round(4 * u));
  const rightW = rowH * 1.3;
  const oppW = listW - tile - rightW - rowH * 0.5 - 110 * u;
  const type = planFixtureRows(rows, oppW, rowH, theme);

  const head = (
    <Win title="fixtures.ics" theme={theme} s={s} style={{ flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 * u }}>
        <Crest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={96 * u}
          theme={theme}
        />
        <Heading
          text={design.headlines.fixtures}
          width={(split ? a.width * 0.36 : a.width) - 180 * u}
          max={(theme.tall ? 160 : 130) * u}
          theme={theme}
          color={s.ink}
        />
      </div>
    </Win>
  );
  const list = rows.length ? (
    <Win
      title="calendar.exe"
      theme={theme}
      s={s}
      style={{ width: listW, alignSelf: split ? undefined : "flex-end" }}
      body={{ gap: 0, padding: `${6 * u}px ${24 * u}px` }}
    >
      {rows.map((f, i) => {
        const [, day, month] = formatMatchDate(f.date).split(" ");
        const right = f.score.trim() || f.kickoff;
        return (
          <div
            key={f.id}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: rowH * 0.18,
              borderTop: i ? `${4 * u}px dashed ${s.ink}` : undefined,
            }}
          >
            <div
              style={{
                width: tile,
                height: tile,
                flexShrink: 0,
                border: `${b}px solid ${s.ink}`,
                display: "flex",
                flexDirection: "column",
                background: PAPER,
              }}
            >
              <div
                style={{
                  background: s.bar,
                  color: s.barInk,
                  fontSize: legible(theme, tile * 0.2),
                  fontWeight: theme.font.heavy,
                  textAlign: "center",
                  borderBottom: `${b}px solid ${s.ink}`,
                }}
              >
                {month}
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: legible(theme, tile * 0.46),
                  fontWeight: theme.font.heavy,
                }}
              >
                {day}
              </div>
            </div>
            <span
              style={{
                padding: `${4 * u}px ${10 * u}px`,
                border: `${b}px solid ${s.ink}`,
                background: f.isHome ? s.bar : PAPER,
                color: f.isHome ? s.barInk : s.ink,
                fontSize: legible(theme, rowH * 0.18),
                fontWeight: theme.font.heavy,
                flexShrink: 0,
              }}
            >
              {f.isHome ? "H" : "A"}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: type.oppSize,
                  fontWeight: theme.font.heavy,
                  lineHeight: 0.95,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {type.lines(f.opponent).map((l) => (
                  <span key={l} style={{ whiteSpace: "nowrap" }}>
                    {l}
                  </span>
                ))}
              </span>
              {type.showComp(f) && (
                <span
                  style={{
                    fontSize: type.compSize,
                    color: s.soft,
                    lineHeight: 1.15,
                    marginTop: 4 * u,
                  }}
                >
                  {f.competition}
                </span>
              )}
            </div>
            <span
              style={{
                width: rightW,
                textAlign: "right",
                fontSize: legible(theme, rowH * 0.32),
                fontWeight: theme.font.heavy,
                color: s.accent,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {right}
            </span>
          </div>
        );
      })}
    </Win>
  ) : null;

  if (split) {
    return (
      <Desk theme={theme} design={design}>
        <div style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}>
          <div style={{ width: a.width * 0.36 }}>{head}</div>
          {list}
        </div>
      </Desk>
    );
  }
  return (
    <Desk theme={theme} design={design}>
      {head}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {list}
      </div>
    </Desk>
  );
}
