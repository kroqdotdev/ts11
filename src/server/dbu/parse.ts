import "server-only";
import * as cheerio from "cheerio";
import type {
  DbuMatchEvent,
  DbuMatchPage,
  DbuSheetPlayer,
  DbuTeamEntry,
  DbuTeamSheet,
} from "@/lib/dbu";

/**
 * Parsers for the public results pages on dbu.dk (the Danish FA). They read the
 * HTML a browser gets; there is no public API for clubs. dbu.dk answers 200 for
 * anything, including ids that don't exist, so every parser checks that the page
 * has the part it reads and throws `DbuPageError` when it doesn't.
 */

export const DBU_ORIGIN = "https://www.dbu.dk";

/** A page didn't have what we read from it: the markup changed or the id is wrong. */
export class DbuPageError extends Error {}

/** DBU answered, but has no match by that number (moved, cancelled or mistyped). */
export class DbuNotFound extends DbuPageError {}

export interface ClubHit {
  id: string;
  name: string;
}

export interface KitNames {
  shirt: string;
  shorts: string;
}

export interface ClubInfo {
  name: string;
  /** The home kit as DBU names it ("Mørkeblå", "Rød/Hvid"); null when not filled in. */
  homeKit: KitNames | null;
}

export type TeamEntry = DbuTeamEntry;

export interface FixtureRow {
  matchId: string;
  /** "YYYY-MM-DD", Danish local date. */
  date: string;
  /** "HH:MM", or "" when DBU hasn't set a time. */
  kickoff: string;
  home: TeamCell;
  away: TeamCell;
  venue: string;
  /** "3-1" once played, "" before. */
  score: string;
}

export interface TeamCell {
  name: string;
  /** From the team link, when the cell has one. */
  teamId: string | null;
  /** The club's crest on file.dbu.dk, when it has one. */
  crestPath: string | null;
  /** Read from the crest path: DBU files crests under the club's id. */
  clubId: string | null;
}

type Root = ReturnType<typeof cheerio.load>;
type Node = ReturnType<Root>;

function load(html: string): Root {
  const $ = cheerio.load(html);
  // Ad slots inject <script> rows between table rows.
  $("script, style").remove();
  return $;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** `/resultater/klubsoeg/?q=…`: a table of links to `/resultater/Klub/{id}`. */
export function parseClubSearch(html: string): ClubHit[] {
  const $ = load(html);
  const hits: ClubHit[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, a) => {
    const m = /^\/resultater\/klub\/(\d+)\/?$/i.exec($(a).attr("href") ?? "");
    if (!m || seen.has(m[1])) return;
    const name = clean($(a).text());
    if (!name) return;
    seen.add(m[1]);
    hits.push({ id: m[1], name });
  });
  return hits;
}

/** `/resultater/klub/{id}/klubinfo`: label/value pairs in `.sr--club--info`. */
export function parseClubInfo(html: string): ClubInfo {
  const $ = load(html);
  const box = $(".sr--club--info").first();
  if (!box.length) throw new DbuPageError("club info: .sr--club--info not found");
  let name = "";
  let homeKit: KitNames | null = null;
  box.find(".col-pad").each((_, el) => {
    const pad = $(el);
    const label = clean(pad.children("label").first().text());
    if (label === "Navn") name = clean(pad.children("span").first().text());
    if (label === "Spilledragt hjemme") {
      const part = (want: string) =>
        clean(
          pad
            .find(".clothes-box label")
            .filter((_, l) => clean($(l).text()) === want)
            .first()
            .next("span")
            .text(),
        );
      const shirt = part("Trøje");
      if (shirt) homeKit = { shirt, shorts: part("Shorts") };
    }
  });
  if (!name) throw new DbuPageError("club info: no club name");
  return { name, homeKit };
}

/**
 * `/resultater/klub/{id}/holdoversigt`: the table `#club-team-list`. Heading rows
 * (one cell) name the age group; team rows link `/resultater/hold/{team}_{pool}` and
 * the pool. Teams not placed in a pool yet link elsewhere and are left out.
 */
export function parseTeamList(html: string): TeamEntry[] {
  const $ = load(html);
  const table = $("#club-team-list").first();
  const headers = table
    .find("th")
    .map((_, th) => clean($(th).text()))
    .get();
  if (!table.length || !headers.includes("Hold") || !headers.includes("Pulje")) {
    throw new DbuPageError("team list: #club-team-list with Hold/Pulje not found");
  }
  const teams: TeamEntry[] = [];
  const seen = new Set<string>();
  let group = "";
  table.find("tr").each((_, tr) => {
    const cells = $(tr).children("td");
    if (cells.length === 1) {
      const heading = clean(cells.first().text());
      if (heading) group = heading;
      return;
    }
    if (cells.length < 2) return;
    const link = cells.eq(0).find('a[href*="/resultater/hold/"]').first();
    const m = /\/resultater\/hold\/(\d+)_(\d+)/.exec(link.attr("href") ?? "");
    if (!m) return;
    const key = `${m[1]}_${m[2]}`;
    if (seen.has(key)) return;
    seen.add(key);
    teams.push({
      teamId: m[1],
      poolId: m[2],
      group,
      competition: clean(link.text()),
      pool: clean(cells.eq(1).text()),
    });
  });
  return teams;
}

