import { matchScore } from "@/lib/score";
import type { Team } from "@/lib/types";
import { toBoardText } from "./font";

/** A short code for a club name on the scoreboard: "Corrin Town" → "CT". */
function code(name: string, short: string): string {
  const s = toBoardText(short.trim());
  if (s) return s.slice(0, 5);
  const words = toBoardText(name).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.length === 1
    ? words[0].slice(0, 4)
    : words
        .map((w) => w[0])
        .join("")
        .slice(0, 4);
}

/**
 * The scoreboard's top line for a club. Home side on the left, as in the ground.
 * - `live`: the score once there are goals, from the same count every graphic uses.
 * - Otherwise "HOME V AWAY" before kick-off, or the kick-off time when there's no opponent yet.
 */
export function scoreboardLine(team: Team, { live = true }: { live?: boolean } = {}): string {
  const m = team.match;
  const us = code(team.name, team.shortName) || "HOME";
  const them = code(m.opponent, m.opponentShort);
  if (!them) return m.kickoff ? `${us} KO ${toBoardText(m.kickoff)}` : us;
  const score = matchScore(m);
  const started = m.goals.length > 0 || (!m.autoScore && score.us + score.them > 0);
  const [home, away] = m.isHome ? [us, them] : [them, us];
  if (!live || !started) return `${home} V ${away}`;
  const [hs, as] = m.isHome ? [score.us, score.them] : [score.them, score.us];
  return `${home} ${hs}-${as} ${away}`;
}
