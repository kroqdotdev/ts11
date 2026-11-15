/**
 * Crests are often saved from a club website as a JPEG on a white square. On a
 * dark graphic that square shows as a white box, so the studio spots a solid,
 * opaque border and can cut it away with a flood fill from the edges.
 */

export interface CrestBackground {
  /** The border colour, e.g. "#ffffff". */
  color: string;
  /** Light enough that it reads as "white". */
  light: boolean;
}

const MAX = 256;

/**
 * The image's pixels, at most `max` across. Throws when it can't be decoded or read (a
 * picture from another site without CORS).
 */
export async function crestPixels(
  src: string,
  max = MAX,
): Promise<{ data: ImageData; w: number; h: number }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  // An SVG without a width or height has no natural size: draw it square.
  const nw = img.naturalWidth || max;
  const nh = img.naturalHeight || max;
  const scale = Math.min(1, max / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h), w, h };
}

function borderIndexes(w: number, h: number): number[] {
  const out: number[] = [];
  for (let x = 0; x < w; x++) out.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) out.push(y * w, y * w + w - 1);
  return out;
}

const dist = (d: Uint8ClampedArray, i: number, r: number, g: number, b: number) =>
  Math.max(Math.abs(d[i * 4] - r), Math.abs(d[i * 4 + 1] - g), Math.abs(d[i * 4 + 2] - b));

/**
 * "transparent" when the crest is cut out (see-through edges, or an SVG), "opaque"
 * when it fills its square, so graphics know whether to give it a plate.
 */
export async function crestKindOf(src: string): Promise<"opaque" | "transparent"> {
  if (src.startsWith("data:image/svg")) return "transparent";
  try {
    const { data, w, h } = await crestPixels(src);
    const edge = borderIndexes(w, h);
    const opaque = edge.filter((i) => data.data[i * 4 + 3] > 230).length;
    return opaque >= edge.length * 0.6 ? "opaque" : "transparent";
  } catch {
    return "opaque";
  }
}

/** A solid opaque colour round the edge, or null when the edge is transparent or busy. */
export async function crestBackground(src: string): Promise<CrestBackground | null> {
  if (src.startsWith("data:image/svg")) return null;
  const { data, w, h } = await crestPixels(src);
  const d = data.data;
  const edge = borderIndexes(w, h);
  const opaque = edge.filter((i) => d[i * 4 + 3] > 230);
  if (opaque.length < edge.length * 0.9) return null;
  // The most common edge colour, roughly: average the opaque edge pixels, then
  // check most of them sit close to it.
  let r = 0;
  let g = 0;
  let b = 0;
  for (const i of opaque) {
    r += d[i * 4];
    g += d[i * 4 + 1];
    b += d[i * 4 + 2];
  }
  r /= opaque.length;
  g /= opaque.length;
  b /= opaque.length;
  const close = opaque.filter((i) => dist(d, i, r, g, b) < 28).length;
  if (close < edge.length * 0.85) return null;
  const hex = "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  return { color: hex, light: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.8 };
}

/**
 * Makes the background see-through: everything connected to the edge and close to
 * its colour goes transparent, with a soft fringe so edges don't look jagged.
 */
export async function removeCrestBackground(src: string, bg: CrestBackground): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the image.");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const r = Number.parseInt(bg.color.slice(1, 3), 16);
  const g = Number.parseInt(bg.color.slice(3, 5), 16);
  const b = Number.parseInt(bg.color.slice(5, 7), 16);
  const HARD = 34;
  const SOFT = 70;

  const seen = new Uint8Array(w * h);
  const stack = borderIndexes(w, h);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    seen[i] = 1;
    const away = dist(d, i, r, g, b);
    if (away >= SOFT) continue;
    // Close to the background: gone. A little further: partly see-through, and stop.
    d[i * 4 + 3] = away < HARD ? 0 : Math.round((d[i * 4 + 3] * (away - HARD)) / (SOFT - HARD));
    if (away >= HARD) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  ctx.putImageData(data, 0, 0);
  const webp = canvas.toDataURL("image/webp", 0.92);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/**
 * The main colours in a crest's pixels, most used first: what the club's colours most
 * likely are. Pixels that are see-through, or the solid background round the crest, are
 * skipped. Pure, so it can be tested without a canvas.
 */
export function paletteOf(
  d: Uint8ClampedArray,
  { background, max = 6 }: { background?: string | null; max?: number } = {},
): string[] {
  const bg = background
    ? [1, 3, 5].map((i) => Number.parseInt(background.slice(i, i + 2), 16))
    : null;
  // Buckets of 16 levels a channel, each keeping a sum so its colour is the true average.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (bg && Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2])) < 28)
      continue;
    total++;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const k = buckets.get(key);
    if (k) {
      k.n++;
      k.r += r;
      k.g += g;
      k.b += b;
    } else buckets.set(key, { n: 1, r, g, b });
  }
  const ranked = [...buckets.values()]
    .map((k) => ({ n: k.n, rgb: [k.r / k.n, k.g / k.n, k.b / k.n] }))
    .sort((a, b) => b.n - a.n);
  // Neighbouring buckets of one colour, and the blends along its edges, fold into the
  // biggest colour near them.
  const picked: { n: number; rgb: number[] }[] = [];
  for (const c of ranked) {
    const near = picked.find((p) => Math.max(...p.rgb.map((v, j) => Math.abs(v - c.rgb[j]))) < 48);
    if (near) near.n += c.n;
    else picked.push({ ...c });
  }
  return picked
    .filter((p) => p.n >= total * 0.02)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((p) => "#" + p.rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""));
}

/** The main colours in a crest image (see paletteOf). Empty when it can't be read. */
export async function crestPalette(src: string): Promise<string[]> {
  try {
    const { data } = await crestPixels(src);
    const bg = await crestBackground(src).catch(() => null);
    return paletteOf(data.data, { background: bg?.color });
  } catch {
    return [];
  }
}