/**
 * `/resultater/hold/{team}_{pool}/kampprogram`. Each match is rendered twice
 * (desktop and mobile); only the desktop cells (`td.hide-on-mobile`) are read:
 * [0] info icon, [1] match number, [2] date ("lør. 15-08 2026"), [3] time,
 * [4] home, [5] away, [6] venue, [7] result. The hidden Excel field names the team,
 * which proves the page is the one asked for.
 */
export function parseFixtures(html: string, teamId: string): FixtureRow[] {
  const $ = load(html);
  const container = $("#teamMatchProgram").first();
  if (!container.length) throw new DbuPageError("fixtures: #teamMatchProgram not found");
  const excel = container.find("input#hid_srexcel").attr("value") ?? "";
  if (!excel.includes(`TeamId=${teamId}`)) {
    throw new DbuPageError("fixtures: the page belongs to another team");
  }
  const table = container.find("table.match-program--table").first();
  if (!table.length) return []; // No fixtures published yet.
  const headers = table
    .find("thead th")
    .map((_, th) => clean($(th).text()))
    .get();
  if (!headers.includes("Kampnr") || !headers.includes("Hjemme") || !headers.includes("Ude")) {
    throw new DbuPageError("fixtures: expected columns Kampnr/Hjemme/Ude not found");
  }
  const rows: FixtureRow[] = [];
  table.find("tbody tr").each((_, tr) => {
    const cells = $(tr).children("td.hide-on-mobile");
    if (cells.length < 8) return;
    const matchId = clean(cells.eq(1).text());
    if (!/^\d+$/.test(matchId)) return;
    const d = /(\d{2})-(\d{2})\s+(\d{4})/.exec(cells.eq(2).text());
    if (!d) return;
    const time = clean(cells.eq(3).text());
    rows.push({
      matchId,
      date: `${d[3]}-${d[2]}-${d[1]}`,
      kickoff: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "",
      home: teamCell($, cells.eq(4)),
      away: teamCell($, cells.eq(5)),
      venue: linkText(cells.eq(6)),
      score: score(cells.eq(7)),
    });
  });
  return rows;
}

function linkText(cell: Node): string {
  const link = cell.find("a").first();
  return clean(link.length ? link.text() : cell.text());
}

function teamCell($: Root, cell: Node): TeamCell {
  const href = cell.find('a[href*="/resultater/hold/"]').first().attr("href") ?? "";
  const team = /\/resultater\/hold\/(\d+)_/.exec(href);
  const crestPath = crestPathOf(cell.find(".logo img").first().attr("src"));
  const club = crestPath ? /^\/images\/club\/(\d+)\//.exec(crestPath) : null;
  return {
    name: linkText(cell),
    teamId: team ? team[1] : null,
    crestPath,
    clubId: club ? club[1] : null,
  };
}

/**
 * A crest's path on file.dbu.dk, or null. Only DBU's own file server counts, so a
 * change in the markup can never make the server fetch someone else's URL.
 */
export function crestPathOf(src: string | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src.trim(), DBU_ORIGIN);
    if (url.protocol !== "https:" || url.hostname !== "file.dbu.dk") return null;
    return /^\/images\/club\/\d+\/[^/]+\.(png|jpe?g|gif|webp)$/i.test(url.pathname)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
}

/**
 * The result cell: two numbers once played. A walkover reads HHT (home lost) or UHT
 * (away lost) and counts as 3-0 to the other side, as in DBU's tables.
 */
function score(cell: Node): string {
  const status = clean(cell.text()).toUpperCase();
  if (/\bHHT\b/.test(status)) return "0-3";
  if (/\bUHT\b/.test(status)) return "3-0";
  const home = clean(cell.find(".home-score").first().text());
  const away = clean(cell.find(".away-score").first().text());
  return /^\d+$/.test(home) && /^\d+$/.test(away) ? `${home}-${away}` : "";
}

/** "Oversidder" is DBU's placeholder for a bye: the team sits the round out. */
export const isBye = (name: string) => /^oversidder$/i.test(name.trim());

/* ---------------------------------------------------------------- match page */

