import { TShirtIcon } from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";
import { alpha, contrast, readableOn } from "@/lib/color";
import { displayName, initials } from "@/lib/format";
import type { Design, Team, TeamSize } from "@/lib/types";
import { CaptainMark, SubsLine } from "./LineupList";
import { Crest, Footer, Heading, MatchMeta, minPx, px, textUnits } from "./parts";
import { placedStarters, type Placed } from "./selection";
import type { Theme } from "./theme";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the pitch sits on the canvas. Shared with the studio's drag layer. */
export function pitchRect(theme: Theme, design: Design): Rect {
  const { w, h, u, pad, wide, tall } = theme;
  if (wide) {
    // Wide posts are shown small: a broad pitch gives the shirts and their name
    // labels the room to stay readable.
    const ph = h - pad * 2;
    const pw = Math.min(ph * 1.05, w * 0.54);
    return { x: theme.right - pw, y: pad, w: pw, h: ph };
  }
  const top = pad + (tall ? 300 : 210) * u;
  const bottom = (design.showSubs ? (tall ? 250 : 190) : 140) * u;
  const ph = h - top - bottom;
  const pw = Math.min(theme.right - pad, ph * (tall ? 0.82 : 1.3));
  return { x: pad + (theme.right - pad - pw) / 2, y: top, w: pw, h: ph };
}

/** Looks whose kit pattern would run through the shirts; their pitch gets a solid fill. */
const PATTERNED = new Set(["stripes", "hoops", "halves", "sash"]);

/** The pitch surface: club colour with mown stripes on patterned looks, else a light wash. */
function pitchFill(theme: Theme, rows = 10, strong = 0.07, soft = 0.03): string {
  const stripes = `repeating-linear-gradient(180deg, ${alpha(theme.fg, strong)} 0 ${100 / rows}%, ${alpha(theme.fg, soft)} ${100 / rows}% ${200 / rows}%)`;
  return PATTERNED.has(theme.look) ? `${stripes}, ${theme.ground}` : stripes;
}

/**
 * An outline colour for a shirt that would otherwise melt into the background
 * (a white kit on a light ground, a black kit at night). Null when it already stands out.
 */
export function kitEdge(kit: string, theme: Theme): string | null {
  return contrast(kit, theme.ground) < 1.8 ? theme.fg : null;
}

export function tokenSize(theme: Theme, rect: Rect, size: TeamSize): number {
  const base = { 11: 122, 9: 134, 8: 140, 7: 148, 5: 166 }[size];
  return base * theme.u * Math.min(1.25, Math.max(0.78, Math.min(rect.w / 860, rect.h / 760)));
}

interface LabelPlan {
  /** One line, or two for a long double-barrelled name. */
  lines: string[];
  size: number;
  /** Top-left corner on the pitch, in px. */
  left: number;
  top: number;
}

/**
 * Places each name label under its shirt so it never collides with another label
 * or shirt and never prints below the readable minimum. Each player tries, in
 * order: the name as styled, the surname, the surname over two lines; first right
 * under the shirt, then dropped a line or two lower. The first spot that is clear wins.
 */
function planLabels(
  placed: Placed[],
  design: Design,
  theme: Theme,
  rect: Rect,
  size: number,
): Map<number, LabelPlan> {
  const plans = new Map<number, LabelPlan>();
  const floor = minPx(theme);
  const max = Math.max(size * 0.24, floor);
  const padX = size * 0.2;
  const padY = size * 0.12;
  const shown = placed.filter((p) => p.player);
  const pos = (p: Placed) => ({ x: (p.x / 100) * rect.w, y: (p.y / 100) * rect.h });
  type Box = { l: number; r: number; t: number; b: number };
  const hit = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) *
    Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  // Shirts are obstacles too (a little inset: the icon doesn't fill its box).
  const taken: Box[] = shown.map((p) => {
    const { x, y } = pos(p);
    return { l: x - size * 0.42, r: x + size * 0.42, t: y - size * 0.45, b: y + size * 0.45 };
  });
  const maxW = Math.min(size * 3.4, rect.w);
  const order = [...shown].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const pl of order) {
    const { x, y } = pos(pl);
    const full = displayName(pl.player!, design.nameStyle);
    const surname = displayName(pl.player!, "surname");
    const options: string[][] = [[full]];
    if (surname !== full) options.push([surname]);
    const two = splitAt(surname);
    if (two.length > 1) options.push(two);
    let best: { plan: LabelPlan; box: Box; cost: number } | null = null;
    // Under the shirt; beside it; a line lower; above it; two lines lower.
    const spots = ["below", "right", "left", "drop1", "above", "drop2"] as const;
    search: for (const spot of spots) {
      for (const lines of options) {
        const units = Math.max(...lines.map((l) => textUnits(l)));
        const fontSize = Math.max(floor, Math.min(max, (maxW - padX) / (units * theme.font.glyph)));
        const w = units * theme.font.glyph * fontSize + padX;
        const h = lines.length * fontSize + padY;
        const under = y + size * 0.5 + size * 0.04;
        let l = x - w / 2;
        let t = under;
        if (spot === "drop1") t = under + fontSize + padY;
        if (spot === "drop2") t = under + 2 * (fontSize + padY);
        if (spot === "above") t = y - size * 0.5 - size * 0.04 - h;
        if (spot === "right" || spot === "left") {
          t = y - h / 2 + size * 0.1;
          l = spot === "right" ? x + size * 0.46 : x - size * 0.46 - w;
        }
        // Nudge along the touchline to stay on the pitch, but not far off the shirt.
        const clamped = Math.max(0, Math.min(l, rect.w - w));
        const box = { l: clamped, r: clamped + w, t, b: t + h };
        const shifted = Math.abs(clamped - l) > size * 0.6;
        const outside = box.t < 0 || box.b > rect.h;
        const cost =
          taken.reduce((n, o) => n + overlap(box, o), 0) + (shifted || outside ? 1e6 : 0);
        const plan = { lines, size: fontSize, left: box.l, top: box.t };
        if (!best || cost < best.cost) best = { plan, box, cost };
        if (cost === 0 && !taken.some((o) => hit(box, o))) break search;
      }
    }
    if (best) {
      plans.set(pl.slot.index, best.plan);
      taken.push(best.box);
    }
  }
  return plans;
}

