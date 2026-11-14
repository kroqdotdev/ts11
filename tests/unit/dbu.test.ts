import { readFileSync } from "node:fs";
import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  findPlayerByName,
  matchFromFixture,
  mergeFixtures,
  nextFixture,
  planFromDbuMatch,
  toFixtures,
  type DbuImport,
  type DbuMatchPage,
} from "@/lib/dbu";
import { blankTeam, defaultMatch } from "@/lib/demo";
import { useStudio } from "@/lib/store";
import type { Fixture } from "@/lib/types";
import {
  competitionLabel,
  DbuUnavailable,
  getClub,
  getImport,
  searchClubs,
  setDbuFetch,
} from "@/server/dbu/client";
import { kitColors, namedColors } from "@/server/dbu/kit";
import {
  crestPathOf,
  DbuNotFound,
  DbuPageError,
  minuteOf,
  parseClubInfo,
  parseClubSearch,
  parseFixtures,
  parseMatchPage,
  parseTeamList,
} from "@/server/dbu/parse";

// Pages saved from dbu.dk for Torslunde-Ishøj IF (club 1274) on 14 Nov 2026, trimmed to
// the parts the parsers read, with the club's contact details removed.
const page = (name: string) => readFileSync(`tests/unit/fixtures/dbu/${name}.html`, "utf8");

describe("dbu.dk parsers", () => {
  it("reads club search results", () => {
    expect(parseClubSearch(page("klubsoeg"))).toEqual([{ id: "1274", name: "Torslunde-Ishøj IF" }]);
  });

  it("reads the club name and home kit", () => {
    expect(parseClubInfo(page("klubinfo"))).toEqual({
      name: "Torslunde-Ishøj IF",
      homeKit: { shirt: "Mørkeblå", shorts: "Mørkeblå" },
    });
  });

  it("rejects a page without club info", () => {
    expect(() => parseClubInfo("<html><body>Ingen klub</body></html>")).toThrow(DbuPageError);
  });

  it("lists teams with their age group and competition, skipping teams without a pool", () => {
    const teams = parseTeamList(page("holdoversigt"));
    expect(teams[0]).toEqual({
      teamId: "218563",
      poolId: "502551",
      group: "Senior",
      competition: "Serie 2 - Efterår",
      pool: "Pulje 3",
    });
    // One DBU team can play in several competitions (here a league and a cup).
    expect(teams.filter((t) => t.teamId === "802772").map((t) => t.poolId)).toEqual([
      "502650",
      "500758",
    ]);
    expect(teams.find((t) => t.teamId === "802772")?.group).toBe("U16");
    expect(new Set(teams.map((t) => `${t.teamId}_${t.poolId}`)).size).toBe(teams.length);
  });

  it("reads played fixtures with scores, crests and venues", () => {
    const rows = parseFixtures(page("kampprogram"), "218563");
    expect(rows).toHaveLength(11);
    expect(rows[0]).toEqual({
      matchId: "184226",
      date: "2026-08-15",
      kickoff: "13:00",
      home: {
        name: "Torslunde-Ishøj IF",
        teamId: "218563",
        crestPath: "/images/club/1274/tiif-gennemsigtig.png",
        clubId: "1274",
      },
      away: {
        name: "Vipperød BK",
        teamId: "19519",
        crestPath: "/images/club/1311/Vipper%C3%B8d_BK.png",
        clubId: "1311",
      },
      venue: "Ishøj Idrætsplads",
      score: "4-1",
    });
    // A bye has no opponent team and no score.
    expect(rows[1].away).toMatchObject({ name: "Oversidder", teamId: null });
    expect(rows[1].score).toBe("");
  });

  it("refuses a fixtures page that belongs to another team", () => {
    expect(() => parseFixtures(page("kampprogram"), "999999")).toThrow(DbuPageError);
  });

  it("only accepts crests from DBU's file server", () => {
    expect(crestPathOf("https://file.dbu.dk/images/club/12/a.png")).toBe("/images/club/12/a.png");
    expect(crestPathOf("https://evil.example/images/club/12/a.png")).toBeNull();
    expect(crestPathOf("http://file.dbu.dk/images/club/12/a.png")).toBeNull();
    expect(crestPathOf("https://file.dbu.dk/images/user/12.jpg")).toBeNull();
    expect(crestPathOf(undefined)).toBeNull();
  });
});

