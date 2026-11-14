import { describe, expect, it } from "vitest";
import { autoLineup, parseSquad, readSquad, squadWarnings } from "@/lib/squad";

const named = (text: string) => parseSquad(text).map((p) => p.name);

describe("readSquad, Danish pastes", () => {
  it("reads a club's Facebook post with position groups", () => {
    const post = [
      "Dagens hold mod Kildeby BK 🔴⚪",
      "Kampstart kl. 14.00 på Søndervang Idrætspark",
      "",
      "Mål: Mads Kjærgaard",
      "Forsvar: Jonas Bech, Frederik Holm, Mikkel Dahl og Rasmus Thygesen",
      "Midtbane: Emil Kristensen, Oliver Brandt, Magnus Friis (A)",
      "Angreb: Lucas Østergaard, Mathias Krogh, Anton Vestergaard",
      "",
      "Bænk: Christian Bak, Nikolaj Munk og Victor Skov",
      "Kom og hep på drengene 💪",
    ].join("\n");
    const { players, ignored } = readSquad(post);

    expect(players.map((p) => p.name)).toEqual([
      "Mads Kjærgaard",
      "Jonas Bech",
      "Frederik Holm",
      "Mikkel Dahl",
      "Rasmus Thygesen",
      "Emil Kristensen",
      "Oliver Brandt",
      "Magnus Friis",
      "Lucas Østergaard",
      "Mathias Krogh",
      "Anton Vestergaard",
      "Christian Bak",
      "Nikolaj Munk",
      "Victor Skov",
    ]);
    expect(players.map((p) => p.position)).toEqual([
      "GK",
      ...Array(4).fill("DF"),
      ...Array(3).fill("MF"),
      ...Array(3).fill("FW"),
      "MF",
      "MF",
      "MF",
    ]);
    expect(players.filter((p) => p.captain).map((p) => p.name)).toEqual(["Magnus Friis"]);
    expect(players.slice(0, 11).every((p) => p.section === "starters")).toBe(true);
    expect(players.slice(11).every((p) => p.section === "bench")).toBe(true);
    // The kick-off line and the cheer are chat, not players.
    expect(ignored.map((l) => l.code)).toEqual(
      expect.arrayContaining(["startersHeading", "time", "benchHeading", "message"]),
    );

    const lineup = autoLineup(
      players.map((p, i) => ({ ...p, id: `p${i}` })),
      11,
    );
    expect(lineup.starters[0]).toBe("p0");
    expect(lineup.bench).toEqual(["p11", "p12", "p13"]);
    expect(lineup.captainId).toBe("p7");
  });

  it("reads numbered lists with Danish position codes and headings", () => {
    const paste = [
      "Startopstilling:",
      "1. Mads Kjærgaard MM",
      "2. Jonas Bech FS",
      "4 Mikkel Dahl (FS)",
      "10. Magnus Friis MB (A)",
      "9 Mathias Krogh AN",
      "Udskiftere:",
      "12 Christian Bak (MM)",
      "17 Oscar Juhl",
    ].join("\n");
    const players = parseSquad(paste);
    expect(players.map((p) => [p.number, p.name, p.position, p.section])).toEqual([
      ["1", "Mads Kjærgaard", "GK", "starters"],
      ["2", "Jonas Bech", "DF", "starters"],
      ["4", "Mikkel Dahl", "DF", "starters"],
      ["10", "Magnus Friis", "MF", "starters"],
      ["9", "Mathias Krogh", "FW", "starters"],
      ["12", "Christian Bak", "GK", "bench"],
      ["17", "Oscar Juhl", "MF", "bench"],
    ]);
    expect(players.find((p) => p.captain)?.name).toBe("Magnus Friis");
  });

  it("knows the Danish words for the starters and the bench", () => {
    for (const heading of [
      "Startellever",
      "Start 11",
      "Dagens hold",
      "Holdet",
      "Holdet til lørdag",
      "Holdopstilling",
    ]) {
      const { players } = readSquad(`${heading}\nMads Kjærgaard\nJonas Bech`);
      expect(
        players.map((p) => p.section),
        heading,
      ).toEqual(["starters", "starters"]);
    }
    for (const heading of ["Udskiftere", "Bænk", "Bænken", "På bænken", "Reserver"]) {
      const { players } = readSquad(`Mads Kjærgaard\n${heading}:\nJonas Bech`);
      expect(
        players.map((p) => p.section),
        heading,
      ).toEqual([null, "bench"]);
    }
  });

  it("reads the bench listed on the heading line, with og", () => {
    const players = parseSquad("Udskiftere: Bak, Munk, Lauridsen og Skov");
    expect(players.map((p) => [p.name, p.section])).toEqual([
      ["Bak", "bench"],
      ["Munk", "bench"],
      ["Lauridsen", "bench"],
      ["Skov", "bench"],
    ]);
  });

  it("marks the captain written as anfører, (anf.) or kaptajn", () => {
    expect(parseSquad("Magnus Friis anfører")[0]).toMatchObject({
      name: "Magnus Friis",
      captain: true,
    });
    expect(parseSquad("Magnus Friis (anf.)")[0]).toMatchObject({
      name: "Magnus Friis",
      captain: true,
    });
    expect(parseSquad("Magnus Friis kaptajn")[0].captain).toBe(true);
    // Vice-captains are not captains, and the mark doesn't end up in the name.
    expect(parseSquad("Oliver Brandt (VA)")[0]).toMatchObject({
      name: "Oliver Brandt",
      captain: false,
    });
  });

  it("drops Danish chat from a WhatsApp export", () => {
    const paste = [
      "[12.11.2026, 19.42.13] Træner Lars: Holdet til lørdag",
      "[12.11.2026, 19.42.20] Træner Lars: Mads Kjærgaard",
      "[12.11.2026, 19.42.31] Træner Lars: Jonas Bech",
      "[12.11.2026, 19.43.02] Træner Lars: husk at være der kl 13",
      "[12.11.2026, 19.44.10] Jonas: ses på lørdag",
    ].join("\n");
    expect(named(paste)).toEqual(["Mads Kjærgaard", "Jonas Bech"]);
  });

  it("keeps Danish names whole", () => {
    expect(named("Lucas Østergaard\nÅge Bøgh-Nielsen\nIb Dam")).toEqual([
      "Lucas Østergaard",
      "Åge Bøgh-Nielsen",
      "Ib Dam",
    ]);
  });
});

