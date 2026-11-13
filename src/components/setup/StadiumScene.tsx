"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LofiStadium, type StadiumProps } from "@/components/lofi/LofiStadium";
import { bigScreenRect } from "@/lib/lofi/stadium";
import { useFocusTrap } from "./useFocusTrap";

const ZOOM = 1.45;

/** Mirrors LofiStadium's resolution choice so the camera maths lines up. */
function logicalSize(cssW: number, cssH: number) {
  const px = cssW < 640 ? 2 : 4;
  return { w: Math.max(40, Math.ceil(cssW / px)), h: Math.max(30, Math.ceil(cssH / px)) };
}

/**
 * The stadium as a stage. In "setup" on wide screens, the camera zooms in and
 * pans right, the scoreboard grows into a big screen, and `screen` is laid
 * exactly over it. On phones the questions sit underneath instead.
 */
export function StadiumScene({
  stadium,
  setup,
  instant = false,
  screen,
  narrowScreen,
  header,
  children,
  className,
  onArrive,
  onEscape,
  tifoFrame,
}: {
  stadium: Omit<StadiumProps, "className" | "bigScreen" | "tifoX">;
  setup: boolean;
  /** Skip the camera move (arriving straight on the setup). */
  instant?: boolean;
  screen: ReactNode;
  narrowScreen: ReactNode;
  header: ReactNode;
  /** Shown while not in setup: the hero panels on the landing page. */
  children?: ReactNode;
  className?: string;
  onArrive?: () => void;
  /** Escape while in setup: leave it. */
  onEscape?: () => void;
  /** Where the crowd mosaic goes on wide screens outside the setup (e.g. between hero panels). */
  tifoFrame?: { x: number; width: number };
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [arrived, setArrived] = useState(setup && instant);

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wide = size.w >= 1024;
  const zoomed = setup && wide;
  // Phones: while a setup field has focus the stadium shrinks to a strip pinned to the
  // top, so the crowd spelling the name stays in view above the keyboard.
  const [typing, setTyping] = useState(false);
  const strip = setup && !wide && typing;

  // The setup is modal: keep the keyboard on it, and let Escape back out.
  useFocusTrap(sectionRef, setup, { onEscape, fallback: "[data-setup-start]" });

  // Camera: zoom in and slide the big screen over to the left third.
  let camera = { x: 0, y: 0, scale: 1 };
  let rect = { left: 0, top: 0, width: 0, height: 0 };
  if (size.w > 0) {
    const { w, h } = logicalSize(size.w, size.h);
    const big = bigScreenRect(w, h);
    const fx = big.x / w;
    const fy = big.y / h;
    const fw = big.w / w;
    const fh = big.h / h;
    const tx = Math.max(size.w * (1 - ZOOM), size.w * 0.35 - (fx + fw / 2) * size.w * ZOOM);
    const ty = size.h * 0.05;
    const inset = 3 * (size.w / w) * ZOOM;
    if (zoomed) camera = { x: tx, y: ty, scale: ZOOM };
    rect = {
      left: tx + fx * size.w * ZOOM + inset,
      top: ty + fy * size.h * ZOOM + inset,
      width: fw * size.w * ZOOM - inset * 2,
      height: fh * size.h * ZOOM - inset * 2,
    };
  }

  // While zoomed, the crowd's mosaic fills the stand still in shot right of the screen
  // (about 0.67 to 0.95 of the width once the camera has moved).
  const tifoAt = zoomed
    ? { x: 0.81, width: 0.26 }
    : wide && tifoFrame
      ? tifoFrame
      : { x: 0.5, width: undefined };

  // While zoomed, players line up near the far touchline so they stay in shot.
  const formation = zoomed
    ? stadium.formation.map((p) => ({
        ...p,
        x: 0.35 + ((p.x - 0.46) / 0.46) * 0.59,
        y: 0.03 + p.y * 0.17,
      }))
    : stadium.formation;

  return (
    <section
      ref={sectionRef}
      // clip, not hidden: hidden would stop the phone's stadium strip from sticking.
      className={clsx("relative flex flex-col overflow-clip bg-[#1d2750]", className)}
    >
      {/* First in the DOM so the logo and its buttons come before the form in tab order. */}
      {header}

      <div
        ref={viewport}
        className={clsx(
          "relative mt-16 shrink-0 overflow-hidden transition-[height] duration-300 lg:absolute lg:inset-0 lg:mt-0 lg:h-auto",
          strip
            ? "sticky top-0 z-20 h-[24dvh] border-b-2 border-[#2a323e]"
            : setup
              ? "h-[40dvh]"
              : "h-[48dvh] min-h-[320px]",
        )}
      >
        <motion.div
          // As a strip the scene keeps its full height and the strip shows its top: the
          // sky, the scoreboard and the stand where the crowd spells the name.
          className={clsx(
            "absolute inset-x-0 top-0 origin-top-left",
            strip ? "h-[40dvh]" : "h-full",
          )}
          initial={false}
          animate={camera}
          // Lands just as the scoreboard finishes growing into the big screen (850ms).
          transition={
            instant || reduce ? { duration: 0 } : { duration: 0.9, ease: [0.65, 0, 0.3, 1] }
          }
          onAnimationComplete={() => {
            if (zoomed) {
              setArrived(true);
              onArrive?.();
            }
          }}
        >
          <LofiStadium
            className="absolute inset-0 size-full"
            {...stadium}
            formation={formation}
            bigScreen={zoomed}
            tifoX={tifoAt.x}
            tifo={stadium.tifo && { ...stadium.tifo, width: tifoAt.width }}
          />
        </motion.div>

        <AnimatePresence>
          {zoomed && (arrived || instant) && (
            <motion.div
              key="screen"
              initial={instant || reduce ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-10 flex"
              style={rect}
            >
              {screen}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!setup && children && (
          <motion.div
            key="hero"
            initial={false}
            exit={reduce ? undefined : { opacity: 0, y: 24, transition: { duration: 0.3 } }}
            className="pointer-events-none relative z-10 flex flex-1 flex-col"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {setup && !wide && (
        // On phones the big screen hangs below the ground on two struts, in its
        // housing, rather than being laid over it.
        <div
          className="relative z-10 -mt-3 flex-1 px-3 pb-6"
          onFocus={(e) => setTyping(e.target.matches("input, textarea"))}
          onBlur={() => setTyping(false)}
        >
          <div aria-hidden className="absolute top-0 left-[22%] h-6 w-2 bg-[#2a323e]" />
          <div aria-hidden className="absolute top-0 right-[22%] h-6 w-2 bg-[#2a323e]" />
          <div className="relative mt-5 rounded-[4px] border-[6px] border-[#2a323e] bg-[#2a323e] shadow-[0_6px_0_rgb(0_0_0/0.4)]">
            <div aria-hidden className="flex justify-between px-1 pb-1">
              {[0, 1].map((i) => (
                <span key={i} className="flex gap-1">
                  <span className="size-1.5 bg-[#4a5566]" />
                  <span className="size-1.5 bg-[#4a5566]" />
                </span>
              ))}
            </div>
            {narrowScreen}
          </div>
        </div>
      )}
    </section>
  );
}