describe("kit colours", () => {
  it("maps DBU's colour names, two-colour shirts first", () => {
    expect(namedColors("Rød/Hvid")).toEqual(["#c8102e", "#f4f4f1"]);
    expect(kitColors({ shirt: "Gul/Rød", shorts: "Marineblå" })).toEqual({
      primary: "#f6c518",
      secondary: "#c8102e",
    });
  });

  it("takes the shorts as the second colour when they differ", () => {
    expect(kitColors({ shirt: "Sort", shorts: "Hvid" })).toEqual({
      primary: "#161616",
      secondary: "#f4f4f1",
    });
  });

  it("falls back to white or black for a one-colour kit", () => {
    expect(kitColors({ shirt: "Mørkeblå", shorts: "Mørkeblå" })?.secondary).toBe("#f4f4f1");
    expect(kitColors({ shirt: "Gul", shorts: "" })?.secondary).toBe("#161616");
  });

  it("gives up on colours it doesn't know", () => {
    expect(kitColors({ shirt: "Regnbue", shorts: "" })).toBeNull();
    expect(kitColors(null)).toBeNull();
  });

  it("leaves the season off competition names", () => {
    expect(competitionLabel("Serie 2 - Efterår")).toBe("Serie 2");
    expect(competitionLabel("U16 Piger 1 (11-12) Efterår")).toBe("U16 Piger 1 (11-12)");
    expect(competitionLabel("U14 Drenge Liga 2A (2012) 11:11 - forår 2026")).toBe(
      "U14 Drenge Liga 2A (2012) 11:11",
    );
    expect(competitionLabel("VinterBOLD Herresenior S1-S2")).toBe("VinterBOLD Herresenior S1-S2");
  });
});

