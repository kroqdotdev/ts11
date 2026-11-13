import { formationSlots, type Slot } from "@/lib/formation";
import { matchScore } from "@/lib/score";
import type { Fixture, Player, Team } from "@/lib/types";

export interface Placed {
  slot: Slot;
  player: Player | null;
  x: number;
  y: number;
}

export function placedStarters(team: Team): Placed[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const slots = formationSlots(team.lineup.formation, team.lineup.size);
  return slots.map((slot) => {
    const id = team.lineup.starters[slot.index];
    const o = team.lineup.overrides[slot.index];
    return {
      slot,
      player: id ? (byId.get(id) ?? null) : null,
      x: o?.x ?? slot.x,
      y: o?.y ?? slot.y,
    };
  });
}

export function benchPlayers(team: Team): Player[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  return team.lineup.bench.map((id) => byId.get(id)).filter((p): p is Player => !!p);
}

/**
 * The rows for the fixtures graphic, in date order: results first (the most recent
 * few), then the games to come. This week's match is included whether or not it has
 * been saved as a fixture, without listing the same game twice. Every look's
 * fixtures layout should read its rows from here.
 */
export function fixtureRows(team: Team, maxResults = 2): Fixture[] {
  const m = team.match;
  const same = (f: Fixture) =>
    f.date === m.date && f.opponent.trim().toLowerCase() === m.opponent.trim().toLowerCase();
  const rows = [...team.fixtures];
  if (m.opponent.trim() && !team.fixtures.some(same)) {
    const s = matchScore(m);
    const played = m.goals.length > 0 || (!m.autoScore && s.us + s.them > 0);
    rows.push({
      id: "current-match",
      opponent: m.opponent,
      isHome: m.isHome,
      date: m.date,
      kickoff: m.kickoff,
      competition: m.competition,
      score: played ? `${s.us}-${s.them}` : "",
    });
  }
  // yyyy-mm-dd sorts as text; undated rows go last, in the order they were added.
  const byDate = (a: Fixture, b: Fixture) => (a.date || "9999").localeCompare(b.date || "9999");
  const results = rows
    .filter((f) => f.score.trim())
    .sort(byDate)
    .slice(-maxResults);
  const upcoming = rows.filter((f) => !f.score.trim()).sort(byDate);
  return [...results, ...upcoming];
}
