import { demoTeam } from "./demo";
import { graphicsLanguage } from "./language";
import { matchScore, scorerOf } from "./score";
import type { Design, Language, Match, Player, Team } from "./types";

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
  // Sample content is printed, so it comes in the club's graphics language.
  const language = graphicsLanguage(team);
  const demo = demoTeam("sample", team.match.date, language);
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
          name: scorer?.name ?? demo.players[7].name.split(" ").at(-1) ?? "",
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
        motmNote: match.motmNote || motmNote(pick, team, match, language),
      };
    else {
      borrow();
      const sample = demo.players.find((p) => p.id === demo.match.motmId);
      match = {
        ...match,
        motmId: demo.match.motmId,
        motmNote: match.motmNote || (sample ? motmNote(sample, team, match, language) : ""),
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

type MotmLine =
  | "hatTrick"
  | "twoCaptain"
  | "two"
  | "oneCaptain"
  | "one"
  | "keeperClean"
  | "keeper"
  | "backClean"
  | "back"
  | "captain"
  | "forward"
  | "midfield";

const MOTM_LINES: Record<Language, Record<MotmLine, string>> = {
  en: {
    hatTrick: "A hat-trick to remember",
    twoCaptain: "Two goals and the armband",
    two: "Two goals and a shift",
    oneCaptain: "On the scoresheet with the armband on",
    one: "On the scoresheet",
    keeperClean: "Kept a clean sheet",
    keeper: "Saves that kept us in it",
    backClean: "A clean sheet at the back",
    back: "Won everything at the back",
    captain: "Led from the front",
    forward: "Ran the line all afternoon",
    midfield: "Ran the midfield all afternoon",
  },
  da: {
    hatTrick: "Et hattrick, der bliver husket",
    twoCaptain: "To mål og anførerbindet",
    two: "To mål og masser af slid",
    oneCaptain: "Scorede med anførerbindet om armen",
    one: "Fik sit navn på måltavlen",
    keeperClean: "Holdt buret rent",
    keeper: "Redninger, der holdt os inde i kampen",
    backClean: "Holdt nullet bagtil",
    back: "Vandt alt bagtil",
    captain: "Gik forrest hele kampen",
    forward: "Plagede forsvaret hele eftermiddagen",
    midfield: "Styrede midtbanen hele eftermiddagen",
  },
};

/**
 * A sample line under the player of the match that fits the actual match: goals
 * only when they scored, a clean sheet only when there was one, the armband only
 * for the captain.
 */
function motmNote(player: Player, team: Team, match: Match, language: Language): string {
  const lines = MOTM_LINES[language];
  const goals = match.goals.filter((g) => scorerOf(team, g)?.id === player.id).length;
  const score = matchScore(match);
  const captain = team.lineup.captainId === player.id;
  if (goals >= 3) return lines.hatTrick;
  if (goals === 2) return captain ? lines.twoCaptain : lines.two;
  if (goals === 1) return captain ? lines.oneCaptain : lines.one;
  const cleanSheet = match.goals.length > 0 || score.us + score.them > 0 ? score.them === 0 : false;
  if (player.position === "GK") return cleanSheet ? lines.keeperClean : lines.keeper;
  if (player.position === "DF") return cleanSheet ? lines.backClean : lines.back;
  if (captain) return lines.captain;
  return player.position === "FW" ? lines.forward : lines.midfield;
}