describe("the import, with DBU answered from saved pages", () => {
  let png: Buffer;
  const requested: string[] = [];

  beforeAll(async () => {
    png = await sharp({
      create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
  });

  afterEach(() => {
    setDbuFetch(null);
    requested.length = 0;
  });

  function serve(pages: Record<string, string>) {
    setDbuFetch(async (input) => {
      const url = new URL(String(input));
      requested.push(url.pathname + url.search);
      if (url.hostname === "file.dbu.dk") {
        return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
      }
      const html = pages[url.pathname];
      if (!html) return new Response("<html>dbu: no such page</html>", { status: 404 });
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    });
  }

  const tiif = () => ({
    "/resultater/klub/1274/klubinfo": page("klubinfo"),
    "/resultater/klub/1274/holdoversigt": page("holdoversigt"),
    "/resultater/hold/218563_502551/kampprogram": page("kampprogram"),
    "/resultater/hold/819632_515169/kampprogram": page("kampprogram-upcoming"),
  });

  it("searches and reads a club", async () => {
    serve({ "/resultater/klubsoeg/": page("klubsoeg"), ...tiif() });
    expect(await searchClubs("torslunde")).toEqual([{ id: "1274", name: "Torslunde-Ishøj IF" }]);
    const club = await getClub("1274");
    expect(club.name).toBe("Torslunde-Ishøj IF");
    expect(club.colors).toEqual({ primary: "#1a2f55", secondary: "#f4f4f1" });
    expect(club.teams.length).toBeGreaterThan(10);
  });

  it("imports fixtures from two competitions, ours first, byes left out", async () => {
    serve(tiif());
    const result = (await getImport("1274", [
      { teamId: "218563", poolId: "502551" },
      { teamId: "819632", poolId: "515169" },
    ])) as DbuImport;
    expect("unknown" in result).toBe(false);
    const { fixtures, club, opponents } = result;
    expect(fixtures.every((f) => f.opponent !== "Oversidder")).toBe(true);
    expect(fixtures.map((f) => f.date)).toEqual([...fixtures.map((f) => f.date)].sort());
    // Played away at Hundige: DBU writes 0 - 4 (home first); ours first it's a 4-0 win.
    expect(fixtures.find((f) => f.matchId === "184382")).toMatchObject({
      isHome: false,
      opponent: "Hundige BK",
      score: "4-0",
      competition: "Serie 2",
    });
    expect(fixtures.find((f) => f.matchId === "141181")).toMatchObject({
      date: "2027-02-06",
      kickoff: "14:00",
      isHome: false,
      opponent: "CFK",
      score: "",
      competition: "VinterBOLD Herresenior S1-S2",
      venue: "Hedehusene Idrætspark",
    });
    expect(club.crest).toMatch(/^data:image\/webp;base64,/);
    // Crests are downsized like an uploaded one.
    const meta = await sharp(Buffer.from(club.crest!.split(",")[1], "base64")).metadata();
    expect(meta.width).toBe(512);
    // Opponents' club pages aren't served here, so their colours are missing but crests aren't.
    expect(opponents["1311"]).toEqual({
      crest: expect.stringMatching(/^data:image/),
      colors: null,
    });
    expect(Object.keys(opponents)).not.toContain("1274");
    // Opponents' crests are smaller: a season brings many, all stored in the browser.
    const opp = opponents["1311"].crest!;
    expect((await sharp(Buffer.from(opp.split(",")[1], "base64")).metadata()).width).toBe(320);
  });

  it("refuses teams that aren't the club's", async () => {
    serve(tiif());
    const result = await getImport("1274", [{ teamId: "1", poolId: "2" }]);
    expect(result).toEqual({ unknown: ["1_2"] });
    expect(requested.some((r) => r.includes("/resultater/hold/"))).toBe(false);
  });

  it("keeps the import going when a crest fails", async () => {
    serve(tiif());
    setDbuFetch(async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "file.dbu.dk") return new Response("nope", { status: 500 });
      const html = tiif()[url.pathname as keyof ReturnType<typeof tiif>];
      return html
        ? new Response(html, { headers: { "content-type": "text/html" } })
        : new Response("", { status: 404 });
    });
    const result = (await getImport("1274", [{ teamId: "218563", poolId: "502551" }])) as DbuImport;
    expect(result.club.crest).toBeNull();
    expect(result.fixtures).toHaveLength(10);
  });
});

