import type { Position, TeamSize } from "./types";

export const FORMATIONS: Record<TeamSize, string[]> = {
  11: ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "4-4-1-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1"],
  9: ["3-3-2", "3-2-3", "2-4-2", "3-4-1", "2-3-2-1"],
  8: ["3-3-1", "3-2-2", "2-3-2", "3-1-3", "2-4-1"],
  7: ["2-3-1", "3-2-1", "2-1-2-1", "3-1-2", "1-3-2"],
  5: ["2-2", "1-2-1", "2-1-1", "3-1"],
};

export const TEAM_SIZES: TeamSize[] = [11, 9, 8, 7, 5];

/** Parses "4-2-3-1" into [4, 2, 3, 1]. Returns null when the shape does not fit the team size. */
export function parseFormation(formation: string, size: TeamSize): number[] | null {
  const lines = formation
    .split(/[-\s]+/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (lines.length === 0) return null;
  const total = lines.reduce((a, b) => a + b, 0);
  return total === size - 1 ? lines : null;
}

export interface Slot {
  index: number;
  x: number;
  y: number;
  role: Position;
}

/**
 * Lays out formation slots on a vertical pitch, attacking upward.
 * Coordinates are percentages of the pitch box. Slot 0 is the goalkeeper,
 * then each outfield line from defence to attack, left to right.
 */
export function formationSlots(formation: string, size: TeamSize): Slot[] {
  const lines = parseFormation(formation, size) ?? parseFormation(FORMATIONS[size][0], size)!;
  const slots: Slot[] = [{ index: 0, x: 50, y: 89, role: "GK" }];
  const top = 15;
  const bottom = lines.length > 3 ? 70 : 68;
  lines.forEach((count, lineIdx) => {
    const y = lines.length === 1 ? 40 : bottom - (lineIdx * (bottom - top)) / (lines.length - 1);
    const gap = count === 1 ? 0 : Math.min(76 / (count - 1), 26);
    const role: Position =
      lineIdx === 0 ? "DF" : lineIdx === lines.length - 1 && lines.length > 1 ? "FW" : "MF";
    for (let i = 0; i < count; i++) {
      slots.push({ index: slots.length, x: 50 + (i - (count - 1) / 2) * gap, y, role });
    }
  });
  return slots;
}

export function slotRoleLabel(role: Position): string {
  return { GK: "Goalkeeper", DF: "Defence", MF: "Midfield", FW: "Attack" }[role];
}
