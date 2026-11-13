import type { Colors, Design, Fixture, Lineup, Match, Player, Position, Team } from "./types";

type Row = [number: string, name: string, position: Position];

function players(prefix: string, rows: Row[]): Player[] {
  return rows.map(([number, name, position], i) => ({
    id: `${prefix}${i}`,
    number,
    name,
    position,
  }));
}

function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultMatch(overrides: Partial<Match> = {}): Match {
  return {
    date: overrides.date ?? nextSaturday(),
    opponent: "Corrin Town",
    opponentShort: "CT",
    opponentCrest: null,
    opponentColors: { primary: "#c4232f", secondary: "#f4f4f1" },
    isHome: true,
    competition: "County League Division One",
    kickoff: "15:00",
    venue: "Vale Park Lane",
    autoScore: true,
    ourScore: 2,
    theirScore: 1,
    goals: [
      { id: "g1", side: "us", name: "Price", minute: "23" },
      { id: "g2", side: "them", name: "Hollis", minute: "51" },
      { id: "g3", side: "us", name: "Lund", minute: "78" },
    ],
    htOurScore: 1,
    htTheirScore: 0,
    spotlightGoalId: null,
    subs: [],
    motmId: null,
    motmNote: "",
    ...overrides,
  };
}

function lineupFor(
  ps: Player[],
  starterIdx: number[],
  benchIdx: number[],
  captain: number,
): Lineup {
  return {
    size: 11,
    formation: "4-3-3",
    starters: starterIdx.map((i) => ps[i].id),
    bench: benchIdx.map((i) => ps[i].id),
    captainId: ps[captain].id,
    overrides: {},
  };
}

const ASHBY_ROWS: Row[] = [
  ["1", "Tom Hadley", "GK"],
  ["2", "Josh Okafor", "DF"],
  ["3", "Liam Carr", "DF"],
  ["4", "Ryan Desai", "DF"],
  ["5", "Owen Pritchard", "DF"],
  ["6", "Kieran Walsh", "MF"],
  ["8", "Sam Ellery", "MF"],
  ["10", "Callum Price", "MF"],
  ["7", "Danny Mbeki", "FW"],
  ["9", "Harry Lund", "FW"],
  ["11", "Jamie Rourke", "FW"],
  ["12", "Ben Talbot", "GK"],
  ["14", "Alfie Brennan", "DF"],
  ["15", "Marcus Fenn", "MF"],
  ["16", "Ethan Quayle", "MF"],
  ["17", "Reece Adeyemi", "FW"],
  ["18", "Luke Garvey", "FW"],
];

export function demoTeam(id = "ashby", date?: string): Team {
  const ps = players(`${id}-`, ASHBY_ROWS);
  const matchDate = date ?? nextSaturday();
  return {
    id,
    name: "Ashby Vale",
    // The same letters as the badge, so the score strip and the crest agree.
    shortName: "AV",
    crest: null,
    colors: { primary: "#17553a", secondary: "#e9b62c" },
    players: ps,
    // GK, back four left to right, midfield three, front three
    lineup: lineupFor(ps, [0, 4, 2, 3, 1, 5, 6, 7, 10, 9, 8], [11, 12, 13, 14, 15, 16], 7),
    match: defaultMatch({
      date: matchDate,
      // Our scorers are linked to the squad, as picking them in the studio does.
      goals: [
        { id: "g1", side: "us", name: ps[7].name, playerId: ps[7].id, minute: "23" },
        { id: "g2", side: "them", name: "Hollis", minute: "51" },
        { id: "g3", side: "us", name: ps[9].name, playerId: ps[9].id, minute: "78" },
      ],
      subs: [
        { id: "s1", offId: ps[8].id, onId: ps[15].id, minute: "61" },
        { id: "s2", offId: ps[6].id, onId: ps[13].id, minute: "74" },
      ],
      motmId: ps[7].id,
      motmNote: "A goal, an assist and the armband",
    }),
    // The games after this one (the Fixtures graphic puts the current match first).
    fixtures: [
      fixture("f1", "Kingswood Wanderers", true, addDays(matchDate, 7), "15:00", "League", ""),
      fixture("f2", "Holbeck Saints", false, addDays(matchDate, 14), "14:30", "League", ""),
      fixture("f3", "Pellow Rovers", true, addDays(matchDate, 17), "19:45", "County Cup", ""),
      fixture("f4", "Wrenfield United", false, addDays(matchDate, 21), "15:00", "League", ""),
    ],
  };
}