describe("turning an import into fixtures and a match", () => {
  const data: DbuImport = {
    club: { id: "1", name: "Ishøj", crest: "data:image/webp;base64,AAA", colors: null },
    fixtures: [
      {
        matchId: "2",
        teamId: "9",
        poolId: "8",
        date: "2027-02-13",
        kickoff: "13:00",
        isHome: true,
        opponent: "Farum BK (2)",
        opponentClubId: "1008",
        competition: "VinterBOLD",
        venue: "Ishøj Idrætscenter",
        score: "",
      },
      {
        matchId: "1",
        teamId: "9",
        poolId: "8",
        date: "2026-10-17",
        kickoff: "13:00",
        isHome: false,
        opponent: "Svogerslev BK",
        opponentClubId: null,
        competition: "Serie 2",
        venue: "Svogerslev",
        score: "2-2",
      },
    ],
    opponents: {
      "1008": {
        crest: "data:image/webp;base64,BBB",
        colors: { primary: "#f6c518", secondary: "#c8102e" },
      },
    },
  };

  it("gives each fixture its opponent's crest and colours, by date", () => {
    const fixtures = toFixtures(data);
    expect(fixtures.map((f) => f.dbuMatchId)).toEqual(["1", "2"]);
    expect(fixtures[1]).toMatchObject({
      opponentCrest: "data:image/webp;base64,BBB",
      opponentColors: { primary: "#f6c518", secondary: "#c8102e" },
      venue: "Ishøj Idrætscenter",
    });
    expect(fixtures[0].opponentCrest).toBeNull();
    expect(fixtures[0].opponentColors).toBeUndefined();
  });

  it("updates DBU's facts in place and keeps what the person tidied", () => {
    const [played, upcoming] = toFixtures(data);
    const mine: Fixture[] = [
      { ...upcoming, opponent: "Farum", competition: "Winter league", id: "keep" },
      {
        id: "hand",
        opponent: "Friendly FC",
        isHome: true,
        date: "",
        kickoff: "",
        competition: "",
        score: "",
      },
    ];
    const moved = { ...upcoming, date: "2027-02-20", kickoff: "11:00", score: "" };
    const { fixtures, added, updated } = mergeFixtures(mine, [played, moved]);
    expect(added).toBe(1);
    expect(updated).toBe(1);
    expect(fixtures[0]).toMatchObject({
      id: "keep",
      opponent: "Farum",
      competition: "Winter league",
      date: "2027-02-20",
      kickoff: "11:00",
    });
    expect(fixtures[1].id).toBe("hand");
    expect(fixtures[2].dbuMatchId).toBe("1");
    // Importing the same thing again changes nothing.
    expect(mergeFixtures(fixtures, [played, moved])).toMatchObject({ added: 0, updated: 0 });
  });

  it("picks the next unplayed fixture", () => {
    const fixtures = toFixtures(data);
    expect(nextFixture(fixtures, "2026-11-14")?.dbuMatchId).toBe("2");
    expect(nextFixture(fixtures, "2027-03-01")).toBeNull();
  });

  it("starts a clean match for a new game and keeps the details of the same one", () => {
    const [, upcoming] = toFixtures(data);
    const old = defaultMatch();
    const m = matchFromFixture(old, upcoming);
    expect(m).toMatchObject({
      opponent: "Farum BK (2)",
      opponentShort: "",
      opponentCrest: "data:image/webp;base64,BBB",
      opponentColors: { primary: "#f6c518", secondary: "#c8102e" },
      isHome: true,
      date: "2027-02-13",
      venue: "Ishøj Idrætscenter",
      goals: [],
      ourScore: 0,
    });
    const scored = { ...m, goals: [{ id: "g", side: "us" as const, name: "Lund", minute: "9" }] };
    expect(matchFromFixture(scored, upcoming).goals).toHaveLength(1);
  });
});

describe("a match page", () => {
  // Torslunde-Ishøj IF v Undløse BK, 12 Sep 2026 (3-3), with every person's name made up.
  const html = page("kampinfo");

  it("reads the score, the timeline and both team sheets", () => {
    const m = parseMatchPage(html, "184253");
    expect(m.score).toEqual({ home: 3, away: 3 });
    expect(m.finished).toBe(true);
    expect(m.hasHalfTime).toBe(true);
    expect(m.home?.team).toBe("Torslunde-Ishøj IF");
    expect(m.home?.starters).toHaveLength(11);
    expect(m.home?.bench).toHaveLength(3);
    expect(m.away?.team).toBe("Undløse BK");
    const goals = m.events.filter((e) => e.type === "goal");
    expect(goals.map((g) => `${g.side} ${g.minute}`)).toEqual([
      "away 50",
      "home 60",
      "away 71",
      "home 74",
      "away 88",
      "home 90",
    ]);
    expect(goals.at(-1)).toMatchObject({ kind: "penalty", assist: "" });
    expect(goals[1]).toMatchObject({ scorer: "Emil Hald", assist: "Nils Munk", firstHalf: false });
    expect(m.events.find((e) => e.type === "sub")).toEqual({
      type: "sub",
      side: "away",
      minute: "33",
      on: "Frode Sand",
      off: "Bo Iversen",
    });
    // Yellow cards aren't read: teamsheet11 has no graphic for them.
    expect(m.events).toHaveLength(14);
  });

  it("refuses another match's page", () => {
    expect(() => parseMatchPage(html, "1")).toThrow(DbuNotFound);
  });

  it("reads minutes with added time", () => {
    expect(minuteOf("'45+2")).toBe("45+2");
    expect(minuteOf("'7")).toBe("7");
    expect(minuteOf("")).toBe("");
  });
});

