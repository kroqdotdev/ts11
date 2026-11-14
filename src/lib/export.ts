import { initials } from "./format";
import { domToBlob } from "modern-screenshot";
import { GRAPHIC_FONTS } from "./fonts";
import type { FontId, Team } from "./types";

export const GRAPHIC_NODE_ID = "graphic-export";

/** Why a graphic could not be turned into a PNG; the interface words it. */
export class ExportError extends Error {
  constructor(readonly code: "notDrawn" | "notOnScreen") {
    super(code);
    this.name = "ExportError";
  }
}

/**
 * Words that go into file names, in the interface language, so a Danish volunteer
 * downloads `…-mod-…-startopstilling-staaende.png`. Built from messages/ by the studio.
 */
export interface FileWords {
  /** Between the two clubs: "v". */
  versus: string;
  /** For "&" in a club name: "and". */
  and: string;
  /** When a club has no name: "club". */
  club: string;
  /** When the opponent has no name: "opponent". */
  opponent: string;
}

/** Waits for the graphic's typeface so the PNG never falls back to a system font. */
async function fontsReady(font: FontId) {
  const f = GRAPHIC_FONTS[font];
  await Promise.all([
    document.fonts.load(`${f.heavy} 100px ${f.family}`),
    document.fonts.load(`${f.light} 100px ${f.family}`),
  ]).catch(() => undefined);
  await document.fonts.ready;
}

/** Renders any graphic node (at its native size) to a PNG. */
export async function renderNodePng(node: HTMLElement, font: FontId, scale = 1): Promise<Blob> {
  await fontsReady(font);
  const blob = await domToBlob(node, {
    scale,
    width: node.offsetWidth,
    height: node.offsetHeight,
    type: "image/png",
    // Only fetch the woff2 files of the fonts in use, not every format of every face.
    font: { preferredFormat: "woff2" },
  });
  if (!blob) throw new ExportError("notDrawn");
  return blob;
}

/** Renders the studio's graphic, the one on screen, to a PNG. */
export async function renderGraphicPng(font: FontId, scale = 1): Promise<Blob> {
  const node = document.getElementById(GRAPHIC_NODE_ID);
  if (!node) throw new ExportError("notOnScreen");
  return renderNodePng(node, font, scale);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Long enough for a slow browser to start the download, short enough not to pile up.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function slug(text: string, and = "and"): string {
  return (
    text
      // Danish letters that don't come apart into a plain letter and an accent.
      .replace(/æ/gi, "ae")
      .replace(/ø/gi, "oe")
      .replace(/å/gi, "aa")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, ` ${and} `)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
      .replace(/-$/, "") || "graphic"
  );
}

/** A club in a file name: the full name when short, else its short name or initials. */
function clubSlug(name: string, short: string, fallback: string, and: string): string {
  const full = slug(name, and);
  if (full && full.length <= 16) return full;
  return slug(short, and) || slug(initials(name), and) || full.slice(0, 16) || slug(fallback);
}

/** "ashby-vale-v-corrin-town-2026-11-14": who, against whom and when. */
export function matchSlug(team: Team, words: FileWords): string {
  const m = team.match;
  const parts = [clubSlug(team.name, team.shortName, words.club, words.and)];
  if (m.opponent.trim())
    parts.push(
      slug(words.versus),
      clubSlug(m.opponent, m.opponentShort, words.opponent, words.and),
    );
  if (/^\d{4}-\d{2}-\d{2}$/.test(m.date)) parts.push(m.date);
  return parts.join("-");
}

/**
 * The PNG's file name, e.g. `ashby-vale-v-corrin-town-2026-11-14-full-time-portrait.png`.
 * `kind` and `format` are the graphic's and the size's names ("Full time", "Portrait").
 * The fixtures list is not about one match, so it skips the opponent and date.
 */
export function graphicFilename(
  team: Team,
  graphic: { fixtures: boolean; kind: string; format: string },
  words: FileWords,
): string {
  const what = slug(graphic.kind, words.and);
  const size = slug(graphic.format, words.and);
  const base = graphic.fixtures
    ? clubSlug(team.name, team.shortName, words.club, words.and)
    : matchSlug(team, words);
  // Kept well under 60 characters so it stays readable in a downloads list.
  return `${base.slice(0, 60 - what.length - size.length - 6).replace(/-+$/, "")}-${what}-${size}.png`;
}
