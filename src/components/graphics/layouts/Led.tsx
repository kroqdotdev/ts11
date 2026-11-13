import { eachTextPixel, GLYPH_H, GLYPH_W, textWidth, toBoardText } from "@/lib/lofi/font";

/** A run of lit dots: text in the 5×7 sign font, or a solid block (a kit colour chip). */
export type LedPart =
  | {
      text: string;
      color: string;
      scale?: number;
      /** Reserve at least this many dots and right-align the text in them (number columns). */
      minWidth?: number;
    }
  | { block: number; color: string; scale?: number };

/** Width in dots of a part at its scale. */
function partWidth(p: LedPart, scale: number): number {
  const s = p.scale ?? scale;
  return "block" in p ? p.block * s : Math.max(p.minWidth ?? 0, textWidth(toBoardText(p.text), s));
}

/** Width in dots of `text` in the sign font. */
export function ledWidth(text: string, scale = 1): number {
  return textWidth(toBoardText(text), scale);
}

/** Largest whole scale (≤ max) at which `text` fits `cols` dots; 1 at least. */
export function ledScale(text: string, cols: number, max: number): number {
  const w = textWidth(toBoardText(text), 1);
  if (w === 0) return max;
  return Math.max(1, Math.min(max, Math.floor(cols / w)));
}

/**
 * Cuts `text` to what fits `cols` dots at `scale`, at a word boundary: whole words
 * only, so a board never shows "PAPADOPOUL". A single word too long for the board
 * is dropped rather than cut; callers pass short names for tight boards.
 */
export function ledClip(text: string, cols: number, scale = 1): string {
  const t = toBoardText(text);
  const max = Math.max(0, Math.floor((cols / scale + 1) / (GLYPH_W + 1)));
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  const cut = Math.max(head.lastIndexOf(" "), head.lastIndexOf("-") + 1);
  return cut > 0
    ? t
        .slice(0, cut)
        .replace(/[\s·,-]+$/, "")
        .trimEnd()
    : "";
}

/**
 * One module of a dot-matrix sign: a grid of unlit dots with lit text on it.
 * Modules stacked with no gap read as one continuous board, since every module
 * is a whole number of dots tall.
 */
