"use client";

import { useEffect, useState } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { FORMATS, LOOKS } from "@/components/graphics/theme";
import { KINDS } from "@/lib/kinds";
import type { FormatId, GraphicKind, LookId } from "@/lib/types";
import { checkCases, checkDesign } from "./checkCases";
import { measureGraphic, type Problem } from "./measure";

declare global {
  interface Window {
    __checkReady?: boolean;
    __checkGraphics?: () => { id: string; problems: Problem[] }[];
  }
}

interface Filter {
  cases: string[] | null;
  looks: LookId[] | null;
  kinds: GraphicKind[] | null;
  formats: FormatId[] | null;
  scale: number;
}

function readFilter(): Filter {
  const q = new URLSearchParams(window.location.hash.slice(1));
  const list = <T extends string>(key: string) =>
    q.get(key) ? (q.get(key)!.split(",") as T[]) : null;
  return {
    cases: list("case"),
    looks: list<LookId>("look"),
    kinds: list<GraphicKind>("kind"),
    formats: list<FormatId>("format"),
    scale: Number(q.get("scale") ?? 0.4),
  };
}

/**
 * Renders every graphic × look × format × worst-case club at native size (scaled
 * down for the screen) and exposes `window.__checkGraphics()` for the checker.
 * Filter with the hash, e.g. `#case=long&look=sash&kind=lineup&format=square`.
 */
export function GraphicCheck() {
  const [filter, setFilter] = useState<Filter | null>(null);

  useEffect(() => {
    const read = () => setFilter(readFilter());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    if (!filter) return;
    window.__checkReady = false;
    window.__checkGraphics = () =>
      [...document.querySelectorAll<HTMLElement>("[data-check-id]")].map((el) => {
        // Hit-testing (the "covered" rule) only sees what is on screen.
        el.scrollIntoView({ block: "center", inline: "center" });
        return { id: el.dataset.checkId!, problems: measureGraphic(el, Number(el.dataset.w)) };
      });
    let live = true;
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        if (live) window.__checkReady = true;
      });
    });
    return () => {
      live = false;
    };
  }, [filter]);

  if (!filter) return null;
  const cases = checkCases().filter((c) => !filter.cases || filter.cases.includes(c.id));
  const looks = (Object.keys(LOOKS) as LookId[]).filter(
    (l) => !filter.looks || filter.looks.includes(l),
  );
  const kinds = KINDS.map((k) => k.id).filter((k) => !filter.kinds || filter.kinds.includes(k));
  const formats = (Object.keys(FORMATS) as FormatId[]).filter(
    (f) => !filter.formats || filter.formats.includes(f),
  );

  return (
    <main
      style={{ background: "#2a2f3a", padding: 16, display: "flex", flexWrap: "wrap", gap: 16 }}
    >
      {cases.flatMap((c) =>
        looks.flatMap((look) =>
          kinds.flatMap((kind) =>
            formats.map((format) => {
              const { w, h } = FORMATS[format];
              const id = `${c.id}/${look}/${kind}/${format}`;
              return (
                <figure key={id} style={{ margin: 0, color: "#cbd2dc", font: "12px monospace" }}>
                  <figcaption style={{ marginBottom: 4 }}>{id}</figcaption>
                  <div
                    style={{
                      width: w * filter.scale,
                      height: h * filter.scale,
                      position: "relative",
                    }}
                  >
                    <div
                      data-check-id={id}
                      data-w={w}
                      style={{
                        width: w,
                        height: h,
                        transform: `scale(${filter.scale})`,
                        transformOrigin: "0 0",
                        position: "absolute",
                      }}
                    >
                      <Graphic team={c.team} design={checkDesign(c, { kind, look, format })} />
                    </div>
                  </div>
                </figure>
              );
            }),
          ),
        ),
      )}
    </main>
  );
}
