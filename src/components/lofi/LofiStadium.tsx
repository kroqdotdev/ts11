"use client";

import { useEffect, useRef } from "react";
import { luminance, mix } from "@/lib/color";
import {
  layout,
  paintStadium,
  pitchPoint,
  type Sky,
  type Sprite,
  type StadiumKit,
} from "@/lib/lofi/stadium";

export interface StadiumProps {
  className?: string;
  /** CSS pixels per stadium pixel. */
  px?: number;
  sky?: Sky;
  lightsOn: boolean;
  /** The home kit. Null keeps a mixed, neutral crowd and no players. */
  kit: StadiumKit | null;
  scoreLine: string;
  ticker: string;
  /** A card mosaic in the stand spelling `text`, in the given colours. */
  tifo: {
    text: string;
    primary: string;
    secondary: string;
    width?: number;
    /** Spelled instead when the full text won't fit the stand. */
    short?: string;
  } | null;
  /** Messages on the advertising boards. */
  boardText?: string[];
  /** Where the line-up stands, as fractions of the pitch (0..1 across, 0..1 deep). */
  formation: { x: number; y: number; keeper?: boolean }[];
  /** Changing this sets off a wave round the ground. */
  waveKey?: string | number;
  kickable?: boolean;
  seed?: number;
  /** Grow the scoreboard into the big screen used by the club setup. */
  bigScreen?: boolean;
  /** Where the banner hangs, as a fraction across the stand. */
  tifoX?: number;
}

const NEUTRAL = ["#c9ccd3", "#7f8899", "#c75446"];

/** Near-black shirts vanish against the dark seats, so the crowd wears them a touch lighter. */
function liftDark(hex: string): string {
  return luminance(hex) < 0.03 ? mix(hex, "#ffffff", 0.22) : hex;
}

interface Runner {
  fx: number;
  fy: number;
  keeper: boolean;
  spawn: number;
  seed: number;
}

