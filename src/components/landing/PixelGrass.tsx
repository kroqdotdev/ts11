"use client";

import { useEffect, useRef } from "react";

/**
 * A strip of low-fi pixel grass. Each blade sways in the wind and bends away
 * from the cursor, and there is a ball in it that can be kicked.
 *
 * The canvas is drawn at a quarter of the CSS resolution and scaled up with
 * `image-rendering: pixelated`, so every pixel is a chunky 4×4 block and a full
 * frame is a few thousand writes into one ImageData buffer.
 */

const PX = 4; // CSS pixels per grass pixel
const BALL_R = 4.5;

/* 9×9 ball sprite: 0 empty, 1 white, 2 panel, 3 outline. */
const BALL = [
  "003333300",
  "031111130",
  "311221113",
  "312222113",
  "311221123",
  "311111223",
  "312211113",
  "031221130",
  "003333300",
];

interface Blade {
  h: number;
  phase: number;
  color: number;
  tip: number;
  front: boolean;
}

function rgba(hex: string, a = 255): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // ImageData is little-endian RGBA in a Uint32Array.
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [ar, ag, ab] = ch(pa);
  const [br, bg, bb] = ch(pb);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    "#" + [m(ar, br), m(ag, bg), m(ab, bb)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

export function PixelGrass({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let ground = 0;
    let blades: Blade[] = [];
    let image: ImageData;
    let buf: Uint32Array;
    let palette: number[] = [];
    let soil = 0;
    let ballColors: number[] = [];

    const pointer = { x: -999, y: -999, vx: 0 };
    const ball = { x: 0, y: 0, vx: 0, vy: 0, spin: 0 };

    function setup() {
      const rect = canvas!.getBoundingClientRect();
      w = Math.max(1, Math.ceil(rect.width / PX));
      h = Math.max(1, Math.ceil(rect.height / PX));
      canvas!.width = w;
      canvas!.height = h;
      ground = h - 5;
      image = ctx!.createImageData(w, h);
      buf = new Uint32Array(image.data.buffer);

      const grass = cssVar("--grass", "#1c5434");
      const mown = cssVar("--grass-mown", "#21603b");
      const deep = cssVar("--grass-deep", "#113520");
      palette = [
        rgba(mix(deep, grass, 0.6)),
        rgba(mown),
        rgba(mix(mown, "#5fae57", 0.35)),
        rgba(mix(mown, "#8fcf6a", 0.45)),
        rgba(mix(grass, "#b7b04a", 0.4)),
      ];
      soil = rgba(deep);
      ballColors = [0, rgba("#f2f5ef"), rgba("#0d1a12"), rgba("#0d1a12")];

      // Two blades per column, in front of and behind the ball.
      blades = [];
      for (let i = 0; i < w * 2; i++) {
        const tall = Math.random() < 0.08;
        const front = i % 2 === 0;
        // Front blades stay short so the ball shows through them.
        const scale = front ? 0.45 : 1;
        blades.push({
          h: Math.max(2, Math.round(((tall ? 16 : 6) + Math.random() * (tall ? 10 : 12)) * scale)),
          phase: Math.random() * Math.PI * 2,
          color: Math.random() < 0.04 ? 4 : Math.floor(Math.random() * 3),
          tip: Math.random() < 0.5 ? 3 : 2,
          front,
        });
      }
      if (ball.x === 0) {
        ball.x = Math.round(w * 0.78);
        ball.y = ground - BALL_R;
      }
    }

    function put(x: number, y: number, c: number) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      buf[y * w + x] = c;
    }

    function drawBlades(t: number, front: boolean) {
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        if (b.front !== front) continue;
        const x = i >> 1;
        // Wind: a slow travelling wave plus a little per-blade flutter.
        let bend =
          Math.sin(t * 0.0011 - x * 0.045) * 2.2 +
          Math.sin(t * 0.0037 + b.phase) * 0.7 +
          Math.sin(t * 0.0004 + x * 0.01) * 1.2;
        // Part around the cursor and the ball.
        for (const [px, py, force] of [
          [pointer.x, pointer.y, 7],
          [ball.x, ball.y, 5],
        ] as const) {
          const dx = x - px;
          const dy = ground - b.h / 2 - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 260) bend += (Math.sign(dx) || 1) * force * (1 - d2 / 260);
        }
        for (let k = 0; k < b.h; k++) {
          const f = k / b.h;
          const ox = bend * f * f;
          put(x + ox, ground - k, k >= b.h - 2 ? palette[b.tip] : palette[b.color]);
        }
      }
    }

    function drawBall() {
      const cos = Math.cos(ball.spin);
      const sin = Math.sin(ball.spin);
      for (let sy = 0; sy < 9; sy++) {
        for (let sx = 0; sx < 9; sx++) {
          const cell = BALL[sy][sx];
          if (cell === "0") continue;
          let c = ballColors[3];
          if (cell !== "3") {
            // Spin the panels inside a fixed outline (nearest-neighbour rotation).
            const rx = sx - 4;
            const ry = sy - 4;
            const ux = Math.round(rx * cos + ry * sin) + 4;
            const uy = Math.round(-rx * sin + ry * cos) + 4;
            c = BALL[uy]?.[ux] === "2" ? ballColors[2] : ballColors[1];
          }
          put(ball.x + sx - 4, ball.y + sy - 4, c);
        }
      }
    }

    function step() {
      const floor = ground - BALL_R;
      ball.vy += 0.22;
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.y > floor) {
        ball.y = floor;
        ball.vy = Math.abs(ball.vy) > 0.8 ? -ball.vy * 0.5 : 0;
        ball.vx *= 0.94;
      }
      // The strip is short, so the ball heads the top edge back down.
      if (ball.y < BALL_R) {
        ball.y = BALL_R;
        ball.vy = Math.abs(ball.vy) * 0.4;
      }
      if (ball.x < BALL_R || ball.x > w - BALL_R) {
        ball.x = Math.min(w - BALL_R, Math.max(BALL_R, ball.x));
        ball.vx = -ball.vx * 0.7;
      }
      if (Math.abs(ball.vx) < 0.02 && ball.y >= floor) ball.vx = 0;
      ball.spin += ball.vx / BALL_R;
    }

    function frame(t: number) {
      buf.fill(0);
      for (let x = 0; x < w; x++) for (let y = ground + 1; y < h; y++) buf[y * w + x] = soil;
      drawBlades(t, false);
      drawBall();
      drawBlades(t, true);
      ctx!.putImageData(image, 0, 0);
    }

    let raf = 0;
    let visible = true;
    const loop = (t: number) => {
      step();
      frame(t);
      const resting = ball.vx === 0 && ball.vy === 0;
      if (visible && !document.hidden && !(reduce && resting)) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    setup();
    frame(0);
    if (!reduce) start();

    const ro = new ResizeObserver(() => {
      setup();
      frame(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce) start();
    });
    io.observe(canvas);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / PX, y: (e.clientY - r.top) / PX };
    };
    const nearBall = (p: { x: number; y: number }) =>
      Math.hypot(p.x - ball.x, p.y - ball.y) < BALL_R + 4;

    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      pointer.vx = p.x - pointer.x;
      pointer.x = p.x;
      pointer.y = p.y;
      canvas.style.cursor = nearBall(p) ? "pointer" : "";
      // Running the cursor through the ball nudges it along.
      if (nearBall(p) && Math.abs(pointer.vx) > 1.5 && ball.y >= ground - BALL_R - 1) {
        ball.vx = Math.max(-4, Math.min(4, pointer.vx * 0.6));
        ball.vy = -1.8;
        if (reduce) start();
      }
    };
    const onLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
    };
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      if (!nearBall(p)) return;
      const dir = p.x < ball.x ? 1 : -1;
      ball.vx = dir * (2.6 + Math.random() * 1.6);
      ball.vy = -(2.1 + Math.random() * 0.7);
      start();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    const onVis = () => {
      if (!document.hidden && !reduce) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block w-full touch-manipulation [image-rendering:pixelated] ${className}`}
    />
  );
}
