/**
 * "Stadium": the club's own pixel ground, crowd in the club colours, with the
 * graphic played on a big screen hanging over the stand.
 */
import type { CSSProperties, ReactNode } from "react";
import { alpha, mix, readableOn, SNOW } from "@/lib/color";
import { displayName, formatMatchDate } from "@/lib/format";
import { stadiumPaths } from "@/lib/lofi/stadium";
import type { Team } from "@/lib/types";
import { Crest, Footer } from "../parts";
import { fit, type Theme, legible } from "../theme";
import {
  Cutout,
  benchNames,
  facts,
  fitLine,
  finalScore,
  goalFacts,
  litAccent,
  NameLines,
  pairNames,
  planFixtureRows,
  playerInitials,
  scoreLine,
  sideNames,
  fitScorers,
  scorerLines,
  starterRows,
  versusLine,
  type LayoutProps,
} from "./shared";
import { PitchDiagram, type PitchSkin } from "./pitch";
import { fixtureRows } from "../selection";

const CACHE = new Map<string, { fill: string; d: string }[]>();

/** The pixel ground, filling the lower part of the frame. Painted once per club and size. */
function Ground({ team, theme }: { team: Team; theme: Theme }) {
  const { w, primary, secondary } = theme;
  const fullH = theme.h + theme.bleedTop + theme.bleedBottom;
  const boxH = fullH * (theme.wide ? 0.66 : 0.62);
  // Enough logical pixels down the scene that boards and stands keep their proportions.
  const lw = Math.max(176, Math.round((130 * w) / boxH));
  const lh = Math.round((lw * boxH) / w);
  const kit = { primary, secondary, look: "stripes" as const };
  const key = `${lw}x${lh}-${primary}-${secondary}-${team.name}-${team.shortName}`;
  let paths = CACHE.get(key);
  if (!paths) {
    paths = stadiumPaths({
      tunnel: false,
      w: lw,
      h: lh,
      t: 0,
      seed: 7,
      sky: "dusk",
      lights: 1,
      crowd: {
        from: [primary, secondary, "#f2f5ef"],
        to: [primary, secondary, "#f2f5ef"],
        switchX: 0,
      },
      waveX: null,
      tifo: {
        progress: 1,
        text: team.name || team.shortName,
        short: team.shortName,
        primary,
        secondary,
        width: 0.7,
      },
      scoreboard: null,
      boards: [primary, "#f2f5ef", secondary, "#11161d"],
      boardText: [[team.name, team.shortName].filter(Boolean)],
      boardFit: true,
      boardOffset: 0,
      players: [0.18, 0.34, 0.66, 0.82].map((fx, i) => ({
        x: Math.round(fx * lw),
        y: Math.round(lh * (0.78 + (i % 2) * 0.1)),
        kit,
        frame: (i % 2) as 0 | 1,
        seed: i / 4,
      })),
      ball: { x: Math.round(lw * 0.52), y: Math.round(lh * 0.86), z: 0 },
    });
    if (CACHE.size > 40) CACHE.clear();
    CACHE.set(key, paths);
  }
  return (
    <>
      {/* Night sky above the stand, deepening toward the top. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -theme.bleedTop,
          bottom: -theme.bleedBottom,
          background: `linear-gradient(180deg, #0b1027 0%, #1d2750 ${100 - (boxH / fullH) * 100 + 4}%)`,
        }}
      />
      <svg
        viewBox={`0 0 ${lw} ${lh}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
        style={{
          position: "absolute",
          left: 0,
          width: w,
          bottom: -theme.bleedBottom,
          height: boxH,
        }}
        aria-hidden
      >
        {paths.map((p) => (
          <path key={p.fill} fill={p.fill} d={p.d} />
        ))}
      </svg>
    </>
  );
}

/** Rectangle with pixel-stepped corners, as a clip path. */
function stepped(step: number): string {
  const s = `${step}px`;
  const s2 = `${step * 2}px`;
  return `polygon(${s2} 0, calc(100% - ${s2}) 0, calc(100% - ${s2}) ${s}, calc(100% - ${s}) ${s}, calc(100% - ${s}) ${s2}, 100% ${s2}, 100% calc(100% - ${s2}), calc(100% - ${s}) calc(100% - ${s2}), calc(100% - ${s}) calc(100% - ${s}), calc(100% - ${s2}) calc(100% - ${s}), calc(100% - ${s2}) 100%, ${s2} 100%, ${s2} calc(100% - ${s}), ${s} calc(100% - ${s}), ${s} calc(100% - ${s2}), 0 calc(100% - ${s2}), 0 ${s2}, ${s} ${s2}, ${s} ${s}, ${s2} ${s})`;
}

/** The screen: hung on two cables, a heavy stepped housing, a trim and scanlines. */
function Screen({
  theme,
  rect,
  children,
}: {
  theme: Theme;
  rect: { left: number; top: number; width: number; height: number };
  children: ReactNode;
}) {
  const { u, primary } = theme;
  const frame = Math.round(16 * u);
  const step = Math.round(10 * u);
  const inside = mix(primary, "#04060a", 0.84);
  return (
    <>
      {[0.2, 0.8].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            top: -theme.bleedTop,
            height: rect.top + theme.bleedTop + 4,
            left: rect.left + rect.width * x - 4 * u,
            width: 8 * u,
            background: "#0b0e14",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          ...rect,
          background: "#0b0e14",
          clipPath: stepped(step),
          padding: frame,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            background: inside,
            boxShadow: `inset 0 0 0 ${Math.round(4 * u)}px ${alpha(primary, 0.9)}, inset 0 0 ${80 * u}px ${alpha("#000000", 0.6)}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(120% 80% at 50% 0%, ${alpha(primary, 0.45)} 0%, ${alpha(primary, 0)} 70%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: Math.round(4 * u) + 26 * u,
              display: "flex",
              flexDirection: "column",
              color: SNOW,
            }}
          >
            {children}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `repeating-linear-gradient(180deg, ${alpha("#000000", 0.22)} 0 ${Math.max(1, 2 * u)}px, transparent ${Math.max(1, 2 * u)}px ${Math.max(3, 6 * u)}px)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </>
  );
}

/** Where the screen hangs: wide and high, or taller for the team sheet. */
function screenRect(theme: Theme, design: LayoutProps["design"], tall: boolean) {
  const { w, h, pad, wide } = theme;
  const right = design.featureImage ? (wide ? w * 0.54 : w * 0.64) : w - pad * 0.7;
  const left = pad * 0.7;
  const width = wide && !design.featureImage ? w * 0.7 : right - left;
  const x = wide && !design.featureImage ? (w - width) / 2 : left;
  const bottom = h * (tall ? 0.84 : wide ? 0.66 : h / w < 1.1 ? 0.6 : 0.56);
  return { left: x, top: pad * 0.6, width, height: bottom - pad * 0.6 };
}

/** The footer on a dark band along the bottom, like an advertising board. */
function Foot({ theme, design }: { theme: Theme; design: LayoutProps["design"] }) {
  if (!design.footer && !design.sponsorImage) return null;
  const { u, pad } = theme;
  return (
    <div
      style={{
        position: "absolute",
        left: pad * 0.7,
        right: pad * 0.7,
        // Stories: stay above the reply bar's safe line.
        bottom: theme.bleedBottom ? pad : pad * 0.5,
        padding: `${12 * u}px ${20 * u}px`,
        background: alpha("#05070b", 0.82),
        border: `${3 * u}px solid #0b0e14`,
      }}
    >
      <Footer theme={{ ...theme, fg: SNOW, muted: alpha(SNOW, 0.7) }} design={design} />
    </div>
  );
}

function Stage({
  team,
  design,
  theme,
  tall = false,
  children,
}: LayoutProps & {
  tall?: boolean;
  children: (inner: { width: number; height: number }) => ReactNode;
}) {
  const rect = screenRect(theme, design, tall);
  const inset = (16 + 4 + 26) * theme.u * 2;
  const own = !design.background.image;
  return (
    <>
      {own && <Ground team={team} theme={theme} />}
      {own && <Cutout design={design} theme={theme} />}
      <Screen theme={theme} rect={rect}>
        {children({ width: rect.width - inset, height: rect.height - inset })}
      </Screen>
      <Foot theme={theme} design={design} />
    </>
  );
}

const center: CSSProperties = { textAlign: "center", whiteSpace: "nowrap" };

function Title({
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
  color?: string;
}) {
  return (
    <div
      style={{
        ...center,
        fontSize: legible(theme, fit(text, width, max, theme)),
        fontWeight: theme.font.heavy,
        lineHeight: 0.88 * theme.font.leading,
        color: color ?? SNOW,
        flexShrink: 0,
      }}
    >
      {text}
    </div>
  );
}

/** A club on the screen: crest above its name, with optional lines below. */
function Club({
  name,
  crest,
  colors,
  theme,
  width,
  size,
  below,
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
  below?: ReactNode;
  /** A shared fit for a pair of clubs, so both names print at the same size. */
  fitted?: { lines: string[]; size: number };
}) {
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.12,
      }}
    >
      <Crest src={crest} kind={kind} name={name} colors={colors} size={size} theme={theme} />
      <NameLines
        lines={fitted?.lines ?? [name]}
        style={{
          ...center,
          fontSize: legible(theme, fitted?.size ?? fit(name, width, size * 0.3, theme)),
          fontWeight: theme.font.heavy,
          lineHeight: theme.font.leading,
        }}
      />
      {below}
    </div>
  );
}

/**
 * A caption line on the screen. Prefers `children`; if that would drop below the
 * minimum text size it tries `alt` (short names), then wraps onto two lines.
 */
function Small({
  children,
  alt,
  width,
  theme,
  color,
}: {
  children: string;
  alt?: string;
  width: number;
  theme: Theme;
  color?: string;
}) {
  const line = fitLine([children, alt ?? ""], width, 30 * theme.u, theme);
  return (
    <div
      style={{
        ...center,
        whiteSpace: line.wrap ? "normal" : "nowrap",
        textWrap: "balance",
        fontSize: legible(theme, line.size),
        lineHeight: 1.15 * theme.font.leading,
        color: color ?? alpha(SNOW, 0.78),
        fontWeight: theme.font.heavy,
        flexShrink: 0,
      }}
    >
      {line.text}
    </div>
  );
}

/* ---------------------------------------------------------------- Matchday */

export function ScreenFixture(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const f = facts(team);
  return (
    <Stage {...props}>
      {({ width, height }) => {
        const clubW = f.versus ? width * 0.36 : width * 0.6;
        const crest = Math.min(height * 0.36, clubW * 0.62);
        const when = [f.date, f.venue].filter(Boolean).join("  ·  ");
        const names = pairNames(
          sideNames(team, f.versus ? [f.home, f.away] : [f.home]),
          clubW,
          crest * 0.3,
          theme,
        );
        return (
          <>
            <Title text={design.headlines.fixture} width={width} max={height * 0.2} theme={theme} />
            {f.competition && (
              <Small width={width} theme={theme} color={litAccent(theme)}>
                {f.competition}
              </Small>
            )}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 0,
              }}
            >
              <Club
                {...f.home}
                kind={f.home.us ? team.crestKind : undefined}
                theme={theme}
                width={clubW}
                size={crest}
                fitted={{ lines: names.lines[0], size: names.size }}
              />
              {f.versus && (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10 * u,
                    }}
                  >
                    <span
                      style={{
                        fontSize: legible(
                          theme,
                          Math.min(
                            crest * 0.5,
                            fit(f.kickoff || "v", width * 0.24, 140 * u, theme),
                          ),
                        ),
                        fontWeight: theme.font.heavy,
                        color: litAccent(theme),
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f.kickoff || "v"}
                    </span>
                  </div>
                  <Club
                    {...f.away}
                    kind={f.away.us ? team.crestKind : undefined}
                    theme={theme}
                    width={clubW}
                    size={crest}
                    fitted={{ lines: names.lines[1], size: names.size }}
                  />
                </>
              )}
            </div>
            {!f.versus && f.kickoff && (
              <Small width={width} theme={theme} color={litAccent(theme)}>
                {f.kickoff}
              </Small>
            )}
            {when && (
              <Small width={width} theme={theme}>
                {when}
              </Small>
            )}
          </>
        );
      }}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Full time / Half time */