/** yyyy-mm-dd plus some days, without timezone drift. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

function fixture(
  id: string,
  opponent: string,
  isHome: boolean,
  date: string,
  kickoff: string,
  competition: string,
  score: string,
): Fixture {
  return { id, opponent, isHome, date, kickoff, competition, score };
}

export function blankTeam(id: string): Team {
  return {
    id,
    name: "New team",
    shortName: "NEW",
    crest: null,
    colors: { primary: "#1d3f8f", secondary: "#f2f2ee" },
    players: [],
    lineup: {
      size: 11,
      formation: "4-4-2",
      starters: Array(11).fill(null),
      bench: [],
      captainId: null,
      overrides: {},
    },
    match: defaultMatch({
      opponent: "",
      opponentShort: "",
      competition: "",
      venue: "",
      goals: [],
      ourScore: 0,
      theirScore: 0,
      htOurScore: 0,
      htTheirScore: 0,
    }),
    fixtures: [],
  };
}

export const DEFAULT_HEADLINES: Design["headlines"] = {
  fixture: "Matchday",
  lineup: "Starting XI",
  pitch: "Team news",
  goal: "Goal",
  halftime: "Half time",
  subs: "Substitutions",
  result: "Full time",
  motm: "Player of the match",
  fixtures: "Fixtures",
};

export function defaultDesign(): Design {
  return {
    kind: "lineup",
    format: "portrait",
    look: "block",
    font: "archivo",
    colors: null,
    headlines: { ...DEFAULT_HEADLINES },
    footer: "#UpTheVale",
    nameStyle: "initial",
    tokenStyle: "shirt",
    showNumbers: true,
    showSubs: true,
    showCaptain: true,
    showLettering: false,
    background: {
      image: null,
      x: 50,
      y: 35,
      zoom: 1,
      overlay: "fade",
      strength: 0.8,
      mono: false,
    },
    backgroundOn: null,
    featureImage: null,
    featureOn: null,
    sponsorImage: null,
  };
}

/* Extra clubs used only on the landing page to show range. */

interface SampleClub {
  id: string;
  name: string;
  shortName: string;
  colors: Colors;
  rows: Row[];
  opponent: Partial<Match>;
}

const SAMPLE_CLUBS: SampleClub[] = [
  {
    id: "harlow",
    name: "Harlow Fields",
    shortName: "HFFC",
    colors: { primary: "#15295c", secondary: "#86c0ea" },
    opponent: {
      opponent: "Weybridge Albion",
      opponentShort: "WA",
      opponentColors: { primary: "#f0c419", secondary: "#141414" },
      competition: "Senior Cup Quarter-final",
      venue: "The Meadow",
      kickoff: "19:45",
      ourScore: 3,
      theirScore: 0,
    },
    rows: [
      ["1", "Nathan Oduya", "GK"],
      ["2", "Will Stapleton", "DF"],
      ["5", "Femi Adebayo", "DF"],
      ["6", "Craig Munro", "DF"],
      ["3", "Aaron Kitt", "DF"],
      ["4", "Lewis Farrant", "MF"],
      ["8", "Tobi Shaw", "MF"],
      ["10", "Jordan Pace", "MF"],
      ["7", "Ollie Venn", "FW"],
      ["9", "Kai Benton", "FW"],
      ["11", "Dom Rafferty", "FW"],
    ],
  },
  {
    id: "millbrook",
    name: "Millbrook Rangers",
    shortName: "MRFC",
    colors: { primary: "#b51f2c", secondary: "#f5f3ee" },
    opponent: {
      opponent: "Saltmarsh United",
      opponentShort: "SU",
      opponentColors: { primary: "#0f6f74", secondary: "#f2f2ee" },
      competition: "Women's Premier Division",
      venue: "Brook Road",
      kickoff: "14:00",
      ourScore: 1,
      theirScore: 1,
    },
    rows: [
      ["1", "Hannah Reyes", "GK"],
      ["2", "Grace Moffat", "DF"],
      ["4", "Priya Lal", "DF"],
      ["5", "Erin Doyle", "DF"],
      ["3", "Molly Strand", "DF"],
      ["6", "Ava Kendrick", "MF"],
      ["8", "Leah Achebe", "MF"],
      ["10", "Isla Barton", "MF"],
      ["7", "Ruby Cole", "FW"],
      ["9", "Tess Nolan", "FW"],
      ["11", "Zara Whitlock", "FW"],
    ],
  },
];

/** Fixed so the prerendered landing page never depends on the clock. */
const SAMPLE_DATE = "2026-11-21";

export function sampleTeams(): Team[] {
  return [
    demoTeam("ashby", SAMPLE_DATE),
    ...SAMPLE_CLUBS.map((c): Team => {
      const ps = players(`${c.id}-`, c.rows);
      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        crest: null,
        colors: c.colors,
        players: ps,
        lineup: lineupFor(ps, [0, 4, 2, 3, 1, 5, 6, 7, 10, 9, 8], [], 7),
        match: defaultMatch({ ...c.opponent, date: SAMPLE_DATE, goals: [], autoScore: false }),
        fixtures: [],
      };
    }),
  ];
}
