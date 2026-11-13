import { demoTeam } from "./demo";
import { matchScore, scorerOf } from "./score";
import type { Design, Match, Player, Team } from "./types";

/** Ids of sample players start with this, so they never collide with the club's own. */
const SAMPLE_PREFIX = "sample-";

/** The parts of a graphic that were filled in from sample data. */
export type SampleNote = "opponent" | "starters" | "goals" | "subs" | "motm" | "fixtures";

export interface Sampled {
  team: Team;
  /** Empty when the graphic shows only the club's own details. */
  filled: SampleNote[];
}

/**
 * For the studio preview only: fills what the current graphic is missing with
 * realistic sample content, so an empty graphic still shows what it will look like.
 * The export always uses the real team.
 */
export function withSamples(team: Team, design: Design): Sampled {
  const kind = design.kind;
  const demo = demoTeam("sample", team.match.date);
  const filled: SampleNote[] = [];
  let players = team.players;
  let lineup = team.lineup;
  let match = team.match;
  let fixtures = team.fixtures;

  /** Sample players join the squad only when something needs them. */
  const borrow = () => {
    if (players.some((p) => p.id.startsWith(SAMPLE_PREFIX))) return;
    players = [...players, ...demo.players];
  };
  const own = team.players;
  const starterIds = team.lineup.starters.filter((id): id is string => !!id);

  if (kind !== "fixtures" && !match.opponent.trim()) {
    const d = demo.match;
    match = {
      ...match,
      opponent: d.opponent,
      opponentShort: d.opponentShort,
      opponentColors: d.opponentColors,
      competition: match.competition || d.competition,
      venue: match.venue || d.venue,
    };
    filled.push("opponent");
  }

  if ((kind === "lineup" || kind === "pitch") && starterIds.length === 0) {
    // The club's own squad if there is one, otherwise the sample squad.
    const useOwn = own.length >= lineup.size;
    if (!useOwn) borrow();
    const pool = useOwn ? own : demo.players;
    const keeper = pool.find((p) => p.position === "GK");
    const ordered = keeper ? [keeper, ...pool.filter((p) => p !== keeper)] : pool;
    lineup = {
      ...lineup,
      starters: Array.from({ length: lineup.size }, (_, i) => ordered[i]?.id ?? null),
      bench: lineup.bench.length ? lineup.bench : ordered.slice(lineup.size).map((p) => p.id),
      captainId: lineup.captainId ?? ordered[Math.min(7, lineup.size - 1)]?.id ?? null,
    };
    filled.push("starters");
  }

  if (kind === "goal" && match.goals.length === 0) {
    const scorer = own.find((p) => starterIds.includes(p.id) && p.position === "FW") ?? own[0];
    match = {
      ...match,
      goals: [
        {
          id: "sample-goal",
          side: "us",
          name: scorer?.name ?? "Price",
          playerId: scorer?.id ?? null,
          minute: "23",
        },
      ],
      spotlightGoalId: "sample-goal",
    };
    filled.push("goals");
  }

  // Rows added in the studio but not filled in yet don't print, so they count as none.
  if (kind === "subs" && !match.subs.some((s) => s.onId || s.offId)) {
    const bench = own.filter((p) => !starterIds.includes(p.id));
    const off = starterIds.slice(-2).reverse();
    if (off.length === 2 && bench.length >= 2) {
      match = {
        ...match,
        subs: [
          { id: "sample-s1", offId: off[0], onId: bench[0].id, minute: "61" },
          { id: "sample-s2", offId: off[1], onId: bench[1].id, minute: "74" },
        ],
      };
    } else {
      borrow();
      match = { ...match, subs: demo.match.subs };
    }
    filled.push("subs");
  }

  if (kind === "motm" && !own.some((p) => p.id === match.motmId)) {
    const pick =
      own.find((p) => p.id === team.lineup.captainId) ??
      own.find((p) => starterIds.includes(p.id) && p.position !== "GK");
    if (pick)
      match = {
        ...match,
        motmId: pick.id,
        motmNote: match.motmNote || motmNote(pick, team, match),
      };
    else {
      borrow();
      const sample = demo.players.find((p) => p.id === demo.match.motmId);
      match = {
        ...match,
        motmId: demo.match.motmId,
        motmNote: match.motmNote || (sample ? motmNote(sample, team, match) : ""),
      };
    }
    filled.push("motm");
  }

  if (kind === "fixtures" && fixtures.length === 0) {
    fixtures = demo.fixtures;
    filled.push("fixtures");
  }

  if (filled.length === 0) return { team, filled };
  return { team: { ...team, players, lineup, match, fixtures }, filled };
}

/** "the opponent and goals", for the sample label. */
export function describeSamples(filled: SampleNote[]): string {
  const words: Record<SampleNote, string> = {
    opponent: "opponent",
    starters: "line-up",
    goals: "goal",
    subs: "substitutions",
    motm: "player of the match",
    fixtures: "fixtures",
  };
  const list = filled.map((f) => words[f]);
  return list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

/**
 * A sample line under the player of the match that fits the actual match: goals
 * only when they scored, a clean sheet only when there was one, the armband only
 * for the captain.
 */
function motmNote(player: Player, team: Team, match: Match): string {
  const goals = match.goals.filter((g) => scorerOf(team, g)?.id === player.id).length;
  const score = matchScore(match);
  const captain = team.lineup.captainId === player.id;
  if (goals >= 3) return "A hat-trick to remember";
  if (goals === 2) return captain ? "Two goals and the armband" : "Two goals and a shift";
  if (goals === 1) return captain ? "On the scoresheet with the armband on" : "On the scoresheet";
  const cleanSheet = match.goals.length > 0 || score.us + score.them > 0 ? score.them === 0 : false;
  if (player.position === "GK")
    return cleanSheet ? "Kept a clean sheet" : "Saves that kept us in it";
  if (player.position === "DF")
    return cleanSheet ? "A clean sheet at the back" : "Won everything at the back";
  if (captain) return "Led from the front";
  return player.position === "FW" ? "Ran the line all afternoon" : "Ran the midfield all afternoon";
}
