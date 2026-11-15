import { describe, expect, it } from "vitest";
import { paletteOf } from "@/lib/crest";

/** Pixels from runs of [r, g, b, a, count]. */
function pixels(...runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [r, g, b, a, n] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
}

describe("paletteOf", () => {
  it("ranks a crest's colours by how much of it they cover", () => {
    const d = pixels([27, 69, 168, 255, 600], [244, 244, 241, 255, 300], [200, 30, 40, 255, 100]);
    expect(paletteOf(d)).toEqual(["#1b45a8", "#f4f4f1", "#c81e28"]);
  });

  it("skips see-through pixels and the solid background round the crest", () => {
    const d = pixels([255, 255, 255, 255, 5000], [0, 0, 0, 0, 5000], [23, 85, 58, 255, 400]);
    expect(paletteOf(d, { background: "#ffffff" })).toEqual(["#17553a"]);
  });

  it("folds shades of one colour and anti-aliased edges into it", () => {
    const d = pixels(
      [27, 69, 168, 255, 500],
      [35, 75, 175, 255, 300],
      [120, 140, 190, 255, 5],
      [244, 244, 241, 255, 200],
    );
    const colours = paletteOf(d);
    expect(colours).toHaveLength(2);
    expect(colours[1]).toBe("#f4f4f1");
  });

  it("gives nothing for an empty or fully see-through image", () => {
    expect(paletteOf(new Uint8ClampedArray())).toEqual([]);
    expect(paletteOf(pixels([10, 10, 10, 0, 50]))).toEqual([]);
  });
});
