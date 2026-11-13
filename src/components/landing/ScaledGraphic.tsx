"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fits a native-size graphic (rendered on the server as `children`) into
 * whatever width its container gives it, keeping the aspect ratio.
 */
export function ScaledGraphic({
  w,
  h,
  children,
  className,
}: {
  w: number;
  h: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", aspectRatio: `${w} / ${h}`, overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          transformOrigin: "0 0",
          transform: `scale(${scale})`,
          opacity: scale ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