/** Two lines for a long name: at the hyphen or space nearest the middle. */
function splitAt(text: string): string[] {
  const breaks = [...text.matchAll(/[-\s]/g)].map((m) => m.index!);
  if (!breaks.length) return [text];
  const mid = text.length / 2;
  const at = breaks.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
  const split = [text.slice(0, at + 1).trim(), text.slice(at + 1).trim()];
  // Never leave an initial on a line of its own ("S." / "Ellery").
  return split.every((l) => l.replace(/[.\-]/g, "").length > 2) ? split : [text];
}

function Markings({ theme, weight = 3 }: { theme: Theme; weight?: number }) {
  const line = `${Math.max(2, weight * theme.u)}px solid ${alpha(theme.fg, 0.32)}`;
  const box = (style: CSSProperties) => (
    <div style={{ position: "absolute", left: "50%", translate: "-50% 0", ...style }} />
  );
  return (
    <>
      <div style={{ position: "absolute", inset: 0, border: line }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: line }} />
      {box({
        top: "50%",
        width: "24%",
        aspectRatio: "1",
        borderRadius: "50%",
        border: line,
        translate: "-50% -50%",
      })}
      {box({ top: 0, width: "56%", height: "15%", borderBottom: line, borderInline: line })}
      {box({ top: 0, width: "26%", height: "5.5%", borderBottom: line, borderInline: line })}
      {box({ bottom: 0, width: "56%", height: "15%", borderTop: line, borderInline: line })}
      {box({ bottom: 0, width: "26%", height: "5.5%", borderTop: line, borderInline: line })}
    </>
  );
}

function Token({
  placed,
  team,
  design,
  theme,
  size,
}: {
  placed: Placed;
  team: Team;
  design: Design;
  theme: Theme;
  size: number;
}) {
  const p = placed.player;
  // Empty positions are left off the graphic; the studio flags them instead.
  if (!p) return null;
  const isKeeper = placed.slot.index === 0;
  const kit = isKeeper ? theme.kitAlt : theme.kit;
  const ink = readableOn(kit);
  const edge = kitEdge(kit, theme);
  const isCaptain = design.showCaptain && p && team.lineup.captainId === p.id;
  // No shirt number (a pasted squad often has none): the shirt carries initials instead.
  const number = p.number.trim() || initials(p.name, 2);

  return (
    <div
      style={{
        position: "absolute",
        left: `${placed.x}%`,
        top: `${placed.y}%`,
        translate: "-50% -50%",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        {design.tokenStyle === "shirt" ? (
          <>
            <TShirtIcon weight="fill" size={size} color={kit} style={{ display: "block" }} />
            {edge && (
              <TShirtIcon
                weight="bold"
                size={size}
                color={edge}
                style={{ position: "absolute", inset: 0 }}
              />
            )}
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: size * 0.12,
              borderRadius: "50%",
              background: kit,
              boxShadow: edge
                ? `0 0 0 ${size * 0.05}px ${edge}`
                : `0 0 0 ${size * 0.04}px ${alpha(ink, 0.35)} inset`,
            }}
          />
        )}
        {(design.showNumbers || design.tokenStyle === "disc") && (
          <div
            data-check-slot="number"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: design.tokenStyle === "shirt" ? size * 0.12 : 0,
              color: ink,
              fontWeight: theme.font.heavy,
              fontSize: px(theme, size * (number.length > 1 ? 0.34 : 0.4)),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {number}
          </div>
        )}
        {isCaptain && (
          // Off the shirt's shoulder, clear of the number.
          <div
            style={{
              position: "absolute",
              left: "100%",
              top: 0,
              translate: "-35% -20%",
            }}
          >
            <CaptainMark theme={theme} size={size * 0.3} />
          </div>
        )}
      </div>
    </div>
  );
}

