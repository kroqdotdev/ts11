/**
 * The lo-fi stadium: a pixel scene painted into a flat RGBA buffer.
 *
 * Pure and deterministic (given the same state it paints the same pixels), so
 * one renderer feeds the animated canvas on the landing page and in the club
 * setup, and the static SVG behind the "Stadium" graphic style.
 */
import type { LookId } from "@/lib/types";
import { eachTextPixel, GLYPH_H, textWidth, toBoardText } from "./font";
import { contrast, luminance } from "@/lib/color";
import { hash, lerpHex, pack } from "./pixels";

export type Sky = "dusk" | "night" | "day";

export interface StadiumKit {
  primary: string;
  secondary: string;
  look: LookId;
}

export interface Sprite {
  /** Feet position in logical pixels. */
  x: number;
  y: number;
  kit: StadiumKit;
  keeper?: boolean;
  frame: 0 | 1;
  seed: number;
}

export interface StadiumState {
  w: number;
  h: number;
  t: number;
  seed: number;
  sky: Sky;
  /** Floodlight brightness, 0 to 1. */
  lights: number;
  /** Shirt colours in the crowd. People left of `switchX` already wear `to`. */
  crowd: { from: string[]; to: string[]; switchX: number };
  /** Horizontal position of a Mexican wave, or null. */
  waveX: number | null;
  /** Draw the players' tunnel. Off for still graphics, where nobody runs out of it. */
  tunnel?: boolean;
  /** A card mosaic held up by the crowd, spelling `text`. */
  tifo: {
    /** 0 to 1: how far through raising their cards the crowd is. */
    progress: number;
    text: string;
    primary: string;
    secondary: string;
    /** Horizontal centre as a fraction of the width (default the middle). */
    x?: number;
    /** Widest the mosaic may get, as a fraction of the width (at most 0.7). */
    width?: number;
    /** Spelled instead when `text` won't fit (e.g. the club's short name). */
    short?: string;
  } | null;
  scoreboard: {
    line: string;
    ticker: string;
    offset: number;
    /** 0 is the normal scoreboard, 1 the big screen used for the club setup. */
    grow?: number;
    /** Lit on the big screen while it grows, before the setup questions appear over it. */
    title?: string;
  } | null;
  boards: string[];
  /**
   * Messages scrolled along the advertising boards. Without them, boards show noise.
   * An entry can list alternatives, longest first (e.g. full name, then short name):
   * the first that fits the width is used, so a message is never cut mid-word.
   */
  boardText?: (string | string[])[];
  /**
   * Still pictures: tile whole messages exactly across the width (no scrolling, no
   * message cut off at an edge).
   */
  boardFit?: boolean;
  boardOffset: number;
  players: Sprite[];
  ball: { x: number; y: number; z: number } | null;
}

export interface Layout {
  skyH: number;
  roofY: number;
  roofH: number;
  standTop: number;
  standBottom: number;
  boardsY: number;
  boardsH: number;
  pitchTop: number;
  pylons: [number, number];
  tunnelX: number;
}

export function layout(w: number, h: number): Layout {
  const skyH = Math.max(10, Math.round(h * 0.22));
  const roofH = Math.max(2, Math.round(h * 0.03));
  const standTop = skyH + roofH;
  const standBottom = Math.max(standTop + 9, Math.round(h * 0.56));
  // Tall enough for one line of the 5×7 font with a pixel either side.
  const boardsH = Math.max(GLYPH_H + 2, Math.round(h * 0.035));
  return {
    skyH,
    roofY: skyH,
    roofH,
    standTop,
    standBottom,
    boardsY: standBottom,
    boardsH,
    pitchTop: standBottom + boardsH,
    pylons: [Math.round(w * 0.05), w - 1 - Math.round(w * 0.05)],
    tunnelX: Math.round(w * 0.42),
  };
}

