import { describe, expect, it } from "vitest";
import { blankTeam, defaultDesign, demoTeam, sampleTeams } from "@/lib/demo";
import { displayName, formatMatchDate, initials, matchDateParts } from "@/lib/format";
import {
  effectiveHeadline,
  graphicText,
  subsHeadline,
  textFor,
  withHeadlines,
} from "@/lib/graphicText";
import { withSamples } from "@/lib/sample";
import { scorerLabel } from "@/lib/score";
import type { GraphicKind } from "@/lib/types";

const KINDS: GraphicKind[] = [
  "fixture",
  "lineup",
  "pitch",
  "goal",
  "halftime",
  "subs",
  "result",
  "motm",
  "fixtures",
];

describe("graphicText", () => {
  it("has every word in both languages", () => {
    const shape = (v: unknown): unknown =>
      typeof v === "object" && v
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]))
        : typeof v;
    expect(shape(graphicText("da"))).toEqual(shape(graphicText("en")));
    for (const [key, value] of Object.entries(graphicText("da"))) {
      if (typeof value === "string") expect(value.trim(), key).not.toBe("");
    }
  });

  it("follows the club's language, English for old saves", () => {
    expect(textFor({ language: "da" }).headlines.lineup).toBe("Startopstilling");
    expect(textFor({}).headlines.lineup).toBe("Starting XI");
    expect(textFor({ language: "da" }).quote("Godt spillet")).toBe("»Godt spillet«");
  });
});

describe("headlines", () => {
  it("prints a default headline in the club's language, whichever language it was saved in", () => {
    const english = defaultDesign("en");
    const danish = defaultDesign("da");
    for (const kind of KINDS) {
      expect(effectiveHeadline(english, kind, "da")).toBe(graphicText("da").headlines[kind]);
      expect(effectiveHeadline(danish, kind, "en")).toBe(graphicText("en").headlines[kind]);
    }
  });

  it("prints a typed headline as typed", () => {
    const design = {
      ...defaultDesign(),
      headlines: { ...defaultDesign().headlines, goal: "GOOOAL" },
    };
    expect(effectiveHeadline(design, "goal", "da")).toBe("GOOOAL");
    expect(withHeadlines(design, { language: "da" }).headlines).toMatchObject({
      goal: "GOOOAL",
      lineup: "Startopstilling",
    });
  });

  it("uses the singular for one substitution, only on the default headline", () => {
    const da = { language: "da" as const };
    const design = withHeadlines(defaultDesign(), da);
    expect(subsHeadline(design, da, 1)).toBe("Udskiftning");
    expect(subsHeadline(design, da, 2)).toBe("Udskiftninger");
    expect(subsHeadline(withHeadlines(defaultDesign(), {}), {}, 1)).toBe("Substitution");
    const typed = { ...design, headlines: { ...design.headlines, subs: "Ind og ud" } };
    expect(subsHeadline(typed, da, 1)).toBe("Ind og ud");
  });
});

describe("dates on graphics", () => {
  it("formats dates in English and Danish", () => {
    expect(formatMatchDate("2026-11-21")).toBe("Sat 21 Nov");
    expect(formatMatchDate("2026-11-21", "da")).toBe("Lør 21. nov");
    expect(formatMatchDate("2026-12-01", "da")).toBe("Tirs 1. dec");
    expect(matchDateParts("2026-11-21", "da")).toEqual({
      weekday: "Lør",
      day: "21.",
      month: "nov",
    });
  });

  it("prints anything that isn't a date as typed", () => {
    expect(formatMatchDate("TBC", "da")).toBe("TBC");
    expect(matchDateParts("")).toBeNull();
  });
});

describe("the Danish example club", () => {
  const en = demoTeam("ex", "2026-11-21", "en");
  const da = demoTeam("ex", "2026-11-21", "da");

  it("tells the same story with the same ids", () => {
    expect(da.language).toBe("da");
    expect(da.players.map((p) => [p.id, p.number, p.position])).toEqual(
      en.players.map((p) => [p.id, p.number, p.position]),
    );
    expect(da.lineup).toEqual(en.lineup);
    const story = (t: typeof en) => ({
      goals: t.match.goals.map((g) => [g.id, g.side, g.playerId ?? null, g.minute]),
      subs: t.match.subs,
      motm: t.match.motmId,
      fixtures: t.fixtures.map((f) => [f.id, f.isHome, f.date]),
      isHome: t.match.isHome,
      score: [t.match.ourScore, t.match.theirScore, t.match.htOurScore, t.match.htTheirScore],
    });
    expect(story(da)).toEqual(story(en));
  });

  it("is a Danish club", () => {
    expect(da.name).toBe("Søndervang IF");
    expect(da.match.competition).toBe("Serie 1");
    expect(da.match.kickoff).toBe("15.00");
    expect(da.fixtures.every((f) => /^\d{2}\.\d{2}$/.test(f.kickoff))).toBe(true);
    expect(scorerLabel(da, da.match.goals[0], "surname")).toBe("Friis");
    expect(defaultDesign("da").footer).toBe("#ViErSIF");
    expect(blankTeam("x", "da")).toMatchObject({ name: "Nyt hold", language: "da" });
  });

  it("gives the landing page's other clubs in Danish", () => {
    const teams = sampleTeams("da");
    expect(teams.map((t) => t.id)).toEqual(sampleTeams("en").map((t) => t.id));
    expect(teams.every((t) => t.language === "da")).toBe(true);
  });

  it("fills studio samples in the club's language", () => {
    const blank = blankTeam("x", "da");
    const { team } = withSamples(blank, { ...defaultDesign("da"), kind: "motm" });
    expect(team.match.motmNote).toMatch(/[æøå]|mål|bagtil|kampen|eftermiddagen/i);
    const { team: fixtures } = withSamples(blank, { ...defaultDesign("da"), kind: "fixture" });
    expect(fixtures.match.opponent).toBe("Kildeby BK");
  });

  it("prints a blank name as Uden navn", () => {
    expect(displayName({ id: "p", name: " ", number: "4", position: "DF" }, "full", "da")).toBe(
      "Uden navn",
    );
  });
});

describe("initials", () => {
  it("keeps a Danish club's abbreviation whole", () => {
    expect(initials("Søndervang IF")).toBe("SIF");
    expect(initials("Kildeby BK")).toBe("KBK");
    expect(initials("Boldklubben af 1893")).toBe("B1");
    expect(initials("Ashby Vale")).toBe("AV");
    expect(initials("Harlow Fields FC")).toBe("HF");
    // Not when it would not fit (players get two letters).
    expect(initials("Ali AK", 2)).toBe("AA");
  });
});
