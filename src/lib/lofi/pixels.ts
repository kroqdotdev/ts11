/* Colour and randomness helpers for the pixel renderer. Colours are packed as
   ImageData-ready little-endian RGBA (0xAABBGGRR). */

const PACK = new Map<string, number>();

export function pack(hex: string): number {
  let v = PACK.get(hex);
  if (v === undefined) {
    let h = hex.replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const n = Number.parseInt(h.slice(0, 6), 16) || 0;
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    PACK.set(hex, v);
  }
  return v;
}

export function unpackHex(v: number): string {
  const r = v & 255;
  const g = (v >> 8) & 255;
  const b = (v >> 16) & 255;
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function lerpHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [ar, ag, ab] = ch(pa);
  const [br, bg, bb] = ch(pb);
  const m = (x: number, y: number) => Math.round(x + (y - x) * Math.min(1, Math.max(0, t)));
  return (
    "#" + [m(ar, br), m(ag, bg), m(ab, bb)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

/** Stable pseudo-random value in [0, 1) for integer coordinates. */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
