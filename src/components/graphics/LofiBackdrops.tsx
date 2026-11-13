import { alpha, huedTint, luminance, mix, shade, tonal } from "@/lib/color";
import { hash } from "@/lib/lofi/pixels";
import { stadiumPaths } from "@/lib/lofi/stadium";
import type { Design, Team } from "@/lib/types";
import type { Theme } from "./theme";

const full = { position: "absolute", inset: 0 } as const;

/* Static exports are cached: thumbnails and the stage reuse the same scene. */
const CACHE = new Map<string, { fill: string; d: string }[]>();

function cached(key: string, make: () => { fill: string; d: string }[]) {
  let v = CACHE.get(key);
  if (!v) {
    v = make();
    if (CACHE.size > 40) CACHE.clear();
    CACHE.set(key, v);
  }
  return v;
}

function PixelSvg({
  w,
  h,
  paths,
  style,
}: {
  w: number;
  h: number;
  paths: { fill: string; d: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      style={{ ...full, width: "100%", height: "100%", ...style }}
      aria-hidden
    >
      {paths.map((p) => (
        <path key={p.fill} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}

/** A strip of pixel grass, generated rather than drawn. */
function grassPaths(w: number, h: number, colours: string[], seed: number) {
  const by = new Map<string, string[]>();
  const add = (c: string, x: number, y: number, len: number) => {
    let a = by.get(c);
    if (!a) by.set(c, (a = []));
    a.push(`M${x} ${y}h1v${len}h-1z`);
  };
  for (let x = 0; x < w; x++) {
    const blade = Math.round(2 + hash(x, 1, seed) * (h - 3));
    const tip = colours[1 + Math.floor(hash(x, 2, seed) * (colours.length - 1))];
    add(colours[0], x, h - blade, blade);
    add(tip, x, h - blade, 1);
  }
  return [...by].map(([fill, d]) => ({ fill, d: d.join("") }));
}

export function PixelBackdrop({ theme }: { theme: Theme }) {
  const { u, w, primary, secondary } = theme;
  const cell = Math.round(36 * u);
  const frame = Math.round(14 * u);
  const inset = Math.round(28 * u);
  const grassW = 90;
  const grassH = 10;
  // Low enough to stay clear of the subs line and footer.
  const grassStrip = Math.min((w / grassW) * grassH, 52 * u);
  // On a white shirt a darker tone is grey, and a grey checkerboard reads as an
  // image editor's "transparent" grid. Check in a pale tint of the trim instead.
  const checker = luminance(primary) > 0.62 ? huedTint(secondary, 0.9) : tonal(primary, 0.12);
  const grass = cached(`grass-${primary}`, () =>
    grassPaths(grassW, grassH, [shade(primary, -0.45), secondary, shade(primary, 0.25)], 5),
  );
  return (
    <>
      <div
        style={{
          ...full,
          background: `repeating-conic-gradient(${primary} 0 25%, ${checker} 0 50%) 0 0 / ${cell * 2}px ${cell * 2}px`,
        }}
      />
      {/* A chunky frame with stepped corners, like an 8-bit dialogue box. */}
      <div
        style={{
          position: "absolute",
          inset,
          border: `${frame}px solid ${secondary}`,
          boxShadow: `${frame}px ${frame}px 0 ${shade(primary, -0.5)}`,
        }}
      />
      {[
        { left: inset, top: inset },
        { right: inset, top: inset },
        { left: inset, bottom: inset },
        { right: inset, bottom: inset },
      ].map((pos, i) => (
        <div
          key={i}
          style={{ position: "absolute", width: frame, height: frame, background: primary, ...pos }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: grassStrip,
        }}
      >
        <PixelSvg w={grassW} h={grassH} paths={grass} />
      </div>
    </>
  );
}

export function StadiumBackdrop({ theme, team }: { theme: Theme; design: Design; team: Team }) {
  const { w, h, primary, secondary, ground } = theme;
  const lw = 132;
  const lh = Math.round((lw * h) / w);
  const kit = { primary, secondary, look: "stripes" as const };
  const key = `stadium-${lw}x${lh}-${primary}-${secondary}-${team.name}-${team.shortName}`;
  const paths = cached(key, () =>
    stadiumPaths({
      tunnel: false,
      w: lw,
      h: lh,
      t: 0,
      seed: 11,
      sky: "dusk",
      lights: 1,
      crowd: {
        from: [primary, secondary, "#f2f5ef"],
        to: [primary, secondary, "#f2f5ef"],
        switchX: 0,
      },
      waveX: null,
      tifo: {
        progress: 1,
        text: team.name || team.shortName,
        short: team.shortName,
        primary,
        secondary,
      },
      scoreboard: null,
      // No bright white board: shared layouts run type across the whole width.
      boards: [primary, mix(primary, "#05070b", 0.45), secondary, "#11161d"],
      // Whole names only: the full name where it fits, else the short name.
      boardText: [[team.name, team.shortName].filter(Boolean)],
      boardFit: true,
      boardOffset: 0,
      players: [0.62, 0.7, 0.78, 0.88].map((fx, i) => ({
        x: Math.round(fx * lw),
        y: Math.round(lh * (0.72 + (i % 2) * 0.12)),
        kit,
        frame: (i % 2) as 0 | 1,
        seed: i / 4,
      })),
      ball: { x: Math.round(lw * 0.74), y: Math.round(lh * 0.8), z: 0 },
    }),
  );
  // A light kit mixed toward black gives a flat grey ground. Veil the scene in a
  // night tone instead, so a white club still gets a floodlit stadium, not grey mud.
  const light = luminance(primary) > 0.35;
  const veil = light
    ? luminance(secondary) < 0.12
      ? mix(secondary, "#05070b", 0.55)
      : "#0a0f18"
    : ground;
  return (
    <>
      <PixelSvg w={lw} h={lh} paths={paths} />
      {/* Knock the crowd back everywhere, then darken where the type sits. */}
      <div style={{ ...full, background: alpha(veil, light ? 0.3 : 0.42) }} />
      <div
        style={{
          ...full,
          background: `linear-gradient(${theme.wide ? 90 : 100}deg, ${alpha(veil, 0.9)} 0%, ${alpha(veil, 0.82)} 50%, ${alpha(veil, 0.4)} 88%)`,
        }}
      />
      <div
        style={{
          ...full,
          background: `linear-gradient(180deg, ${alpha(veil, 0.35)} 0%, ${alpha(veil, 0)} 30%, ${alpha(veil, 0)} 60%, ${alpha(veil, 0.85)} 100%)`,
        }}
      />
    </>
  );
}
