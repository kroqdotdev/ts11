import type { Design, GraphicKind, Language, Team } from "./types";

/**
 * Words printed on the graphics, in the club's graphics language (team.language).
 * This is separate from the interface text in messages/: a Danish volunteer can make
 * English graphics and the other way round. Every word a graphic prints comes from here;
 * names, numbers and what the club typed are printed as given.
 */
export interface GraphicText {
  /** The default headline for each graphic. */
  headlines: Record<GraphicKind, string>;
  /** The Substitutions headline for a single change. */
  substitution: string;

  /** Before the opponent at a home game: "vs Corrin Town". */
  vs: string;
  /** Before the opponent at an away game: "at Corrin Town". */
  at: string;
  /** Between two club names on one line: "Ashby Vale v Corrin Town". */
  v: string;
  /** Between two club names set on lines of their own. */
  vStacked: string;
  /** Home and away, written out. */
  home: string;
  away: string;
  /** Home and away as a one-letter badge. */
  homeLetter: string;
  awayLetter: string;

  /** The mark beside the captain's name: "C" (bracketed as "(C)" in lists). */
  captain: string;
  /** Label for the bench players on a line-up. */
  subs: string;
  /** Label before the list of scorers. */
  goals: string;
  /** Player coming on and going off, beside a substitution. */
  on: string;
  off: string;
  /** Before the player going off, under the one coming on: "Ravn / for Juhl". */
  subFor: string;
  /** Printed for a goal with no scorer filled in. */
  goal: string;
  /** The scorer's name for an own goal, as imported from DBU. */
  ownGoal: string;
  /** Printed for a player whose name is blank. */
  unnamed: string;
  /** A fixture row with no opponent filled in. */
  opponent: string;

  /** Labels in fact tables and beside big numbers. */
  kickoff: string;
  /** Kick-off squeezed onto a scoreboard, before the time: "KO 15:00". */
  kickoffShort: string;
  date: string;
  venue: string;
  score: string;
  result: string;
  shirt: string;
  /** The scoreboard's line above the next fixture. */
  nextUp: string;

  /** The cover of the programme look. */
  programme: string;
  /** "No." before the programme's issue number. */
  issue: string;
  /** The cover price on the programme roundel. */
  price: string;
  /** The section name at the foot of the back page. */
  sport: string;

  /** File names in the Pixel look (lowercase, no extension unless given). */
  files: {
    versus: string;
    club: string;
    kickoff: string;
    scorers: string;
    score: string;
    bench: string;
    changes: string;
    note: string;
    fixtures: string;
    calendar: string;
    untitled: string;
    /** The third desktop icon on a story, when the design has no hashtag. */
    matchday: string;
  };

  /** A quotation, with the language's own quotation marks. */
  quote: (text: string) => string;
  /** The BCP 47 tag used for dates on the graphics. */
  locale: string;
}

