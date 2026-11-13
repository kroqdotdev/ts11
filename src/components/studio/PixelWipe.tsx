"use client";

import { useEffect, useState } from "react";
import { hash } from "@/lib/lofi/pixels";
import { useUi } from "@/lib/store";

const COLS = 16;
const ROWS = 10;

/**
 * Straight after the club setup, the stadium's dusk sky breaks up into blocks
 * that drop away to reveal the studio, so the move from one to the other reads
 * as one piece rather than a hard cut.
 */
export function PixelWipe() {
  const intro = useUi((s) => s.intro);
  const setIntro = useUi((s) => s.setIntro);
  const [reduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntro(false), reduce ? 0 : 1100);
    return () => window.clearTimeout(t);
  }, [intro, reduce, setIntro]);

  if (!intro || reduce) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 grid"
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const x = i % COLS;
        const y = Math.floor(i / COLS);
        // Clears from the top left, with a little randomness per block.
        const delay = (x / COLS) * 380 + (y / ROWS) * 260 + hash(x, y, 4) * 260;
        return (
          <div
            key={i}
            className="animate-[pixel-out_260ms_steps(3)_forwards]"
            style={{
              animationDelay: `${delay}ms`,
              background: y < ROWS * 0.45 ? "#1d2750" : "#113520",
            }}
          />
        );
      })}
    </div>
  );
}