/** Maps a point on the pitch (fractions across and into the picture) to pixels. */
export function pitchPoint(w: number, h: number, fx: number, fy: number) {
  const lay = layout(w, h);
  return {
    x: Math.round(fx * (w - 1)),
    y: Math.round(lay.pitchTop + 4 + fy * (h - lay.pitchTop - 6)),
  };
}

const SKIES: Record<Sky, string[]> = {
  dusk: ["#1d2750", "#2c3a6c", "#4f4d86", "#8c628c", "#d0806c", "#efa877"],
  night: ["#050a1a", "#08112b", "#0c1838", "#111f45", "#172852"],
  day: ["#3b7bc4", "#5390d0", "#6ea6dc", "#93bfe7", "#b7d6ef"],
};
const SKIN = ["#f1c7a5", "#dba27d", "#b07752", "#764a32", "#eab690"];
const HAIR = ["#2a1c14", "#5a3a22", "#14100c", "#b98a4b", "#3a2a1e"];

function kitPixel(kit: StadiumKit, col: number, row: number): string {
  switch (kit.look) {
    case "stripes":
      return col % 2 === 0 ? kit.primary : kit.secondary;
    case "hoops":
      return row % 2 === 0 ? kit.primary : kit.secondary;
    case "halves":
      return col < 2 ? kit.primary : kit.secondary;
    case "sash":
      return col + row === 4 || col + row === 5 ? kit.secondary : kit.primary;
    default:
      return kit.primary;
  }
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The scoreboard on the roof, sized to its top line. */
export function boardRect(w: number, h: number, line: string): Rect {
  const lay = layout(w, h);
  const bw = Math.min(w - 8, Math.max(textWidth(line) + 10, Math.round(w * 0.24)));
  const bh = GLYPH_H * 2 + 9;
  return { x: Math.round((w - bw) / 2), y: Math.max(1, lay.roofY - bh - 3), w: bw, h: bh };
}

/** The big screen the scoreboard turns into for the club setup. */
export function bigScreenRect(w: number, h: number): Rect {
  const bw = Math.round(w * 0.34);
  // Down to just above the ad boards, so the club setup fits on a laptop screen.
  return { x: Math.round((w - bw) / 2), y: Math.round(h * 0.035), w: bw, h: Math.round(h * 0.52) };
}

export function paintStadium(buf: Uint32Array, s: StadiumState) {
  const { w, h, t, seed } = s;
  const lay = layout(w, h);
  const lit = s.sky === "day" ? 1 : s.lights;
  const dimFactor = s.sky === "day" ? 0 : (1 - lit) * 0.45;
  const dim = (hex: string) => (dimFactor > 0 ? lerpHex(hex, "#0a0e15", dimFactor) : hex);

  const put = (x: number, y: number, c: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    buf[y * w + x] = c;
  };

  // Sky, in bands with a checkerboard dither between them.
  const sky = SKIES[s.sky].map(pack);
  for (let y = 0; y < lay.standTop; y++) {
    const f = (y / Math.max(1, lay.standTop)) * sky.length;
    const band = Math.min(sky.length - 1, Math.floor(f));
    const next = Math.min(sky.length - 1, band + 1);
    const frac = f - band;
    for (let x = 0; x < w; x++) {
      buf[y * w + x] = frac > 0.55 && ((x + y) & 1) === 0 ? sky[next] : sky[band];
    }
  }
  if (s.sky !== "day") {
    const star = pack("#e9eefc");
    for (let y = 0; y < lay.skyH * 0.6; y++)
      for (let x = 0; x < w; x++) if (hash(x, y, seed + 7) < 0.005) put(x, y, star);
  }

  // Floodlight glow, dithered so it reads as light rather than a shape.
  if (s.sky !== "day" && lit > 0) {
    const glow = pack("#ffe6a0");
    const headY = Math.round(h * 0.05);
    for (const px of lay.pylons) {
      for (let dy = -9; dy <= 9; dy++)
        for (let dx = -12; dx <= 12; dx++) {
          const d = Math.hypot(dx, dy * 1.4);
          if (d < 3 || d > 12) continue;
          if (
            ((px + dx + headY + dy) & 1) === 0 &&
            hash(px + dx, headY + dy, 3) < lit * (1 - d / 13)
          )
            put(px + dx, headY + dy, glow);
        }
    }
  }

  // Roof.
  const roof = pack("#171c24");
  const roofEdge = pack("#3a4555");
  for (let y = lay.roofY; y < lay.standTop; y++)
    for (let x = 0; x < w; x++) buf[y * w + x] = y === lay.standTop - 1 ? roofEdge : roof;

  // The stand and the crowd.
  const seat = pack(dim("#2a3340"));
  const rowLine = pack(dim("#1d242e"));
  const aisle = 26;
  for (let y = lay.standTop; y < lay.standBottom; y++)
    for (let x = 0; x < w; x++)
      buf[y * w + x] = (y - lay.standTop) % 3 === 2 || x % aisle === 0 ? rowLine : seat;

  const fromCols = s.crowd.from.map((c) => pack(dim(c)));
  const toCols = s.crowd.to.map((c) => pack(dim(c)));
  const skins = SKIN.map((c) => pack(dim(c)));
  const tick = Math.floor(t / 420);
  const rows = Math.floor((lay.standBottom - lay.standTop - 2) / 3);
  const mosaic = s.tifo ? planMosaic(s.tifo, w, rows) : null;
  const inks = s.tifo ? mosaicInks(s.tifo.primary, s.tifo.secondary) : null;
  const cardA = inks
    ? [pack(dim(inks.ground)), pack(dim(lerpHex(inks.ground, "#000000", 0.16)))]
    : [];
  const cardB = inks ? [pack(dim(inks.letter)), pack(dim(inks.letter))] : [];

  for (let r = 0; r < rows; r++) {
    const y0 = lay.standTop + 1 + r * 3;
    for (let x = 1; x < w; x++) {
      const near = s.waveX === null ? 99 : Math.abs(x - s.waveX);
      // Inside the mosaic nearly every seat is taken (people stand in the aisles too),
      // and most hold up a card.
      const lit = mosaic ? mosaic.at(x, r) : null;
      if (x % aisle === 0 && lit === null) continue;
      if (lit !== null && s.tifo) {
        if (hash(x, r, seed + 5) > 0.985) continue;
        const raised = hash(x, r, 77) < s.tifo.progress * 1.25 - 0.05;
        const dropped = hash(x, r, seed + 9) < 0.02 || near < 4;
        if (raised && !dropped) {
          // A few are held the wrong way round; some cards are a shade darker.
          const flip = hash(x, r, seed + 13) < 0.008;
          const pal = lit !== flip ? cardB : cardA;
          const card = pal[hash(x, r, seed + 17) < 0.05 ? 1 : 0];
          const wobble = hash(x, r, tick + 3) < 0.02 ? 1 : 0;
          for (let k = -1; k <= 1; k++) put(x, y0 + k - wobble, card);
          continue;
        }
      } else if (hash(x, r, seed) > 0.86) continue;

      const pick = hash(x, r + 997, seed);
      const pal = x < s.crowd.switchX ? toCols : fromCols;
      const shirt = pal[pick < 0.55 ? 0 : pick < 0.85 ? 1 : 2] ?? pal[0];
      const skin = skins[Math.floor(hash(x, r + 31, seed) * skins.length)];
      const up = near < 5 || hash(x, r, tick) < 0.02 ? 1 : 0;
      put(x, y0 - up, skin);
      put(x, y0 + 1 - up, shirt);
      if (near < 3) put(x, y0 - 1 - up, shirt);
    }
  }

  // Scoreboard, standing on the roof. It can grow into the big screen.
  if (s.scoreboard) {
    const sb = s.scoreboard;
    const g = Math.min(1, Math.max(0, sb.grow ?? 0));
    const e = 1 - (1 - g) ** 3;
    const a = boardRect(w, h, sb.line);
    const b = bigScreenRect(w, h);
    const bx = Math.round(a.x + (b.x - a.x) * e);
    const by = Math.round(a.y + (b.y - a.y) * e);
    const bw = Math.round(a.w + (b.w - a.w) * e);
    const bh = Math.round(a.h + (b.h - a.h) * e);
    const frame = pack("#10151c");
    const edge = pack("#3a4555");
    const screen = pack("#0b0f14");
    const dot = pack("#121922");
    for (let y = by + bh; y < lay.standTop; y++) {
      put(bx + 4, y, frame);
      put(bx + bw - 5, y, frame);
    }
    for (let y = by; y < by + bh; y++)
      for (let x = bx; x < bx + bw; x++) {
        const rim = y === by || y === by + bh - 1 || x === bx || x === bx + bw - 1;
        const inner = y > by + 1 && y < by + bh - 2 && x > bx + 1 && x < bx + bw - 2;
        // A faint LED grid once the screen is big.
        const led = g > 0.5 && inner && (x & 1) === 0 && (y & 1) === 0;
        put(x, y, rim ? edge : inner ? (led ? dot : screen) : frame);
      }
    if (sb.title && g > 0.55) {
      // The screen powers up: its title, and a cursor blinking under it.
      const led = pack("#f7c600");
      const pad = Math.max(4, Math.round(bw * 0.06));
      eachTextPixel(toBoardText(sb.title), bx + pad, by + pad, 1, (x, y) => put(x, y, led));
      if (Math.floor(t / 400) % 2 === 0)
        for (let y = by + pad + GLYPH_H + 5; y < by + pad + GLYPH_H * 2 + 5; y++)
          for (let x = bx + pad; x < bx + pad + 4; x++) put(x, y, led);
    }
    if (g < 0.08) {
      const led = pack("#f7c600");
      const lx = bx + Math.round((bw - textWidth(sb.line)) / 2);
      eachTextPixel(sb.line, lx, by + 3, 1, (x, y) => put(x, y, led));
      // Ticker, scrolling right to left inside the board.
      const tick = pack("#e9efe7");
      const inner = bw - 6;
      const span = textWidth(sb.ticker) + inner;
      const tx = bx + 3 + inner - (Math.floor(sb.offset) % Math.max(1, span));
      eachTextPixel(sb.ticker, tx, by + GLYPH_H + 6, 1, (x, y) => {
        if (x > bx + 2 && x < bx + bw - 3) put(x, y, tick);
      });
    }
  }

  // Floodlight pylons, in front of the stand.
  const steel = pack("#121720");
  const lampOn = pack("#fff6d2");
  const lampOff = pack("#4a525e");
  const headY = Math.round(h * 0.05);
  for (const px of lay.pylons) {
    for (let y = headY + 3; y < lay.boardsY; y++) {
      put(px, y, steel);
      if ((y - headY) % 4 === 0) put(px + ((y >> 2) & 1 ? 1 : -1), y, steel);
    }
    for (let y = headY - 2; y < headY + 3; y++)
      for (let x = px - 4; x <= px + 4; x++) {
        const lamp = y >= headY - 1 && y <= headY + 1 && x > px - 4 && x < px + 4;
        const flicker = lit > 0 && lit < 1 && hash(x, y, Math.floor(t / 60)) > lit;
        put(x, y, lamp ? (lit > 0 && !flicker ? lampOn : lampOff) : steel);
      }
  }

  // Advertising boards, scrolling like the LED ones do.
  if (s.boardText?.length) {
    // One segment per message, each on the next board colour, looping round.
    const fits = (m: string) => textWidth(m) + 12 <= w;
    const msgs = s.boardText
      .map((entry) => {
        const options = (Array.isArray(entry) ? entry : [entry]).map(toBoardText).filter(Boolean);
        return options.find(fits) ?? options.at(-1) ?? "";
      })
      .filter(Boolean);
    const count = msgs.length * s.boards.length;
    const segs: { start: number; w: number; msg: string; bg: string }[] = [];
    let total = 0;
    for (let k = 0; k < count; k++) {
      const msg = msgs[k % msgs.length];
      const sw = textWidth(msg) + 12;
      segs.push({ start: total, w: sw, msg, bg: s.boards[k % s.boards.length] });
      total += sw;
    }
    if (s.boardFit && msgs.length) {
      // As many whole messages as fit, stretched to share the width exactly.
      segs.length = 0;
      let used = 0;
      let k = 0;
      const picked: string[] = [];
      while (picked.length < 24) {
        const msg = msgs[k % msgs.length];
        if (used + textWidth(msg) + 12 > w && picked.length) break;
        picked.push(msg);
        used += textWidth(msg) + 12;
        k++;
      }
      const extra = (w - used) / picked.length;
      let x = 0;
      picked.forEach((msg, i) => {
        const sw = Math.round(textWidth(msg) + 12 + extra * (i + 1)) - Math.round(extra * i);
        segs.push({ start: x, w: sw, msg, bg: s.boards[i % s.boards.length] });
        x += sw;
      });
      total = Math.max(x, w);
    }
    const shift = ((Math.floor(s.boardOffset) % total) + total) % total;
    for (const seg of segs) {
      for (const base of [-total, 0, total]) {
        const sx = seg.start - shift + base;
        if (sx > w || sx + seg.w < 0) continue;
        const bg = pack(seg.bg);
        for (let y = lay.boardsY; y < lay.boardsY + lay.boardsH; y++)
          for (let x = Math.max(0, sx); x < Math.min(w, sx + seg.w); x++) buf[y * w + x] = bg;
        const light =
          Number.parseInt(seg.bg.slice(1, 3), 16) + Number.parseInt(seg.bg.slice(3, 5), 16) > 300;
        const ink = pack(light ? "#11161d" : "#f2f5ef");
        const ty = lay.boardsY + Math.floor((lay.boardsH - GLYPH_H) / 2);
        const tx = s.boardFit ? sx + Math.round((seg.w - textWidth(seg.msg)) / 2) : sx + 6;
        eachTextPixel(seg.msg, tx, ty, 1, (x, y) => put(x, y, ink));
      }
    }
  } else {
    const seg = 20;
    for (let y = lay.boardsY; y < lay.boardsY + lay.boardsH; y++) {
      for (let x = 0; x < w; x++) {
        const p = x + Math.floor(s.boardOffset);
        const idx = Math.floor(p / seg);
        const bg = s.boards[((idx % s.boards.length) + s.boards.length) % s.boards.length];
        const inner = ((p % seg) + seg) % seg;
        const row = y - lay.boardsY;
        const letter =
          row > 0 &&
          row < lay.boardsH - 1 &&
          inner > 2 &&
          inner < seg - 3 &&
          hash(idx, inner, row) < 0.42;
        const light =
          Number.parseInt(bg.slice(1, 3), 16) + Number.parseInt(bg.slice(3, 5), 16) > 300;
        buf[y * w + x] = pack(letter ? (light ? "#11161d" : "#f2f5ef") : bg);
      }
    }
  }

  // The tunnel the teams come out of: a framed mouth cut through the boards, with a
  // canopy in the home colour, lamps inside and a mat that spills onto the grass.
  if (s.tunnel !== false) {
    const tx = lay.tunnelX;
    const half = 5;
    const top = lay.boardsY - 5;
    const frame = pack(dim("#5b6676"));
    const frameDark = pack(dim("#3a4555"));
    const canopy = pack(dim(s.boards[0] ?? "#1d3f8f"));
    const canopyEdge = pack(dim(lerpHex(s.boards[0] ?? "#1d3f8f", "#000000", 0.35)));
    const lamp = pack(lit > 0 ? "#ffe6a0" : "#4a525e");
    const depth = ["#05070a", "#0a0e14", "#10161e", "#161e28", "#1d2632"].map(pack);
    for (let y = top; y < lay.pitchTop; y++)
      for (let x = tx - half; x <= tx + half; x++) {
        const edge = x === tx - half || x === tx + half;
        if (y === top) put(x, y, canopyEdge);
        else if (y <= top + 2) put(x, y, (x + y) % 4 === 0 ? canopyEdge : canopy);
        else if (edge) put(x, y, x === tx - half ? frame : frameDark);
        else {
          // Darkest at the back, lighter towards the mouth.
          const f = (y - top - 3) / Math.max(1, lay.pitchTop - top - 3);
          put(x, y, depth[Math.min(depth.length - 1, Math.floor(f * depth.length))]);
        }
      }
    // Overhang shadow either side of the canopy, and two lamps under it.
    put(tx - half - 1, top + 1, canopyEdge);
    put(tx + half + 1, top + 1, canopyEdge);
    put(tx - 2, top + 3, lamp);
    put(tx + 2, top + 3, lamp);
  }

  // The pitch, mown in bands that widen towards the camera.
  const g1 = pack(s.sky === "day" ? "#3c8b47" : lerpHex("#20482a", "#3a8846", lit));
  const g2 = pack(s.sky === "day" ? "#46984f" : lerpHex("#245030", "#43944d", lit));
  for (let y = lay.pitchTop; y < h; y++) {
    const band = Math.floor(Math.sqrt(y - lay.pitchTop) * 1.7);
    const c = band % 2 === 0 ? g1 : g2;
    for (let x = 0; x < w; x++) buf[y * w + x] = c;
  }
  // The walkway mat from the tunnel to the touchline.
  const mat = pack(dim("#2b3440"));
  if (s.tunnel !== false)
    for (let y = lay.pitchTop; y < lay.pitchTop + 2; y++)
      for (let x = lay.tunnelX - 3; x <= lay.tunnelX + 3; x++) put(x, y, mat);
  const chalk = pack(s.sky === "day" || lit > 0.5 ? "#e8efe6" : "#9fb2a0");
  const pt = lay.pitchTop;
  const ph = h - pt;
  for (let x = 0; x < w; x++) put(x, pt + 1, chalk);
  const mid = Math.round(w / 2);
  for (let y = pt + 1; y < h; y++) put(mid, y, chalk);
  const cy = pt + ph * 0.55;
  const rx = w * 0.1;
  const ry = ph * 0.3;
  for (let a = 0; a < 360; a += 2) {
    const r = (a * Math.PI) / 180;
    put(Math.round(mid + Math.cos(r) * rx), Math.round(cy + Math.sin(r) * ry), chalk);
  }
  const boxTop = Math.round(pt + ph * 0.22);
  const boxW = Math.round(w * 0.12);
  for (let x = 0; x <= boxW; x++) {
    put(x, boxTop, chalk);
    put(w - 1 - x, boxTop, chalk);
  }
  for (let y = boxTop; y < h; y++) {
    put(boxW, y, chalk);
    put(w - 1 - boxW, y, chalk);
  }

  // Players and the ball, back to front.
  const things: { y: number; draw: () => void }[] = s.players.map((p) => ({
    y: p.y,
    draw: () => drawSprite(put, p),
  }));
  if (s.ball) {
    const b = s.ball;
    things.push({
      y: b.y,
      draw: () => {
        const shade = pack("#173a20");
        if (b.z > 0.5) {
          put(Math.round(b.x) - 1, Math.round(b.y), shade);
          put(Math.round(b.x), Math.round(b.y), shade);
          put(Math.round(b.x) + 1, Math.round(b.y), shade);
        }
        const bx = Math.round(b.x);
        const by = Math.round(b.y - b.z) - 1;
        const white = pack("#f4f6f1");
        const dark = pack("#11161d");
        put(bx, by - 1, white);
        put(bx - 1, by, white);
        put(bx, by, dark);
        put(bx + 1, by, white);
        put(bx, by + 1, white);
      },
    });
  }
  things.sort((a, b) => a.y - b.y).forEach((th) => th.draw());
}

/** Splits a phrase into two lines of similar length at a space. */
function twoLines(text: string): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best: string[] = [];
  let diff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" ");
    const b = words.slice(k).join(" ");
    if (Math.abs(a.length - b.length) < diff) {
      diff = Math.abs(a.length - b.length);
      best = [a, b];
    }
  }
  return best;
}