export function ScreenResult(props: LayoutProps & { half?: boolean }) {
  const { team, design, theme, half = false } = props;
  const { u } = theme;
  const f = facts(team, half);
  const sc = finalScore(team, half);
  const headline = half ? design.headlines.halftime : design.headlines.result;
  return (
    <Stage {...props}>
      {({ width, height }) => {
        const clubW = width * 0.27;
        const sides = f.versus ? [f.home, f.away] : [f.home];
        // Scorers: one size across both sides, surnames when full names won't fit.
        const fitted = fitScorers(
          sides.map((side) => scorerLines(team, design, side.goals).filter((l) => l.name)),
          clubW,
          26 * u,
          theme,
        );
        const scorerRows = Math.max(0, ...fitted.sets.map((ls) => ls.length));
        const scorersH = scorerRows * fitted.size * 1.25;
        // The crest gives way to a long scorer list so nothing runs off the screen.
        const crest = Math.max(
          60 * u,
          Math.min(height * 0.24, clubW * 0.56, (height * 0.62 - scorersH) / 1.5),
        );
        const names = pairNames(
          sideNames(team, f.versus ? [f.home, f.away] : [f.home]),
          clubW,
          crest * 0.32,
          theme,
        );
        const homeScore = f.home.us ? sc.us : sc.them;
        const awayScore = f.home.us ? sc.them : sc.us;
        const scorers = (side: typeof f.home) => {
          const ls = fitted.sets[sides.indexOf(side)] ?? [];
          if (!ls.length) return null;
          return (
            <div
              data-check-list="scorers"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4 * u,
                maxWidth: clubW,
              }}
            >
              {ls.map((l) => (
                <div
                  key={l.id}
                  style={{
                    ...center,
                    // A name too long even as a surname breaks at its hyphen.
                    whiteSpace: "normal",
                    textWrap: "balance",
                    fontSize: fitted.size,
                    lineHeight: 1.1,
                    color: alpha(SNOW, 0.75),
                  }}
                >
                  {l.text}
                  {l.minute && ` ${l.minute}′`}
                </div>
              ))}
            </div>
          );
        };
        const score = f.versus ? `${homeScore}-${awayScore}` : String(homeScore);
        return (
          <>
            <Title text={headline} width={width} max={height * 0.15} theme={theme} />
            {f.competition && (
              <Small width={width} theme={theme} color={litAccent(theme)}>
                {f.competition}
              </Small>
            )}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 0,
              }}
            >
              <Club
                {...f.home}
                kind={f.home.us ? team.crestKind : undefined}
                theme={theme}
                width={clubW}
                size={crest}
                below={scorers(f.home)}
                fitted={{ lines: names.lines[0], size: names.size }}
              />
              <div
                style={{
                  ...center,
                  fontSize: legible(
                    theme,
                    Math.min(
                      fit(score, width - clubW * 2 - 40 * u, 9999, theme, 0.95),
                      height * 0.56,
                    ),
                  ),
                  fontWeight: theme.font.heavy,
                  color: litAccent(theme),
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 0.9,
                  textShadow: `0 0 ${30 * u}px ${alpha(litAccent(theme), 0.55)}`,
                }}
              >
                {score}
              </div>
              {f.versus ? (
                <Club
                  {...f.away}
                  kind={f.away.us ? team.crestKind : undefined}
                  theme={theme}
                  width={clubW}
                  size={crest}
                  below={scorers(f.away)}
                  fitted={{ lines: names.lines[1], size: names.size }}
                />
              ) : (
                <div style={{ width: clubW }} />
              )}
            </div>
          </>
        );
      }}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Goal */

