function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function isHex(value: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  return toHex(parseHex(value));
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mixes `a` toward `b` by `t` (0..1). */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as [number, number, number]);
}

export function shade(hex: string, amount: number): string {
  return amount < 0 ? mix(hex, "#05070a", -amount) : mix(hex, "#ffffff", amount);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const SNOW = "#f7f7f4";
export const COAL = "#0d1117";

/** Picks the most legible of near-white or near-black text on a background. */
export function readableOn(bg: string): string {
  return contrast(bg, SNOW) >= contrast(bg, COAL) ? SNOW : COAL;
}

/**
 * A second tone of the same colour for kit patterns: darker, unless the colour is
 * already near black, in which case lighter so the pattern still shows.
 */
export function tonal(hex: string, amount: number): string {
  return luminance(hex) < 0.045 ? shade(hex, amount * 0.85) : shade(hex, -amount);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return [hue, s, l];
}

function fromHsl(hue: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return toHex([f(0), f(8), f(4)]);
}

/**
 * A pale tint that keeps the colour's hue. Mixing navy with white gives grey;
 * this gives a clear pale blue, so a white-and-navy kit's pattern still reads
 * as navy while dark type stays legible on it. Greys stay grey.
 */
export function huedTint(hex: string, lightness: number): string {
  const [hue, s] = toHsl(hex);
  if (s < 0.08) return mix(hex, "#ffffff", lightness);
  return fromHsl(hue, Math.min(0.7, Math.max(s, 0.42)), lightness);
}
