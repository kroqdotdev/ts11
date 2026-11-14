import { graphicText } from "./graphicText";
import type { Language, NameStyle, Player } from "./types";

/** A player's name as printed; a blank name prints as "Unnamed" in the given language. */
export function displayName(player: Player, style: NameStyle, language: Language = "en"): string {
  if (player.shirtName?.trim()) return player.shirtName.trim();
  const parts = player.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return graphicText(language).unnamed;
  if (parts.length === 1 || style === "full") return parts.join(" ");
  const surname = parts.slice(1).join(" ");
  return style === "surname" ? surname : `${parts[0][0]}. ${surname}`;
}

export interface DateParts {
  /** "Sat" / "Lør" */
  weekday: string;
  /** "21" / "21." */
  day: string;
  /** "Nov" / "nov" */
  month: string;
}

/**
 * The parts of a yyyy-mm-dd date for a graphic, without timezone drift: "Sat", "21",
 * "Nov" in English, "Lør", "21.", "nov" in Danish (Intl's "lør. 21. nov." without the
 * abbreviation dots, which clutter a graphic; the day keeps its ordinal dot). Null when
 * the text is not a date.
 */
export function matchDateParts(iso: string, language: Language = "en"): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const parts = new Intl.DateTimeFormat(graphicText(language).locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value.replace(/\.$/, "") ?? "";
  const weekday = part("weekday");
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: language === "da" ? `${part("day")}.` : part("day"),
    month: part("month"),
  };
}

/**
 * Formats a yyyy-mm-dd date for a graphic: "Sat 14 Nov", or "Lør 14. nov" in Danish.
 * Anything that is not a date prints as typed.
 */
export function formatMatchDate(iso: string, language: Language = "en"): string {
  const p = matchDateParts(iso, language);
  return p ? `${p.weekday} ${p.day} ${p.month}` : iso;
}

/**
 * Badge letters for a club: "Ashby Vale" → "AV", "Sudbury Wanderers & Long Melford"
 * → "SWL". Club suffixes (FC, AFC), joining words and punctuation never count, so
 * an ampersand can't end up on a badge. A Danish club keeps its abbreviation whole,
 * as it is written: "Søndervang IF" → "SIF", "Kildeby BK" → "KBK".
 */
export function initials(name: string, max = 3): string {
  const words = name
    .split(/[\s/]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !/^(fc|afc|cf|sc|and|of|the|de|da|og|af)$/i.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, Math.min(max, 3)).toUpperCase();
  const plain = words
    .slice(0, max)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  // A trailing two- or three-letter abbreviation in capitals (IF, BK) stays whole when it fits.
  const last = words.at(-1)!;
  if (words.length === 2 && /^\p{Lu}{2,3}$/u.test(last)) {
    const kept = (words[0][0] + last).toUpperCase();
    if (kept.length <= max) return kept;
  }
  return plain;
}
