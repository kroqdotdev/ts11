import { defaultDesign, demoTeam } from "@/lib/demo";
import type { Design, FontId, Team } from "@/lib/types";

/**
 * Worst-case data for the graphics layout check (`pnpm check:graphics`).
 * Each case is a club a real volunteer could plausibly set up.
 */
export interface CheckCase {
  id: string;
  label: string;
  team: Team;
  design: Partial<Design>;
}

const DATE = "2026-11-14";

function example(): CheckCase {
  return { id: "example", label: "The example club", team: demoTeam("ex", DATE), design: {} };
}

/** Long everything, a near-white kit and full names printed. */
function long(): CheckCase {
  const t = demoTeam("long", DATE);
  const names = [
    "Bartholomew Okonkwo-Fairweather",
    "Konstantinos Papadopoulos-Wolverhampton",
    "Jan Stanislawski",
    "Aidan Fitzgerald-Montgomery",
    "Oskar Harper-Lindqvist",
    "Owen Pritchard-Montgomery-Williamson",
    "Rhino Patel",
    "Callum Abernathy-Wright",
    "Maximilian Featherstonehaugh",
    "Lee",
    "Thelonious Vanderbilt-Ashworth",
    "Sebastian De la Cruz Fernández",
    "Ifeanyi Chukwuemeka-Oyelaran",
    "Tom Hadley",
    "Rotimi Adeyemi-Bankole",
    "Ruaridh MacGillivray",
    "Fitz",
  ];
  return {
    id: "long",
    label: "Long names, white and navy kit",
    team: {
      ...t,
      name: "Wolverhampton Sporting Community Football Club Reserves",
      shortName: "WSCFC",
      colors: { primary: "#f6f6f2", secondary: "#14284b" },
      players: t.players.map((p, i) => ({ ...p, name: names[i] ?? p.name })),
      match: {
        ...t.match,
        opponent: "Brightlingsea Regent Under-23s Development",
        opponentShort: "",
        competition: "Eastern Counties Football League Premier Division Challenge Cup",
        venue: "The Memorial Ground, Long Melford Road",
        motmNote: "Two goals, an assist and a goal-line clearance in stoppage time",
        // The longest name gets the spotlight: player of the match and the goal graphic.
        motmId: t.players[1].id,
        spotlightGoalId: "g4",
        goals: [
          ...t.match.goals,
          { id: "g0", side: "us", name: "", playerId: t.players[1].id, minute: "12" },
          { id: "g4", side: "us", name: "", playerId: t.players[1].id, minute: "90+4" },
        ],
      },
      fixtures: t.fixtures.map((f, i) => ({
        ...f,
        opponent:
          i % 2 ? "Stowmarket Town Under-23s Development" : "AFC Sudbury Wanderers & Long Melford",
        competition: "Suffolk Senior Challenge Cup Quarter-final Replay",
      })),
    },
    design: { nameStyle: "full" },
  };
}

/** A near-black kit and a squad pasted without shirt numbers. */
function blackNoNumbers(): CheckCase {
  const t = demoTeam("dark", DATE);
  return {
    id: "dark",
    label: "Near-black kit, no shirt numbers",
    team: {
      ...t,
      name: "Blackwater Lions",
      shortName: "BWL",
      colors: { primary: "#0b0b0b", secondary: "#1a1a1a" },
      players: t.players.map((p) => ({ ...p, number: "" })),
    },
    design: {},
  };
}

/** Half filled in: no opponent, no goals, a short squad. Nothing may print a placeholder. */
function sparse(): CheckCase {
  const t = demoTeam("sparse", DATE);
  const keep = new Set(t.players.slice(0, 8).map((p) => p.id));
  return {
    id: "sparse",
    label: "No opponent, eight players",
    team: {
      ...t,
      name: "Elm Park",
      shortName: "EP",
      players: t.players.filter((p) => keep.has(p.id)),
      lineup: {
        ...t.lineup,
        starters: t.lineup.starters.map((id) => (id && keep.has(id) ? id : null)),
        bench: [],
      },
      match: {
        ...t.match,
        opponent: "",
        opponentShort: "",
        competition: "",
        venue: "",
        goals: [],
        subs: [],
      },
    },
    design: { showLettering: true },
  };
}

export function checkCases(): CheckCase[] {
  return [example(), long(), blackNoNumbers(), sparse()];
}

export function checkDesign(c: CheckCase, patch: Partial<Design>, font?: FontId): Design {
  return { ...defaultDesign(), ...c.design, ...patch, ...(font ? { font } : {}) };
}