/**
 * Plans the card mosaic: which seats hold which colour. The text is laid out in
 * font units over at most 70% of the stand, on one or two lines, whichever
 * makes the letters biggest. Rows of seats are 3 pixels apart, so the grid is
 * stretched to keep the letters roughly square.
 */
function planMosaic(
  tifo: NonNullable<StadiumState["tifo"]>,
  w: number,
  rows: number,
): MosaicPlan | null {
  if (rows < 5) return null;
  // The full name if it fits, else the short name, else the initials.
  const tries = [tifo.text, tifo.short ?? "", initialsOf(tifo.text)]
    .map(toBoardText)
    .filter((t, i, all) => t && all.indexOf(t) === i);
  // At one seat per font pixel the crowd's odd cards turn letters to mush, so a
  // longer name only wins while it gets at least two seats a pixel.
  let fallback: MosaicPlan | null = null;
  for (const text of tries) {
    const plan = planText(text, tifo, w, rows);
    if (!plan) continue;
    if (plan.scale >= MIN_SCALE) return plan;
    if (!fallback || plan.scale > fallback.scale) fallback = plan;
  }
  return fallback;
}

const MIN_SCALE = 2;

interface MosaicPlan {
  at: (x: number, r: number) => boolean | null;
  /** Seats per font pixel; bigger reads better. */
  scale: number;
}