export type SheetPlayer = DbuSheetPlayer;
export type TeamSheet = DbuTeamSheet;
export type MatchEvent = DbuMatchEvent;
export type MatchPage = DbuMatchPage;

const EVENT = "sr--match--live-score--event";
/** DBU's placeholder when the reporter didn't pick a player. */
const unknownPlayer = (name: string) => (/^ukendt spiller$/i.test(name) ? "" : name);

/** "'45" → "45", "'45+2" → "45+2", anything else → "". */
export function minuteOf(text: string): string {
  const m = /(\d+)(?:\s*\+\s*(\d+))?/.exec(text);
  return m ? (m[2] ? `${m[1]}+${m[2]}` : m[1]) : "";
}

/** The event's type from its icon's file name (/Content/Gfx/SR/livescorev2/<name>.svg). */
function iconName(src: string): string {
  return (src.split(/[?#]/)[0].split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

function sheet($: Root, side: "home-team" | "away-team"): TeamSheet | null {
  let team = "";
  const starters: SheetPlayer[] = [];
  const bench: SheetPlayer[] = [];
  $(`table.${side}`).each((_, table) => {
    const rows = $(table).find("tr");
    const header = clean($(rows[0]).text());
    if (!header || /^officials$/i.test(header)) return; // Coaches and team managers.
    const isBench = /^reserver$/i.test(header);
    if (!isBench && team) return; // The starters are already read.
    const target = isBench ? bench : starters;
    rows.each((i, tr) => {
      if (i === 0) return;
      const name = unknownPlayer(clean($(tr).find("span").first().text()));
      const number = clean($(tr).find("td.shirt-number").first().text());
      if (name) target.push({ name, number: /^\d{1,3}$/.test(number) ? number : "" });
    });
    if (!isBench && starters.length) team = header;
  });
  return team ? { team, starters, bench } : null;
}

/**
 * `/resultater/kamp/{match}_{pool}/kampinfo`: the score, the live-score timeline and
 * the holdkort (team sheets, starters and "Reserver"), when DBU shows them. In a
 * timeline entry the first name is the scorer, or the player coming on; the second
 * (greyed) is the assist, or the player going off.
 */
export function parseMatchPage(html: string, matchId: string): MatchPage {
  const $ = load(html);
  let number = "";
  $(".sr--match--info .col-pad").each((_, el) => {
    if (clean($(el).children("label").first().text()) === "Kampnummer") {
      number = clean($(el).children().not("label").first().text());
    }
  });
  if (number !== matchId) throw new DbuNotFound(`match page: no match ${matchId}`);

  const events: MatchEvent[] = [];
  let firstHalf = true;
  let hasHalfTime = false;
  $(`div.${EVENT}`).each((_, el) => {
    const e = $(el);
    const minute = minuteOf(e.children(`.${EVENT}--minute`).first().text());
    const home = e.children(`.${EVENT}--home`);
    const away = e.children(`.${EVENT}--away`);
    const box = home.length ? home : away;
    if (!box.length) {
      if (/1\.\s*halvleg slut/i.test(clean(e.text()))) {
        firstHalf = false;
        hasHalfTime = true;
      }
      return;
    }
    const side = home.length ? "home" : "away";
    const player = box.find(`.${EVENT}--player`).first();
    const second = clean(player.find(`.${EVENT}--player2`).first().text());
    const first = clean(player.clone().find(`.${EVENT}--player2`).remove().end().text());
    const icon = iconName(box.find(`.${EVENT}--icon img`).attr("src") ?? "");
    if (icon === "icon_sr_goal" || icon === "icon_sr_penaltygoal" || icon === "icon_sr_owngoal") {
      events.push({
        type: "goal",
        side,
        minute,
        scorer: unknownPlayer(first),
        assist: unknownPlayer(second),
        kind:
          icon === "icon_sr_owngoal" ? "own" : icon === "icon_sr_penaltygoal" ? "penalty" : "open",
        firstHalf,
      });
    } else if (icon === "icon_sr_subhome" || icon === "icon_sr_subaway") {
      events.push({
        type: "sub",
        side,
        minute,
        on: unknownPlayer(first),
        off: unknownPlayer(second),
      });
    }
  });

  const scoreBox = $(".sr-match-score").first();
  const h = clean(scoreBox.find(".home").first().text());
  const a = clean(scoreBox.find(".away").first().text());
  const status = clean($(".sr--match--live-score--status").first().text());
  return {
    matchId,
    home: sheet($, "home-team"),
    away: sheet($, "away-team"),
    score: /^\d+$/.test(h) && /^\d+$/.test(a) ? { home: Number(h), away: Number(a) } : null,
    finished: /færdigspillet/i.test(status),
    hasHalfTime,
    events,
  };
}
