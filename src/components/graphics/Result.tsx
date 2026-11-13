import { scorerLabel } from "@/lib/score";
import type { Design, Goal, NameStyle, Team } from "@/lib/types";
import { columnBox, fitNames, sides, TeamRow, teamRowNameWidth, type Side } from "./Fixture";
import { fitText, Footer, Heading, MatchMeta, minPx, px, textUnits } from "./parts";
import type { Theme } from "./theme";

function label(team: Team, g: Goal, style: NameStyle): string {
  const name = scorerLabel(team, g, style) || "Goal";
  return g.minute ? `${name} ${g.minute}′` : name;
}

/**
 * How the scorers print: the design's name style while it fits at a readable size,
 * then initial + surname, then surname alone; a name that still won't fit wraps.
 */
export function scorerStyle(
  team: Team,
  goals: Goal[],
  preferred: NameStyle,
  width: number,
  max: number,
  theme: Theme,
): { style: NameStyle; size: number; wrap: boolean } {
  const styles: NameStyle[] = [preferred, "initial", "surname"].filter(
    (st, i, all) => all.indexOf(st) === i,
  ) as NameStyle[];
  const floor = minPx(theme);
  let last = { style: preferred, size: floor, wrap: true };
  for (const style of styles) {
    const longest = goals
      .map((g) => label(team, g, style))
      .reduce((a, b) => (textUnits(b) > textUnits(a) ? b : a), "");
    const size = Math.min(max, fitText(longest, width, max, theme));
    if (size >= floor) return { style, size: Math.min(max, Math.max(size, floor)), wrap: false };
    last = { style, size: floor, wrap: true };
  }
  return last;
}

function Scorers({
  team,
  design,
  side,
  theme,
  size,
  width,
}: {
  team: Team;
  design: Design;
  side: Side;
  theme: Theme;
  size: number;
  width: number;
}) {
  if (side.goals.length === 0) return null;
  const fitted = scorerStyle(team, side.goals, design.nameStyle, width, px(theme, size), theme);
  return (
    <div
      data-check-list="scorers"
      style={{
        fontSize: fitted.size,
        color: theme.muted,
        lineHeight: 1.3 * theme.font.leading,
        display: "flex",
        flexWrap: "wrap",
        columnGap: fitted.size * 0.7,
        minWidth: 0,
      }}
    >
      {side.goals.map((g) => (
        <span key={g.id} style={{ whiteSpace: fitted.wrap ? "normal" : "nowrap" }}>
          {scorerLabel(team, g, fitted.style) || "Goal"}
          {g.minute && (
            <span style={{ textTransform: "none", whiteSpace: "nowrap" }}> {g.minute}&prime;</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function Result({
  team,
  design,
  theme,
  half = false,
}: {
  team: Team;
  design: Design;
  theme: Theme;
  half?: boolean;
}) {
  const { h, u, pad, tall, wide } = theme;
  const m = team.match;
  const col = columnBox(theme, design);
  const pair = sides(team, half);
  const crest = (tall ? 220 : wide ? 150 : 170) * u;
  const draw = pair[0].score === pair[1].score;
  const names = fitNames(pair, teamRowNameWidth(col.width, crest, true), crest * 0.42, theme);

  return (
    <div
      style={{
        position: "absolute",
        left: col.left,
        width: col.width,
        top: pad,
        height: h - pad * 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Heading
        text={half ? design.headlines.halftime : design.headlines.result}
        width={col.width}
        max={(tall ? 260 : 220) * u}
        theme={theme}
      />
      {m.competition && (
        <div
          style={{
            marginTop: 24 * u,
            fontSize: px(theme, (tall ? 38 : 32) * u),
            color: theme.accent,
            fontWeight: theme.font.heavy,
          }}
        >
          {m.competition}
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: crest * 0.34,
        }}
      >
        {pair.map((side, i) => {
          const won = side.score > pair[1 - i].score;
          return (
            <TeamRow
              key={side.us ? "us" : "them"}
              side={side}
              theme={theme}
              width={col.width}
              crest={crest}
              name={{ size: names.size, lines: names.lines[i] }}
              below={
                <Scorers
                  team={team}
                  design={design}
                  side={side}
                  theme={theme}
                  size={(tall ? 40 : 34) * u}
                  width={teamRowNameWidth(col.width, crest, true)}
                />
              }
              trailing={
                <div
                  style={{
                    width: crest * 0.95,
                    textAlign: "right",
                    fontSize: crest * 1.02,
                    lineHeight: 0.8 * theme.font.leading,
                    fontWeight: theme.font.heavy,
                    fontVariantNumeric: "tabular-nums",
                    color: won || draw ? theme.accent : theme.muted,
                    flexShrink: 0,
                  }}
                >
                  {side.score}
                </div>
              }
            />
          );
        })}
      </div>

      <MatchMeta team={team} theme={theme} size={(tall ? 32 : 26) * u} showVersus={false} />
      <Footer theme={theme} design={design} style={{ marginTop: (tall ? 60 : 36) * u }} />
    </div>
  );
}
