import { initials } from "./format";
import { domToBlob } from "modern-screenshot";
import { GRAPHIC_FONTS } from "./fonts";
import { KIND_LABEL } from "./kinds";
import type { Design, FontId, Team } from "./types";

export const GRAPHIC_NODE_ID = "graphic-export";

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
  if (!blob) throw new Error("The image could not be created.");
  return blob;
}

/** Renders the studio's graphic, the one on screen, to a PNG. */
export async function renderGraphicPng(font: FontId, scale = 1): Promise<Blob> {
  const node = document.getElementById(GRAPHIC_NODE_ID);
  if (!node) throw new Error("The graphic is not on screen yet.");
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

export function slug(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
      .replace(/-$/, "") || "graphic"
  );
}

/** "ashby-vale-v-corrin-town-2026-11-14": who, against whom and when. */
/** A club in a file name: the full name when short, else its short name or initials. */
function clubSlug(name: string, short: string, fallback: string): string {
  const full = slug(name);
  if (full && full.length <= 16) return full;
  return slug(short) || slug(initials(name)) || full.slice(0, 16) || fallback;
}

export function matchSlug(team: Team): string {
  const m = team.match;
  const parts = [clubSlug(team.name, team.shortName, "club")];
  if (m.opponent.trim()) parts.push("v", clubSlug(m.opponent, m.opponentShort, "opponent"));
  if (/^\d{4}-\d{2}-\d{2}$/.test(m.date)) parts.push(m.date);
  return parts.join("-");
}

/**
 * The PNG's file name, e.g. `ashby-vale-v-corrin-town-2026-11-14-full-time-portrait.png`.
 * The fixtures list is not about one match, so it skips the opponent and date.
 */
export function graphicFilename(team: Team, design: Pick<Design, "kind" | "format">): string {
  const what = slug(KIND_LABEL[design.kind]);
  const base =
    design.kind === "fixtures" ? clubSlug(team.name, team.shortName, "club") : matchSlug(team);
  // Kept well under 60 characters so it stays readable in a downloads list.
  return `${base.slice(0, 60 - what.length - design.format.length - 6).replace(/-+$/, "")}-${what}-${design.format}.png`;
}
