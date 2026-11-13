"use client";

import clsx from "clsx";
import { memo } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { FORMATS } from "@/components/graphics/theme";
import { KINDS } from "@/lib/kinds";
import { withSamples } from "@/lib/sample";
import { PANEL_FOR } from "@/lib/issues";
import { useActiveTeam, useStudio, useUi } from "@/lib/store";
import type { Design, GraphicKind, Team } from "@/lib/types";

const THUMB_H = 92;

/** A live, tiny render of one graphic with the current club and style. */
const Thumb = memo(function Thumb({
  team,
  design,
  kind,
}: {
  team: Team;
  design: Design;
  kind: GraphicKind;
}) {
  // Square thumbnails keep the rail calm whichever size is being exported.
  const f = FORMATS.square;
  const scale = THUMB_H / f.h;
  const d: Design = { ...design, kind, format: "square" };
  // Empty graphics show sample content here too, so every template reads at a glance.
  const shown = withSamples(team, d).team;
  return (
    <div className="relative overflow-hidden" style={{ width: f.w * scale, height: THUMB_H }}>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ transform: `scale(${scale})`, width: f.w, height: f.h }}
      >
        <Graphic team={shown} design={d} />
      </div>
    </div>
  );
});

export function TemplateRail() {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const updateDesign = useStudio((s) => s.updateDesign);

  return (
    <nav
      aria-label="Graphics"
      className="-mx-4 scrollbar-none overflow-x-auto px-4 py-2 lg:-mx-2 lg:px-2 xl:mx-0 xl:overflow-visible xl:px-0 xl:py-0"
    >
      <ul className="flex w-max gap-3 lg:gap-4 xl:w-[100px] xl:flex-col xl:gap-4">
        {KINDS.map((k) => {
          const active = design.kind === k.id;
          return (
            <li key={k.id}>
              <button
                type="button"
                aria-pressed={active}
                title={k.hint}
                onClick={() => {
                  updateDesign({ kind: k.id });
                  // Open the tab that feeds this graphic, unless styles are being compared.
                  if (useUi.getState().panel !== "design")
                    useUi.getState().setPanel(PANEL_FOR[k.id]);
                }}
                className="group flex flex-col items-start gap-2 rounded-[3px] text-left"
              >
                <span
                  className={clsx(
                    "block overflow-hidden rounded-[3px] border-2 transition-[box-shadow,opacity,translate] duration-150",
                    active
                      ? "-translate-y-0.5 border-card shadow-[4px_4px_0_var(--card-ink)]"
                      : "border-card-ink shadow-[2px_2px_0_var(--card-ink)] group-hover:-translate-y-0.5 group-hover:shadow-[3px_3px_0_var(--card-ink)] group-active:translate-x-0.5 group-active:translate-y-0.5",
                  )}
                >
                  <Thumb team={team} design={design} kind={k.id} />
                </span>
                <span
                  className={clsx(
                    "font-signage text-[17px] leading-none whitespace-nowrap transition-colors xl:whitespace-normal",
                    active ? "text-card" : "text-chalk/80 group-hover:text-chalk",
                  )}
                >
                  {k.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
