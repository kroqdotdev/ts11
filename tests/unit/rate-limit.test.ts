import { beforeEach, describe, expect, it } from "vitest";
import { allow, resetRateLimits } from "@/server/rate-limit";

describe("allow", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit inside the window, then refuses", () => {
    for (let i = 0; i < 3; i++) expect(allow("k", 3, 1000, 100 + i)).toBe(true);
    expect(allow("k", 3, 1000, 200)).toBe(false);
  });

  it("frees up once old hits leave the window", () => {
    for (let i = 0; i < 3; i++) allow("k", 3, 1000, i);
    expect(allow("k", 3, 1000, 1500)).toBe(true);
  });

  it("counts keys separately", () => {
    expect(allow("a", 1, 1000, 0)).toBe(true);
    expect(allow("b", 1, 1000, 0)).toBe(true);
    expect(allow("a", 1, 1000, 1)).toBe(false);
  });
});
