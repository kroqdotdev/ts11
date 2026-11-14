import { uid } from "./id";
import type { Colors, DbuLink, Fixture, Goal, Match, Player, Team } from "./types";

/*
  Importing a Danish club from DBU (the Danish FA): the shapes the /api/dbu routes
  send, and the pure steps that turn them into teamsheet11 data. The server reads
  dbu.dk's public results pages; nothing here needs a DBU login.
*/

export interface DbuClubHit {
  id: string;
  name: string;
}

/** One team in one competition. A club's team often plays in several (league, cup, winter). */
export interface DbuTeamEntry {
  teamId: string;
  poolId: string;
  /** The age group heading, e.g. "Senior", "U16". */
  group: string;
  /** The competition, e.g. "Serie 2 - Efterår". */
  competition: string;
  /** The pool within it, e.g. "Pulje 3". */
  pool: string;
}

export interface DbuClub {
  id: string;
  name: string;
  /** From the home kit on DBU; null when the club hasn't filled it in. */
  colors: Colors | null;
  teams: DbuTeamEntry[];
}

export interface DbuFixture {
  matchId: string;
  teamId: string;
  poolId: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** "HH:MM", or "" when not set yet. */
  kickoff: string;
  isHome: boolean;
  opponent: string;
  /** The opponent's DBU club id, the key into `opponents`; null when DBU has no crest for them. */
  opponentClubId: string | null;
  competition: string;
  venue: string;
  /** Ours first ("3-1" is a win), "" before the match is played. */
  score: string;
}

export interface DbuOpponent {
  /** A data: URL, ready to store like an uploaded crest. */
  crest: string | null;
  colors: Colors | null;
}

export interface DbuImport {
  club: { id: string; name: string; crest: string | null; colors: Colors | null };
  fixtures: DbuFixture[];
  opponents: Record<string, DbuOpponent>;
}

export type { DbuLink };

/** A player on a holdkort (DBU's team sheet). */
export interface DbuSheetPlayer {
  name: string;
  /** Shirt number when the holdkort has one, else "". */
  number: string;
}

export interface DbuTeamSheet {
  /** The team as DBU heads its holdkort. */
  team: string;
  starters: DbuSheetPlayer[];
  bench: DbuSheetPlayer[];
}

export type DbuMatchEvent =
  | {
      type: "goal";
      side: "home" | "away";
      /** "45", "45+2", or "" when not given. */
      minute: string;
      /** "" when DBU doesn't name the scorer. */
      scorer: string;
      assist: string;
      kind: "open" | "penalty" | "own";
      /** Scored before DBU's half-time marker. */
      firstHalf: boolean;
    }
  | { type: "sub"; side: "home" | "away"; minute: string; on: string; off: string };

/** What DBU's page for one match shows: score, timeline and team sheets. */
export interface DbuMatchPage {
  matchId: string;
  home: DbuTeamSheet | null;
  away: DbuTeamSheet | null;
  /** The final (or current) score; null before kick-off. */
  score: { home: number; away: number } | null;
  finished: boolean;
  /** Whether the timeline has a half-time marker, so `firstHalf` can be trusted. */
  hasHalfTime: boolean;
  events: DbuMatchEvent[];
}

export const selectionKey = (t: { teamId: string; poolId: string }) => `${t.teamId}_${t.poolId}`;

