"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Graphic, pitchLayout } from "@/components/graphics/Graphic";
import { placedStarters } from "@/components/graphics/selection";
import { FORMATS } from "@/components/graphics/theme";
import { GRAPHIC_NODE_ID } from "@/lib/export";
import { displayName } from "@/lib/format";
import { postIssues } from "@/lib/issues";
import { describeSamples, withSamples } from "@/lib/sample";
import { useActiveTeam, useStudio } from "@/lib/store";
import { fixIssue } from "./fixIssue";

/** Room kept above the graphic for the sample tag, so the tag never covers the artwork. */
const TAG_H = 30;

function useFitScale(w: number, h: number, reserveY: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(0.05, Math.min(r.width / w, (r.height - reserveY) / h)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, reserveY]);
  return { ref, scale };
}

/**
 * The live preview. `exportable` (the main stage) also owns the node that gets exported;
 * the fullscreen phone view sets it to false so ids stay unique.
 */
export function Stage({ exportable = true }: { exportable?: boolean }) {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const { w, h } = FORMATS[design.format];
  // Missing details are shown with sample content here; the export uses the real team.
  const sample = withSamples(team, design);
  const sampled = sample.filled.length > 0;
  const { ref, scale } = useFitScale(w, h, sampled ? TAG_H : 0);
  const reduce = useReducedMotion();
  const shownW = w * scale;

  return (
    <div ref={ref} className="relative grid size-full place-items-center">
      {scale > 0 && (
        <div className="flex flex-col items-start">
          {sampled && <SampleTag text={describeSamples(sample.filled)} width={shownW} />}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${design.format}`}
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className={clsx(
                "relative shadow-[8px_8px_0_var(--card-ink)]",
                // A sample preview gets a dashed yellow-card frame instead of the ink one.
                sampled
                  ? "outline-2 outline-offset-2 outline-card outline-dashed"
                  : "outline-2 outline-card-ink",
              )}
              style={{ width: shownW, height: h * scale }}
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{ transform: `scale(${scale})`, width: w, height: h }}
              >
                <Graphic
                  team={sample.team}
                  design={design}
                  id={exportable && !sampled ? GRAPHIC_NODE_ID : undefined}
                />
              </div>
              {design.kind === "pitch" && !sample.filled.includes("starters") && (
                <PitchHandles scale={scale} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      {exportable && sampled && (
        // The real graphic, unseen, is what gets exported.
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 size-0 overflow-hidden opacity-0"
        >
          <div style={{ width: w, height: h }}>
            <Graphic team={team} design={design} id={GRAPHIC_NODE_ID} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sits on top of the frame like a file tab, outside the artwork: says the preview
 * borrows example content and that the PNG won't include it.
 */
function SampleTag({ text, width }: { text: string; width: number }) {
  const roomy = width >= 300;
  const full = `Example ${text}. Not exported.`;
  return (
    <div
      role="note"
      aria-label={`Sample preview: example ${text}. Not exported.`}
      title={full}
      className="mb-1.5 flex h-6 max-w-full items-center gap-2 overflow-hidden rounded-[3px] border-2 border-card-ink bg-card pr-2 pl-1.5 text-card-ink shadow-[2px_2px_0_var(--card-ink)]"
      style={{ maxWidth: width }}
    >
      <span className="font-signage text-[17px] leading-none">Sample</span>
      <span className="truncate text-[11.5px] leading-none font-medium">
        {roomy ? full : "Not exported."}
      </span>
    </div>
  );
}

/** What the graphic on screen still needs, under the stage on wide screens. */
export function IssuesBar() {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const issues = postIssues(team, design);
  if (issues.length === 0) return null;
  const [first, ...rest] = issues;
  return (
    <div
      role="status"
      className="mx-auto flex max-w-full items-center gap-3 rounded-[4px] border-2 border-card-ink bg-paper py-1.5 pr-1.5 pl-3 text-[13px] text-ink shadow-[3px_3px_0_var(--card-ink)]"
    >
      <span
        aria-hidden
        className={clsx("size-2.5 shrink-0", first.soft ? "bg-card" : "bg-danger")}
      />
      <span className="font-signage text-[18px] leading-none whitespace-nowrap">
        Before you post
      </span>
      <span className="min-w-0 truncate">{first.message}</span>
      {rest.length > 0 && (
        <span className="shrink-0 text-ink-soft" title={rest.map((i) => i.message).join(", ")}>
          +{rest.length} more
        </span>
      )}
      <button
        type="button"
        onClick={() => fixIssue(first)}
        className="shrink-0 lofi-press rounded-[3px] border-2 border-card-ink bg-card px-2.5 py-1 text-[12px] font-semibold text-card-ink shadow-[2px_2px_0_var(--card-ink)]"
      >
        {first.soft ? "Check" : "Fix it"}
      </button>
    </div>
  );
}

/**
 * Invisible handles over each player token. Dragging moves the player on the
 * pitch; arrow keys nudge the focused one. Lives outside the exported node.
 */
function PitchHandles({ scale }: { scale: number }) {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const setOverride = useStudio((s) => s.setOverride);
  // Each look draws its pitch in its own place (and Story shifts it below the safe zone).
  const { rect, token: native } = pitchLayout(team, design);
  const size = native * scale;
  const placed = placedStarters(team).filter((p) => p.player);
  const drag = useRef<{
    slot: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  // The slot being dragged, so its handle can show a ghost token under the pointer.
  const [dragging, setDragging] = useState<number | null>(null);

  const clamp = (v: number) => Math.min(97, Math.max(3, v));

  // Two players clash when their shirts or name labels would touch (a default
  // formation keeps about 1.7 shirts apart). Measured in pitch percent.
  const gapX = ((native * 1.45) / rect.w) * 100;
  const gapY = ((native * 1.35) / rect.h) * 100;

  /** The other placed players, read fresh so drags see the latest positions. */
  function others(slot: number) {
    return placedStarters(activeTeamNow()).filter((p) => p.player && p.slot.index !== slot);
  }
  /** The closest team-mate this spot would overlap, if any. */
  function clashAt(slot: number, x: number, y: number) {
    let best: ReturnType<typeof others>[number] | undefined;
    let bestD = Infinity;
    for (const o of others(slot)) {
      const dx = Math.abs(o.x - x) / gapX;
      const dy = Math.abs(o.y - y) / gapY;
      if (dx < 1 && dy < 1 && dx + dy < bestD) {
        best = o;
        bestD = dx + dy;
      }
    }
    return best;
  }

  /** Nearest spot to (x, y) that keeps clear of everyone else, searching outward. */
  function freeSpot(slot: number, x: number, y: number) {
    if (!clashAt(slot, x, y)) return { x, y };
    for (let r = 1; r <= 40; r++) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const cx = clamp(x + Math.cos(ang) * r * (gapX / 4));
        const cy = clamp(y + Math.sin(ang) * r * (gapY / 4));
        if (!clashAt(slot, cx, cy)) return { x: cx, y: cy };
      }
    }
    return { x, y };
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, slot: number, x: number, y: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { slot, startX: e.clientX, startY: e.clientY, x, y };
    setDragging(slot);
  }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.startX) / (rect.w * scale)) * 100;
    const dy = ((e.clientY - d.startY) / (rect.h * scale)) * 100;
    setOverride(d.slot, { x: clamp(d.x + dx), y: clamp(d.y + dy) });
  }
  /**
   * On drop: right on top of a team-mate swaps the two places; a near miss slides the
   * dragged player to the closest clear spot so names never overlap.
   */
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d) return;
    const me = placedStarters(activeTeamNow()).find((p) => p.slot.index === d.slot);
    if (!me) return;
    const hit = clashAt(d.slot, me.x, me.y);
    if (!hit) return;
    const direct = Math.abs(hit.x - me.x) < gapX * 0.35 && Math.abs(hit.y - me.y) < gapY * 0.35;
    if (direct) {
      setOverride(d.slot, { x: hit.x, y: hit.y });
      setOverride(hit.slot.index, { x: d.x, y: d.y });
    } else {
      setOverride(d.slot, freeSpot(d.slot, me.x, me.y));
    }
  }
  function onKey(e: KeyboardEvent<HTMLButtonElement>, slot: number, x: number, y: number) {
    const step = e.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    // Hop over a team-mate instead of stopping on top of them.
    let nx = clamp(x + m[0]);
    let ny = clamp(y + m[1]);
    for (let i = 0; i < 200 && clashAt(slot, nx, ny); i++) {
      const next = { x: clamp(nx + m[0]), y: clamp(ny + m[1]) };
      if (next.x === nx && next.y === ny) return; // against the edge, behind someone
      nx = next.x;
      ny = next.y;
    }
    if (clashAt(slot, nx, ny)) return;
    setOverride(slot, { x: nx, y: ny });
  }

  return (
    <div
      className="absolute"
      style={{
        left: rect.x * scale,
        top: rect.y * scale,
        width: rect.w * scale,
        height: rect.h * scale,
      }}
    >
      {placed.map((p) => (
        <button
          key={p.slot.index}
          type="button"
          aria-label={`Move ${p.player ? displayName(p.player, "full") : "empty position"}. Drag, or use the arrow keys.`}
          onPointerDown={(e) => onPointerDown(e, p.slot.index, p.x, p.y)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(null);
          }}
          onKeyDown={(e) => onKey(e, p.slot.index, p.x, p.y)}
          className={clsx(
            "absolute cursor-grab touch-none rounded-full outline-offset-2 transition-[box-shadow] select-none hover:shadow-[0_0_0_2px_var(--card)] focus-visible:outline-2 focus-visible:outline-card active:cursor-grabbing",
            dragging === p.slot.index && "z-10",
          )}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: size * 1.05,
            height: size * 1.05,
            translate: "-50% -50%",
          }}
        >
          {dragging === p.slot.index && (
            // A ghost of the player under the pointer while the graphic catches up.
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 grid place-items-center rounded-full border-2 border-card-ink bg-card/85 font-signage leading-none text-card-ink shadow-[3px_3px_0_var(--card-ink)]"
              style={{ fontSize: Math.max(14, size * 0.5) }}
            >
              {p.player?.number || "•"}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function activeTeamNow() {
  const s = useStudio.getState();
  return s.teams.find((t) => t.id === s.activeTeamId) ?? s.teams[0];
}