function initialsOf(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map((x) => x[0]).join("") : text.slice(0, 4);
}

/** Letters in the second colour on a ground of the first, unless they'd barely show. */
function mosaicInks(primary: string, secondary: string) {
  if (contrast(primary, secondary) >= 1.8) return { ground: primary, letter: secondary };
  const letter = luminance(primary) > 0.4 ? "#11161d" : "#f2f5ef";
  return { ground: primary, letter };
}

function planText(
  text: string,
  tifo: NonNullable<StadiumState["tifo"]>,
  w: number,
  rows: number,
): MosaicPlan | null {
  const maxW = w * Math.min(0.7, tifo.width ?? 0.7);
  const cx = (tifo.x ?? 0.5) * w;
  const half = Math.min(maxW / 2, cx, w - cx);
  const availW = half * 2;
  const availH = rows * 3;

  // Snap to whole seats: `px` seats across per font unit, `rpu` rows down.
  const options = [[text], twoLines(text)].filter((o): o is string[] => !!o);
  let best = { lines: options[0], px: 0, rpu: 0, uw: 0, uh: 0, score: 0 };
  for (const lines of options) {
    const uw = Math.max(...lines.map((l) => textWidth(l))) + 2;
    const uh = lines.length * GLYPH_H + (lines.length - 1) * 2 + 2;
    const px = Math.floor(availW / uw);
    const rpu = Math.min(Math.max(1, Math.round(px / 3)), Math.floor(availH / 3 / uh));
    const score = Math.min(px, rpu * 3);
    if (px >= 1 && rpu >= 1 && score > best.score) best = { lines, px, rpu, uw, uh, score };
  }
  if (!best.score) return null;
  const { px, rpu } = best;

  const boxW = best.uw * px;
  const boxRows = best.uh * rpu;
  const left = Math.round(cx - boxW / 2);
  const top = Math.floor((rows - boxRows) / 2);

  // Rasterise the lines once into a small grid of font units.
  const grid = new Set<string>();
  best.lines.forEach((line, li) => {
    const lx = Math.round((best.uw - 2 - textWidth(line)) / 2) + 1;
    const ly = 1 + li * (GLYPH_H + 2);
    eachTextPixel(line, lx, ly, 1, (gx, gy) => grid.add(`${gx},${gy}`));
  });

  return {
    scale: best.score,
    at(x, r) {
      if (r < top || r >= top + boxRows) return null;
      // Ragged edges: each row starts and ends a pixel or two off.
      const jag = Math.round((hash(r, 3, 41) - 0.5) * 3);
      if (x < left + jag || x >= left + boxW + jag) return null;
      const ux = Math.floor((x - left) / px);
      const uy = Math.floor((r - top) / rpu);
      return grid.has(`${ux},${uy}`);
    },
  };
}