/** A problem the import dialog can show as is. */
export class DbuError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin" });
  } catch {
    throw new DbuError("Couldn't reach teamsheet11. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new DbuError(body.message ?? "DBU didn't answer. Try again in a minute.");
  return body as T;
}

export async function searchDbuClubs(q: string): Promise<DbuClubHit[]> {
  const res = await getJson<{ clubs: DbuClubHit[] }>(
    `/api/dbu/clubs?q=${encodeURIComponent(q.trim())}`,
  );
  return res.clubs;
}

export function getDbuClub(id: string): Promise<DbuClub> {
  return getJson<DbuClub>(`/api/dbu/clubs/${encodeURIComponent(id)}`);
}

export function getDbuImport(link: DbuLink): Promise<DbuImport> {
  const teams = link.teams.map(selectionKey).join(",");
  return getJson<DbuImport>(
    `/api/dbu/clubs/${encodeURIComponent(link.clubId)}/fixtures?teams=${encodeURIComponent(teams)}`,
  );
}

const byDate = (a: Fixture, b: Fixture) =>
  `${a.date || "9999"}T${a.kickoff}`.localeCompare(`${b.date || "9999"}T${b.kickoff}`);

/** The imported fixtures as teamsheet11 fixtures, by date, with the opponents' crests. */
export function toFixtures(data: DbuImport): Fixture[] {
  return data.fixtures
    .map((f): Fixture => {
      const opp = f.opponentClubId ? data.opponents[f.opponentClubId] : undefined;
      return {
        id: uid(),
        opponent: f.opponent,
        isHome: f.isHome,
        date: f.date,
        kickoff: f.kickoff,
        competition: f.competition,
        score: f.score,
        venue: f.venue,
        opponentCrest: opp?.crest ?? null,
        ...(opp?.colors ? { opponentColors: opp.colors } : {}),
        dbuMatchId: f.matchId,
        dbuPoolId: f.poolId,
      };
    })
    .sort(byDate);
}

/**
 * Adds newly imported fixtures and refreshes the ones already here (matched by DBU's
 * match number). What DBU decides wins: date, kick-off, home or away, venue and the
 * score. What a person may have tidied up stays: the opponent's name, the
 * competition, and a crest they chose. Fixtures DBU no longer lists are kept;
 * deleting is left to the person.
 */
export function mergeFixtures(
  existing: Fixture[],
  incoming: Fixture[],
): { fixtures: Fixture[]; added: number; updated: number } {
  const byMatch = new Map(incoming.filter((f) => f.dbuMatchId).map((f) => [f.dbuMatchId, f]));
  let updated = 0;
  const kept = existing.map((f) => {
    const fresh = f.dbuMatchId ? byMatch.get(f.dbuMatchId) : undefined;
    if (!fresh) return f;
    byMatch.delete(f.dbuMatchId);
    const next: Fixture = {
      ...f,
      date: fresh.date,
      kickoff: fresh.kickoff,
      isHome: fresh.isHome,
      score: fresh.score || f.score,
      venue: fresh.venue || f.venue,
      dbuPoolId: fresh.dbuPoolId ?? f.dbuPoolId,
      opponentCrest: f.opponentCrest ?? fresh.opponentCrest ?? null,
      ...(f.opponentColors || fresh.opponentColors
        ? { opponentColors: f.opponentColors ?? fresh.opponentColors }
        : {}),
    };
    if (JSON.stringify(next) !== JSON.stringify(f)) updated++;
    return next;
  });
  const added = [...byMatch.values()].sort(byDate);
  return { fixtures: [...kept, ...added], added: added.length, updated };
}

/** Today in the browser's time zone, as "YYYY-MM-DD". */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** The next fixture still to be played: dated today or later, no score yet. */
export function nextFixture(fixtures: Fixture[], on = today()): Fixture | null {
  return fixtures.filter((f) => !f.score.trim() && f.date && f.date >= on).sort(byDate)[0] ?? null;
}

/** "3-1" (ours first) as numbers, or null. */
function parseScore(score: string): { us: number; them: number } | null {
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(score);
  return m ? { us: Number(m[1]), them: Number(m[2]) } : null;
}

/**
 * The match graphics' details set from a fixture. A different game (another
 * opponent or date) starts with a clean sheet: no goals, subs or player of the
 * match, and the fixture's result typed in when it has one.
 */
export function matchFromFixture(m: Match, f: Fixture): Match {
  const same =
    m.date === f.date && m.opponent.trim().toLowerCase() === f.opponent.trim().toLowerCase();
  const result = parseScore(f.score);
  const fresh: Partial<Match> = same
    ? {}
    : {
        goals: [],
        subs: [],
        ourScore: result?.us ?? 0,
        theirScore: result?.them ?? 0,
        htOurScore: 0,
        htTheirScore: 0,
        // A result without its goals is typed in; goals can come from DBU afterwards.
        autoScore: !result,
        spotlightGoalId: null,
        motmId: null,
        motmNote: "",
      };
  const dbu =
    f.dbuMatchId && f.dbuPoolId
      ? { matchId: f.dbuMatchId, poolId: f.dbuPoolId }
      : same
        ? m.dbu
        : undefined;
  return {
    ...m,
    ...fresh,
    dbu,
    opponent: f.opponent,
    // Empty lets the graphics use the initials; a short name typed for another club would be wrong.
    opponentShort: same ? m.opponentShort : "",
    opponentCrest: f.opponentCrest ?? (same ? m.opponentCrest : null),
    opponentColors: f.opponentColors ?? m.opponentColors,
    isHome: f.isHome,
    competition: f.competition,
    date: f.date,
    kickoff: f.kickoff || m.kickoff,
    venue: f.venue ?? (same ? m.venue : ""),
  };
}

/** Whether a team's match graphics haven't been set up for a real game yet. */
export function matchIsBlank(team: Team): boolean {
  const m = team.match;
  return !m.opponent.trim() && m.goals.length === 0 && m.subs.length === 0;
}

export function getDbuMatch(ref: { matchId: string; poolId: string }): Promise<DbuMatchPage> {
  return getJson<DbuMatchPage>(
    `/api/dbu/matches/${encodeURIComponent(`${ref.matchId}_${ref.poolId}`)}`,
  );
}

const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase("da");

/**
 * The squad player a DBU name belongs to: the same full name (or shirt name), else
 * the only player with the same first and last name ("Asger Høst Hemmingsen" is
 * "Asger Hemmingsen"). Null when there's no match or more than one.
 */
export function findPlayerByName(players: Player[], name: string): Player | null {
  const want = normName(name);
  if (!want) return null;
  const exact = players.filter(
    (p) => normName(p.name) === want || (p.shirtName && normName(p.shirtName) === want),
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const ends = (n: string) => {
    const w = normName(n).split(" ");
    return w.length > 1 ? `${w[0]} ${w.at(-1)}` : null;
  };
  const key = ends(name);
  if (!key) return null;
  const loose = players.filter((p) => ends(p.name) === key);
  return loose.length === 1 ? loose[0] : null;
}

/** What "Get from DBU" would fill in for the match, worked out before anything changes. */
export interface DbuMatchPlan {
  /** Ours first; null before DBU has a score. */
  score: { us: number; them: number } | null;
  finished: boolean;
  goals: Goal[];
  /** The goals add up to DBU's score, so the score can be counted from them. */
  goalsAddUp: boolean;
  /** Half-time from the goals before DBU's half-time marker; null when unknown. */
  halfTime: { us: number; them: number } | null;
  /** Our holdkort; null when DBU doesn't show it. */
  sheet: DbuTeamSheet | null;
  /** Names on the holdkort that aren't in the squad yet. */
  newPlayers: DbuSheetPlayer[];
  subs: { minute: string; on: string; off: string }[];
}

/**
 * Reads DBU's match page from our side. Own goals are listed under one side, and it
 * isn't certain which; they're credited the way that makes the goals add up to the
 * score. Opponents' scorers keep DBU's full names.
 */
export function planFromDbuMatch(team: Team, page: DbuMatchPage): DbuMatchPlan {
  const ours = team.match.isHome ? "home" : "away";
  const score = page.score
    ? ours === "home"
      ? { us: page.score.home, them: page.score.away }
      : { us: page.score.away, them: page.score.home }
    : null;
  const goalEvents = page.events.filter((e) => e.type === "goal");
  const build = (ownGoalsFlip: boolean): Goal[] =>
    goalEvents.map((e) => {
      const listedOurs = e.side === ours;
      const forUs = e.kind === "own" && ownGoalsFlip ? !listedOurs : listedOurs;
      const player = forUs && e.kind !== "own" ? findPlayerByName(team.players, e.scorer) : null;
      const name = e.kind === "own" ? "Own goal" : player ? player.name : e.scorer;
      return {
        id: uid(),
        side: forUs ? "us" : "them",
        name,
        playerId: player?.id ?? null,
        minute: e.minute,
      };
    });
  const adds = (goals: Goal[]) =>
    !!score &&
    goals.filter((g) => g.side === "us").length === score.us &&
    goals.filter((g) => g.side === "them").length === score.them;
  let goals = build(false);
  if (!adds(goals) && goalEvents.some((e) => e.kind === "own") && adds(build(true))) {
    goals = build(true);
  }
  const goalsAddUp = adds(goals);
  const firstHalf = goalEvents.map((e) => e.firstHalf);
  const halfTime =
    page.hasHalfTime && goalsAddUp
      ? {
          us: goals.filter((g, i) => firstHalf[i] && g.side === "us").length,
          them: goals.filter((g, i) => firstHalf[i] && g.side === "them").length,
        }
      : null;
  const sheet = (ours === "home" ? page.home : page.away) ?? null;
  const onSheet = sheet ? [...sheet.starters, ...sheet.bench] : [];
  const newPlayers = onSheet.filter((p) => !findPlayerByName(team.players, p.name));
  const subs = page.events
    .filter((e): e is Extract<DbuMatchEvent, { type: "sub" }> => e.type === "sub")
    .filter((e) => e.side === ours && (e.on || e.off))
    .map(({ minute, on, off }) => ({ minute, on, off }));
  return { score, finished: page.finished, goals, goalsAddUp, halfTime, sheet, newPlayers, subs };
}
