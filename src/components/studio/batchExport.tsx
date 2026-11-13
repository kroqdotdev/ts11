"use client";

import { strToU8, zipSync } from "fflate";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Graphic } from "@/components/graphics/Graphic";
import { FORMATS } from "@/components/graphics/theme";
import { graphicFilename, matchSlug, renderNodePng } from "@/lib/export";
import { graphicIssues } from "@/lib/issues";
import { KIND_LABEL, KINDS } from "@/lib/kinds";
import type { Design, FormatId, GraphicKind, Team } from "@/lib/types";

export interface BatchResult {
  zip: Blob;
  filename: string;
  count: number;
  /** Graphics left out because they are still missing details. */
  skipped: GraphicKind[];
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** The graphics that are ready, and the ones left out because they still miss details. */
function plan(team: Team, design: Design, formats: FormatId[]) {
  const ready = KINDS.map((k) => k.id).filter(
    (kind) => graphicIssues(team, { ...design, kind }).length === 0,
  );
  const skipped = KINDS.map((k) => k.id).filter((kind) => !ready.includes(kind));
  const jobs = formats.flatMap((format) => ready.map((kind) => ({ kind, format })));
  return { jobs, skipped };
}

/**
 * Renders every finished graphic for the given sizes off screen, one at a time.
 * Graphics that are still missing details are skipped, never filled with sample content.
 */
export async function renderAll(
  team: Team,
  design: Design,
  formats: FormatId[],
  onProgress: (done: number, total: number) => void,
): Promise<{ files: { name: string; blob: Blob }[]; skipped: GraphicKind[] }> {
  const { jobs, skipped } = plan(team, design, formats);
  if (jobs.length === 0) return { files: [], skipped };

  // An unseen stage in the page, so the graphic gets the page's fonts and styles.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "0",
    height: "0",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  const files: { name: string; blob: Blob }[] = [];
  try {
    for (let i = 0; i < jobs.length; i++) {
      const { kind, format } = jobs[i];
      onProgress(i, jobs.length);
      const d: Design = { ...design, kind, format };
      const { w, h } = FORMATS[format];
      flushSync(() =>
        root.render(
          <div style={{ width: w, height: h }}>
            <Graphic team={team} design={d} />
          </div>,
        ),
      );
      await nextFrame();
      const node = host.firstElementChild?.firstElementChild;
      if (!(node instanceof HTMLElement)) throw new Error("The graphic could not be drawn.");
      const blob = await renderNodePng(node, design.font);
      const name =
        formats.length > 1 ? `${format}/${graphicFilename(team, d)}` : graphicFilename(team, d);
      files.push({ name, blob });
    }
    onProgress(jobs.length, jobs.length);
  } finally {
    root.unmount();
    host.remove();
  }
  return { files, skipped };
}

/** Every finished graphic for the given sizes, zipped. */
export async function exportAll(
  team: Team,
  design: Design,
  formats: FormatId[],
  onProgress: (done: number, total: number) => void,
): Promise<BatchResult> {
  const { files: pngs, skipped } = await renderAll(team, design, formats, onProgress);
  if (pngs.length === 0) return { zip: new Blob(), filename: "", count: 0, skipped };
  const files: Record<string, Uint8Array> = {};
  for (const f of pngs) files[f.name] = new Uint8Array(await f.blob.arrayBuffer());

  if (skipped.length > 0) {
    files["not-included.txt"] = strToU8(
      `Left out because they are still missing details:\n${skipped
        .map(
          (k) =>
            `- ${KIND_LABEL[k]}: ${graphicIssues(team, { ...design, kind: k })
              .map((i) => i.message)
              .join(", ")}`,
        )
        .join("\n")}\n`,
    );
  }
  // PNGs are already compressed, so store them as they are.
  const zipped = zipSync(files, { level: 0 });
  const size = formats.length > 1 ? "all-sizes" : formats[0];
  return {
    zip: new Blob([zipped as BlobPart], { type: "application/zip" }),
    filename: `${matchSlug(team)}-graphics-${size}.zip`,
    count: pngs.length,
    skipped,
  };
}
