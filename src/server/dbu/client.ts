import "server-only";
import sharp from "sharp";
import type {
  DbuClub,
  DbuClubHit,
  DbuFixture,
  DbuImport,
  DbuMatchPage,
  DbuOpponent,
} from "@/lib/dbu";
import { kitColors } from "./kit";
import {
  DBU_ORIGIN,
  DbuPageError,
  isBye,
  parseClubInfo,
  parseClubSearch,
  parseFixtures,
  parseMatchPage,
  parseTeamList,
  type ClubInfo,
  type FixtureRow,
  type TeamEntry,
} from "./parse";

/*
  Reads dbu.dk for the import. Every page and crest is cached in memory, so a club
  importing, then updating, costs DBU a handful of requests at most, and many
  people from one club don't multiply that. One process serves the site, so memory
  is enough. Requests name teamsheet11 in the User-Agent, so DBU can see who we are.
*/

const USER_AGENT = "teamsheet11 fixture import (+https://teamsheet11.com)";
const TIMEOUT_MS = 12_000;
const PAGE_TTL = 30 * 60_000;
/** A match page changes while it's played and while goals are reported afterwards. */
const MATCH_TTL = 2 * 60_000;
const CLUB_TTL = 24 * 60 * 60_000;
const MAX_CACHE = 400;
const MAX_CREST_BYTES = 3 * 1024 * 1024;
/** Our crest is kept the size an uploaded crest is downsized to in the browser. */
const CREST_SIDE = 512;
/**
 * Opponents' crests are smaller: a season brings a dozen or more, all stored in the
 * browser, and they never print larger than our own.
 */
const OPPONENT_CREST_SIDE = 320;
/** At most this many requests to DBU at once for one import. */
const PARALLEL = 4;

/** DBU couldn't be reached, answered with an error, or sent something else (a bot check). */
export class DbuUnavailable extends Error {}

type Entry = { at: number; ttl: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < hit.ttl) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: now, ttl, value });
  // A failure isn't remembered: the next import tries again.
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return value;
}

/** Only for tests. */
export function clearDbuCache() {
  cache.clear();
}

let fetcher: typeof fetch = (...args) => fetch(...args);

/** Only for tests: answer DBU requests without the network. */
export function setDbuFetch(f: typeof fetch | null) {
  fetcher = f ?? ((...args) => fetch(...args));
  clearDbuCache();
}