function drawSprite(put: (x: number, y: number, c: number) => void, p: Sprite) {
  const left = Math.round(p.x) - 2;
  const top = Math.round(p.y) - 7;
  const skin = pack(SKIN[Math.floor(p.seed * SKIN.length) % SKIN.length]);
  const hair = pack(HAIR[Math.floor(p.seed * 7) % HAIR.length]);
  const kit: StadiumKit = p.keeper
    ? { primary: "#f2c230", secondary: "#11161d", look: "block" }
    : p.kit;
  const light =
    Number.parseInt(kit.secondary.slice(1, 3), 16) +
      Number.parseInt(kit.secondary.slice(3, 5), 16) >
    300;
  const shorts = pack(
    kit.look === "block" || kit.look === "clean" ? kit.secondary : light ? "#f2f5ef" : "#11161d",
  );
  const socks = pack(kit.primary);
  const boot = pack("#0b0e12");
  // Rows: hair, face, shoulders, hands, waist, shorts, legs, boots.
  put(left + 1, top, hair);
  put(left + 2, top, hair);
  put(left + 1, top + 1, skin);
  put(left + 2, top + 1, skin);
  for (let c = 0; c < 4; c++) put(left + c, top + 2, pack(kitPixel(kit, c, 0)));
  put(left, top + 3, skin);
  put(left + 1, top + 3, pack(kitPixel(kit, 1, 1)));
  put(left + 2, top + 3, pack(kitPixel(kit, 2, 1)));
  put(left + 3, top + 3, skin);
  put(left + 1, top + 4, pack(kitPixel(kit, 1, 2)));
  put(left + 2, top + 4, pack(kitPixel(kit, 2, 2)));
  put(left + 1, top + 5, shorts);
  put(left + 2, top + 5, shorts);
  if (p.frame === 0) {
    put(left + 1, top + 6, socks);
    put(left + 2, top + 6, socks);
    put(left + 1, top + 7, boot);
    put(left + 2, top + 7, boot);
  } else {
    put(left, top + 6, socks);
    put(left + 3, top + 6, socks);
    put(left, top + 7, boot);
    put(left + 3, top + 7, boot);
  }
}

/** Groups same-coloured runs into one SVG path per colour, for static exports. */
export function stadiumPaths(s: StadiumState): { fill: string; d: string }[] {
  const buf = new Uint32Array(s.w * s.h);
  paintStadium(buf, s);
  const byColour = new Map<number, string[]>();
  for (let y = 0; y < s.h; y++) {
    let x = 0;
    while (x < s.w) {
      const c = buf[y * s.w + x];
      let run = 1;
      while (x + run < s.w && buf[y * s.w + x + run] === c) run++;
      if (c) {
        let parts = byColour.get(c);
        if (!parts) byColour.set(c, (parts = []));
        parts.push(`M${x} ${y}h${run}v1h-${run}z`);
      }
      x += run;
    }
  }
  return [...byColour].map(([c, parts]) => ({
    fill: `#${[c & 255, (c >> 8) & 255, (c >> 16) & 255].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    d: parts.join(""),
  }));
}