export function LedRow({
  parts,
  cols,
  pitch,
  scale = 1,
  align = "left",
  padX = 1,
  padY = 1,
  gapDots = 4,
  rightCount = 1,
  dim,
  glow = true,
}: {
  parts: LedPart[];
  cols: number;
  pitch: number;
  scale?: number;
  align?: "left" | "center" | "right" | "spread";
  padX?: number;
  padY?: number;
  /** Dots between parts. */
  gapDots?: number;
  /** With align "spread": how many trailing parts are packed against the right edge. */
  rightCount?: number;
  dim: string;
  glow?: boolean;
}) {
  const live = parts.filter((p) =>
    "block" in p ? p.block > 0 : toBoardText(p.text).length > 0 || !!p.minWidth,
  );
  const rowScale = Math.max(scale, ...live.map((p) => p.scale ?? scale));
  const rows = GLYPH_H * rowScale + padY * 2;
  const widths = live.map((p) => partWidth(p, scale));
  const used = widths.reduce((a, b) => a + b, 0) + gapDots * Math.max(0, live.length - 1);
  const inner = cols - padX * 2;

  // Left edge of each part, in dots.
  const xs: number[] = [];
  if (align === "spread" && live.length > 1) {
    // Packed from the left, except the last `rightCount` parts, packed against the right edge.
    const split = Math.max(1, live.length - Math.min(rightCount, live.length - 1));
    let x = padX;
    for (let i = 0; i < split; i++) {
      xs.push(x);
      x += widths[i] + gapDots;
    }
    const tail = widths.slice(split);
    let r = cols - padX - tail.reduce((a, b) => a + b, 0) - gapDots * (tail.length - 1);
    for (let i = split; i < live.length; i++) {
      xs.push(r);
      r += widths[i] + gapDots;
    }
  } else {
    let x =
      align === "center"
        ? padX + Math.floor((inner - used) / 2)
        : align === "right"
          ? cols - padX - used
          : padX;
    for (let i = 0; i < live.length; i++) {
      xs.push(x);
      x += widths[i] + gapDots;
    }
  }

  const lit = new Map<string, string[]>();
  const dot = (color: string, x: number, y: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    let list = lit.get(color);
    if (!list) lit.set(color, (list = []));
    list.push(`M${x + 0.1} ${y + 0.5}a.4 .4 0 1 0 .8 0a.4 .4 0 1 0 -.8 0`);
  };
  live.forEach((p, i) => {
    const s = p.scale ?? scale;
    const h = GLYPH_H * s;
    const top = padY + Math.floor((GLYPH_H * rowScale - h) / 2);
    if ("block" in p) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < p.block * s; x++) dot(p.color, xs[i] + x, top + y);
    } else {
      const t = toBoardText(p.text);
      const shift = Math.max(0, (p.minWidth ?? 0) - textWidth(t, s));
      eachTextPixel(t, xs[i] + shift, top, s, (x, y) => dot(p.color, x, y));
    }
  });

  // Pattern ids are document-wide; include the colour so boards on different graphics never share one.
  const id = `led-${cols}-${rows}-${dim.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      width={cols * pitch}
      height={rows * pitch}
      viewBox={`0 0 ${cols} ${rows}`}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <pattern id={`${id}-off`} width="1" height="1" patternUnits="userSpaceOnUse">
          <circle cx=".5" cy=".5" r=".34" fill={dim} />
        </pattern>
      </defs>
      <rect width={cols} height={rows} fill={`url(#${id}-off)`} />
      {[...lit].map(([color, d]) => (
        <g key={color}>
          {glow && (
            <path d={d.join("")} fill="none" stroke={color} strokeWidth={0.32} opacity={0.28} />
          )}
          <path d={d.join("")} fill={color} />
        </g>
      ))}
    </svg>
  );
}

/** Paints dots on a free canvas: used for pictures (a pitch) rather than rows of text. */
export interface LedPainter {
  dot: (color: string, x: number, y: number) => void;
  text: (text: string, x: number, y: number, color: string, scale?: number) => void;
}

/** A dot-matrix panel of `cols` × `rows` dots, painted by `paint`. */
export function LedCanvas({
  cols,
  rows,
  pitch,
  dim,
  paint,
  glow = true,
}: {
  cols: number;
  rows: number;
  pitch: number;
  dim: string;
  paint: (p: LedPainter) => void;
  glow?: boolean;
}) {
  const lit = new Map<string, Map<number, string>>();
  const dot = (color: string, x: number, y: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    // Later paint wins: drop the dot from any other colour first.
    const key = y * cols + x;
    for (const m of lit.values()) m.delete(key);
    let m = lit.get(color);
    if (!m) lit.set(color, (m = new Map()));
    m.set(key, `M${x + 0.1} ${y + 0.5}a.4 .4 0 1 0 .8 0a.4 .4 0 1 0 -.8 0`);
  };
  const text = (t: string, x: number, y: number, color: string, scale = 1) =>
    eachTextPixel(toBoardText(t), Math.round(x), Math.round(y), scale, (px, py) =>
      dot(color, px, py),
    );
  paint({ dot, text });
  const id = `ledc-${cols}-${rows}-${dim.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      width={cols * pitch}
      height={rows * pitch}
      viewBox={`0 0 ${cols} ${rows}`}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <pattern id={`${id}-off`} width="1" height="1" patternUnits="userSpaceOnUse">
          <circle cx=".5" cy=".5" r=".34" fill={dim} />
        </pattern>
      </defs>
      <rect width={cols} height={rows} fill={`url(#${id}-off)`} />
      {[...lit].map(([color, m]) => {
        const d = [...m.values()].join("");
        return (
          <g key={color}>
            {glow && <path d={d} fill="none" stroke={color} strokeWidth={0.32} opacity={0.28} />}
            <path d={d} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