export function ScreenGoal(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const g = goalFacts(team, design);
  const score = g ? scoreLine(team, g.us, g.them) : "";
  return (
    <Stage {...props}>
      {({ width, height }) => (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18 * u,
          }}
        >
          <Title
            text={design.headlines.goal}
            width={width}
            max={height * 0.42}
            theme={theme}
            color={litAccent(theme)}
          />
          {g?.scorer && (
            <Title text={g.scorer} width={width * 0.9} max={height * 0.2} theme={theme} />
          )}
          {(score || g?.minute) && (
            <Small
              width={width}
              theme={theme}
              alt={[g?.minute ? `${g.minute}′` : "", g ? scoreLine(team, g.us, g.them, true) : ""]
                .filter(Boolean)
                .join("   ")}
            >
              {[g?.minute ? `${g.minute}′` : "", score].filter(Boolean).join("   ")}
            </Small>
          )}
        </div>
      )}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Starting XI */

export function ScreenLineup(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const rows = starterRows(team, design);
  const bench = benchNames(team, design);
  const vs = [versusLine(team), facts(team).date].filter(Boolean).join("  ·  ");
  return (
    <Stage {...props} tall>
      {({ width, height }) => {
        const perCol = Math.ceil(rows.length / 2);
        const listH = height - 220 * u - (bench.length ? 80 * u : 0);
        const rowH = Math.min(70 * u, listH / Math.max(perCol, 1));
        const colW = (width - 40 * u) / 2;
        const longest = rows.reduce((a, r) => (r.name.length > a.length ? r.name : a), "");
        const size = Math.min(rowH * 0.7, fit(longest + "    ", colW, 56 * u, theme));
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 22 * u,
              }}
            >
              <Crest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={100 * u}
                theme={theme}
              />
              <Title
                text={design.headlines.lineup}
                width={width - 140 * u}
                max={110 * u}
                theme={theme}
              />
            </div>
            {vs && (
              <Small width={width} theme={theme} color={litAccent(theme)}>
                {vs}
              </Small>
            )}
            <div
              style={{ flex: 1, display: "flex", gap: 40 * u, alignItems: "center", minHeight: 0 }}
            >
              {[rows.slice(0, perCol), rows.slice(perCol)].map((c, ci) => (
                <div key={ci} style={{ width: colW, display: "flex", flexDirection: "column" }}>
                  {c.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        height: rowH,
                        display: "flex",
                        alignItems: "center",
                        gap: size * 0.45,
                        fontSize: legible(theme, size),
                        fontWeight: theme.font.heavy,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {design.showNumbers && (
                        <span
                          style={{
                            width: size * 1.3,
                            textAlign: "right",
                            color: litAccent(theme),
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {r.number}
                        </span>
                      )}
                      <span>{r.name}</span>
                      {r.captain && (
                        <span
                          style={{ fontSize: legible(theme, size * 0.6), color: litAccent(theme) }}
                        >
                          (C)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {bench.length > 0 && (
              <div
                style={{
                  ...center,
                  whiteSpace: "normal",
                  fontSize: legible(theme, 24 * u),
                  lineHeight: 1.3,
                  color: alpha(SNOW, 0.75),
                }}
              >
                <span style={{ color: litAccent(theme), fontWeight: theme.font.heavy }}>Subs </span>
                {bench.join(", ")}
              </div>
            )}
          </>
        );
      }}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Team news */

/** Where the tactics board sits on the big screen; shared with the studio's drag handles. */
export function screenPitchGeometry(theme: Theme, design: LayoutProps["design"]) {
  const { u, wide } = theme;
  const rect = screenRect(theme, design, true);
  const inset = (16 + 4 + 26) * u;
  const inner = {
    left: rect.left + inset,
    top: rect.top + inset,
    width: rect.width - inset * 2,
    height: rect.height - inset * 2,
  };
  const split = wide && !design.featureImage;
  let box: { left: number; top: number; width: number; height: number };
  let aspect: number;
  if (split) {
    // Wide: a broad pitch, so names have room side by side.
    const headW = inner.width * 0.36;
    box = { ...inner, left: inner.left + headW + 30 * u, width: inner.width - headW - 30 * u };
    aspect = 1.25;
  } else {
    const headH = 170 * u;
    const bench = design.showSubs ? 80 * u : 0;
    box = { ...inner, top: inner.top + headH, height: inner.height - headH - bench };
    aspect = theme.tall ? 0.86 : 1.3;
  }
  const pw = Math.min(box.width, box.height * aspect);
  const ph = Math.min(box.height, pw / aspect);
  return {
    split,
    inner,
    rect: { x: box.left + (box.width - pw) / 2, y: box.top + (box.height - ph) / 2, w: pw, h: ph },
  };
}

export function ScreenPitch(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const g = screenPitchGeometry(theme, design);
  const bench = benchNames(team, design);
  const vs = [versusLine(team), team.lineup.formation].filter(Boolean).join("  ·  ");
  const skin: PitchSkin = {
    surface: `repeating-linear-gradient(180deg, #123f26 0 10%, #164a2c 10% 20%)`,
    line: alpha(SNOW, 0.55),
    lineWidth: Math.max(2, 3 * u),
    scale: 0.62,
    token: ({ player, keeper, size, captain }) => {
      const kit = keeper ? theme.kitAlt : theme.kit;
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: kit,
            color: readableOn(kit),
            boxShadow: `0 0 0 ${Math.max(2, 3 * u)}px ${alpha(SNOW, 0.85)}, 0 0 ${18 * u}px ${alpha(kit, 0.8)}`,
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
                width: Math.max(size * 0.4, legible(theme, size * 0.26) * 1.45),
                height: Math.max(size * 0.4, legible(theme, size * 0.26) * 1.45),
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: litAccent(theme),
                color: "#05070a",
                fontSize: legible(theme, size * 0.26),
              }}
            >
              C
            </span>
          )}
        </div>
      );
    },
    label: { color: SNOW, weight: theme.font.heavy },
  };
  const head = (width: number) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 * u }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 * u }}>
        <Crest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={90 * u}
          theme={theme}
        />
        <Title text={design.headlines.pitch} width={width - 120 * u} max={110 * u} theme={theme} />
      </div>
      {vs && (
        <Small width={width} theme={theme} color={litAccent(theme)}>
          {vs}
        </Small>
      )}
    </div>
  );
  const subs = bench.length ? (
    <div
      style={{
        ...center,
        whiteSpace: "normal",
        fontSize: legible(theme, 22 * u),
        lineHeight: 1.3,
        color: alpha(SNOW, 0.75),
      }}
    >
      <span style={{ color: litAccent(theme), fontWeight: theme.font.heavy }}>Subs </span>
      {bench.join(", ")}
    </div>
  ) : null;
  return (
    <>
      <Stage {...props} tall>
        {() =>
          g.split ? (
            <div
              style={{
                width: g.inner.width * 0.4,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {head(g.inner.width * 0.4)}
              {subs}
            </div>
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {head(g.inner.width)}
              {subs}
            </div>
          )
        }
      </Stage>
      <PitchDiagram team={team} design={design} theme={theme} rect={g.rect} skin={skin} />
    </>
  );
}

/* ---------------------------------------------------------------- Substitutions */

export function ScreenSubs(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const subs = team.match.subs.slice(0, 5);
  const headline =
    subs.length === 1 && design.headlines.subs === "Substitutions"
      ? "Substitution"
      : design.headlines.subs;
  return (
    <Stage {...props}>
      {({ width, height }) => {
        const titleH = Math.min(height * 0.18, 120 * u);
        const rowH = Math.min((height - titleH - 30 * u) / Math.max(subs.length, 1), height * 0.36);
        const numSize = rowH * 0.5;
        const sideW = (width - rowH * 1.4) / 2;
        const names = subs
          .flatMap((x) => [x.onId, x.offId])
          .map((id) => {
            const p = id ? byId.get(id) : undefined;
            return p ? displayName(p, design.nameStyle) : "";
          });
        const longest = names.reduce((a, b) => (b.length > a.length ? b : a), "");
        // Narrow screens put the name under the number; wide ones beside it.
        const stacked = sideW < 520 * u;
        const nameSize = Math.min(
          rowH * (stacked ? 0.17 : 0.2),
          fit(longest, stacked ? sideW : sideW - numSize * 1.4, 999, theme),
        );
        const side = (id: string | null, on: boolean) => {
          const p = id ? byId.get(id) : undefined;
          const color = on ? "#3ee27f" : "#ff5a4e";
          return (
            <div
              style={{
                width: sideW,
                display: "flex",
                alignItems: "center",
                flexDirection: stacked ? "column" : on ? "row" : "row-reverse",
                gap: (stacked ? 6 : 18) * u,
              }}
            >
              <span
                style={{
                  fontSize: legible(theme, numSize),
                  fontWeight: theme.font.heavy,
                  color,
                  textShadow: `0 0 ${24 * u}px ${alpha(color, 0.6)}`,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 0.9,
                  minWidth: numSize * 0.9,
                  textAlign: "center",
                }}
              >
                {p?.number?.trim() || (p ? playerInitials(p.name) : "")}
              </span>
              <span
                style={{
                  fontSize: legible(theme, nameSize),
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                  color: on ? SNOW : alpha(SNOW, 0.7),
                  textAlign: stacked ? "center" : on ? "left" : "right",
                }}
              >
                {p ? displayName(p, design.nameStyle) : ""}
              </span>
            </div>
          );
        };
        return (
          <>
            <Title text={headline} width={width} max={titleH} theme={theme} />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              {subs.map((x, i) => (
                <div
                  key={x.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: i ? `${2 * u}px solid ${alpha(SNOW, 0.15)}` : undefined,
                  }}
                >
                  {side(x.offId, false)}
                  <div
                    style={{
                      width: rowH * 1.2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4 * u,
                    }}
                  >
                    <span
                      style={{
                        fontSize: legible(theme, rowH * 0.3),
                        color: alpha(SNOW, 0.8),
                        lineHeight: 1,
                      }}
                    >
                      ⇄
                    </span>
                    {x.minute && (
                      <span
                        style={{ fontSize: legible(theme, rowH * 0.16), color: litAccent(theme) }}
                      >
                        {x.minute}′
                      </span>
                    )}
                  </div>
                  {side(x.onId, true)}
                </div>
              ))}
            </div>
          </>
        );
      }}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Player of the match */

export function ScreenMotm(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const player = team.players.find((p) => p.id === team.match.motmId);
  const sc = finalScore(team);
  const line = scoreLine(team, sc.us, sc.them, true);
  const note = team.match.motmNote.trim();
  const parts = player?.name.trim().split(/\s+/) ?? [];
  const first = player?.shirtName ? "" : parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const last = player?.shirtName || parts.at(-1) || "";
  return (
    <Stage {...props} tall>
      {({ width, height }) => (
        <>
          <Title
            text={design.headlines.motm}
            width={width}
            max={Math.min(100 * u, height * 0.12)}
            theme={theme}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10 * u,
              minHeight: 0,
            }}
          >
            {player?.number && (
              <div
                style={{
                  fontSize: legible(
                    theme,
                    Math.min(height * 0.36, fit(player.number, width * 0.5, 9999, theme)),
                  ),
                  fontWeight: theme.font.heavy,
                  lineHeight: 0.85,
                  color: litAccent(theme),
                  textShadow: `0 0 ${40 * u}px ${alpha(litAccent(theme), 0.6)}`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {player.number}
              </div>
            )}
            {first && (
              <Title
                text={first}
                width={width * 0.8}
                max={Math.min(70 * u, height * 0.08)}
                theme={theme}
                color={alpha(SNOW, 0.8)}
              />
            )}
            {last && <Title text={last} width={width * 0.92} max={height * 0.2} theme={theme} />}
          </div>
          {note && (
            <div
              style={{
                ...center,
                whiteSpace: "normal",
                fontSize: legible(theme, 30 * u),
                color: alpha(SNOW, 0.85),
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {note}
            </div>
          )}
          {line && (
            <Small width={width} theme={theme}>
              {line}
            </Small>
          )}
        </>
      )}
    </Stage>
  );
}

/* ---------------------------------------------------------------- Fixtures */

export function ScreenFixtures(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u } = theme;
  const rows = fixtureRows(team).slice(0, theme.tall ? 7 : 6);
  return (
    <Stage {...props} tall>
      {({ width, height }) => {
        const titleH = Math.min(110 * u, height * 0.14);
        // Rows fill the screen; the opponent leads each one (two lines before it shrinks).
        const rowH = Math.min(
          (theme.tall ? 190 : 140) * u,
          (height - titleH - 40 * u) / Math.max(rows.length, 1),
        );
        const dateW = rowH * 1.15;
        const rightW = rowH * 1.25;
        const oppW = width - dateW - rightW - rowH * 0.4 - 60 * u;
        const type = planFixtureRows(rows, oppW, rowH, theme);
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20 * u,
              }}
            >
              <Crest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={titleH}
                theme={theme}
              />
              <Title
                text={design.headlines.fixtures}
                width={width - titleH - 40 * u}
                max={titleH}
                theme={theme}
              />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              {rows.map((f, i) => {
                const [weekday, day, month] = formatMatchDate(f.date).split(" ");
                return (
                  <div
                    key={f.id}
                    style={{
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      gap: 20 * u,
                      borderTop: i ? `${2 * u}px solid ${alpha(SNOW, 0.15)}` : undefined,
                    }}
                  >
                    <span
                      style={{
                        width: dateW,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        color: alpha(SNOW, 0.75),
                        fontWeight: theme.font.heavy,
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      <span style={{ fontSize: legible(theme, rowH * 0.18) }}>{weekday}</span>
                      <span style={{ fontSize: legible(theme, rowH * 0.26), color: SNOW }}>
                        {day} {month}
                      </span>
                    </span>
                    <span
                      style={{
                        width: rowH * 0.4,
                        flexShrink: 0,
                        fontSize: legible(theme, rowH * 0.28),
                        color: litAccent(theme),
                        fontWeight: theme.font.heavy,
                      }}
                    >
                      {f.isHome ? "H" : "A"}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
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
                            color: alpha(SNOW, 0.6),
                            lineHeight: 1.15,
                            marginTop: 4 * u,
                          }}
                        >
                          {f.competition}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        width: rightW,
                        textAlign: "right",
                        fontSize: legible(theme, rowH * 0.38),
                        fontWeight: theme.font.heavy,
                        color: litAccent(theme),
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f.score.trim() || f.kickoff}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        );
      }}
    </Stage>
  );
}