describe("filling a match in from DBU", () => {
  const sheet = (names: string[]) => names.map((name) => ({ name, number: "" }));
  const base = (): DbuMatchPage => ({
    matchId: "1",
    home: {
      team: "Ishøj",
      starters: sheet([
        "Kim Keeper",
        "Asger Høst Hemmingsen",
        "Ny Spiller",
        "D",
        "E",
        "F",
        "G",
        "H",
      ]),
      bench: sheet(["Bænk Et"]),
    },
    away: null,
    score: { home: 2, away: 1 },
    finished: true,
    hasHalfTime: true,
    events: [
      {
        type: "goal",
        side: "home",
        minute: "12",
        scorer: "Asger Høst Hemmingsen",
        assist: "",
        kind: "open",
        firstHalf: true,
      },
      {
        type: "goal",
        side: "away",
        minute: "50",
        scorer: "Their Nine",
        assist: "",
        kind: "open",
        firstHalf: false,
      },
      {
        type: "goal",
        side: "home",
        minute: "88",
        scorer: "",
        assist: "",
        kind: "own",
        firstHalf: false,
      },
      { type: "sub", side: "home", minute: "60", on: "Bænk Et", off: "Ny Spiller" },
      { type: "sub", side: "away", minute: "70", on: "X", off: "Y" },
    ],
  });
  const team = () => {
    const t = blankTeam("t");
    t.players = [
      { id: "gk", name: "Kim Keeper", number: "1", position: "GK" },
      { id: "ah", name: "Asger Hemmingsen", number: "9", position: "FW" },
      { id: "x", name: "Not Playing", number: "4", position: "DF" },
    ];
    t.match = {
      ...t.match,
      isHome: true,
      opponent: "Undløse BK",
      dbu: { matchId: "1", poolId: "2" },
    };
    return t;
  };

  it("matches names loosely but never guesses between two players", () => {
    const players = team().players;
    expect(findPlayerByName(players, "asger  hemmingsen")?.id).toBe("ah");
    expect(findPlayerByName(players, "Asger Høst Hemmingsen")?.id).toBe("ah");
    const twins = [
      { id: "a", name: "Jens Hansen", number: "", position: "MF" as const },
      { id: "b", name: "Jens Hansen", number: "", position: "MF" as const },
    ];
    expect(findPlayerByName(twins, "Jens Hansen")).toBeNull();
  });

  it("plans goals from our side, with own goals credited so the score adds up", () => {
    const plan = planFromDbuMatch(team(), base());
    expect(plan.score).toEqual({ us: 2, them: 1 });
    expect(plan.goals.map((g) => [g.side, g.name, g.playerId ?? null])).toEqual([
      ["us", "Asger Hemmingsen", "ah"],
      ["them", "Their Nine", null],
      ["us", "Own goal", null],
    ]);
    expect(plan.goalsAddUp).toBe(true);
    expect(plan.halfTime).toEqual({ us: 1, them: 0 });
    expect(plan.newPlayers.map((p) => p.name)).toEqual([
      "Ny Spiller",
      "D",
      "E",
      "F",
      "G",
      "H",
      "Bænk Et",
    ]);
    expect(plan.subs).toEqual([{ minute: "60", on: "Bænk Et", off: "Ny Spiller" }]);
  });

  it("flips an own goal listed under the side that conceded it", () => {
    const page = base();
    page.events[2] = { ...page.events[2], side: "away" } as DbuMatchPage["events"][number];
    const plan = planFromDbuMatch(team(), page);
    expect(plan.goals[2]).toMatchObject({ side: "us", name: "Own goal" });
    expect(plan.goalsAddUp).toBe(true);
  });

  it("reads the match from the away side too", () => {
    const t = team();
    t.match.isHome = false;
    const page = { ...base(), away: base().home, home: null };
    const plan = planFromDbuMatch(t, page);
    expect(plan.score).toEqual({ us: 1, them: 2 });
    expect(plan.sheet?.starters).toHaveLength(8);
  });

  it("types the score in when the timeline is missing goals", () => {
    const page = { ...base(), score: { home: 4, away: 1 } };
    const plan = planFromDbuMatch(team(), page);
    expect(plan.goalsAddUp).toBe(false);
    expect(plan.halfTime).toBeNull();
  });

  it("fills in the line-up, adds the new players, and sets goals and subs", () => {
    const t = team();
    useStudio.setState({ teams: [t], activeTeamId: t.id });
    const plan = planFromDbuMatch(t, base());
    useStudio.getState().applyDbuMatch(plan, { score: true, lineup: true, subs: true });
    const after = useStudio.getState().teams[0];
    // 8 starters: an 8-a-side line-up, keeper in goal, the rest in holdkort order.
    expect(after.lineup.size).toBe(8);
    expect(after.lineup.starters[0]).toBe("gk");
    expect(after.lineup.starters).toContain("ah");
    expect(after.players).toHaveLength(3 + 7);
    const added = after.players.find((p) => p.name === "Ny Spiller")!;
    expect(added.position).toBe("MF");
    const benchId = after.players.find((p) => p.name === "Bænk Et")!.id;
    expect(after.lineup.bench).toEqual([benchId]);
    expect(after.match.goals.map((g) => g.minute)).toEqual(["12", "50", "88"]);
    expect(after.match.autoScore).toBe(true);
    expect(after.match.subs).toEqual([
      { id: expect.any(String), minute: "60", onId: benchId, offId: added.id },
    ]);
  });

  it("keeps the score DBU gives when the goals don't add up", () => {
    const t = team();
    useStudio.setState({ teams: [t], activeTeamId: t.id });
    const plan = planFromDbuMatch(t, { ...base(), score: { home: 4, away: 1 } });
    useStudio.getState().applyDbuMatch(plan, { score: true, lineup: false, subs: false });
    const after = useStudio.getState().teams[0];
    expect(after.match).toMatchObject({ autoScore: false, ourScore: 4, theirScore: 1 });
    expect(after.players).toHaveLength(3);
    expect(after.lineup).toEqual(t.lineup);
  });

  it("carries the DBU match and a played fixture's result into the match", () => {
    const played: Fixture = {
      id: "f",
      opponent: "Hundige BK",
      isHome: false,
      date: "2026-10-25",
      kickoff: "13:00",
      competition: "Serie 2",
      score: "4-0",
      dbuMatchId: "184382",
      dbuPoolId: "502551",
    };
    const m = matchFromFixture(defaultMatch(), played);
    expect(m).toMatchObject({
      dbu: { matchId: "184382", poolId: "502551" },
      autoScore: false,
      ourScore: 4,
      theirScore: 0,
      goals: [],
    });
  });
});

