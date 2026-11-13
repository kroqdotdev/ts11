/**
 * "Clean": a newspaper back page. A club-colour nameplate, a huge headline set
 * edge to edge between heavy rules, facts in ruled columns, and the background
 * photo as a picture box with a caption rather than a full-bleed wash.
 */
import type { CSSProperties, ReactNode } from "react";
import { COAL, alpha, contrast, readableOn } from "@/lib/color";
import { displayName, formatMatchDate } from "@/lib/format";
import type { Rect } from "../LineupPitch";
import { Crest, Footer, balance } from "../parts";
import { fit, minText, type Theme, legible } from "../theme";
import {
  Cutout,
  Ground,
  PhotoBox,
  benchNames,
  facts,
  finalScore,
  FitText,
  goalFacts,
  FittedName,
  fitNameList,
  NameLines,
  pairNames,
  playerInitials,
  planFixtureRows,
  scoreLine,
  shortOf,
  sideNames,
  scorerLines,
  starterRows,
  versusLine,
  type LayoutProps,
} from "./shared";
import { PitchDiagram, type PitchSkin } from "./pitch";
import { fixtureRows } from "../selection";

interface Ink {
  paper: string;
  ink: string;
  /** Nameplate and reverse-out boxes. */
  plate: string;
  plateInk: string;
  accent: string;
  soft: string;
}

function inks(theme: Theme): Ink {
  const paper = theme.ground;
  const plate = [theme.primary, theme.secondary].find((c) => contrast(c, paper) >= 1.8) ?? COAL;
  return {
    paper,
    ink: COAL,
    plate,
    plateInk: readableOn(plate),
    accent: theme.accent,
    soft: alpha(COAL, 0.62),
  };
}

/** Content column: narrower when a player cut-out stands on the right. */
function column(theme: Theme, design: LayoutProps["design"]) {
  const { w, pad, wide } = theme;
  const right = design.featureImage ? (wide ? w * 0.5 : w * 0.6) : w - pad;
  return { left: pad, width: right - pad };
}

function Rule({
  ink,
  weight,
  double = false,
  u,
}: {
  ink: string;
  weight: number;
  double?: boolean;
  u: number;
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: weight, background: ink }} />
      {double && <div style={{ height: 2 * u, background: ink, marginTop: 5 * u }} />}
    </div>
  );
}

/** The nameplate: club name reversed out of a club-colour block, date and competition beside it. */
function Masthead({
  team,
  theme,
  ink,
  aside,
}: {
  team: LayoutProps["team"];
  theme: Theme;
  ink: Ink;
  aside?: string;
}) {
  const { u } = theme;
  const f = facts(team);
  // The plate takes at most ~60% of the row; a very long club name gives way to its short name.
  const room =
    (theme.wide ? theme.w * 0.5 : theme.w - theme.pad * 2) * 0.6 - (team.crest ? 90 * u : 0);
  const fullSize = fit(team.name, room, 40 * u, theme);
  const plateName = fullSize < 26 * u && team.shortName.trim() ? team.shortName : team.name;
  const size = plateName === team.name ? fullSize : fit(plateName, room, 40 * u, theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * u, flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: 24 * u,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 * u, minWidth: 0 }}>
          {/* The club's own crest, when uploaded, leads the nameplate. */}
          {team.crest && (
            <Crest
              src={team.crest}
              kind={team.crestKind}
              name={team.name}
              colors={team.colors}
              size={Math.max(size * 1.9, 64 * u)}
              theme={theme}
            />
          )}
          <div
            style={{
              background: ink.plate,
              color: ink.plateInk,
              fontWeight: theme.font.heavy,
              fontSize: legible(theme, size),
              padding: `${12 * u}px ${20 * u}px ${10 * u}px`,
              whiteSpace: "nowrap",
              lineHeight: theme.font.leading,
            }}
          >
            {plateName}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            gap: 4 * u,
            fontSize: legible(theme, 27 * u),
            color: ink.soft,
            fontWeight: theme.font.heavy,
            textAlign: "right",
            minWidth: 0,
          }}
        >
          {aside && <span style={{ color: ink.accent }}>{aside}</span>}
          <span>{[f.date, f.kickoff].filter(Boolean).join("  ")}</span>
        </div>
      </div>
      <Rule ink={ink.ink} weight={9 * u} double u={u} />
    </div>
  );
}

