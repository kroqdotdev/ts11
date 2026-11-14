import { describe, expect, it } from "vitest";
import { eachTextPixel, textWidth, toBoardText } from "../../src/lib/lofi/font";

/** The lit pixels of one character, as a string of rows. */
function drawn(ch: string): string {
  const rows = Array.from({ length: 7 }, () => Array(5).fill("0"));
  eachTextPixel(ch, 0, 0, 1, (x, y) => (rows[y][x] = "1"));
  return rows.map((r) => r.join("")).join(" ");
}
const QUESTION = drawn("?");

describe("pixel font", () => {
  it("keeps the letters of Nordic, German and other European club names", () => {
    expect(toBoardText("Torslunde-Ishøj Idrætsforening")).toBe("TORSLUNDE-ISHØJ IDRÆTSFORENING");
    expect(toBoardText("Malmö FF")).toBe("MALMÖ FF");
    expect(toBoardText("Vålerenga")).toBe("VÅLERENGA");
    expect(toBoardText("Fortuna Düsseldorf")).toBe("FORTUNA DÜSSELDORF");
    expect(toBoardText("Großaspach")).toBe("GROSSASPACH");
    expect(toBoardText("Atlético Peñarol")).toBe("ATLÉTICO PEÑAROL");
    expect(toBoardText("Śląsk Wrocław")).toBe("ŚLĄSK WROCŁAW");
    expect(toBoardText("Baník Ostrava ⚽")).toBe("BANÍK OSTRAVA");
  });

  it("draws every accented capital it keeps, never as a question mark", () => {
    const letters = "ÆØÅÄÖÜÉÈÊËÁÀÂÃÍÌÎÏÓÒÔÕÚÙÛÝŸÑÇŞŢĄĘŁŚŹŻĆŃČŠŽŘĚŇĎŤŮŐŰĞİŒÐÞ";
    const bad = [...letters].filter((ch) => drawn(ch) === QUESTION || drawn(ch) === drawn(" "));
    expect(bad).toEqual([]);
  });

  it("tells an accented letter from the plain one", () => {
    for (const [plain, marked] of [
      ["A", "Ä"],
      ["O", "Ø"],
      ["E", "É"],
      ["N", "Ñ"],
      ["C", "Ç"],
      ["S", "Š"],
    ])
      expect(drawn(marked)).not.toBe(drawn(plain));
  });

  it("measures text the way it draws it, also when ß becomes SS", () => {
    expect(textWidth("ß")).toBe(textWidth("SS"));
    let right = 0;
    eachTextPixel("straße", 0, 0, 1, (x) => (right = Math.max(right, x)));
    expect(right).toBeLessThan(textWidth("straße"));
  });

  it("draws raw text without question marks for letters it knows", () => {
    expect(drawn("ø")).toBe(drawn("Ø"));
    expect(drawn("é")).toBe(drawn("É"));
  });
});
