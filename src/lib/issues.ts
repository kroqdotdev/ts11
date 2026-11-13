import type { PanelId } from "./store";
import { minuteOf, scoreMismatch, scorerOf, spotlightGoal } from "./score";
import type { Design, GraphicKind, Team } from "./types";

export interface Issue {
  message: string;
  /** The studio tab where it gets fixed. */
  panel: PanelId;
  /** DOM id of the control that fixes it; "Fix it" focuses this after switching tab. */
  field?: string;
  /**
   * Something that doesn't add up rather than something missing. Worth a look before
   * posting, but the graphic is complete, so "Download all" still includes it.
   */
  soft?: boolean;
}

/** Ids of the studio controls that issues point at. The panels put these on the elements. */
export const FIELD = {
  opponent: "field-opponent",
  score: "field-score",
  goals: "field-goals",
  scorer: (goalId: string) => `field-scorer-${goalId}`,
  starters: "field-starters",
  subs: "field-subs",
  motm: "field-motm",
  fixtures: "field-fixtures",
} as const;

/** The tab that feeds each graphic, opened when it is picked from the rail. */
export const PANEL_FOR: Record<GraphicKind, PanelId> = {
  fixture: "match",
  lineup: "lineup",
  pitch: "lineup",
  goal: "match",
  halftime: "match",
  subs: "match",
  result: "match",
  motm: "match",
  fixtures: "match",
};

/**
 * What a graphic is still missing. Graphics never print placeholder text, so
 * the studio shows these beside the preview and checks them before export.
 */
export function graphicIssues(team: Team, design: Design): Issue[] {
  const m = team.match;
  const issues: Issue[] = [];
  const kind = design.kind;

  if (kind !== "fixtures" && !m.opponent.trim()) {
    issues.push({ message: "Add the opponent", panel: "match", field: FIELD.opponent });
  }

  if (kind === "lineup" || kind === "pitch") {
    const filled = team.lineup.starters.filter(Boolean).length;
    const empty = team.lineup.size - filled;
    if (filled === 0)
      issues.push({
        message: "Pick your starting players",
        panel: "lineup",
        field: FIELD.starters,
      });
    else if (empty > 0)
      issues.push({
        message: `${empty} starting ${empty === 1 ? "place is" : "places are"} empty`,
        panel: "lineup",
        field: FIELD.starters,
      });
  }

  if (kind === "goal") {
    if (m.goals.length === 0)
      issues.push({ message: "Add a goal and who scored it", panel: "match", field: FIELD.goals });
    else {
      const spot = spotlightGoal(team)?.goal;
      if (spot && !spot.name.trim() && !scorerOf(team, spot))
        issues.push({
          message: "Add the scorer's name",
          panel: "match",
          field: FIELD.scorer(spot.id),
        });
    }
  }

  if ((kind === "result" || kind === "goal") && scoreMismatch(m)) {
    issues.push({ message: "Score doesn't match the goals", panel: "match", field: FIELD.score });
  }
  if (kind === "halftime" && scoreMismatch(m, true)) {
    issues.push({
      message: "Half-time score doesn't match the goals",
      panel: "match",
      field: FIELD.score,
    });
  }

  if (kind === "subs") {
    if (m.subs.length === 0)
      issues.push({ message: "Add a substitution", panel: "match", field: FIELD.subs });
    else if (m.subs.some((s) => !s.onId || !s.offId))
      issues.push({
        message: "Pick who came on and who went off",
        panel: "match",
        field: FIELD.subs,
      });
  }

  if (kind === "motm" && !team.players.some((p) => p.id === m.motmId)) {
    issues.push({ message: "Pick the player of the match", panel: "match", field: FIELD.motm });
  }

  if (kind === "fixtures" && team.fixtures.length === 0) {
    issues.push({ message: "Add your upcoming fixtures", panel: "match", field: FIELD.fixtures });
  }

  return issues;
}

/** When each player was on the pitch, from the line-up and the substitutions. */
function onPitch(team: Team) {
  const starters = new Set(team.lineup.starters.filter((id): id is string => !!id));
  const subs = [...team.match.subs].sort((a, b) => minuteOf(a.minute) - minuteOf(b.minute));
  /** Whether a player was on at a minute (999 when the minute is unknown). */
  return (id: string, minute: number) => {
    let on = starters.has(id);
    for (const s of subs) {
      const at = minuteOf(s.minute);
      if (minute !== 999 && at !== 999 && at > minute) break;
      if (s.onId === id) on = true;
      if (s.offId === id && (minute === 999 || at === 999 || at < minute)) on = false;
    }
    return on;
  };
}

/**
 * Details that don't add up: a scorer who wasn't on the pitch, a substitution that
 * can't have happened. Cheap checks that catch typos before a graphic goes out.
 */
export function graphicChecks(team: Team, design: Design): Issue[] {
  const m = team.match;
  const kind = design.kind;
  const issues: Issue[] = [];
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name.trim() || "A player";
  const hasLineup = team.lineup.starters.some(Boolean);

  if (hasLineup && (kind === "goal" || kind === "result" || kind === "halftime")) {
    const wasOn = onPitch(team);
    for (const g of m.goals) {
      const p = scorerOf(team, g);
      if (!p || wasOn(p.id, minuteOf(g.minute))) continue;
      issues.push({
        message: `${p.name} scored${g.minute ? ` at ${g.minute}′` : ""} but wasn't on the pitch`,
        panel: "match",
        field: FIELD.scorer(g.id),
        soft: true,
      });
    }
  }

  if (hasLineup && kind === "subs") {
    const sorted = [...m.subs].sort((a, b) => minuteOf(a.minute) - minuteOf(b.minute));
    const on = new Set(team.lineup.starters.filter((id): id is string => !!id));
    for (const s of sorted) {
      if (s.onId && on.has(s.onId))
        issues.push({
          message: `${name(s.onId)} comes on but is already playing`,
          panel: "match",
          field: FIELD.subs,
          soft: true,
        });
      if (s.offId && !on.has(s.offId))
        issues.push({
          message: `${name(s.offId)} goes off but wasn't on the pitch`,
          panel: "match",
          field: FIELD.subs,
          soft: true,
        });
      if (s.offId) on.delete(s.offId);
      if (s.onId) on.add(s.onId);
    }
  }

  if (kind === "motm" && design.showNumbers) {
    const p = m.motmId ? byId.get(m.motmId) : undefined;
    if (p && !p.number.trim())
      issues.push({
        message: `${p.name || "The player of the match"} has no shirt number`,
        panel: "squad",
        soft: true,
      });
  }
  return issues;
}

/** Everything worth knowing before posting: what's missing first, then what doesn't add up. */
export function postIssues(team: Team, design: Design): Issue[] {
  return [...graphicIssues(team, design), ...graphicChecks(team, design)];
}
