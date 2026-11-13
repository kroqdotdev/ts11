/**
 * A formation diagram for the looks that draw Team news their own way: the
 * markings, a token per player and a name label that never runs into the next.
 */
import { legible } from "../theme";
import type { CSSProperties, ReactNode } from "react";
import { displayName } from "@/lib/format";
import type { Design, Player, Team } from "@/lib/types";
import { tokenSize, type Rect } from "../LineupPitch";
import { placedStarters, type Placed } from "../selection";
import type { Theme } from "../theme";

export interface PitchSkin {
  /** CSS background of the playing surface. */
  surface: string;
  line: string;
  lineWidth: number;
  /** Draws one player's token, centred on its spot, `size` px across. */
  token: (p: { player: Player; keeper: boolean; size: number; captain: boolean }) => ReactNode;
  label: { color: string; background?: string; weight: number; style?: CSSProperties };
  /** Token size relative to the shared Team news size. */
  scale?: number;
}

interface Label {
  lines: string[];
  size: number;
  /** Horizontal condensing for a name that still doesn't fit its room. */
  squeeze: number;
  /** Estimated label width and height. */
  w: number;
  h: number;
  /** Offset of the label's top centre from the token centre. */
  top: number;
  left: number;
}

/** Packs words (split after hyphens and at spaces) into lines no wider than `room`. */
function wrapWords(text: string, room: number, width: (t: string) => number): string[] {
  const tokens = text.split(/(?<=-)|\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const t of tokens) {
    const last = lines.at(-1);
    const join = last === undefined ? t : last.endsWith("-") ? last + t : `${last} ${t}`;
    if (last !== undefined && width(join) <= room) lines[lines.length - 1] = join;
    else lines.push(t);
  }
  return lines;
}

/**
 * Plans every name around its token: one size for the whole team (set so most
 * names fit in full), each name in full, else its surname, else the surname
 * wrapped at hyphens and spaces, else condensed; never cut or below the floor.
 * Labels go under their token, or beside or above it when that would collide
 * with a team-mate's label or run off the pitch.
 */
function planLabels(shown: Placed[], design: Design, theme: Theme, rect: Rect, size: number) {
  // Heavy capitals run wider than the average glyph; estimate generously.
  const est = (t: string, s: number) => t.length * s * theme.font.glyph * 1.18;
  const floor = legible(theme, 0);
  const max = Math.max(floor, size * 0.3);
  const pos = (pl: Placed) => ({ x: (pl.x / 100) * rect.w, y: (pl.y / 100) * rect.h });
  const rooms = shown.map((pl) => {
    const { x, y } = pos(pl);
    let room = rect.w * 0.34;
    for (const o of shown) {
      if (o === pl) continue;
      if (Math.abs(pos(o).y - y) > size * 0.9) continue;
      // Two centred labels side by side share the gap between their tokens.
      room = Math.min(room, (Math.abs(pos(o).x - x) - size * 0.2) * 0.95);
    }
    return Math.max(size, Math.min(room, rect.w));
  });
  // The size most names can take on one line (full or surname).
  const best = shown.map((pl, i) => {
    const full = displayName(pl.player!, design.nameStyle);
    const surname = displayName(pl.player!, "surname");
    const one = (t: string) =>
      (rooms[i] * 0.92) / (Math.max(1, t.length) * theme.font.glyph * 1.08);
    return Math.max(one(full), one(surname));
  });
  const sorted = [...best].sort((a, b) => a - b);
  const S0 = Math.max(floor, Math.min(max, sorted[Math.floor(sorted.length * 0.3)] ?? max));
  // Try the natural size first; if labels can't all find a clear spot, step the
  // whole team's size down towards the floor.
  for (let S = S0; ; S = Math.max(floor, S * 0.9)) {
    const { plans: p, clashes } = placeAt(S);
    if (clashes === 0 || S <= floor) return p;
  }

  function placeAt(S: number) {
    const out = new Map<number, Label>();
    let clashes = 0;
    // Labels on a plate carry padding either side.
    const pad = S * 0.3;
    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    // Tokens are obstacles too.
    for (const pl of shown) {
      const { x, y } = pos(pl);
      boxes.push({ x0: x - size / 2, y0: y - size / 2, x1: x + size / 2, y1: y + size / 2 });
    }
    // Keepers last: their label has the fewest good spots and should yield.
    const order = [...shown.keys()].sort(
      (i, j) => Number(shown[i].slot.index === 0) - Number(shown[j].slot.index === 0),
    );
    for (const i of order) {
      const pl = shown[i];
      const room = rooms[i] - pad * 2;
      const full = displayName(pl.player!, design.nameStyle);
      const surname = displayName(pl.player!, "surname");
      const widest = (ls: string[]) => Math.max(...ls.map((l) => est(l, S)));
      const options: string[][] = [[full], [surname], wrapWords(surname, room, (t) => est(t, S))];
      const lines =
        options.find((ls) => ls.length <= 3 && widest(ls) <= room) ??
        options.reduce((x, y) => (widest(y) < widest(x) ? y : x));
      const squeeze = Math.max(0.6, Math.min(1, room / widest(lines)));
      const w = widest(lines) * squeeze + pad * 2;
      const h = lines.length * S * 1.05 + S * 0.24;
      const { x, y } = pos(pl);
      const clampX = (cx: number) => Math.min(Math.max(cx, w / 2), rect.w - w / 2) - x;
      const below = size * 0.56;
      const side = size * 0.58 + w / 2;
      const spots = [
        { top: below, left: clampX(x) },
        { top: -h / 2, left: side },
        { top: -h / 2, left: -side },
        { top: -(below + h), left: clampX(x) },
        { top: below, left: clampX(x + w / 2) },
        { top: below, left: clampX(x - w / 2) },
        { top: -(below + h), left: clampX(x + w / 2) },
        { top: -(below + h), left: clampX(x - w / 2) },
      ];
      const box = (sp: { top: number; left: number }) => ({
        x0: x + sp.left - w / 2,
        y0: y + sp.top,
        x1: x + sp.left + w / 2,
        y1: y + sp.top + h,
      });
      const overlap = (b: ReturnType<typeof box>) => {
        const off =
          Math.max(0, -b.x0) +
          Math.max(0, b.x1 - rect.w) +
          Math.max(0, -b.y0) +
          Math.max(0, b.y1 - rect.h);
        const hit = boxes.reduce(
          (sum, o) =>
            sum +
            Math.max(0, Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0)) *
              Math.max(0, Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0)),
          0,
        );
        return off * 1000 + hit;
      };
      const scored = spots.map((sp) => ({ sp, cost: overlap(box(sp)) }));
      const pick =
        scored.find((c) => c.cost === 0) ?? scored.reduce((a, b) => (b.cost < a.cost ? b : a));
      if (pick.cost > 0) clashes++;
      boxes.push(box(pick.sp));
      out.set(pl.slot.index, { lines, size: S, squeeze, w, h, ...pick.sp });
    }
    return { plans: out, clashes };
  }
}

