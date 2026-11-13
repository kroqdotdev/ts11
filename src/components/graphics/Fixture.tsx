import { formatMatchDate, initials } from "@/lib/format";
import { byMinute, firstHalfGoals, matchScore } from "@/lib/score";
import type { Colors, Design, Goal, Team } from "@/lib/types";
import { balance, Crest, fitText, Footer, Heading, px, textUnits } from "./parts";
import type { Theme } from "./theme";

export interface Side {
  name: string;
  /** Short name or initials, used where the full name would be too small. */
  short: string;
  crest: string | null;
  /** Only our own crest knows whether it was cut out (see Team.crestKind). */
  crestKind?: Team["crestKind"];
  colors: Colors;
  score: number;
  goals: Goal[];
  us: boolean;
}

export { minuteOf } from "@/lib/score";

export function sides(team: Team, half = false): [Side, Side] {
  const m = team.match;
  const score = matchScore(m);
  const goals = byMinute(half ? firstHalfGoals(m.goals) : m.goals);
  const us: Side = {
    name: team.name,
    short: team.shortName.trim() || initials(team.name),
    crest: team.crest,
    crestKind: team.crestKind,
    colors: team.colors,
    score: half ? score.htUs : score.us,
    goals: goals.filter((g) => g.side === "us"),
    us: true,
  };
  const them: Side = {
    name: m.opponent,
    short: m.opponentShort.trim() || (m.opponent.trim() ? initials(m.opponent) : ""),
    crest: m.opponentCrest,
    colors: m.opponentColors,
    score: half ? score.htThem : score.them,
    goals: goals.filter((g) => g.side === "them"),
    us: false,
  };
  return m.isHome ? [us, them] : [them, us];
}

/** Content box shared by the matchday and result layouts. */
export function columnBox(theme: Theme, design: Design) {
  const { w, pad, wide } = theme;
  const right = design.featureImage
    ? wide
      ? w * 0.5
      : w * 0.6
    : wide
      ? Math.min(w * 0.7, theme.right)
      : theme.right;
  return { left: pad, width: right - pad };
}

export interface FittedNames {
  size: number;
  /** One or two lines per side, in the order given. */
  lines: string[][];
}

/**
 * Sizes both club names together so neither reads as the lesser side. A long
 * name may break over two lines; if it would still be much smaller than `max`,
 * it falls back to the short name.
 */
export function fitNames(
  names: { name: string; short?: string }[],
  width: number,
  max: number,
  theme: Theme,
  {
    twoLines = true,
    minRatio = 0.55,
    together = true,
  }: {
    twoLines?: boolean;
    minRatio?: number;
    /** When one side needs its short name, use both short names so they match. */
    together?: boolean;
  } = {},
): FittedNames {
  const best = (text: string) => {
    const one = fitText(text, width, max, theme);
    const split = twoLines ? balance(text) : [text];
    const two =
      split.length > 1
        ? fitText(
            split.reduce((a, b) => (textUnits(b) > textUnits(a) ? b : a)),
            width,
            max,
            theme,
          )
        : 0;
    // Two lines only when they buy real size.
    return two > one * 1.15 ? { size: two, lines: split } : { size: one, lines: [text] };
  };
  // A side "wants" its short name when the full one would be much too small and the
  // short one is genuinely bigger. Then both sides go short, so "SWL 2-1 Brightlingsea
  // Regent Under-23s" never happens.
  const wantsShort = (n: { name: string; short?: string }) => {
    const short = n.short?.trim();
    if (!short || short.length >= n.name.length) return false;
    const full = best(n.name).size;
    return full < max * minRatio && best(short).size > full;
  };
  const allShort = together && names.some(wantsShort) && names.every((n) => n.short?.trim());
  const picks = names.map((n) => {
    const full = best(n.name);
    const short = n.short?.trim();
    if (allShort && short) return best(short);
    if (full.size < max * minRatio && short && short.length < n.name.length) {
      const s = best(short);
      if (s.size > full.size) return s;
    }
    return full;
  });
  const size = Math.min(...picks.map((p) => p.size));
  return { size, lines: picks.map((p) => p.lines) };
}

export function TeamRow({
  side,
  theme,
  width,
  crest,
  trailing,
  below,
  name,
}: {
  side: Side;
  theme: Theme;
  width: number;
  crest: number;
  trailing?: React.ReactNode;
  below?: React.ReactNode;
  /** A size and line split shared with the other side (see `fitNames`). */
  name?: { size: number; lines: string[] };
}) {
  const gap = crest * 0.22;
  const nameW = teamRowNameWidth(width, crest, !!trailing);
  const label = name ?? {
    size: fitText(side.name, nameW, crest * 0.42, theme),
    lines: [side.name],
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      <Crest
        src={side.crest}
        kind={side.crestKind}
        name={side.name}
        colors={side.colors}
        size={crest}
        theme={theme}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: crest * 0.08,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: label.size,
            fontWeight: theme.font.heavy,
            lineHeight: 0.9 * theme.font.leading,
            whiteSpace: "nowrap",
            color: theme.fg,
          }}
        >
          {label.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        {below}
      </div>
      {trailing}
    </div>
  );
}

/** The width a TeamRow leaves for the club name. */
export function teamRowNameWidth(width: number, crest: number, trailing: boolean): number {
  return width - crest - crest * 0.22 - (trailing ? crest * 0.95 : 0);
}

export function Fixture({ team, design, theme }: { team: Team; design: Design; theme: Theme }) {
  const { h, u, pad, tall, wide } = theme;
  const m = team.match;
  const col = columnBox(theme, design);
  const [home, away] = sides(team);
  const crest = (tall ? 220 : wide ? 150 : 170) * u;
  const date = formatMatchDate(m.date);
  const names = fitNames(
    [home, away],
    teamRowNameWidth(col.width, crest, false),
    crest * 0.42,
    theme,
  );

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
        text={design.headlines.fixture}
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
          gap: crest * 0.16,
        }}
      >
        <TeamRow
          side={home}
          theme={theme}
          width={col.width}
          crest={crest}
          name={{ size: names.size, lines: names.lines[0] }}
        />
        {away.name.trim() && home.name.trim() && (
          <>
            <div
              style={{
                fontSize: px(theme, crest * 0.2),
                color: theme.muted,
                paddingLeft: crest * 0.36,
                fontWeight: theme.font.heavy,
              }}
            >
              v
            </div>
            <TeamRow
              side={away}
              theme={theme}
              width={col.width}
              crest={crest}
              name={{ size: names.size, lines: names.lines[1] }}
            />
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 40 * u, flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: (tall ? 150 : 118) * u,
            fontWeight: theme.font.heavy,
            lineHeight: 0.85 * theme.font.leading,
            color: theme.accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {m.kickoff}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12 * u,
            paddingBottom: 6 * u,
          }}
        >
          <span style={{ fontSize: (tall ? 52 : 44) * u, fontWeight: theme.font.heavy }}>
            {date}
          </span>
          {m.venue && (
            <span style={{ fontSize: px(theme, (tall ? 32 : 28) * u), color: theme.muted }}>
              {m.venue}
            </span>
          )}
        </div>
      </div>
      <Footer theme={theme} design={design} style={{ marginTop: (tall ? 70 : 44) * u }} />
    </div>
  );
}
