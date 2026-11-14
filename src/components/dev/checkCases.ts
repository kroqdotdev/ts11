import { defaultDesign, demoTeam } from "@/lib/demo";
import type { Design, FontId, Language, Team } from "@/lib/types";

/**
 * Worst-case data for the graphics layout check (`pnpm check:graphics`).
 * Each case is a club a real volunteer could plausibly set up, once with English
 * graphics and once with Danish ones (ids ending in "-da"), whose words run longer.
 */
export interface CheckCase {
  id: string;
  label: string;
  team: Team;
  design: Partial<Design>;
}

const DATE = "2026-11-14";

function example(language: Language): CheckCase {
  return {
    id: "example",
    label: "The example club",
    team: demoTeam("ex", DATE, language),
    design: {},
  };
}

/**
 * The Danish long case: names as long as the English ones (compounds, double surnames,
 * "af 1921"), so both languages are held to the same worst case.
 */
const LONG_DA = {
  club: "Idrætsforeningen Søndervang-Kildeby af 1921 Reserverne",
  short: "ISKR",
  opponent: "Brøndbyvester Boldklub U19 Udviklingshold",
  competition: "Sjællandsserien pulje 2, slutspillet om oprykning, omkamp",
  venue: "Søndervang Idrætspark, kunstgræsbane 2",
  note: "To mål, et oplæg og en redning på stregen i overtiden",
  fixtures: ["Hjortholm-Egeskov Idrætsforening U23", "Frederiksværk-Kregme Boldklub af 1908"],
  fixtureCompetition: "Sjællandsserien, oprykningsspil kvartfinale omkamp",
  // Same lengths as the English names, position by position.
  names: [
    "Christoffer Kjærgaard-Thygesen",
    "Konstantin Vestergaard-Kristoffersen",
    "Ole Christiansen",
    "Sebastian Brøndum-Thygesen",
    "Oliver Bach-Lindberg",
    "Mads Bjørn Højgaard Kristiansen",
    "Ali Haddad",
    "Emil Damsgaard-Nielsen",
    "Benjamin Højgaard-Mortensen",
    "Ib",
    "Valdemar Søndergaard-Hansen",
    "Emil Kjeldgaard Due Nielsen",
    "Viktor Christensen-Skovgaard",
    "Bo Kjærgaard",
    "Yusuf Mohamed-Ahmed",
    "Marius Fruergaard-Bech",
    "Åge",
  ],
};

/** Long everything, a near-white kit and full names printed. */
function long(language: Language): CheckCase {
  const t = demoTeam("long", DATE, language);
  const da = language === "da";
  const names = da
    ? LONG_DA.names
    : [
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
      name: da ? LONG_DA.club : "Wolverhampton Sporting Community Football Club Reserves",
      shortName: da ? LONG_DA.short : "WSCFC",
      colors: { primary: "#f6f6f2", secondary: "#14284b" },
      players: t.players.map((p, i) => ({ ...p, name: names[i] ?? p.name })),
      match: {
        ...t.match,
        opponent: da ? LONG_DA.opponent : "Brightlingsea Regent Under-23s Development",
        opponentShort: "",
        competition: da
          ? LONG_DA.competition
          : "Eastern Counties Football League Premier Division Challenge Cup",
        venue: da ? LONG_DA.venue : "The Memorial Ground, Long Melford Road",
        motmNote: da
          ? LONG_DA.note
          : "Two goals, an assist and a goal-line clearance in stoppage time",
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
        opponent: da
          ? LONG_DA.fixtures[i % 2]
          : i % 2
            ? "Stowmarket Town Under-23s Development"
            : "AFC Sudbury Wanderers & Long Melford",
        competition: da
          ? LONG_DA.fixtureCompetition
          : "Suffolk Senior Challenge Cup Quarter-final Replay",
      })),
    },
    design: { nameStyle: "full" },
  };
}

/** A near-black kit and a squad pasted without shirt numbers. */
function blackNoNumbers(language: Language): CheckCase {
  const t = demoTeam("dark", DATE, language);
  return {
    id: "dark",
    label: "Near-black kit, no shirt numbers",
    team: {
      ...t,
      name: language === "da" ? "Sortebæk IF" : "Blackwater Lions",
      shortName: language === "da" ? "SIF" : "BWL",
      colors: { primary: "#0b0b0b", secondary: "#1a1a1a" },
      players: t.players.map((p) => ({ ...p, number: "" })),
    },
    design: {},
  };
}

/** Half filled in: no opponent, no goals, a short squad. Nothing may print a placeholder. */
function sparse(language: Language): CheckCase {
  const t = demoTeam("sparse", DATE, language);
  const keep = new Set(t.players.slice(0, 8).map((p) => p.id));
  return {
    id: "sparse",
    label: "No opponent, eight players",
    team: {
      ...t,
      name: language === "da" ? "Elmely" : "Elm Park",
      shortName: language === "da" ? "EL" : "EP",
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

const BUILDERS = [example, long, blackNoNumbers, sparse];

/** Every case in English, then every case again with Danish graphics ("long-da" and so on). */
export function checkCases(): CheckCase[] {
  return (["en", "da"] as const).flatMap((language) =>
    BUILDERS.map((build) => {
      const c = build(language);
      return language === "en"
        ? c
        : { ...c, id: `${c.id}-da`, label: `${c.label} (Danish graphics)` };
    }),
  );
}

export function checkDesign(c: CheckCase, patch: Partial<Design>, font?: FontId): Design {
  return {
    ...defaultDesign(c.team.language),
    ...c.design,
    ...patch,
    ...(font ? { font } : {}),
  };
}