/** The standard markings, drawn in `color` at `width` px. */
export function PitchLines({ color, width }: { color: string; width: number }) {
  const line = `${width}px solid ${color}`;
  const mid = (style: CSSProperties) => (
    <div style={{ position: "absolute", left: "50%", translate: "-50% 0", ...style }} />
  );
  return (
    <>
      <div style={{ position: "absolute", inset: 0, border: line }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: line }} />
      {mid({
        top: "50%",
        width: "24%",
        aspectRatio: "1",
        translate: "-50% -50%",
        borderRadius: "50%",
        border: line,
      })}
      {mid({ top: 0, width: "44%", height: "14%", border: line, borderTop: "none" })}
      {mid({ top: 0, width: "20%", height: "5%", border: line, borderTop: "none" })}
      {mid({ bottom: 0, width: "44%", height: "14%", border: line, borderBottom: "none" })}
      {mid({ bottom: 0, width: "20%", height: "5%", border: line, borderBottom: "none" })}
    </>
  );
}

export function PitchDiagram({
  team,
  design,
  theme,
  rect,
  skin,
}: {
  team: Team;
  design: Design;
  theme: Theme;
  rect: Rect;
  skin: PitchSkin;
}) {
  const shown = placedStarters(team).filter((p) => p.player);
  const size = tokenSize(theme, rect, team.lineup.size) * (skin.scale ?? 0.82);
  const labels = planLabels(shown, design, theme, rect, size);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: skin.surface,
      }}
    >
      <PitchLines color={skin.line} width={skin.lineWidth} />
      {shown.map((pl) => {
        const label = labels.get(pl.slot.index)!;
        const captain = design.showCaptain && team.lineup.captainId === pl.player!.id;
        return (
          <div
            key={pl.slot.index}
            style={{
              position: "absolute",
              left: `${pl.x}%`,
              top: `${pl.y}%`,
              width: 0,
              height: 0,
            }}
          >
            <div style={{ position: "absolute", left: -size / 2, top: -size / 2 }}>
              {skin.token({ player: pl.player!, keeper: pl.slot.index === 0, size, captain })}
            </div>
            <div
              style={{
                position: "absolute",
                // Below the token; if that runs off the pitch (the keeper), beside it.
                top: label.top,
                left: label.left,
                translate: "-50% 0",
                textAlign: "center",
                whiteSpace: "nowrap",
                fontSize: label.size,
                lineHeight: 1.05,
                fontWeight: skin.label.weight,
                color: skin.label.color,
                background: skin.label.background,
                padding: skin.label.background ? `${label.size * 0.12}px ${label.size * 0.3}px` : 0,
                ...skin.label.style,
              }}
            >
              {label.lines.map((l, i) => (
                <div
                  key={i}
                  style={
                    label.squeeze < 0.999
                      ? {
                          transform: `scaleX(${label.squeeze})`,
                          margin: `0 ${-((1 - label.squeeze) * (l.length * label.size * theme.font.glyph * 1.08)) / 2}px`,
                        }
                      : undefined
                  }
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
