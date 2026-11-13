import { displayName } from "./format";
import type { Goal, Match, NameStyle, Player, Team } from "./types";

/** "45+2" → 45.2, "90" → 90; blank or unreadable minutes sort last. */
export function minuteOf(minute: string): number {
  const m = /^\s*(\d+)(?:\s*\+\s*(\d+))?/.exec(minute);
  if (!m) return 999;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}

/** Goals in the order they were scored; goals without a minute keep their list order, last. */
export function byMinute(goals: Goal[]): Goal[] {
  return goals
    .map((g, i) => ({ g, i }))
    .sort((a, b) => minuteOf(a.g.minute) - minuteOf(b.g.minute) || a.i - b.i)
    .map(({ g }) => g);
}

/** Goals scored before the break. Stoppage time in the first half ("45+2") counts. */
export function firstHalfGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => minuteOf(g.minute) < 46);
}

export interface Score {
  us: number;
  them: number;
  htUs: number;
  htThem: number;
}

function count(goals: Goal[]) {
  return {
    us: goals.filter((g) => g.side === "us").length,
    them: goals.filter((g) => g.side === "them").length,
  };
}

/** The score every graphic prints, so Goal, Half time and Full time always agree. */
export function matchScore(m: Match): Score {
  if (!m.autoScore) {
    return { us: m.ourScore, them: m.theirScore, htUs: m.htOurScore, htThem: m.htTheirScore };
  }
  const ft = count(m.goals);
  const ht = count(firstHalfGoals(m.goals));
  return { us: ft.us, them: ft.them, htUs: ht.us, htThem: ht.them };
}

/** With typed scores: true when the goals list disagrees with them. */
export function scoreMismatch(m: Match, half = false): boolean {
  if (m.autoScore || m.goals.length === 0) return false;
  const c = count(half ? firstHalfGoals(m.goals) : m.goals);
  return half
    ? c.us !== m.htOurScore || c.them !== m.htTheirScore
    : c.us !== m.ourScore || c.them !== m.theirScore;
}

/** Best squad match for a typed scorer name: full name, surname, then part of a name. */
export function findPlayer(team: Team, name: string): Player | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return (
    team.players.find((p) => p.name.toLowerCase() === q) ??
    team.players.find((p) => p.shirtName?.trim().toLowerCase() === q) ??
    team.players.find((p) => p.name.toLowerCase().split(/\s+/).at(-1) === q) ??
    team.players.find((p) => p.name.toLowerCase().includes(q))
  );
}

/** The player behind one of our goals: the linked one, else a name match. */
export function scorerOf(team: Team, goal: Goal): Player | undefined {
  if (goal.side !== "us") return undefined;
  if (goal.playerId) {
    const linked = team.players.find((p) => p.id === goal.playerId);
    if (linked) return linked;
  }
  return findPlayer(team, goal.name);
}

/** How a scorer is printed. Used by every graphic so the same goal reads the same everywhere. */
export function scorerLabel(team: Team, goal: Goal, style: NameStyle): string {
  const p = scorerOf(team, goal);
  return p ? displayName(p, style) : goal.name.trim();
}

/** The goal the Goal graphic celebrates (the chosen one, else our latest), and the score just after it. */
export function spotlightGoal(team: Team): { goal: Goal; us: number; them: number } | null {
  const goals = byMinute(team.match.goals);
  const chosen =
    goals.find((g) => g.id === team.match.spotlightGoalId) ??
    [...goals].reverse().find((g) => g.side === "us") ??
    goals.at(-1);
  if (!chosen) return null;
  const upTo = count(goals.slice(0, goals.indexOf(chosen) + 1));
  return { goal: chosen, ...upTo };
}
