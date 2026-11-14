import "server-only";
import type { Colors } from "@/lib/types";
import type { KitNames } from "./parse";

/**
 * DBU names kit colours from a fixed list ("Mørkeblå", "Rød/Hvid", "Gul/Sort"). Two
 * colours joined by "/" are a two-colour shirt. The values are kit colours as they
 * read on a graphic (a navy, not DBU's own mid-blue for "Mørkeblå").
 */
const NAMED: Record<string, string> = {
  hvid: "#f4f4f1",
  sort: "#161616",
  rød: "#c8102e",
  mørkerød: "#8f0f1f",
  bordeaux: "#6d1a36",
  vinrød: "#6d1a36",
  blå: "#1b45a8",
  kongeblå: "#1b45a8",
  mørkeblå: "#1a2f55",
  marineblå: "#14213d",
  lyseblå: "#6cace4",
  himmelblå: "#6cace4",
  grøn: "#0b7a3e",
  mørkegrøn: "#0a4d2a",
  lysegrøn: "#5fb85a",
  gul: "#f6c518",
  orange: "#f26b1d",
  lilla: "#5b2a86",
  violet: "#5b2a86",
  grå: "#6b6b6b",
  sølv: "#b9b9b9",
  guld: "#c9a227",
  brun: "#6b4226",
  lyserød: "#f4a6b7",
  rosa: "#f4a6b7",
  pink: "#e6439a",
  turkis: "#1aa6a6",
  beige: "#d8c7a3",
};

/** Hex values for each colour in a DBU name, in order. Unknown words are skipped. */
export function namedColors(name: string): string[] {
  return name
    .split(/[/,&]|\bog\b/i)
    .map((part) => NAMED[part.trim().toLocaleLowerCase("da")])
    .filter((hex): hex is string => !!hex);
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Club colours from the home kit: the shirt's first colour leads; the second comes
 * from a two-colour shirt, else the shorts when they differ, else white or black,
 * whichever stands out. Null when the shirt colour isn't one we know.
 */
export function kitColors(kit: KitNames | null): Colors | null {
  if (!kit) return null;
  const shirt = namedColors(kit.shirt);
  if (!shirt.length) return null;
  const primary = shirt[0];
  const second =
    shirt.find((c) => c !== primary) ?? namedColors(kit.shorts).find((c) => c !== primary);
  const secondary = second ?? (luminance(primary) > 0.4 ? NAMED.sort : NAMED.hvid);
  return { primary, secondary };
}