const TEXT: Record<Language, GraphicText> = {
  en: {
    headlines: {
      fixture: "Matchday",
      lineup: "Starting XI",
      pitch: "Team news",
      goal: "Goal",
      halftime: "Half time",
      subs: "Substitutions",
      result: "Full time",
      motm: "Player of the match",
      fixtures: "Fixtures",
    },
    substitution: "Substitution",
    vs: "vs",
    at: "at",
    v: "v",
    vStacked: "v",
    home: "Home",
    away: "Away",
    homeLetter: "H",
    awayLetter: "A",
    captain: "C",
    subs: "Subs",
    goals: "Goals",
    on: "On",
    off: "Off",
    subFor: "for",
    goal: "Goal",
    ownGoal: "Own goal",
    unnamed: "Unnamed",
    opponent: "Opponent",
    kickoff: "Kick-off",
    kickoffShort: "KO",
    date: "Date",
    venue: "Venue",
    score: "Score",
    result: "Result",
    shirt: "Shirt",
    nextUp: "Next up",
    programme: "Official matchday programme",
    issue: "No.",
    price: "£2",
    sport: "Sport",
    files: {
      versus: "versus.txt",
      club: "club.txt",
      kickoff: "kickoff.ics",
      scorers: "scorers.log",
      score: "score.txt",
      bench: "subs.txt",
      changes: "changes.log",
      note: "note.txt",
      fixtures: "fixtures.ics",
      calendar: "calendar.exe",
      untitled: "untitled",
      matchday: "matchday",
    },
    quote: (text) => `“${text}”`,
    locale: "en-GB",
  },
  da: {
    headlines: {
      fixture: "Kampdag",
      lineup: "Startopstilling",
      pitch: "Dagens hold",
      goal: "Mål",
      halftime: "Pause",
      subs: "Udskiftninger",
      result: "Slutresultat",
      motm: "Kampens spiller",
      fixtures: "Kampprogram",
    },
    substitution: "Udskiftning",
    vs: "mod",
    at: "ude mod",
    v: "–",
    vStacked: "mod",
    home: "Hjemme",
    away: "Ude",
    homeLetter: "H",
    awayLetter: "U",
    captain: "A",
    subs: "Udskiftere",
    goals: "Mål",
    on: "Ind",
    off: "Ud",
    subFor: "ind for",
    goal: "Mål",
    ownGoal: "Selvmål",
    unnamed: "Uden navn",
    opponent: "Modstander",
    kickoff: "Kampstart",
    kickoffShort: "Kl.",
    date: "Dato",
    venue: "Bane",
    score: "Stilling",
    result: "Resultat",
    shirt: "Nummer",
    nextUp: "Næste kamp",
    programme: "Officielt kampprogram",
    issue: "Nr.",
    price: "20 kr.",
    sport: "Sport",
    files: {
      versus: "kampen.txt",
      club: "klubben.txt",
      kickoff: "kampstart.ics",
      scorers: "målscorere.log",
      score: "stilling.txt",
      bench: "bænk.txt",
      changes: "udskiftninger.log",
      note: "note.txt",
      fixtures: "kampprogram.ics",
      calendar: "kalender.exe",
      untitled: "unavngivet",
      matchday: "kampdag",
    },
    quote: (text) => `»${text}«`,
    locale: "da-DK",
  },
};

export function graphicText(language: Language | undefined): GraphicText {
  return TEXT[language ?? "en"] ?? TEXT.en;
}

/** The printed words for a club's graphics, in its graphics language. */
export function textFor(team: { language?: Language }): GraphicText {
  return graphicText(team.language === "da" ? "da" : "en");
}

/**
 * A headline as printed. The design's headlines are shared by all clubs, so a headline
 * still on a default (in any language) prints as the default in this club's language;
 * one someone has typed (or emptied) prints as typed.
 */
export function effectiveHeadline(design: Design, kind: GraphicKind, language: Language): string {
  const typed = design.headlines[kind] ?? "";
  const isDefault = Object.values(TEXT).some(
    (t) => t.headlines[kind].toLowerCase() === typed.trim().toLowerCase(),
  );
  return isDefault ? graphicText(language).headlines[kind] : typed;
}

/** The design with every headline as it prints for this club (see `effectiveHeadline`). */
export function withHeadlines(design: Design, team: { language?: Language }): Design {
  const language = team.language === "da" ? "da" : "en";
  const headlines = Object.fromEntries(
    (Object.keys(design.headlines) as GraphicKind[]).map((kind) => [
      kind,
      effectiveHeadline(design, kind, language),
    ]),
  ) as Design["headlines"];
  const same = (Object.keys(headlines) as GraphicKind[]).every(
    (k) => headlines[k] === design.headlines[k],
  );
  return same ? design : { ...design, headlines };
}

/**
 * The Substitutions headline: the singular for a single change while the headline is
 * still the default, as typed otherwise.
 */
export function subsHeadline(design: Design, team: Pick<Team, "language">, count: number) {
  const t = textFor(team);
  const headline = design.headlines.subs;
  return count === 1 && headline.trim().toLowerCase() === t.headlines.subs.toLowerCase()
    ? t.substitution
    : headline;
}
