import { graphicText } from "./graphicText";
import type {
  Colors,
  Design,
  Fixture,
  Language,
  Lineup,
  Match,
  Player,
  Position,
  Team,
} from "./types";

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

/** The example match: a home game against a local rival, won 2-1. */
const MATCH: Record<Language, Omit<Match, "date">> = {
  en: {
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
  },
  da: {
    opponent: "Kildeby BK",
    opponentShort: "KBK",
    opponentCrest: null,
    opponentColors: { primary: "#c4232f", secondary: "#f4f4f1" },
    isHome: true,
    competition: "Serie 1",
    kickoff: "15.00",
    venue: "Søndervang Idrætspark",
    autoScore: true,
    ourScore: 2,
    theirScore: 1,
    goals: [
      { id: "g1", side: "us", name: "Friis", minute: "23" },
      { id: "g2", side: "them", name: "Nygaard", minute: "51" },
      { id: "g3", side: "us", name: "Krogh", minute: "78" },
    ],
    htOurScore: 1,
    htTheirScore: 0,
    spotlightGoalId: null,
    subs: [],
    motmId: null,
    motmNote: "",
  },
};

export function defaultMatch(overrides: Partial<Match> = {}, language: Language = "en"): Match {
  return {
    ...MATCH[language],
    date: overrides.date ?? nextSaturday(),
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

/** The Danish example club: same shirts, same positions, same match. */
const SONDERVANG_ROWS: Row[] = [
  ["1", "Mads Kjærgaard", "GK"],
  ["2", "Jonas Bech", "DF"],
  ["3", "Frederik Holm", "DF"],
  ["4", "Mikkel Dahl", "DF"],
  ["5", "Rasmus Thygesen", "DF"],
  ["6", "Emil Kristensen", "MF"],
  ["8", "Oliver Brandt", "MF"],
  ["10", "Magnus Friis", "MF"],
  ["7", "Lucas Østergaard", "FW"],
  ["9", "Mathias Krogh", "FW"],
  ["11", "Anton Vestergaard", "FW"],
  ["12", "Christian Bak", "GK"],
  ["14", "Nikolaj Munk", "DF"],
  ["15", "Sebastian Lauridsen", "MF"],
  ["16", "Victor Skov", "MF"],
  ["17", "Oscar Juhl", "FW"],
  ["18", "Malthe Ravn", "FW"],
];

/** What differs between the English and the Danish example club; the story is the same. */
const DEMO_CLUB: Record<
  Language,
  {
    name: string;
    shortName: string;
    rows: Row[];
    theirScorer: string;
    motmNote: string;
    fixtures: [opponent: string, isHome: boolean, days: number, kickoff: string, comp: string][];
  }
> = {
  en: {
    name: "Ashby Vale",
    // The same letters as the badge, so the score strip and the crest agree.
    shortName: "AV",
    rows: ASHBY_ROWS,
    theirScorer: "Hollis",
    motmNote: "A goal, an assist and the armband",
    fixtures: [
      ["Kingswood Wanderers", true, 7, "15:00", "League"],
      ["Holbeck Saints", false, 14, "14:30", "League"],
      ["Pellow Rovers", true, 17, "19:45", "County Cup"],
      ["Wrenfield United", false, 21, "15:00", "League"],
    ],
  },
  da: {
    name: "Søndervang IF",
    shortName: "SIF",
    rows: SONDERVANG_ROWS,
    theirScorer: "Nygaard",
    motmNote: "Et mål, et oplæg og anførerbindet",
    fixtures: [
      ["Hjortholm IF", true, 7, "15.00", "Serie 1"],
      ["Egholt Boldklub", false, 14, "14.00", "Serie 1"],
      ["Rødmose IF", true, 17, "19.00", "DBU Pokalen"],
      ["Stenlund Fremad", false, 21, "13.00", "Serie 1"],
    ],
  },
};

/**
 * The example club the studio starts with, in English or Danish. Both tell the same
 * story with the same ids (goals g1-g3, subs s1-s2, fixtures f1-f4, players by shirt
 * order), so the landing page can point at the same moments in either language.
 */
export function demoTeam(id = "ashby", date?: string, language: Language = "en"): Team {
  const club = DEMO_CLUB[language] ?? DEMO_CLUB.en;
  const ps = players(`${id}-`, club.rows);
  const matchDate = date ?? nextSaturday();
  return {
    id,
    name: club.name,
    shortName: club.shortName,
    crest: null,
    colors: { primary: "#17553a", secondary: "#e9b62c" },
    language,
    players: ps,
    // GK, back four left to right, midfield three, front three
    lineup: lineupFor(ps, [0, 4, 2, 3, 1, 5, 6, 7, 10, 9, 8], [11, 12, 13, 14, 15, 16], 7),
    match: defaultMatch(
      {
        date: matchDate,
        // Our scorers are linked to the squad, as picking them in the studio does.
        goals: [
          { id: "g1", side: "us", name: ps[7].name, playerId: ps[7].id, minute: "23" },
          { id: "g2", side: "them", name: club.theirScorer, minute: "51" },
          { id: "g3", side: "us", name: ps[9].name, playerId: ps[9].id, minute: "78" },
        ],
        subs: [
          { id: "s1", offId: ps[8].id, onId: ps[15].id, minute: "61" },
          { id: "s2", offId: ps[6].id, onId: ps[13].id, minute: "74" },
        ],
        motmId: ps[7].id,
        motmNote: club.motmNote,
      },
      language,
    ),
    // The games after this one (the Fixtures graphic puts the current match first).
    fixtures: club.fixtures.map(([opponent, isHome, days, kickoff, competition], i) =>
      fixture(`f${i + 1}`, opponent, isHome, addDays(matchDate, days), kickoff, competition, ""),
    ),
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

export function blankTeam(id: string, language: Language = "en"): Team {
  return {
    id,
    name: language === "da" ? "Nyt hold" : "New team",
    shortName: language === "da" ? "NYT" : "NEW",
    crest: null,
    colors: { primary: "#1d3f8f", secondary: "#f2f2ee" },
    language,
    players: [],
    lineup: {
      size: 11,
      formation: "4-4-2",
      starters: Array(11).fill(null),
      bench: [],
      captainId: null,
      overrides: {},
    },
    match: defaultMatch(
      {
        opponent: "",
        opponentShort: "",
        competition: "",
        venue: "",
        goals: [],
        ourScore: 0,
        theirScore: 0,
        htOurScore: 0,
        htTheirScore: 0,
      },
      language,
    ),
    fixtures: [],
  };
}

/** The English default headlines (the Danish ones are in graphicText.ts). */
export const DEFAULT_HEADLINES: Design["headlines"] = { ...graphicText("en").headlines };

/** The example club's hashtag, printed in the footer of a new design. */
const FOOTER: Record<Language, string> = { en: "#UpTheVale", da: "#ViErSIF" };

/**
 * A new design. The headlines start on the defaults, which print in each club's own
 * language whatever language they are stored in (see `effectiveHeadline`).
 */
export function defaultDesign(language: Language = "en"): Design {
  return {
    kind: "lineup",
    format: "portrait",
    look: "block",
    font: "archivo",
    colors: null,
    headlines: { ...graphicText(language).headlines },
    footer: FOOTER[language] ?? FOOTER.en,
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

const SAMPLE_CLUBS: Record<Language, SampleClub[]> = {
  en: [
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
  ],
  da: [
    {
      id: "harlow",
      name: "Nørrekær Boldklub",
      shortName: "NBK",
      colors: { primary: "#15295c", secondary: "#86c0ea" },
      opponent: {
        opponent: "Vesterlund IF",
        opponentShort: "VIF",
        opponentColors: { primary: "#f0c419", secondary: "#141414" },
        competition: "DBU Pokalen, kvartfinale",
        venue: "Engen",
        kickoff: "19.00",
        ourScore: 3,
        theirScore: 0,
      },
      rows: [
        ["1", "Kasper Winther", "GK"],
        ["2", "Simon Overgaard", "DF"],
        ["5", "Ali Haddad", "DF"],
        ["6", "Jeppe Lindberg", "DF"],
        ["3", "Andreas Bjerre", "DF"],
        ["4", "Tobias Mørch", "MF"],
        ["8", "Benjamin Kofoed", "MF"],
        ["10", "William Sørensen", "MF"],
        ["7", "Noah Damgaard", "FW"],
        ["9", "Elias Hald", "FW"],
        ["11", "Alexander Riis", "FW"],
      ],
    },
    {
      id: "millbrook",
      name: "Bakkehøj IF",
      shortName: "BIF",
      colors: { primary: "#b51f2c", secondary: "#f5f3ee" },
      opponent: {
        opponent: "Strandby Boldklub",
        opponentShort: "SB",
        opponentColors: { primary: "#0f6f74", secondary: "#f2f2ee" },
        competition: "Kvindeserien",
        venue: "Bakkehøj Stadion",
        kickoff: "14.00",
        ourScore: 1,
        theirScore: 1,
      },
      rows: [
        ["1", "Sofie Lykke", "GK"],
        ["2", "Ida Mortensen", "DF"],
        ["4", "Freja Nørgaard", "DF"],
        ["5", "Clara Bundgaard", "DF"],
        ["3", "Laura Iversen", "DF"],
        ["6", "Emma Toft", "MF"],
        ["8", "Josefine Agger", "MF"],
        ["10", "Signe Kirkegaard", "MF"],
        ["7", "Alma Fogh", "FW"],
        ["9", "Nanna Busk", "FW"],
        ["11", "Maja Holst", "FW"],
      ],
    },
  ],
};

/**
 * Invented club names for the landing page's stadium hero, one per kit, in the same
 * order as its English list (Millbrook Rangers, Harlow Fields, Ravensmoor Town, …).
 */
export const HERO_CLUB_NAMES: Record<Language, string[]> = {
  en: [
    "Millbrook Rangers",
    "Harlow Fields",
    "Ravensmoor Town",
    "Ashby Vale",
    "Holbeck Saints",
    "Wrenfield United",
    "Pellow Rovers",
    "Saltmarsh United",
    "Weybridge Albion",
    "Kestle Athletic",
  ],
  da: [
    "Bakkehøj IF",
    "Nørrekær Boldklub",
    "Ravnsmose IF",
    "Søndervang IF",
    "Egholt Boldklub",
    "Stenlund Fremad",
    "Rødmose IF",
    "Strandby Boldklub",
    "Vesterlund IF",
    "Kildeby BK",
  ],
};

/** Fixed so the prerendered landing page never depends on the clock. */
const SAMPLE_DATE = "2026-11-21";

export function sampleTeams(language: Language = "en"): Team[] {
  return [
    demoTeam("ashby", SAMPLE_DATE, language),
    ...SAMPLE_CLUBS[language].map((c): Team => {
      const ps = players(`${c.id}-`, c.rows);
      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        crest: null,
        colors: c.colors,
        language,
        players: ps,
        lineup: lineupFor(ps, [0, 4, 2, 3, 1, 5, 6, 7, 10, 9, 8], [], 7),
        match: defaultMatch(
          { ...c.opponent, date: SAMPLE_DATE, goals: [], autoScore: false },
          language,
        ),
        fixtures: [],
      };
    }),
  ];
}
