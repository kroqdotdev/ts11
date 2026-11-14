// The /api/dbu routes: input checks always; the live lookup against dbu.dk only with
// E2E_DBU_LIVE=1, since it depends on DBU being up and on Torslunde-Ishøj IF's pages.
import { BASE } from "./lib.mjs";

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
};

await test("rejects a search shorter than two letters", async () => {
  const r = await get("/api/dbu/clubs?q=a");
  assert(r.status === 400 && r.body.error === "bad-query", JSON.stringify(r));
});

await test("rejects a club id that isn't a number", async () => {
  const r = await get("/api/dbu/clubs/abc");
  assert(r.status === 400 && r.body.error === "bad-club", JSON.stringify(r));
});

await test("rejects a malformed team list", async () => {
  const r = await get("/api/dbu/clubs/1274/fixtures?teams=1_2,http://x");
  assert(r.status === 400 && r.body.error === "bad-teams", JSON.stringify(r));
});

await test("rejects a malformed match reference", async () => {
  const r = await get("/api/dbu/matches/184253");
  assert(r.status === 400 && r.body.error === "bad-match", JSON.stringify(r));
});

if (process.env.E2E_DBU_LIVE === "1") {
  await test("finds Torslunde-Ishøj IF and its teams", async () => {
    const s = await get("/api/dbu/clubs?q=torslunde");
    assert(
      s.body.clubs?.some((c) => c.id === "1274"),
      JSON.stringify(s.body),
    );
    const c = await get("/api/dbu/clubs/1274");
    assert(c.body.name === "Torslunde-Ishøj IF" && c.body.teams.length > 0, JSON.stringify(c.body));
  });

  await test("imports fixtures with crests, and refuses another club's team", async () => {
    const club = (await get("/api/dbu/clubs/1274")).body;
    const team = club.teams[0];
    const r = await get(`/api/dbu/clubs/1274/fixtures?teams=${team.teamId}_${team.poolId}`);
    assert(r.status === 200, JSON.stringify(r.body));
    assert(r.body.club.crest?.startsWith("data:image/webp"), "no crest");
    assert(
      r.body.fixtures.every((f) => f.opponent !== "Oversidder"),
      "a bye was imported",
    );
    const bad = await get("/api/dbu/clubs/1274/fixtures?teams=1_2");
    assert(bad.status === 404 && bad.body.error === "unknown-team", JSON.stringify(bad));
  });

  await test("reads a played match's score, goals and team sheets", async () => {
    // Torslunde-Ishøj IF v Undløse BK, 12 Sep 2026, 3-3.
    const r = await get("/api/dbu/matches/184253_502551");
    assert(r.status === 200, JSON.stringify(r.body));
    assert(r.body.score?.home === 3 && r.body.score?.away === 3, "score");
    assert(r.body.home?.starters.length === 11, "home team sheet");
    assert(r.body.events.filter((e) => e.type === "goal").length === 6, "goals");
    const gone = await get("/api/dbu/matches/1_502551");
    assert(gone.status === 404 && gone.body.error === "dbu-not-found", JSON.stringify(gone.body));
  });
} else {
  console.log("skip live dbu.dk checks (set E2E_DBU_LIVE=1)");
}

process.exit(failed ? 1 : 0);