describe("readSquad, English pastes still read the same", () => {
  it("reads headings, captains and positions", () => {
    const players = parseSquad(
      [
        "Starting XI",
        "1 Tom Hadley GK",
        "10 Callum Price (c)",
        "Subs: Talbot, Brennan and Fenn",
      ].join("\n"),
    );
    expect(players.map((p) => [p.name, p.position, p.section, p.captain])).toEqual([
      ["Tom Hadley", "GK", "starters", false],
      ["Callum Price", "MF", "starters", true],
      ["Talbot", "MF", "bench", false],
      ["Brennan", "MF", "bench", false],
      ["Fenn", "MF", "bench", false],
    ]);
  });

  it("reads English position groups", () => {
    const players = parseSquad("Defence: Okafor, Carr, Desai\nAttack: Lund");
    expect(players.map((p) => [p.name, p.position])).toEqual([
      ["Okafor", "DF"],
      ["Carr", "DF"],
      ["Desai", "DF"],
      ["Lund", "FW"],
    ]);
  });
});

describe("squadWarnings", () => {
  it("gives a code with each warning for translating", () => {
    const warnings = squadWarnings([
      { name: "Mads Kjærgaard", number: "1" },
      { name: "Mads Kjærgaard", number: "2" },
      { name: "Jonas Bech", number: "1" },
    ]);
    expect(warnings).toEqual([
      expect.objectContaining({ index: 1, code: "sameName", other: 1 }),
      expect.objectContaining({ index: 2, code: "sameNumber", number: "1" }),
    ]);
  });
});
