import { ArrowFatDownIcon, ArrowFatUpIcon } from "@phosphor-icons/react/ssr";
import { displayName, formatMatchDate } from "@/lib/format";
import { scorerLabel, scorerOf, spotlightGoal } from "@/lib/score";
import type { Design, Player, Team } from "@/lib/types";
import { fitNames, sides } from "./Fixture";
import { balance, Crest, fitText, Footer, Heading, MatchMeta, minPx, px, textUnits } from "./parts";
import { fixtureRows } from "./selection";
import type { Theme } from "./theme";

interface Props {
  team: Team;
  design: Design;
  theme: Theme;
}

/** Shared top block: crest beside the headline and match line. */
function Masthead({
  team,
  theme,
  headline,
  showMeta = true,
}: Props & { headline: string; showMeta?: boolean }) {
  const { u, pad, tall } = theme;
  const crest = (tall ? 150 : 120) * u;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30 * u }}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={crest}
        theme={theme}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 * u }}>
        <Heading
          text={headline}
          width={theme.right - pad - crest - 30 * u}
          max={(tall ? 150 : 124) * u}
          theme={theme}
        />
        {showMeta && <MatchMeta team={team} theme={theme} size={(tall ? 30 : 26) * u} />}
      </div>
    </div>
  );
}

function Column({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const { pad } = theme;
  return (
    <div
      style={{
        position: "absolute",
        left: pad,
        top: pad,
        bottom: pad,
        width: theme.right - pad,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

export { spotlightGoal };

export function goalLettering(team: Team): string | undefined {
  const s = spotlightGoal(team);
  return s ? scorerOf(team, s.goal)?.number : undefined;
}

function ScoreStrip({ team, theme, us, them }: Props & { us: number; them: number }) {
  const { u } = theme;
  const [home, away] = sides(team);
  const homeScore = home.us ? us : them;
  const awayScore = home.us ? them : us;
  const crest = 84 * u;
  const width = theme.right - theme.pad;
  const nameW = (width - crest * 2 - 260 * u) / 2;
  const names = fitNames([home, away], nameW, 40 * u, theme, {
    minRatio: 0.7,
    together: true,
  });
  const label = (lines: string[]) => (
    <span
      style={{
        display: "inline-block",
        fontSize: names.size,
        fontWeight: theme.font.heavy,
        lineHeight: 0.95 * theme.font.leading,
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </span>
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${crest}px 1fr auto 1fr ${crest}px`,
        alignItems: "center",
        gap: 20 * u,
      }}
    >
      <Crest
        src={home.crest}
        kind={home.crestKind}
        name={home.name}
        colors={home.colors}
        size={crest}
        theme={theme}
      />
      <div style={{ textAlign: "right" }}>{label(names.lines[0])}</div>
      <div
        style={{
          background: theme.fg,
          color: theme.ground,
          fontWeight: theme.font.heavy,
          fontSize: 64 * u,
          lineHeight: 1,
          padding: `${12 * u}px ${24 * u}px`,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {homeScore}-{awayScore}
      </div>
      <div>{label(names.lines[1])}</div>
      <Crest
        src={away.crest}
        kind={away.crestKind}
        name={away.name}
        colors={away.colors}
        size={crest}
        theme={theme}
      />
    </div>
  );
}

/**
 * The scorer and minute on one line: the minute keeps its size, the name fits the
 * rest, falling back to initial + surname, then the surname, before it would be
 * printed too small.
 */
function scorerLine(
  team: Team,
  design: Design,
  theme: Theme,
  width: number,
  max: number,
  minuteSize: number,
) {
  const spot = spotlightGoal(team);
  if (!spot) return null;
  const minute = spot.goal.minute ? `${spot.goal.minute}′` : "";
  const minuteW = minute ? textUnits(minute) * theme.font.glyph * minuteSize + 28 * theme.u : 0;
  const room = width - minuteW;
  const styles = [design.nameStyle, "initial", "surname"] as const;
  let name = scorerLabel(team, spot.goal, design.nameStyle);
  let size = fitText(name, room, max, theme);
  for (const style of styles) {
    const n = scorerLabel(team, spot.goal, style);
    const s = fitText(n, room, max, theme);
    name = n;
    size = s;
    if (s >= Math.min(max, minPx(theme) * 1.6)) break;
  }
  return { name, size: px(theme, size), minute };
}

export function GoalGraphic({ team, design, theme }: Props) {
  const { u, pad, tall, wide } = theme;
  const spot = spotlightGoal(team);
  const textW = (design.featureImage ? (wide ? 0.55 : 0.62) : 1) * (theme.right - pad);
  const minuteSize = (tall ? 96 : 76) * u;
  const line = scorerLine(team, design, theme, textW, (tall ? 120 : 96) * u, minuteSize);

  return (
    <Column theme={theme}>
      <Crest
        src={team.crest}
        kind={team.crestKind}
        name={team.name}
        colors={team.colors}
        size={(tall ? 130 : 104) * u}
        theme={theme}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Heading
          text={design.headlines.goal}
          width={theme.right - pad}
          max={(tall ? 560 : wide ? 330 : 470) * u}
          theme={theme}
        />
        {line && (
          <div
            style={{
              marginTop: 24 * u,
              display: "flex",
              alignItems: "baseline",
              gap: 28 * u,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: line.size, fontWeight: theme.font.heavy }}>{line.name}</span>
            {line.minute && (
              <span
                style={{
                  fontSize: minuteSize,
                  fontWeight: theme.font.heavy,
                  color: theme.accent,
                  textTransform: "none",
                }}
              >
                {line.minute}
              </span>
            )}
          </div>
        )}
      </div>
      {spot && (
        <ScoreStrip team={team} design={design} theme={theme} us={spot.us} them={spot.them} />
      )}
      <Footer theme={theme} design={design} style={{ marginTop: (tall ? 64 : 40) * u }} />
    </Column>
  );
}

export function SubsGraphic({ team, design, theme }: Props) {
  const { u, tall, wide } = theme;
  const byId = new Map(team.players.map((p) => [p.id, p]));
  // A row just added in the studio has nobody in it yet; it doesn't print.
  const subs = team.match.subs.filter((s) => s.onId || s.offId).slice(0, 5);
  // The default heading follows the count; a custom one is left alone.
  const headline =
    subs.length === 1 && design.headlines.subs === "Substitutions"
      ? "Substitution"
      : design.headlines.subs;
  // Rows shrink until the longest name fits beside the minute, arrow and number.
  const colW = (design.featureImage ? (wide ? 0.55 : 0.62) : 1) * (theme.right - theme.pad);
  const longest = subs
    .flatMap((s) => [s.onId, s.offId])
    .map((id) => (id ? byId.get(id) : undefined))
    .reduce((n, p) => Math.max(n, p ? displayName(p, design.nameStyle).length : 0), 0);
  const fixed = 1.9 + 0.7 + 0.35 + (design.showNumbers ? 1.55 : 0);
  const rowSize = Math.min(
    (subs.length <= 2 ? 100 : subs.length <= 3 ? 72 : 54) * u * (tall ? 1.5 : wide ? 0.85 : 1),
    colW / (fixed + longest * theme.font.glyph * 1.04),
  );

  const line = (p: Player | undefined, on: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: rowSize * 0.35 }}>
      {on ? (
        <ArrowFatUpIcon weight="fill" size={rowSize * 0.7} color={theme.accent} />
      ) : (
        <ArrowFatDownIcon weight="fill" size={rowSize * 0.7} color={theme.muted} />
      )}
      {design.showNumbers && p && (
        <span
          style={{
            width: rowSize * 1.2,
            color: on ? theme.accent : theme.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {p.number}
        </span>
      )}
      <span style={{ color: on ? theme.fg : theme.muted }}>
        {p ? displayName(p, design.nameStyle) : ""}
      </span>
    </div>
  );

  return (
    <Column theme={theme}>
      <Masthead team={team} design={design} theme={theme} headline={headline} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingBottom: (tall ? 110 : wide ? 40 : 120) * u,
          // Story has height to spare: spread the rows instead of bunching them.
          gap: rowSize * (tall ? 1.5 : 0.9),
        }}
      >
        {subs.map((s) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: `${rowSize * 1.9}px 1fr`,
              alignItems: "start",
              fontSize: rowSize,
              fontWeight: theme.font.heavy,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: rowSize * 0.8,
                color: theme.accent,
                paddingTop: rowSize * 0.12,
                textTransform: "none",
              }}
            >
              {s.minute ? `${s.minute}′` : ""}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: rowSize * 0.3 }}>
              {line(s.onId ? byId.get(s.onId) : undefined, true)}
              {line(s.offId ? byId.get(s.offId) : undefined, false)}
            </div>
          </div>
        ))}
      </div>
      <Footer theme={theme} design={design} />
    </Column>
  );
}

export function motmLettering(team: Team): string | undefined {
  return team.players.find((p) => p.id === team.match.motmId)?.number;
}

export function MotmGraphic({ team, design, theme }: Props) {
  const { u, w, pad, tall, wide } = theme;
  const player = team.players.find((p) => p.id === team.match.motmId);
  const parts = player?.name.trim().split(/\s+/) ?? [];
  const first = player?.shirtName ? "" : parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const last = player?.shirtName || parts.at(-1) || "";
  // Without a player photo, a big crest fills the space on the right.
  // Smaller on square, where the name block below leaves less room.
  const square = theme.h / w < 1.1;
  // An uploaded crest sits on a plate (see Crest), so keep that tile modest.
  const crestFill =
    !design.featureImage && !wide
      ? Math.min(w * (team.crest ? 0.34 : 0.42), (tall ? 520 : square ? 320 : 420) * u)
      : 0;
  // Below the two-line headline, never over it.
  const crestTop = Math.max(theme.h * 0.38 - crestFill / 2, pad + 2 * (tall ? 170 : 136) * u * 0.9);
  const textW = (design.featureImage ? (wide ? 0.5 : 0.6) : 1) * (theme.right - pad);
  const m = team.match;
  const [home, away] = sides(team);
  // The result line under the name: full club names when they fit on one line.
  const lineSize = px(theme, 30 * u);
  const longLine = `${home.name} 0-0 ${away.name}`;
  const useShort = textUnits(longLine) * theme.font.glyph * lineSize > textW;
  const matchName = (side: typeof home) => (useShort && side.short ? side.short : side.name);

  return (
    <Column theme={theme}>
      <Heading
        text={design.headlines.motm}
        width={(theme.right - pad) * (design.featureImage ? 0.7 : 1)}
        max={(tall ? 170 : 136) * u}
        theme={theme}
        twoLines
      />
      {crestFill > 0 && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: crestTop - pad,
          }}
        >
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={crestFill}
            theme={theme}
          />
        </div>
      )}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      >
        {/* A squad pasted without numbers has no number to show: no empty space either. */}
        {player?.number.trim() && (
          <div
            style={{
              fontSize: (tall ? 150 : 120) * u,
              fontWeight: theme.font.heavy,
              color: theme.accent,
              lineHeight: 0.9,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {player.number}
          </div>
        )}
        {first && (
          <div
            style={{
              marginTop: 18 * u,
              fontSize: px(theme, fitText(first, textW, (tall ? 76 : 60) * u, theme)),
              fontWeight: theme.font.light,
            }}
          >
            {first}
          </div>
        )}
        <div
          style={{
            fontSize: px(theme, fitText(last, textW, (tall ? 230 : 180) * u, theme)),
            fontWeight: theme.font.heavy,
            lineHeight: 0.86 * theme.font.leading,
            marginLeft: -4 * u,
          }}
        >
          {last}
        </div>
        {m.motmNote && (
          <div
            style={{
              marginTop: 24 * u,
              fontSize: px(theme, (tall ? 36 : 30) * u),
              color: theme.muted,
              maxWidth: textW,
              lineHeight: 1.2,
            }}
          >
            {m.motmNote}
          </div>
        )}
        {m.opponent.trim() && (
          <div
            style={{
              marginTop: (tall ? 60 : 40) * u,
              display: "flex",
              alignItems: "center",
              gap: 18 * u,
              fontSize: lineSize,
              fontWeight: theme.font.heavy,
              whiteSpace: "nowrap",
            }}
          >
            <span>{matchName(home)}</span>
            <span style={{ color: theme.accent, fontVariantNumeric: "tabular-nums" }}>
              {home.score}-{away.score}
            </span>
            <span>{matchName(away)}</span>
          </div>
        )}
      </div>
      <Footer theme={theme} design={design} style={{ marginTop: 36 * u }} />
    </Column>
  );
}

export function FixturesGraphic({ team, design, theme }: Props) {
  const { u, h, pad, tall, wide } = theme;
  const floor = minPx(theme);
  const listW = (design.featureImage ? 0.62 : 1) * (theme.right - pad);
  // Wide posts have the width but not the height: the list runs in two columns.
  const cols = wide && !design.featureImage ? 2 : 1;
  const colGap = 56 * u;
  const colW = (listW - colGap * (cols - 1)) / cols;
  const glyph = theme.font.glyph;

  // One set of sizes for every row, so the list reads as a table. The opponent is
  // always the biggest thing in a row; everything else is at least readable.
  const base = (tall ? 150 : 120) * u;
  const weekdaySize = px(theme, base * 0.2);
  const badge = px(theme, base * 0.24);
  const badgeW = badge * 1.9;
  const compSize = floor;
  const all = fixtureRows(team);
  let dateSize = px(theme, base * 0.3);
  let kickSize = px(theme, base * 0.34);
  const dateW = Math.max(
    textUnits("28 NOV") * glyph * dateSize,
    textUnits("SAT") * glyph * weekdaySize,
  );
  const kickW = textUnits("15:00") * glyph * kickSize;
  const gap = 22 * u;
  const oppW = colW - dateW - badgeW - kickW - gap * 3;

  // Opponents: one line where it reads, else two balanced lines, never tiny.
  const oppMax = base * 0.42;
  const plan = all.map((f) => {
    const name = f.opponent || "Opponent";
    const one = fitText(name, oppW, oppMax, theme);
    const split = balance(name);
    const two =
      split.length > 1
        ? fitText(
            split.reduce((x, y) => (textUnits(y) > textUnits(x) ? y : x)),
            oppW,
            oppMax,
            theme,
          )
        : 0;
    return two > one * 1.2 && one < floor * 1.4
      ? { lines: split, size: two }
      : { lines: [name], size: one };
  });
  const oppSize = Math.max(floor, Math.min(oppMax, ...plan.map((p) => p.size)));
  dateSize = Math.min(dateSize, oppSize);
  kickSize = Math.max(floor, Math.min(kickSize, oppSize));

  // Only as many rows as fit: the latest results and the next games, never squashed.
  const compLines = (c: string) =>
    c ? Math.min(3, Math.ceil((textUnits(c) * glyph * compSize) / Math.max(oppW, 1))) : 0;
  const rowPad = 16 * u;
  const heightOf = (i: number) => {
    const f = all[i];
    const opp = plan[i].lines.length * oppSize * 0.98;
    const comp = compLines(f.competition) * compSize * 1.2 + (f.competition ? 6 * u : 0);
    const date = weekdaySize + dateSize + 6 * u;
    return Math.max(opp + comp, date, badge * 1.9) + rowPad * 2;
  };
  const room = h - pad * 2 - (tall ? 250 : 200) * u - (design.footer ? 70 * u : 0);
  const shown: number[] = [];
  let used = 0;
  for (let i = 0; i < all.length && shown.length < (tall ? 8 : 6); i += cols) {
    const pair = [i, i + 1].slice(0, cols).filter((k) => k < all.length);
    const rowH = Math.max(...pair.map(heightOf));
    if (used + rowH > room) break;
    used += rowH;
    shown.push(...pair);
  }

  return (
    <Column theme={theme}>
      <Masthead
        team={team}
        design={design}
        theme={theme}
        headline={design.headlines.fixtures}
        showMeta={false}
      />
      <div
        data-check-list="fixtures"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${colW}px)`,
          columnGap: colGap,
          alignContent: "center",
          width: listW,
        }}
      >
        {shown.map((idx, i) => {
          const f = all[idx];
          const [weekday, ...rest] = formatMatchDate(f.date).split(" ");
          return (
            <div
              key={f.id}
              style={{
                display: "grid",
                gridTemplateColumns: `${dateW}px ${badgeW}px 1fr auto`,
                alignItems: "center",
                gap,
                padding: `${rowPad}px 0`,
                borderTop: i < cols ? undefined : `${Math.max(1, 2 * u)}px solid ${theme.rule}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 * u }}>
                <span style={{ fontSize: weekdaySize, color: theme.muted }}>{weekday}</span>
                <span
                  style={{
                    fontSize: dateSize,
                    fontWeight: theme.font.heavy,
                    color: theme.accent,
                    whiteSpace: "nowrap",
                  }}
                >
                  {rest.join(" ")}
                </span>
              </div>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: badge * 1.7,
                  background: f.isHome ? theme.fg : "transparent",
                  color: f.isHome ? theme.ground : theme.fg,
                  border: `${Math.max(2, 3 * u)}px solid ${theme.fg}`,
                  fontSize: badge,
                  fontWeight: theme.font.heavy,
                }}
              >
                {f.isHome ? "H" : "A"}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 * u, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: oppSize,
                    fontWeight: theme.font.heavy,
                    lineHeight: 0.98 * theme.font.leading,
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan[idx].lines.map((l, k) => (
                    <div key={k}>{l}</div>
                  ))}
                </span>
                {f.competition && (
                  <span style={{ fontSize: compSize, color: theme.muted, lineHeight: 1.2 }}>
                    {f.competition}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: kickSize,
                  fontWeight: theme.font.heavy,
                  color: f.score ? theme.accent : theme.fg,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {f.score || f.kickoff}
              </span>
            </div>
          );
        })}
      </div>
      <Footer theme={theme} design={design} />
    </Column>
  );
}