async function request(url: string, accept: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetcher(url, {
      headers: { "user-agent": USER_AGENT, accept, "accept-language": "da" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new DbuUnavailable(`DBU didn't answer (${new URL(url).pathname})`);
  }
  if (!res.ok) throw new DbuUnavailable(`DBU answered ${res.status} (${new URL(url).pathname})`);
  return res;
}

/** A dbu.dk page. Not cached itself: what's read from it is, which is far smaller. */
async function page(path: string): Promise<string> {
  const res = await request(`${DBU_ORIGIN}${path}`, "text/html");
  const type = res.headers.get("content-type") ?? "";
  const html = await res.text();
  // Cloudflare's bot check is an HTML page too, but without DBU's layout.
  if (!type.includes("html") || !html.includes("dbu")) {
    throw new DbuUnavailable(`DBU sent something other than its page (${path})`);
  }
  return html;
}

/** Runs `fn` over `items`, a few at a time. */
async function mapLimited<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
  return out;
}

export function searchClubs(q: string): Promise<DbuClubHit[]> {
  return cached(`search:${q.toLocaleLowerCase("da")}`, PAGE_TTL, async () =>
    parseClubSearch(await page(`/resultater/klubsoeg/?q=${encodeURIComponent(q)}`)).slice(0, 25),
  );
}

function clubInfo(clubId: string): Promise<ClubInfo> {
  return cached(`info:${clubId}`, CLUB_TTL, async () =>
    parseClubInfo(await page(`/resultater/klub/${clubId}/klubinfo`)),
  );
}

function teamList(clubId: string): Promise<TeamEntry[]> {
  return cached(`teams:${clubId}`, PAGE_TTL, async () =>
    parseTeamList(await page(`/resultater/klub/${clubId}/holdoversigt`)),
  );
}

function fixtureRows(t: TeamEntry): Promise<FixtureRow[]> {
  return cached(`fixtures:${t.teamId}_${t.poolId}`, PAGE_TTL, async () =>
    parseFixtures(await page(`/resultater/hold/${t.teamId}_${t.poolId}/kampprogram`), t.teamId),
  );
}

export async function getClub(clubId: string): Promise<DbuClub> {
  const [info, teams] = await Promise.all([clubInfo(clubId), teamList(clubId)]);
  return { id: clubId, name: info.name, colors: kitColors(info.homeKit), teams };
}

/** A crest from file.dbu.dk as a WebP data: URL (transparency kept), or null. */
function crest(path: string, side: number): Promise<string | null> {
  return cached(`crest:${side}:${path}`, CLUB_TTL, async () => {
    const res = await request(`https://file.dbu.dk${path}`, "image/*");
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_CREST_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_CREST_BYTES) return null;
    try {
      const webp = await sharp(bytes, { limitInputPixels: 4096 * 4096 })
        .resize(side, side, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      return `data:image/webp;base64,${webp.toString("base64")}`;
    } catch {
      return null; // Not an image after all.
    }
  });
}

/** A crest that fails to load is left out rather than failing the whole import. */
const crestOrNull = (path: string | null, side = CREST_SIDE) =>
  path ? crest(path, side).catch(() => null) : null;

/** The season's "- Efterår"/"Forår" on DBU's competition names, left off on graphics. */
export function competitionLabel(name: string): string {
  return (
    name.replace(/\s*(?:-\s*)?(?:efterår|forår|vår)(?:\s+\d{4})?\s*$/i, "").trim() || name.trim()
  );
}

/**
 * Fixtures for the chosen teams of one club, with our crest and colours and the
 * opponents' crests and colours. The choices are checked against the club's own
 * team list, so only that club's teams can be asked for.
 */
export async function getImport(
  clubId: string,
  wanted: { teamId: string; poolId: string }[],
): Promise<DbuImport | { unknown: string[] }> {
  const [info, teams] = await Promise.all([clubInfo(clubId), teamList(clubId)]);
  const entries = wanted.map((w) =>
    teams.find((t) => t.teamId === w.teamId && t.poolId === w.poolId),
  );
  const unknown = wanted.filter((_, i) => !entries[i]).map((w) => `${w.teamId}_${w.poolId}`);
  if (unknown.length) return { unknown };

  const pages = await mapLimited(entries as TeamEntry[], async (t) => ({
    entry: t,
    rows: await fixtureRows(t),
  }));

  const fixtures: DbuFixture[] = [];
  const opponentCrests = new Map<string, string | null>();
  const seen = new Set<string>();
  let ownCrestPath: string | null = null;
  for (const { entry, rows } of pages) {
    for (const row of rows) {
      const isHome = row.home.teamId === entry.teamId;
      if (!isHome && row.away.teamId !== entry.teamId) continue;
      const us = isHome ? row.home : row.away;
      const them = isHome ? row.away : row.home;
      ownCrestPath ??= us.crestPath;
      if (isBye(them.name) || !them.name || seen.has(row.matchId)) continue;
      seen.add(row.matchId);
      if (them.clubId && !opponentCrests.has(them.clubId)) {
        opponentCrests.set(them.clubId, them.crestPath);
      }
      const [h, a] = row.score.split("-");
      fixtures.push({
        matchId: row.matchId,
        teamId: entry.teamId,
        poolId: entry.poolId,
        date: row.date,
        kickoff: row.kickoff,
        isHome,
        opponent: them.name,
        opponentClubId: them.clubId,
        competition: competitionLabel(entry.competition),
        venue: row.venue,
        score: row.score ? (isHome ? `${h}-${a}` : `${a}-${h}`) : "",
      });
    }
  }

  const ids = [...opponentCrests.keys()].filter((id) => id !== clubId);
  const [ownCrest, found] = await Promise.all([
    crestOrNull(ownCrestPath),
    mapLimited(ids, async (id): Promise<DbuOpponent> => {
      const [c, colors] = await Promise.all([
        crestOrNull(opponentCrests.get(id) ?? null, OPPONENT_CREST_SIDE),
        // Colours are a bonus: a club page that fails to load leaves them out.
        clubInfo(id).then(
          (i) => kitColors(i.homeKit),
          () => null,
        ),
      ]);
      return { crest: c, colors };
    }),
  ]);
  const colors = kitColors(info.homeKit);
  const opponents: Record<string, DbuOpponent> = {};
  ids.forEach((id, i) => (opponents[id] = found[i]));
  // A derby against the club's own other team.
  if (opponentCrests.has(clubId)) opponents[clubId] = { crest: ownCrest, colors };

  fixtures.sort((a, b) => `${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`));
  return { club: { id: clubId, name: info.name, crest: ownCrest, colors }, fixtures, opponents };
}

/** One match's page: score, goals, substitutions and the team sheets (holdkort). */
export function getMatch(matchId: string, poolId: string): Promise<DbuMatchPage> {
  return cached(`match:${matchId}_${poolId}`, MATCH_TTL, async () =>
    parseMatchPage(await page(`/resultater/kamp/${matchId}_${poolId}/kampinfo`), matchId),
  );
}

export { DbuPageError };