export function LofiStadium(props: StadiumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);

  // Timeline of things that happen in the ground, keyed off prop changes.
  const timeline = useRef({
    lightsAt: -1,
    lightsOff: true,
    crowdFrom: NEUTRAL,
    crowdTo: NEUTRAL,
    crowdAt: -1,
    waveAt: -1,
    waveKey: undefined as string | number | undefined,
    tifoAt: -1,
    runners: [] as Runner[],
    kitKey: "",
    /** Current size of the scoreboard, 0 (scoreboard) to 1 (big screen). */
    grow: props.bigScreen ? 1 : 0,
    lastFrame: -1,
  });

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tl = timeline.current;
    const seed = props.seed ?? 11;

    let w = 0;
    let h = 0;
    let image: ImageData;
    let buf: Uint32Array;
    const ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, placed: false };

    function setup() {
      // Layout size, not the on-screen box: the camera zooms this canvas with a transform.
      const r = { width: canvas!.clientWidth, height: canvas!.clientHeight };
      // Finer pixels on phones so the scoreboard and banner still fit.
      const px = propsRef.current.px ?? (r.width < 640 ? 2 : 4);
      w = Math.max(40, Math.ceil(r.width / px));
      h = Math.max(30, Math.ceil(r.height / px));
      canvas!.width = w;
      canvas!.height = h;
      image = ctx!.createImageData(w, h);
      buf = new Uint32Array(image.data.buffer);
      const spot = pitchPoint(w, h, 0.5, 0.55);
      if (!ball.placed) {
        ball.x = spot.x + 6;
        ball.y = spot.y;
        ball.placed = true;
      }
    }

    function sync(now: number) {
      const p = propsRef.current;
      if (p.lightsOn && tl.lightsOff) {
        tl.lightsOff = false;
        tl.lightsAt = now;
      }
      if (!p.lightsOn) tl.lightsOff = true;

      const kitKey = p.kit ? `${p.kit.primary}${p.kit.secondary}${p.kit.look}` : "";
      if (kitKey !== tl.kitKey) {
        tl.kitKey = kitKey;
        tl.crowdFrom = tl.crowdTo;
        tl.crowdTo = p.kit
          ? [liftDark(p.kit.primary), liftDark(p.kit.secondary), "#f2f5ef"]
          : NEUTRAL;
        tl.crowdAt = now;
      }
      if (p.waveKey !== tl.waveKey) {
        if (tl.waveKey !== undefined) tl.waveAt = now;
        tl.waveKey = p.waveKey;
      }
      if (p.tifo && tl.tifoAt < 0) tl.tifoAt = now;
      if (!p.tifo) tl.tifoAt = -1;

      // Runners: one per formation spot, staggered out of the tunnel.
      const want = p.formation;
      if (want.length > tl.runners.length) {
        for (let i = tl.runners.length; i < want.length; i++)
          tl.runners.push({
            fx: want[i].x,
            fy: want[i].y,
            keeper: !!want[i].keeper,
            spawn: now + (i - tl.runners.length) * 160,
            seed: ((i * 7919) % 97) / 97,
          });
      } else if (want.length < tl.runners.length) {
        tl.runners.length = want.length;
      }
      tl.runners.forEach((r, i) => {
        r.fx = want[i].x;
        r.fy = want[i].y;
        r.keeper = !!want[i].keeper;
      });
    }

    function frame(now: number) {
      sync(now);
      const p = propsRef.current;
      const lay = layout(w, h);
      const since = (at: number) => (at < 0 ? Infinity : now - at);

      const lightT = since(tl.lightsAt);
      const lights = !p.lightsOn ? 0 : reduce ? 1 : Math.min(1, lightT / 900);

      const crowdT = reduce ? Infinity : since(tl.crowdAt);
      const switchX = crowdT === Infinity ? w + 10 : (crowdT / 1100) * (w + 20) - 10;

      const waveT = reduce ? Infinity : since(tl.waveAt);
      const waveX = waveT < 1800 ? (waveT / 1800) * (w + 30) - 15 : null;

      const tifoT = since(tl.tifoAt);
      const tifo = p.tifo
        ? {
            text: p.tifo.text,
            primary: p.tifo.primary,
            secondary: p.tifo.secondary,
            progress: reduce ? 1 : Math.min(1, tifoT / 1400),
            x: p.tifoX,
            width: p.tifo.width,
            short: p.tifo.short,
          }
        : null;

      const tunnel = { x: lay.tunnelX, y: lay.pitchTop + 2 };
      const players: Sprite[] = [];
      if (p.kit) {
        for (const r of tl.runners) {
          const target = pitchPoint(w, h, r.fx, r.fy);
          const t = reduce ? Infinity : now - r.spawn;
          if (t < 0) continue;
          const dist = Math.hypot(target.x - tunnel.x, target.y - tunnel.y);
          const k = Math.min(1, t / Math.max(1, dist * 22));
          const moving = k < 1;
          players.push({
            x: tunnel.x + (target.x - tunnel.x) * k,
            y: tunnel.y + (target.y - tunnel.y) * k,
            kit: p.kit,
            keeper: r.keeper,
            frame: moving ? ((Math.floor(now / 110) % 2) as 0 | 1) : 0,
            seed: r.seed,
          });
        }
      }

      // Ball physics: a kick sends it bouncing across the grass.
      ball.vz -= 0.06;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.z += ball.vz;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = Math.abs(ball.vz) > 0.25 ? -ball.vz * 0.55 : 0;
        ball.vx *= 0.97;
        ball.vy *= 0.97;
      }
      const top = lay.pitchTop + 3;
      if (ball.x < 2 || ball.x > w - 3) {
        ball.vx = -ball.vx * 0.7;
        ball.x = Math.min(w - 3, Math.max(2, ball.x));
      }
      if (ball.y < top || ball.y > h - 2) {
        ball.vy = -ball.vy * 0.7;
        ball.y = Math.min(h - 2, Math.max(top, ball.y));
      }
      if (Math.abs(ball.vx) + Math.abs(ball.vy) < 0.01 && ball.z === 0) {
        ball.vx = 0;
        ball.vy = 0;
      }

      const dt = tl.lastFrame < 0 ? 0 : Math.min(64, now - tl.lastFrame);
      tl.lastFrame = now;
      const target = p.bigScreen ? 1 : 0;
      tl.grow =
        reduce || dt === 0
          ? target === tl.grow
            ? tl.grow
            : reduce
              ? target
              : tl.grow
          : tl.grow + Math.sign(target - tl.grow) * Math.min(Math.abs(target - tl.grow), dt / 850);

      buf.fill(0);
      paintStadium(buf, {
        w,
        h,
        t: now,
        seed,
        sky: p.sky ?? "dusk",
        lights,
        crowd: { from: tl.crowdFrom, to: tl.crowdTo, switchX },
        waveX,
        tifo,
        scoreboard: {
          line: p.scoreLine,
          ticker: p.ticker,
          offset: reduce ? 0 : now * 0.022,
          grow: tl.grow,
          title: p.bigScreen ? "CLUB SETUP" : undefined,
        },
        boards: p.kit
          ? [p.kit.primary, "#f2f5ef", p.kit.secondary, "#11161d"]
          : ["#1d3f8f", "#f2f5ef", "#c8102e", "#11161d"],
        boardOffset: reduce ? 0 : now * 0.012,
        boardText: p.boardText,
        players,
        ball: { x: ball.x, y: ball.y, z: ball.z },
      });
      ctx!.putImageData(image, 0, 0);
    }

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      frame(now);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    setup();
    frame(performance.now());
    if (!reduce) start();

    const ro = new ResizeObserver(() => {
      setup();
      frame(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduce) start();
    });
    io.observe(canvas);
    const onVis = () => {
      if (!document.hidden && !reduce) start();
    };
    document.addEventListener("visibilitychange", onVis);

    // Reduced motion: redraw on demand instead of every frame.
    const redraw = reduce ? window.setInterval(() => frame(performance.now()), 500) : 0;

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
    };
    const onDown = (e: PointerEvent) => {
      if (!propsRef.current.kickable) return;
      const p = local(e);
      if (Math.hypot(p.x - ball.x, p.y - (ball.y - ball.z)) > 6) return;
      const dir = p.x < ball.x ? 1 : -1;
      ball.vx = dir * (1.4 + Math.random() * 0.8);
      ball.vy = (Math.random() - 0.5) * 0.8;
      ball.vz = 1.3 + Math.random() * 0.5;
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (!propsRef.current.kickable) return;
      const p = local(e);
      canvas.style.cursor = Math.hypot(p.x - ball.x, p.y - (ball.y - ball.z)) <= 6 ? "pointer" : "";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(redraw);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    };
    // The loop reads live props from a ref; it only needs setting up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block [image-rendering:pixelated] ${props.className ?? ""}`}
    />
  );
}
