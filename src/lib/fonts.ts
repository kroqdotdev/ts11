import {
  Anton,
  Archivo,
  Barlow_Condensed,
  Doto,
  Jersey_10,
  Bebas_Neue,
  Big_Shoulders,
  Oswald,
  Teko,
} from "next/font/google";
import type { FontId } from "./types";

/*
 * Archivo twice: the interface uses the weight-only cut (34 KB, preloaded, so text on
 * every page paints quickly); the graphics use the cut with the width axis (87 KB),
 * which drives their condensed headings and loads when a graphic needs it.
 */
const archivoUi = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo-ui",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  preload: false,
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  preload: false,
});
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  preload: false,
});
const shoulders = Big_Shoulders({
  subsets: ["latin"],
  // Next has no fallback metrics for this family; skip the generated fallback.
  adjustFontFallback: false,
  variable: "--font-shoulders",
  display: "swap",
  // Only some graphics use it; preloading it on every page warns when it goes unused.
  preload: false,
});
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", preload: false });
const teko = Teko({ subsets: ["latin"], variable: "--font-teko", preload: false });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
  preload: false,
});

/* Dot-matrix type for the landing page's stadium scoreboard panels. */
const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
  weight: "variable",
  // Below the fold on the landing page and absent from the studio, so no preload.
  preload: false,
});

/* A pixel face cut from sports-shirt lettering: the low-fi display type, and a graphic option. */
const jersey = Jersey_10({ subsets: ["latin"], weight: "400", variable: "--font-jersey" });

export const fontVariables = [
  archivoUi,
  archivo,
  anton,
  bebas,
  shoulders,
  oswald,
  teko,
  barlow,
  doto,
  jersey,
]
  .map((f) => f.variable)
  .join(" ");

export interface GraphicFont {
  id: FontId;
  label: string;
  family: string;
  /** Weight for headlines and names. */
  heavy: number;
  /** Weight for supporting text. */
  light: number;
  stretch: string;
  /** Average uppercase glyph width in em, used to fit headlines without measuring. */
  glyph: number;
  /** Multiplier on line-height, some families sit tall. */
  leading: number;
  tracking: string;
}

export const GRAPHIC_FONTS: Record<FontId, GraphicFont> = {
  archivo: {
    id: "archivo",
    label: "Archivo",
    family: archivo.style.fontFamily,
    heavy: 850,
    light: 600,
    stretch: "64%",
    glyph: 0.5,
    leading: 1,
    tracking: "-0.01em",
  },
  anton: {
    id: "anton",
    label: "Anton",
    family: anton.style.fontFamily,
    heavy: 400,
    light: 400,
    stretch: "normal",
    glyph: 0.52,
    leading: 1.04,
    tracking: "0.01em",
  },
  bebas: {
    id: "bebas",
    label: "Bebas Neue",
    family: bebas.style.fontFamily,
    heavy: 400,
    light: 400,
    stretch: "normal",
    glyph: 0.42,
    leading: 0.96,
    tracking: "0.02em",
  },
  shoulders: {
    id: "shoulders",
    label: "Big Shoulders",
    family: shoulders.style.fontFamily,
    heavy: 900,
    light: 700,
    stretch: "normal",
    glyph: 0.46,
    leading: 0.96,
    tracking: "0",
  },
  oswald: {
    id: "oswald",
    label: "Oswald",
    family: oswald.style.fontFamily,
    heavy: 700,
    light: 500,
    stretch: "normal",
    glyph: 0.52,
    leading: 1.08,
    tracking: "0",
  },
  teko: {
    id: "teko",
    label: "Teko",
    family: teko.style.fontFamily,
    heavy: 600,
    light: 500,
    stretch: "normal",
    glyph: 0.44,
    leading: 0.9,
    tracking: "0.01em",
  },
  jersey: {
    id: "jersey",
    label: "Jersey (pixel)",
    family: jersey.style.fontFamily,
    heavy: 400,
    light: 400,
    stretch: "normal",
    glyph: 0.42,
    leading: 0.92,
    tracking: "0.01em",
  },
  barlow: {
    id: "barlow",
    label: "Barlow Condensed",
    family: barlow.style.fontFamily,
    heavy: 800,
    light: 600,
    stretch: "normal",
    glyph: 0.47,
    leading: 1,
    tracking: "0",
  },
};
