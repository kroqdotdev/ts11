"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The horizontal match reel, with buttons so mouse users can move through it
 * (touch and trackpads can still swipe). The buttons dim at either end.
 */
export function Reel({ children, className }: { children: ReactNode; className?: string }) {
  const list = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setEdges({
          start: el.scrollLeft < 8,
          end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8,
        }),
      );
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = (card?.getBoundingClientRect().width ?? 300) + 28;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  const button =
    "grid size-11 place-items-center rounded-[4px] border-2 border-card-ink bg-paper text-ink shadow-[3px_3px_0_var(--card-ink)] lofi-press disabled:opacity-40 disabled:shadow-none";

  return (
    <div className="relative">
      <div className="mx-auto mb-6 flex w-full max-w-[1280px] justify-end gap-2 px-4 md:px-8">
        <button
          type="button"
          className={button}
          onClick={() => move(-1)}
          disabled={edges.start}
          aria-label="Earlier graphics"
        >
          <CaretLeftIcon size={18} weight="bold" />
        </button>
        <button
          type="button"
          className={button}
          onClick={() => move(1)}
          disabled={edges.end}
          aria-label="Later graphics"
        >
          <CaretRightIcon size={18} weight="bold" />
        </button>
      </div>
      <ol ref={list} className={className}>
        {children}
      </ol>
    </div>
  );
}
