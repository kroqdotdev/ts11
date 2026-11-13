import type { NameStyle, Player } from "./types";

export function displayName(player: Player, style: NameStyle): string {
  if (player.shirtName?.trim()) return player.shirtName.trim();
  const parts = player.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Unnamed";
  if (parts.length === 1 || style === "full") return parts.join(" ");
  const surname = parts.slice(1).join(" ");
  return style === "surname" ? surname : `${parts[0][0]}. ${surname}`;
}

/** Formats a yyyy-mm-dd date as "Sat 14 Nov" without timezone drift. */
export function formatMatchDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Badge letters for a club: "Ashby Vale" → "AV", "Sudbury Wanderers & Long Melford"
 * → "SWL". Club suffixes (FC, AFC), joining words and punctuation never count, so
 * an ampersand can't end up on a badge.
 */
export function initials(name: string, max = 3): string {
  const words = name
    .split(/[\s/]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !/^(fc|afc|cf|sc|and|of|the|de|da)$/i.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, Math.min(max, 3)).toUpperCase();
  return words
    .slice(0, max)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
