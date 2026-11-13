#!/usr/bin/env node
/**
 * Renders every graphic × style × size × worst-case club and fails on layout faults:
 * text past the canvas, clipped, covered, colliding or too small.
 *
 *   pnpm dev                       # in another terminal
 *   pnpm check:graphics            # everything
 *   pnpm check:graphics --look sash --kind lineup --case long --shots .check/shots
 *
 * Options: --base <url> (default http://localhost:3000), --case, --look, --kind,
 * --format (comma lists), --shots <dir> (screenshots of failing graphics, faults
 * outlined), --json <file>, --rules out,clipped,spill,covered,overlap,small,orphan,uneven,empty (which fail).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split(/\s*--/)
    .filter(Boolean)
    .map((a) => {
      const [k, ...v] = a.split(/\s+/);
      return [k, v.join(" ") || true];
    }),
);
const base = args.base ?? process.env.CHECK_BASE ?? "http://localhost:3000";
const failRules = new Set(
  String(args.rules ?? "out,clipped,spill,covered,overlap,small,orphan,uneven,empty").split(","),
);
const LOOKS = ["block", "stripes", "hoops", "halves", "sash", "night", "clean", "pixel", "stadium"];
const CASES = ["example", "long", "dark", "sparse"];
const looks = args.look ? String(args.look).split(",") : LOOKS;
const cases = args.case ? String(args.case).split(",") : CASES;

const executablePath =
  process.env.CHROME_PATH ??
  [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const results = [];
for (const c of cases) {
  for (const look of looks) {
    const hash = new URLSearchParams({ case: c, look, scale: "0.35" });
    if (args.kind) hash.set("kind", String(args.kind));
    if (args.format) hash.set("format", String(args.format));
    await page.goto(`${base}/dev/graphics#${hash}`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__checkReady === true, null, { timeout: 60000 });
    const batch = await page.evaluate(() => window.__checkGraphics());
    for (const r of batch) {
      const failing = r.problems.filter((p) => failRules.has(p.rule));
      results.push({ ...r, failing });
      if (failing.length && args.shots) {
        mkdirSync(String(args.shots), { recursive: true });
        const el = page.locator(`[data-check-id="${r.id}"]`);
        await page.evaluate(
          ({ id, boxes }) => {
            const host = document.querySelector(`[data-check-id="${id}"]`);
            host.querySelectorAll("[data-check-mark]").forEach((n) => n.remove());
            for (const b of boxes) {
              const m = document.createElement("div");
              m.dataset.checkMark = "";
              Object.assign(m.style, {
                position: "absolute",
                left: b.x + "px",
                top: b.y + "px",
                width: b.w + "px",
                height: b.h + "px",
                outline: "6px solid #ff2a6d",
                background: "rgba(255,42,109,.18)",
                zIndex: 9999,
                pointerEvents: "none",
              });
              host.appendChild(m);
            }
          },
          { id: r.id, boxes: failing.map((p) => p.box) },
        );
        await el
          .locator("..")
          .screenshot({ path: join(String(args.shots), r.id.replaceAll("/", "-") + ".png") });
      }
    }
  }
}
await browser.close();

const failed = results.filter((r) => r.failing.length);
const byRule = {};
for (const r of failed) for (const p of r.failing) byRule[p.rule] = (byRule[p.rule] ?? 0) + 1;
if (args.json) writeFileSync(String(args.json), JSON.stringify(results, null, 2));

for (const r of failed) {
  console.log(`✗ ${r.id}`);
  for (const p of r.failing)
    console.log(`    ${p.rule.padEnd(8)} ${JSON.stringify(p.text)}  ${p.detail}`);
}
console.log(
  `\n${results.length} graphics checked, ${failed.length} with faults` +
    (failed.length
      ? `  (${Object.entries(byRule)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")})`
      : ""),
);
if (errors.length) console.log(`\nPage errors:\n${errors.join("\n")}`);
process.exit(failed.length || errors.length ? 1 : 0);