describe("review fixes", () => {
  const fixture = (over: Partial<Fixture>): Fixture => ({
    id: "f",
    opponent: "Farum BK",
    isHome: true,
    date: "2027-02-13",
    kickoff: "",
    competition: "VinterBOLD",
    score: "",
    dbuMatchId: "2",
    dbuPoolId: "9",
    ...over,
  });

  it("tells two games on one day apart by DBU's match number", () => {
    const first = matchFromFixture(defaultMatch(), fixture({ dbuMatchId: "1", kickoff: "10:00" }));
    const scored = {
      ...first,
      goals: [{ id: "g", side: "us" as const, name: "Lund", minute: "5" }],
    };
    const second = matchFromFixture(scored, fixture({ dbuMatchId: "2" }));
    expect(second.goals).toEqual([]);
    expect(second.dbu?.matchId).toBe("2");
    // DBU hasn't set the second game's time: the first game's isn't borrowed.
    expect(second.kickoff).toBe("");
    // The same game keeps its time and goals.
    const again = matchFromFixture(scored, fixture({ dbuMatchId: "1" }));
    expect(again.kickoff).toBe("10:00");
    expect(again.goals).toHaveLength(1);
  });

  it("types the scores in when DBU's half-time marker and the minutes disagree", () => {
    const t = blankTeam("t");
    t.match = { ...t.match, isHome: true, dbu: { matchId: "1", poolId: "2" } };
    useStudio.setState({ teams: [t], activeTeamId: t.id });
    const page: DbuMatchPage = {
      matchId: "1",
      home: null,
      away: null,
      score: { home: 1, away: 0 },
      finished: true,
      hasHalfTime: true,
      // Written as minute 46, but before DBU's half-time marker.
      events: [
        {
          type: "goal",
          side: "home",
          minute: "46",
          scorer: "A B",
          assist: "",
          kind: "open",
          firstHalf: true,
        },
      ],
    };
    const plan = planFromDbuMatch(t, page);
    useStudio.getState().applyDbuMatch(plan, { score: true, lineup: false, subs: false });
    expect(useStudio.getState().teams[0].match).toMatchObject({
      autoScore: false,
      ourScore: 1,
      theirScore: 0,
      htOurScore: 1,
      htTheirScore: 0,
    });
  });

  it("imports fixtures into the team that asked, even when another is open", () => {
    const a = blankTeam("a");
    const b = blankTeam("b");
    useStudio.setState({ teams: [a, b], activeTeamId: "b" });
    const link = { clubId: "1274", teams: [{ teamId: "1", poolId: "2" }] };
    useStudio.getState().importFixtures("a", link, [fixture({ id: "x" })]);
    const [after, other] = useStudio.getState().teams;
    expect(after.fixtures).toHaveLength(1);
    expect(after.dbu).toEqual(link);
    expect(other.fixtures).toHaveLength(0);
    expect(other.dbu).toBeUndefined();
    useStudio.getState().playFixture("x", "a");
    expect(useStudio.getState().teams[0].match.opponent).toBe("Farum BK");
    expect(useStudio.getState().teams[1].match.opponent).toBe("");
  });

  it("stops reading a crest that turns out too big, with no length given", async () => {
    const big = new Uint8Array(4 * 1024 * 1024);
    let pulled = 0;
    setDbuFetch(async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "file.dbu.dk") {
        const stream = new ReadableStream<Uint8Array>({
          pull(c) {
            if (pulled >= big.byteLength) return c.close();
            c.enqueue(big.subarray(pulled, pulled + 256 * 1024));
            pulled += 256 * 1024;
          },
        });
        return new Response(stream, { headers: { "content-type": "image/png" } });
      }
      const pages: Record<string, string> = {
        "/resultater/klub/1274/klubinfo": page("klubinfo"),
        "/resultater/klub/1274/holdoversigt": page("holdoversigt"),
        "/resultater/hold/218563_502551/kampprogram": page("kampprogram"),
      };
      const html = pages[url.pathname];
      return html
        ? new Response(html, { headers: { "content-type": "text/html" } })
        : new Response("", { status: 404 });
    });
    const result = (await getImport("1274", [{ teamId: "218563", poolId: "502551" }])) as DbuImport;
    expect(result.club.crest).toBeNull();
    expect(result.fixtures).toHaveLength(10);
    // It stopped soon after 3 MB rather than reading all 4 MB of every crest.
    expect(pulled).toBeLessThan(big.byteLength * 12);
    setDbuFetch(null);
  });

  it("answers 'DBU unavailable' when a page breaks off midway", async () => {
    setDbuFetch(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode("<html>dbu"));
          c.error(new Error("connection reset"));
        },
      });
      return new Response(stream, { headers: { "content-type": "text/html" } });
    });
    await expect(searchClubs("broken off")).rejects.toBeInstanceOf(DbuUnavailable);
    setDbuFetch(null);
  });
});