/** A name label, placed by planLabels so it clears every shirt and label. */
function Label({ plan, theme, size }: { plan: LabelPlan; theme: Theme; size: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: plan.left,
        top: plan.top,
        background: theme.fg,
        color: theme.ground,
        fontWeight: theme.font.heavy,
        fontSize: plan.size,
        lineHeight: 1,
        padding: `${size * 0.06}px ${size * 0.1}px`,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {plan.lines.map((l, k) => (
        <div key={k}>{l}</div>
      ))}
    </div>
  );
}

export function LineupPitch({ team, design, theme }: { team: Team; design: Design; theme: Theme }) {
  const { w, u, pad, wide, tall } = theme;
  const rect = pitchRect(theme, design);
  const size = tokenSize(theme, rect, team.lineup.size);
  const placed = placedStarters(team);
  const labels = planLabels(placed, design, theme, rect, size);
  const crestSize = (tall ? 160 : 118) * u;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: wide ? rect.x - pad * 2 : w - pad * 2,
          bottom: wide ? pad : undefined,
          display: "flex",
          flexDirection: wide ? "column" : "row",
          alignItems: wide ? "flex-start" : "center",
          gap: (wide ? 24 : 30) * u,
        }}
      >
        <Crest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={wide ? 110 * u : crestSize}
          theme={theme}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 * u }}>
          <Heading
            text={design.headlines.pitch}
            width={wide ? rect.x - pad * 2 : theme.right - pad - crestSize - 30 * u}
            max={(tall ? 150 : 118) * u}
            theme={theme}
          />
          <MatchMeta team={team} theme={theme} size={(tall ? 30 : 26) * u} />
        </div>
        {wide && (
          <>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: px(theme, 34 * u), color: theme.muted }}>
              {team.lineup.formation}
            </div>
            <SubsLine
              team={team}
              design={design}
              theme={theme}
              size={26 * u}
              width={rect.x - pad * 2}
              maxLines={3}
            />
            <Footer theme={theme} design={design} style={{ alignSelf: "stretch" }} />
          </>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          background: pitchFill(theme),
        }}
      >
        <Markings theme={theme} />
        {placed.map((pl) => (
          <Token
            key={pl.slot.index}
            placed={pl}
            team={team}
            design={design}
            theme={theme}
            size={size}
          />
        ))}
        {placed.map((pl) => {
          const plan = labels.get(pl.slot.index);
          return plan ? (
            <Label key={`l${pl.slot.index}`} plan={plan} theme={theme} size={size} />
          ) : null;
        })}
      </div>

      {!wide && (
        <div
          style={{
            position: "absolute",
            left: pad,
            right: w - theme.right,
            bottom: pad,
            display: "flex",
            flexDirection: "column",
            gap: 24 * u,
          }}
        >
          <SubsLine
            team={team}
            design={design}
            theme={theme}
            size={(tall ? 32 : 26) * u}
            width={theme.right - pad}
            maxLines={tall ? 4 : 3}
          />
          <Footer theme={theme} design={design} />
        </div>
      )}
    </>
  );
}

/** A small formation diagram: discs with shirt numbers, used beside the Starting XI list. */
export function MiniPitch({ team, theme, rect }: { team: Team; theme: Theme; rect: Rect }) {
  const placed = placedStarters(team);
  const disc = Math.min(rect.w, rect.h) * 0.11;
  const labelSize = px(theme, 30 * theme.u);
  const floor = minPx(theme);
  return (
    // The formation label sits under the pitch, inside the same box.
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h + 16 * theme.u + labelSize * 1.1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: rect.w,
          height: rect.h,
          background: PATTERNED.has(theme.look) ? theme.ground : alpha(theme.fg, 0.05),
        }}
      >
        <Markings theme={theme} weight={2} />
        {placed.map((pl) => {
          if (!pl.player) return null;
          const keeper = pl.slot.index === 0;
          const kit = keeper ? theme.kitAlt : theme.kit;
          const edge = kitEdge(kit, theme);
          const number = pl.player.number.trim();
          const size = disc * (number.length > 1 ? 0.46 : 0.56);
          return (
            <div
              key={pl.slot.index}
              style={{
                position: "absolute",
                left: `${pl.x}%`,
                top: `${pl.y}%`,
                width: disc,
                height: disc,
                translate: "-50% -50%",
                borderRadius: "50%",
                background: kit,
                color: readableOn(kit),
                display: "grid",
                placeItems: "center",
                fontWeight: theme.font.heavy,
                fontSize: size,
                fontVariantNumeric: "tabular-nums",
                boxShadow: `0 0 0 ${Math.max(2, 3 * theme.u)}px ${edge ?? alpha(theme.ground, 0.6)}`,
              }}
            >
              {/* A diagram dot: the number only where it can be read (the list has it). */}
              {size >= floor ? number : null}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16 * theme.u,
          textAlign: "center",
          fontSize: labelSize,
          lineHeight: 1.1,
          fontWeight: theme.font.heavy,
          color: theme.muted,
        }}
      >
        {team.lineup.formation}
      </div>
    </div>
  );
}
