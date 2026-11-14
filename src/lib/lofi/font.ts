/**
 * A 5×7 pixel font (the classic LED-sign grid) for the scoreboard, ticker and
 * banner in the pixel stadium. Each glyph is seven rows of five cells.
 */
const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 10001 11001 10101 10011 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  // Danish letters, so club names and Danish signs are spelt as they should be.
  Æ: "01111 10100 10100 11111 10100 10100 10111",
  Ø: "01111 10011 10101 10101 10101 11001 11110",
  Å: "01110 01010 01110 10001 11111 10001 10001",
  Œ: "01111 10100 10100 10111 10100 10100 01111",
  Ł: "10000 10000 10100 11000 10000 10000 11111",
  Đ: "01110 01001 01001 11101 01001 01001 01110",
  Ð: "01110 01001 01001 11101 01001 01001 01110",
  Þ: "10000 11110 10001 10001 11110 10000 10000",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11111 00010 00100 00010 00001 10001 01110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  ":": "00000 01100 01100 00000 01100 01100 00000",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 01100 00100 01000",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00010 00100 00000 00100",
  "'": "00100 00100 01000 00000 00000 00000 00000",
  "&": "01100 10010 10100 01000 10101 10010 01101",
  "+": "00000 00100 00100 11111 00100 00100 00000",
  "/": "00001 00010 00010 00100 01000 01000 10000",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;

/**
 * Accented capitals (Ä, É, Ñ, Č…) are drawn the way LED signs do it: the mark in the top
 * row, a blank row, then the letter in five rows. A cedilla or ogonek (Ç, Ą) goes in the
 * bottom row under the letter in six rows. One row is little room, so a caret and a dot
 * above share a shape.
 */
const BODY5: Record<string, string> = {
  A: "01110 10001 11111 10001 10001",
  C: "01111 10000 10000 10000 01111",
  D: "11110 10001 10001 10001 11110",
  E: "11111 10000 11110 10000 11111",
  G: "01111 10000 10011 10001 01111",
  I: "01110 00100 00100 00100 01110",
  L: "10000 10000 10000 10000 11111",
  N: "10001 11001 10101 10011 10001",
  O: "01110 10001 10001 10001 01110",
  R: "11110 10001 11110 10010 10001",
  S: "01111 10000 01110 00001 11110",
  T: "11111 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 01110",
  Y: "10001 01010 00100 00100 00100",
  Z: "11111 00010 00100 01000 11111",
};

const BODY6: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001",
  C: "01110 10001 10000 10000 10001 01110",
  E: "11111 10000 11110 10000 10000 11111",
  S: "01111 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100",
};

/** Combining marks drawn in the top row. */
const ABOVE: Record<string, string> = {
  "\u0308": "01010", // diaeresis: Ä Ö Ü Ë Ï Ÿ
  "\u0301": "00010", // acute: É Á Ó Ú Í Ý Ś Ź Ć Ń
  "\u0300": "01000", // grave: À È Ù Ò
  "\u0302": "00100", // circumflex: Â Ê Î Ô Û
  "\u0307": "00100", // dot above: Ż İ Ė
  "\u030c": "01110", // caron: Č Š Ž Ř Ě Ň Ď Ť
  "\u0303": "01101", // tilde: Ñ Ã Õ
  "\u030b": "01001", // double acute: Ő Ű
  "\u0306": "10001", // breve: Ğ Ă
  "\u030a": "00100", // ring: Ů (Å has its own glyph)
};

/** Combining marks drawn in the bottom row, under a letter moved up a row. */
const BELOW: Record<string, string> = {
  "\u0327": "00100", // cedilla: Ç Ş Ţ
  "\u0328": "00010", // ogonek: Ą Ę
};

/** The glyph rows for one capital letter, or null if the font can't draw it. */
export function rowsFor(ch: string): string | null {
  if (GLYPHS[ch]) return GLYPHS[ch];
  const [base, ...marks] = ch.normalize("NFD");
  if (!base) return null;
  // One mark fits. With two (Vietnamese Ệ, Ǻ), the first one above is drawn, and the
  // plain letter is the fallback: better than a "?" or a missing letter.
  const above = marks.find((m) => ABOVE[m]);
  if (above && BODY5[base]) return `${ABOVE[above]} 00000 ${BODY5[base]}`;
  const below = marks.length === 1 ? BELOW[marks[0]] : undefined;
  if (below && BODY6[base]) return `${BODY6[base]} ${below}`;
  return GLYPHS[base] ?? null;
}

/** Capitals in composed form; ß becomes SS here, which keeps widths and drawing in step. */
function chars(text: string): string[] {
  return [...text.normalize("NFC").toUpperCase().normalize("NFC")];
}

const CACHE = new Map<string, boolean[]>();

function glyph(ch: string): boolean[] {
  let g = CACHE.get(ch);
  if (!g) {
    const src = rowsFor(ch) ?? GLYPHS["?"];
    g = src
      .replace(/ /g, "")
      .split("")
      .map((c) => c === "1");
    CACHE.set(ch, g);
  }
  return g;
}

export function textWidth(text: string, scale = 1): number {
  const n = chars(text).length;
  return n === 0 ? 0 : (n * (GLYPH_W + 1) - 1) * scale;
}

/** Calls `plot` for every lit pixel of `text` drawn at (x, y). */
export function eachTextPixel(
  text: string,
  x: number,
  y: number,
  scale: number,
  plot: (px: number, py: number) => void,
) {
  let cx = x;
  for (const ch of chars(text)) {
    const g = glyph(ch);
    for (let r = 0; r < GLYPH_H; r++) {
      for (let c = 0; c < GLYPH_W; c++) {
        if (!g[r * GLYPH_W + c]) continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) plot(cx + c * scale + sx, y + r * scale + sy);
      }
    }
    cx += (GLYPH_W + 1) * scale;
  }
}

/**
 * Reduces any text to what the pixel font can draw: capitals including the accented
 * ones of most European languages (Æ Ø Å Ä Ö Ü É Ñ Č Ł…), digits and a little
 * punctuation. Anything else (emoji, other scripts) is left out.
 */
export function toBoardText(text: string): string {
  return chars(text)
    .map((ch) => (/\s/.test(ch) ? " " : rowsFor(ch) ? ch : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