/** The headline, two balanced lines when long, set as wide as the column allows. */
function Splash({
  text,
  width,
  max,
  theme,
  color,
}: {
  text: string;
  width: number;
  max: number;
  theme: Theme;
  color: string;
}) {
  const lines = text.length > 14 ? balance(text) : [text];
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), "");
  // Heavy capitals run wider than the average glyph: keep a margin so the
  // headline never pushes past its column.
  const size = fit(longest, width * 0.9, max, theme, 0.98);
  return (
    <div
      style={{
        fontSize: legible(theme, size),
        fontWeight: theme.font.heavy,
        lineHeight: 0.84 * theme.font.leading,
        color,
        whiteSpace: "nowrap",
        letterSpacing: "-0.01em",
        flexShrink: 0,
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

/** A reverse-out kicker box above the headline. */
function Kicker({ text, theme, ink }: { text: string; theme: Theme; ink: Ink }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexShrink: 0 }}>
      <span
        style={{
          background: ink.ink,
          color: ink.paper,
          fontSize: legible(theme, 26 * theme.u),
          fontWeight: theme.font.heavy,
          padding: `${8 * theme.u}px ${14 * theme.u}px ${6 * theme.u}px`,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Facts in ruled columns: small label, big value. */
function FactTable({
  items,
  theme,
  ink,
  width,
}: {
  items: { label: string; value: string; alt?: string }[];
  theme: Theme;
  ink: Ink;
  width: number;
}) {
  const { u } = theme;
  const live = items.filter((i) => i.value);
  if (!live.length) return null;
  const cell = width / live.length;
  return (
    <div style={{ display: "flex", flexShrink: 0 }}>
      {live.map((it, i) => (
        <div
          key={it.label}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8 * u,
            paddingLeft: i ? 22 * u : 0,
            paddingRight: 16 * u,
            borderLeft: i ? `${2 * u}px solid ${ink.ink}` : undefined,
          }}
        >
          <span
            style={{
              fontSize: legible(theme, 22 * u),
              color: ink.soft,
              fontWeight: theme.font.heavy,
            }}
          >
            {it.label}
          </span>
          <FitText
            options={[it.value, it.alt ?? ""]}
            width={cell - 40 * u}
            max={64 * u}
            theme={theme}
            style={{ fontWeight: theme.font.heavy, color: ink.ink, lineHeight: theme.font.leading }}
          />
        </div>
      ))}
    </div>
  );
}

/** Mixed-case running text, like match-report copy. */
function Copy({
  theme,
  ink,
  children,
  columns = 1,
  style,
}: {
  theme: Theme;
  ink: Ink;
  children: ReactNode;
  columns?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: legible(theme, 27 * theme.u),
        lineHeight: 1.32,
        color: ink.ink,
        textTransform: "none",
        letterSpacing: 0,
        fontWeight: theme.font.light,
        columnCount: columns,
        columnGap: 36 * theme.u,
        columnRule: columns > 1 ? `${2 * theme.u}px solid ${alpha(ink.ink, 0.25)}` : undefined,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The photo as a picture box, with a club-colour caption strip. */
function Picture({
  design,
  theme,
  ink,
  caption,
  style,
}: {
  design: LayoutProps["design"];
  theme: Theme;
  ink: Ink;
  caption?: string;
  style?: CSSProperties;
}) {
  if (!design.background.image) return null;
  const { u } = theme;
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, ...style }}>
      <PhotoBox
        design={design}
        style={{ flex: 1, minHeight: 0, border: `${3 * u}px solid ${ink.ink}` }}
      />
      {caption && (
        <div
          style={{
            fontSize: legible(theme, 22 * u),
            color: ink.soft,
            paddingTop: 8 * u,
            textTransform: "none",
            letterSpacing: 0,
            fontStyle: "italic",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

function Page({
  theme,
  design,
  children,
  left,
  width,
}: {
  theme: Theme;
  design: LayoutProps["design"];
  children: ReactNode;
  left: number;
  width: number;
}) {
  const ink = inks(theme);
  return (
    <>
      <Ground theme={theme} color={ink.paper} />
      <Cutout design={design} theme={theme} />
      <div
        style={{
          position: "absolute",
          left,
          width,
          // In a story the box already reaches a pad into the safe zones; keep the
          // page's edge on the safe line there.
          top: theme.bleedTop ? theme.pad : theme.pad * 0.7,
          bottom: theme.bleedBottom ? theme.pad : theme.pad * 0.7,
          display: "flex",
          flexDirection: "column",
          gap: 26 * theme.u,
          color: ink.ink,
        }}
      >
        {children}
      </div>
    </>
  );
}

function Foot({ theme, design, ink }: { theme: Theme; design: LayoutProps["design"]; ink: Ink }) {
  if (!design.footer && !design.sponsorImage)
    return <Rule ink={ink.ink} weight={9 * theme.u} u={theme.u} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 * theme.u, flexShrink: 0 }}>
      <Rule ink={ink.ink} weight={9 * theme.u} u={theme.u} />
      <Footer theme={{ ...theme, fg: ink.ink, muted: ink.soft }} design={design} />
    </div>
  );
}

/* ---------------------------------------------------------------- Matchday */

export function BackPageFixture({ team, design, theme }: LayoutProps) {
  const { u, w, pad, wide } = theme;
  const ink = inks(theme);
  const f = facts(team);
  const col = column(theme, design);
  const deck = f.versus ? `${f.home.name} v ${f.away.name}` : team.name;
  const deckShort = f.versus
    ? `${shortOf(team, f.home)} v ${shortOf(team, f.away)}`
    : team.shortName || team.name;
  const table = [
    { label: "Kick-off", value: f.kickoff },
    { label: "Date", value: f.date },
    { label: "Venue", value: f.venue },
  ];

  if (wide && !design.featureImage) {
    const half = w / 2 - pad * 1.5;
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={f.competition} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: half, display: "flex", flexDirection: "column", gap: 24 * u }}>
            <Splash
              text={design.headlines.fixture}
              width={half}
              max={200 * u}
              theme={theme}
              color={ink.ink}
            />
            <FitText
              options={[deck, deckShort]}
              width={half}
              max={60 * u}
              theme={theme}
              style={{ fontWeight: theme.font.heavy, color: ink.accent }}
            />
            <div style={{ flex: 1 }} />
            <FactTable items={table} theme={theme} ink={ink} width={half} />
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          {design.background.image ? (
            <Picture
              design={design}
              theme={theme}
              ink={ink}
              style={{ flex: 1 }}
              caption={versusLine(team)}
            />
          ) : (
            <BigTime theme={theme} ink={ink} time={f.kickoff} width={half - 20 * u} />
          )}
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }

  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={f.competition} />
      <Splash
        text={design.headlines.fixture}
        width={col.width}
        max={(theme.tall ? 300 : 250) * u}
        theme={theme}
        color={ink.ink}
      />
      <DeckLines team={team} theme={theme} ink={ink} width={col.width} max={70 * u} />
      {design.background.image ? (
        <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <BigTime theme={theme} ink={ink} time={f.kickoff} width={col.width} />
        </div>
      )}
      <Rule ink={ink.ink} weight={2 * u} u={u} />
      <FactTable
        items={design.background.image ? table : table.slice(1)}
        theme={theme}
        ink={ink}
        width={col.width}
      />
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/** "Home v Away", on one line when it fits, else one club per line at one shared size. */
function DeckLines({
  team,
  theme,
  ink,
  width,
  max,
}: {
  team: LayoutProps["team"];
  theme: Theme;
  ink: Ink;
  width: number;
  max: number;
}) {
  const f = facts(team);
  const deck = f.versus ? `${f.home.name} v ${f.away.name}` : team.name;
  const deckShort = f.versus
    ? `${shortOf(team, f.home)} v ${shortOf(team, f.away)}`
    : team.shortName || team.name;
  const one = fit(deck, width, max, theme);
  const style = {
    fontWeight: theme.font.heavy,
    color: ink.accent,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    lineHeight: theme.font.leading,
  };
  if (!f.versus || one >= max * 0.62)
    return <div style={{ ...style, fontSize: legible(theme, one) }}>{deck}</div>;
  const size = Math.min(
    fit(f.home.name, width, max, theme),
    fit(`v ${f.away.name}`, width, max, theme),
  );
  // Still too small on two lines: the short names read better.
  if (size < minText(theme) * 1.2)
    return (
      <div
        style={{
          ...style,
          fontSize: legible(theme, Math.min(max, fit(deckShort, width, max, theme))),
        }}
      >
        {deckShort}
      </div>
    );
  return (
    <div style={{ ...style, fontSize: legible(theme, size) }}>
      <div>{f.home.name}</div>
      <div>v {f.away.name}</div>
    </div>
  );
}

/** The kick-off time set huge in outline, the back page's picture when there is no photo. */
function BigTime({
  theme,
  ink,
  time,
  width,
  label = "Kick-off",
}: {
  theme: Theme;
  ink: Ink;
  time: string;
  width: number;
  label?: string;
}) {
  if (!time) return <div style={{ flex: 1 }} />;
  const size = fit(time, width, 360 * theme.u, theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
      {label && (
        <span
          style={{
            fontSize: legible(theme, 24 * theme.u),
            color: ink.soft,
            fontWeight: theme.font.heavy,
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          fontSize: legible(theme, size),
          fontWeight: theme.font.heavy,
          lineHeight: 0.85 * theme.font.leading,
          color: "transparent",
          WebkitTextStroke: `${Math.max(3, 5 * theme.u)}px ${ink.ink}`,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {time}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Full time / Half time */

function ScorerCopy({
  team,
  design,
  theme,
  ink,
  half,
  columns,
}: LayoutProps & { ink: Ink; half: boolean; columns: number }) {
  const f = facts(team, half);
  const parts = [f.home, f.away]
    .map((side) => {
      const lines = scorerLines(team, design, side.goals).filter((l) => l.name);
      if (!lines.length) return null;
      return (
        <span key={side.us ? "us" : "them"}>
          <b style={{ fontWeight: theme.font.heavy }}>{side.name}:</b>{" "}
          {lines.map((l, i) => (
            <span key={l.id}>
              {l.name}
              {l.minute && ` ${l.minute}′`}
              {i < lines.length - 1 ? ", " : ". "}
            </span>
          ))}
        </span>
      );
    })
    .filter(Boolean);
  if (!parts.length) return null;
  return (
    <Copy theme={theme} ink={ink} columns={columns}>
      <b style={{ fontWeight: theme.font.heavy, color: ink.accent, textTransform: "uppercase" }}>
        Goals{" "}
      </b>
      {parts}
    </Copy>
  );
}

/** The score set as the page's splash, with the two clubs under it at one shared size. */
function ScoreSplash({
  team,
  theme,
  ink,
  width,
  height,
  half,
}: {
  team: LayoutProps["team"];
  theme: Theme;
  ink: Ink;
  width: number;
  height: number;
  half: boolean;
}) {
  const { u } = theme;
  const f = facts(team, half);
  const s = finalScore(team, half);
  const homeScore = f.home.us ? s.us : s.them;
  const awayScore = f.home.us ? s.them : s.us;
  const score = f.versus ? `${homeScore}-${awayScore}` : String(homeScore);
  const sides = f.versus ? [f.home, f.away] : [f.home];
  const names = pairNames(
    sideNames(team, sides),
    f.versus ? width / 2 - 24 * u : width,
    (theme.tall ? 64 : 54) * u,
    theme,
  );
  const namesH = names.size * Math.max(...names.lines.map((l) => l.length)) * 1.02 + 30 * u;
  const size = Math.max(
    80 * u,
    Math.min(fit(score, width, 9999, theme, 0.92), (height - namesH) / (0.86 * theme.font.leading)),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * u, flexShrink: 0 }}>
      <div
        style={{
          fontSize: legible(theme, size),
          fontWeight: theme.font.heavy,
          lineHeight: 0.86 * theme.font.leading,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
          textAlign: "center",
          color: ink.ink,
        }}
      >
        {f.versus ? (
          <>
            <span style={{ color: f.home.us ? ink.plate : ink.ink }}>{homeScore}</span>
            <span
              style={{
                display: "inline-block",
                width: size * 0.16,
                height: size * 0.07,
                margin: `0 ${size * 0.06}px`,
                verticalAlign: "middle",
                background: ink.ink,
              }}
            />
            <span style={{ color: f.away.us ? ink.plate : ink.ink }}>{awayScore}</span>
          </>
        ) : (
          score
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 24 * u,
          borderTop: `${2 * u}px solid ${ink.ink}`,
          paddingTop: 14 * u,
        }}
      >
        {sides.map((side, i) => (
          <NameLines
            key={side.us ? "us" : "them"}
            lines={names.lines[i]}
            style={{
              fontSize: legible(theme, names.size),
              fontWeight: theme.font.heavy,
              lineHeight: theme.font.leading,
              textAlign: i ? "right" : "left",
              color: side.us ? ink.ink : ink.soft,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function BackPageResult({
  team,
  design,
  theme,
  half = false,
}: LayoutProps & { half?: boolean }) {
  const { u, w, h, pad, wide } = theme;
  const ink = inks(theme);
  const f = facts(team, half);
  const col = column(theme, design);
  const headline = half ? design.headlines.halftime : design.headlines.result;
  const scorerLines_ = [f.home, f.away].filter((x) => x.goals.length).length;

  if (wide && !design.featureImage) {
    const half_ = w / 2 - pad * 1.5;
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={f.competition} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: half_, display: "flex", flexDirection: "column", gap: 24 * u }}>
            <Splash text={headline} width={half_} max={190 * u} theme={theme} color={ink.ink} />
            {design.background.image && (
              <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
            )}
            {!design.background.image && <div style={{ flex: 1 }} />}
            <ScorerCopy
              team={team}
              design={design}
              theme={theme}
              ink={ink}
              half={half}
              columns={1}
            />
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <ScoreSplash
              team={team}
              theme={theme}
              ink={ink}
              width={half_}
              height={h - pad * 1.4 - 260 * u}
              half={half}
            />
          </div>
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }

  // Everything else on the page; the score takes the rest.
  const splashSize = fit(headline, col.width, (theme.tall ? 220 : 180) * u, theme, 0.98);
  const others =
    pad * 1.4 +
    110 * u +
    splashSize * 0.84 * theme.font.leading * (headline.length > 14 ? 2 : 1) +
    (scorerLines_ ? 80 * u : 0) +
    (design.footer || design.sponsorImage ? 90 * u : 20 * u) +
    26 * u * 5;
  const room = h - others;
  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={f.competition} />
      <Splash
        text={headline}
        width={col.width}
        max={(theme.tall ? 220 : 180) * u}
        theme={theme}
        color={ink.ink}
      />
      {design.background.image && (
        <Picture design={design} theme={theme} ink={ink} style={{ flex: 1, minHeight: 0 }} />
      )}
      <div
        style={{
          flex: design.background.image ? undefined : 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <ScoreSplash
          team={team}
          theme={theme}
          ink={ink}
          width={col.width}
          height={design.background.image ? room * 0.45 : room}
          half={half}
        />
      </div>
      <ScorerCopy
        team={team}
        design={design}
        theme={theme}
        ink={ink}
        half={half}
        columns={col.width > 700 * u ? 2 : 1}
      />
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/* ---------------------------------------------------------------- Goal */

export function BackPageGoal({ team, design, theme }: LayoutProps) {
  const { u, w, pad, wide } = theme;
  const ink = inks(theme);
  const g = goalFacts(team, design);
  const col = column(theme, design);
  const split = wide && !design.featureImage;
  const textW = split ? w / 2 - pad * 1.5 : col.width;
  const strap = g ? scoreLine(team, g.us, g.them) : "";
  const strapShort = g ? scoreLine(team, g.us, g.them, true) : "";
  const kicker = g?.minute ? `${g.minute}′` : "";

  const words = (
    <>
      <Kicker text={kicker} theme={theme} ink={ink} />
      <Splash
        text={design.headlines.goal}
        width={textW}
        max={(theme.tall ? 320 : 270) * u}
        theme={theme}
        color={ink.ink}
      />
      {g?.scorer && (
        <div
          style={{
            fontSize: legible(theme, fit(g.scorer, textW, 170 * u, theme)),
            fontWeight: theme.font.heavy,
            color: ink.accent,
            lineHeight: 0.9 * theme.font.leading,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {g.scorer}
        </div>
      )}
      {strap && (
        <>
          <Rule ink={ink.ink} weight={2 * u} u={u} />
          <FitText
            options={[strap, strapShort]}
            width={textW}
            max={52 * u}
            theme={theme}
            style={{ fontWeight: theme.font.heavy, flexShrink: 0 }}
          />
        </>
      )}
    </>
  );

  if (split) {
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div
            style={{
              width: textW,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 20 * u,
            }}
          >
            {words}
          </div>
          {design.background.image && (
            <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
          )}
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }
  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
      {design.background.image ? (
        <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          {g && strap && (
            <BigTime
              theme={theme}
              ink={ink}
              label="Score"
              time={team.match.isHome ? `${g.us}-${g.them}` : `${g.them}-${g.us}`}
              width={col.width}
            />
          )}
        </div>
      )}
      {words}
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/* ---------------------------------------------------------------- Starting XI */

export function BackPageLineup({ team, design, theme }: LayoutProps) {
  const { u, w, pad, wide, h } = theme;
  const ink = inks(theme);
  const rows = starterRows(team, design);
  const bench = benchNames(team, design);
  const col = column(theme, design);
  const split = wide && !design.featureImage;
  // Beside the headline column (0.44w - 1.5 pad), two gaps and the rule.
  const listW = split ? w - pad * 2 - (w * 0.44 - pad * 1.5) - pad * 2 - 6 * u : col.width;
  const twoCols = split || h / w < 1.1;
  const perCol = twoCols ? Math.ceil(rows.length / 2) : rows.length;
  // Everything else on the page, stacked: masthead, headline, deck, rules, subs, footer, gaps.
  const splash =
    fit(design.headlines.lineup, col.width, (theme.tall ? 220 : 180) * u, theme) * 0.86;
  const others =
    110 * u +
    splash +
    50 * u +
    (bench.length ? 90 * u : 0) +
    (design.footer || design.sponsorImage ? 80 * u : 20 * u) +
    26 * u * 6;
  const listH = split ? h - pad * 1.4 - 260 * u : h - pad * 1.4 - others;
  const rowH = Math.min(84 * u, listH / Math.max(perCol, 1));
  const colW = twoCols ? (listW - 36 * u) / 2 : listW;
  // One size for all eleven, set for the typical name; long ones fall back or condense.
  const numW = design.showNumbers ? rowH * 0.66 * 1.3 + rowH * 0.33 : 0;
  const fitted = fitNameList(
    rows.map((r) => r.name),
    colW - numW - (rows.some((r) => r.captain) ? rowH * 0.7 : 0),
    Math.min(rowH * 0.66, 70 * u),
    theme,
  );
  const nameSize = fitted.size;

  const list = (
    <div data-check-list="starting xi" style={{ display: "flex", gap: 36 * u, flexShrink: 0 }}>
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
                  gap: nameSize * 0.5,
                  borderTop: i ? `${1.5 * u}px solid ${alpha(ink.ink, 0.3)}` : undefined,
                  fontSize: nameSize,
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {design.showNumbers && (
                  <span
                    style={{
                      width: nameSize * 1.3,
                      flexShrink: 0,
                      color: ink.accent,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {r.number}
                  </span>
                )}
                <FittedName row={fitted.rows[rows.indexOf(r)]} />
                {r.captain && (
                  <span
                    style={{
                      fontSize: legible(theme, nameSize * 0.5),
                      background: ink.plate,
                      color: ink.plateInk,
                      padding: `${3 * u}px ${8 * u}px`,
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
  );

  const deck = [versusLine(team), team.match.venue].filter(Boolean).join(" · ");
  const deckShort = versusLine(team, true);
  const subs = bench.length ? (
    <Copy theme={theme} ink={ink} columns={1}>
      <b style={{ fontWeight: theme.font.heavy, color: ink.accent, textTransform: "uppercase" }}>
        Subs{" "}
      </b>
      {bench.join(", ")}
    </Copy>
  ) : null;

  if (split) {
    const leftW = w * 0.44 - pad * 1.5;
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: 20 * u }}>
            <Splash
              text={design.headlines.lineup}
              width={leftW}
              max={190 * u}
              theme={theme}
              color={ink.ink}
            />
            {deck && (
              <FitText
                options={[deck, deckShort]}
                width={leftW}
                max={40 * u}
                theme={theme}
                style={{ fontWeight: theme.font.heavy, color: ink.accent }}
              />
            )}
            {design.background.image && (
              <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
            )}
            {!design.background.image && <div style={{ flex: 1 }} />}
            {subs}
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>{list}</div>
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }

  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
      <Splash
        text={design.headlines.lineup}
        width={col.width}
        max={(theme.tall ? 220 : 180) * u}
        theme={theme}
        color={ink.ink}
      />
      {deck && (
        <FitText
          options={[deck, deckShort]}
          width={col.width}
          max={46 * u}
          theme={theme}
          style={{ fontWeight: theme.font.heavy, color: ink.accent, flexShrink: 0 }}
        />
      )}
      <Rule ink={ink.ink} weight={2 * u} u={u} />
      <div style={{ flex: 1, display: "flex", gap: 30 * u, minHeight: 0, alignItems: "center" }}>
        {list}
        {design.background.image && !twoCols && (
          <Picture
            design={design}
            theme={theme}
            ink={ink}
            style={{ flex: 1, alignSelf: "stretch" }}
          />
        )}
      </div>
      {subs}
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/* ---------------------------------------------------------------- Team news */

/** Height of the masthead block (plate, rules and the gap after it). */
function mastheadH(theme: Theme) {
  return 112 * theme.u;
}

/** Where the Team news diagram sits on the page; shared with the studio's drag handles. */
export function backPagePitchRect(theme: Theme, design: LayoutProps["design"]): Rect {
  const { u, w, h, pad, wide } = theme;
  const col = column(theme, design);
  const top0 = pad * 0.7 + mastheadH(theme) + 26 * u;
  const bottom = h - pad * 0.7 - (design.footer || design.sponsorImage ? 90 : 30) * u;
  if (wide && !design.featureImage) {
    const ph = bottom - top0 - 20 * u;
    // A broad pitch on wide posts, so names have room side by side.
    const pw = Math.min(ph * 1.25, w * 0.56 - pad);
    return { x: w - pad - pw, y: top0 + 10 * u, w: pw, h: ph };
  }
  const splash = fit(design.headlines.pitch, col.width, (theme.tall ? 200 : 150) * u, theme, 0.98);
  const top = top0 + splash * 0.84 * theme.font.leading + 26 * u + 50 * u + 30 * u;
  const bench = design.showSubs ? 80 * u : 0;
  const ph = bottom - bench - top - 40 * u;
  // Wider than tall on square posts: names get room side by side.
  const pw = Math.min(col.width, ph * (theme.tall ? 0.86 : 1.4));
  return { x: col.left + (col.width - pw) / 2, y: top, w: pw, h: ph };
}

export function BackPagePitch({ team, design, theme }: LayoutProps) {
  const { u, w, pad, wide } = theme;
  const ink = inks(theme);
  const col = column(theme, design);
  const rect = backPagePitchRect(theme, design);
  const split = wide && !design.featureImage;
  const bench = benchNames(team, design);
  const deck = [versusLine(team), team.lineup.formation].filter(Boolean).join(" · ");
  const deckShort = [versusLine(team, true), team.lineup.formation].filter(Boolean).join(" · ");
  const skin = {
    surface: ink.paper,
    line: alpha(ink.ink, 0.55),
    lineWidth: Math.max(2, 3 * u),
    token: ({ player, keeper, size, captain }: TokenArgs) => (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: keeper ? ink.ink : ink.plate,
          color: keeper ? ink.paper : ink.plateInk,
          border: `${Math.max(2, 3 * u)}px solid ${ink.ink}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: legible(theme, size * 0.44),
          fontWeight: theme.font.heavy,
          fontVariantNumeric: "tabular-nums",
          position: "relative",
        }}
      >
        {player.number.trim() || playerInitials(player.name)}
        {captain && (
          <span
            style={{
              position: "absolute",
              right: -size * 0.12,
              top: -size * 0.12,
              fontSize: legible(theme, size * 0.24),
              background: ink.paper,
              color: ink.ink,
              border: `${2 * u}px solid ${ink.ink}`,
              borderRadius: size,
              padding: `0 ${size * 0.08}px`,
            }}
          >
            C
          </span>
        )}
      </div>
    ),
    label: { color: ink.ink, weight: theme.font.heavy },
    scale: 0.62,
  };
  const subs = bench.length ? (
    <Copy theme={theme} ink={ink}>
      <b style={{ fontWeight: theme.font.heavy, color: ink.accent, textTransform: "uppercase" }}>
        Subs{" "}
      </b>
      {bench.join(", ")}
    </Copy>
  ) : null;
  const deckEl = deck && (
    <FitText
      options={[deck, deckShort]}
      width={split ? w * 0.42 : col.width}
      max={46 * u}
      theme={theme}
      style={{ fontWeight: theme.font.heavy, color: ink.accent, flexShrink: 0 }}
    />
  );

  if (split) {
    const leftW = rect.x - pad * 2;
    return (
      <>
        <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
          <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
          <div
            style={{ width: leftW, flex: 1, display: "flex", flexDirection: "column", gap: 22 * u }}
          >
            <Splash
              text={design.headlines.pitch}
              width={leftW}
              max={170 * u}
              theme={theme}
              color={ink.ink}
            />
            {deckEl}
            <div style={{ flex: 1 }} />
            {subs}
          </div>
          <Foot theme={theme} design={design} ink={ink} />
        </Page>
        <PitchDiagram team={team} design={design} theme={theme} rect={rect} skin={skin} />
      </>
    );
  }
  return (
    <>
      <Page theme={theme} design={design} left={col.left} width={col.width}>
        <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
        <Splash
          text={design.headlines.pitch}
          width={col.width}
          max={(theme.tall ? 200 : 150) * u}
          theme={theme}
          color={ink.ink}
        />
        {deckEl}
        <Rule ink={ink.ink} weight={2 * u} u={u} />
        <div style={{ flex: 1 }} />
        {subs}
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
      <PitchDiagram team={team} design={design} theme={theme} rect={rect} skin={skin} />
    </>
  );
}

type TokenArgs = Parameters<PitchSkin["token"]>[0];

/* ---------------------------------------------------------------- Substitutions */

export function BackPageSubs({ team, design, theme }: LayoutProps) {
  const { u, w, h, pad, wide } = theme;
  const ink = inks(theme);
  const col = column(theme, design);
  const split = wide && !design.featureImage;
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const subs = team.match.subs.slice(0, 5);
  const headline =
    subs.length === 1 && design.headlines.subs === "Substitutions"
      ? "Substitution"
      : design.headlines.subs;
  const listW = split ? w * 0.56 - pad : col.width;
  const splash = fit(headline, split ? w * 0.4 : col.width, (theme.tall ? 200 : 160) * u, theme);
  const listH = split
    ? h - pad * 1.4 - 240 * u
    : h - pad * 1.4 - mastheadH(theme) - splash * 0.9 - 200 * u;
  const rowH = Math.min((theme.tall ? 300 : 260) * u, listH / Math.max(subs.length, 1));
  const minuteW = rowH * 0.9;
  const names = subs
    .flatMap((s) => [s.onId, s.offId])
    .map((id) => {
      const p = id ? byId.get(id) : undefined;
      return p
        ? `${design.showNumbers ? p.number + " " : ""}${displayName(p, design.nameStyle)}`
        : "";
    });
  const longest = names.reduce((a, b) => (b.length > a.length ? b : a), "");
  const nameSize = Math.min(
    rowH * 0.32,
    fit(longest + "  ", listW - minuteW - rowH * 0.3, 999, theme),
  );

  const person = (id: string | null, on: boolean) => {
    const p = id ? byId.get(id) : undefined;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: nameSize * 0.35,
          fontSize: legible(theme, on ? nameSize : nameSize * 0.8),
          fontWeight: on ? theme.font.heavy : theme.font.light,
          color: on ? ink.ink : ink.soft,
          whiteSpace: "nowrap",
          lineHeight: 1.05,
        }}
      >
        <span
          style={{
            fontSize: legible(theme, nameSize * 0.42),
            color: on ? ink.accent : ink.soft,
            width: nameSize * 0.9,
          }}
        >
          {on ? "ON" : "OFF"}
        </span>
        {p && design.showNumbers && (
          <span style={{ color: on ? ink.accent : ink.soft, fontVariantNumeric: "tabular-nums" }}>
            {p.number}
          </span>
        )}
        <span>{p ? displayName(p, design.nameStyle) : ""}</span>
      </div>
    );
  };

  const list = (
    <div style={{ display: "flex", flexDirection: "column", width: listW, flexShrink: 0 }}>
      {subs.map((s, i) => (
        <div
          key={s.id}
          style={{
            height: rowH,
            display: "flex",
            alignItems: "center",
            gap: rowH * 0.2,
            borderTop: i ? `${2 * u}px solid ${ink.ink}` : undefined,
          }}
        >
          <div
            style={{
              width: minuteW,
              fontSize: legible(theme, rowH * 0.46),
              fontWeight: theme.font.heavy,
              color: "transparent",
              WebkitTextStroke: `${Math.max(2, 3 * u)}px ${ink.ink}`,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {s.minute ? `${s.minute}′` : ""}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: nameSize * 0.2, minWidth: 0 }}
          >
            {person(s.onId, true)}
            {person(s.offId, false)}
          </div>
        </div>
      ))}
    </div>
  );
  const deck = versusLine(team);

  if (split) {
    const leftW = w * 0.4 - pad;
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: 20 * u }}>
            <Splash text={headline} width={leftW} max={170 * u} theme={theme} color={ink.ink} />
            {deck && <Kicker text={deck} theme={theme} ink={ink} />}
            {design.background.image && (
              <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
            )}
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>{list}</div>
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }
  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
      <Splash
        text={headline}
        width={col.width}
        max={(theme.tall ? 200 : 160) * u}
        theme={theme}
        color={ink.ink}
      />
      {deck && <Kicker text={deck} theme={theme} ink={ink} />}
      <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>{list}</div>
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/* ---------------------------------------------------------------- Player of the match */

export function BackPageMotm({ team, design, theme }: LayoutProps) {
  const { u, w, pad, wide } = theme;
  const ink = inks(theme);
  const col = column(theme, design);
  const split = wide && !design.featureImage;
  const player = team.players.find((p) => p.id === team.match.motmId);
  const parts = player?.name.trim().split(/\s+/) ?? [];
  const first = player?.shirtName ? "" : parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const last = player?.shirtName || parts.at(-1) || "";
  const s = finalScore(team);
  const line = scoreLine(team, s.us, s.them);
  const lineShort = scoreLine(team, s.us, s.them, true);
  const note = team.match.motmNote.trim();
  const textW = split ? w * 0.52 - pad : col.width;

  const name = player ? (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {first && (
        <div
          style={{
            fontSize: legible(theme, fit(first, textW, (theme.tall ? 90 : 72) * u, theme)),
            fontWeight: theme.font.heavy,
            color: ink.accent,
            lineHeight: theme.font.leading,
            whiteSpace: "nowrap",
          }}
        >
          {first}
        </div>
      )}
      <Splash
        text={last}
        width={textW}
        max={(theme.tall ? 300 : 240) * u}
        theme={theme}
        color={ink.ink}
      />
    </div>
  ) : null;
  const quote = note ? (
    <Copy
      theme={theme}
      ink={ink}
      style={{ fontSize: legible(theme, (theme.tall ? 40 : 34) * u), fontStyle: "italic" }}
    >
      “{note}”
    </Copy>
  ) : null;
  const table = (
    <FactTable
      items={[
        { label: "Shirt", value: player?.number ?? "" },
        { label: "Result", value: line, alt: lineShort },
        { label: "Date", value: facts(team).date },
      ]}
      theme={theme}
      ink={ink}
      width={textW}
    />
  );
  const number = player?.number.trim() ? (
    <BigTime theme={theme} ink={ink} time={player.number} width={textW * 0.6} label="" />
  ) : (
    <div style={{ flex: 1 }} />
  );

  if (split) {
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} aside={design.headlines.motm} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: textW, display: "flex", flexDirection: "column", gap: 20 * u }}>
            <Kicker text={design.headlines.motm} theme={theme} ink={ink} />
            {name}
            {quote}
            <div style={{ flex: 1 }} />
            {table}
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          {design.background.image ? (
            <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
          ) : (
            number
          )}
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }
  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} aside={team.match.competition} />
      <Kicker text={design.headlines.motm} theme={theme} ink={ink} />
      {name}
      {design.background.image ? (
        <Picture design={design} theme={theme} ink={ink} style={{ flex: 1, minHeight: 0 }} />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          {!design.featureImage && number}
        </div>
      )}
      {quote}
      <Rule ink={ink.ink} weight={2 * u} u={u} />
      {table}
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}

/* ---------------------------------------------------------------- Fixtures */

export function BackPageFixtures({ team, design, theme }: LayoutProps) {
  const { u, w, h, pad, wide } = theme;
  const ink = inks(theme);
  const col = column(theme, design);
  const split = wide && !design.featureImage;
  const rows = fixtureRows(team).slice(0, theme.tall ? 8 : 6);
  // The list column is what's left beside the headline column and the rule.
  const listW = split ? w - pad * 2 - (w * 0.36 - pad) - pad * 2 - 6 * u : col.width;
  const splash = fit(design.headlines.fixtures, split ? w * 0.36 : col.width, 180 * u, theme);
  const listH = split
    ? h - pad * 1.4 - 240 * u
    : h - pad * 1.4 - mastheadH(theme) - splash - 160 * u;
  const rowH = Math.min((theme.tall ? 230 : 190) * u, listH / Math.max(rows.length, 1));
  const dateW = rowH * 1.25;
  const rightW = rowH * 1.4;
  const oppW = listW - dateW - rowH * 0.6 - rightW - 60 * u;
  const type = planFixtureRows(rows, oppW, rowH, theme);
  const { oppSize, compSize } = type;

  const list = (
    <div style={{ display: "flex", flexDirection: "column", width: listW, flexShrink: 0 }}>
      {rows.map((f, i) => {
        const [weekday, day, month] = formatMatchDate(f.date).split(" ");
        const right = f.score.trim() || f.kickoff;
        return (
          <div
            key={f.id}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: 20 * u,
              borderTop: i ? `${2 * u}px solid ${alpha(ink.ink, 0.4)}` : undefined,
            }}
          >
            <div style={{ width: dateW, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: legible(theme, rowH * 0.17),
                  color: ink.soft,
                  fontWeight: theme.font.heavy,
                }}
              >
                {weekday}
              </span>
              <span
                style={{
                  fontSize: legible(theme, rowH * 0.3),
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {day} {month}
              </span>
            </div>
            <span
              style={{
                width: rowH * 0.42,
                height: rowH * 0.42,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: f.isHome ? ink.plate : ink.ink,
                color: f.isHome ? ink.plateInk : ink.paper,
                fontSize: legible(theme, rowH * 0.24),
                fontWeight: theme.font.heavy,
              }}
            >
              {f.isHome ? "H" : "A"}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: oppSize,
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
                    fontSize: compSize,
                    color: ink.soft,
                    textTransform: "none",
                    letterSpacing: 0,
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
                fontSize: legible(theme, rowH * (f.score.trim() ? 0.5 : 0.38)),
                fontWeight: theme.font.heavy,
                fontVariantNumeric: "tabular-nums",
                color: f.score.trim() ? ink.ink : ink.accent,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {right}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (split) {
    const leftW = w * 0.36 - pad;
    return (
      <Page theme={theme} design={design} left={pad} width={w - pad * 2}>
        <Masthead team={team} theme={theme} ink={ink} />
        <div style={{ flex: 1, display: "flex", gap: pad, minHeight: 0 }}>
          <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: 20 * u }}>
            <Splash
              text={design.headlines.fixtures}
              width={leftW}
              max={170 * u}
              theme={theme}
              color={ink.ink}
            />
            {design.background.image && (
              <Picture design={design} theme={theme} ink={ink} style={{ flex: 1 }} />
            )}
          </div>
          <div style={{ width: 2 * u, background: ink.ink, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>{list}</div>
        </div>
        <Foot theme={theme} design={design} ink={ink} />
      </Page>
    );
  }
  return (
    <Page theme={theme} design={design} left={col.left} width={col.width}>
      <Masthead team={team} theme={theme} ink={ink} />
      <Splash
        text={design.headlines.fixtures}
        width={col.width}
        max={(theme.tall ? 220 : 180) * u}
        theme={theme}
        color={ink.ink}
      />
      <Rule ink={ink.ink} weight={2 * u} u={u} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>{list}</div>
      <Foot theme={theme} design={design} ink={ink} />
    </Page>
  );
}
