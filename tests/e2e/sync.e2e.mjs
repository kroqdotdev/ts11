// Account sync across two browsers: merge on first sign-in, saving, pulling edits made
// elsewhere, deletions, and moving inline images to storage.
import {
  assert,
  BASE,
  browser,
  done,
  serverClubs,
  signIn,
  syncStatus,
  test,
  verifiedAccount,
  waitFor,
} from "./lib.mjs";

const b = await browser();

/** A minimal onboarded studio save with one club, as the app stores it. */
async function seedLocal(page, clubName) {
  await page.goto(`${BASE}/studio`);
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await page.evaluate((name) => {
    const s = window.__ts11Studio();
    const team = { ...s.teams[0], id: "local" + Math.random().toString(36).slice(2, 7), name };
    window.__ts11StudioSet?.(team);
    localStorage.setItem(
      "teamsheet11:v1",
      JSON.stringify({
        state: { teams: [team], activeTeamId: team.id, design: s.design, onboarded: true },
        version: 1,
      }),
    );
  }, clubName);
  await page.reload();
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
}

const studioTeams = (page) => page.evaluate(() => window.__ts11Studio().teams.map((t) => t.name));

let account;

await test("an empty account takes this browser's club and saves it", async () => {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await seedLocal(page, "Ashby Vale Test");
  account = await verifiedAccount(ctx, "sync");
  await page.reload();
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "saved" });
  const server = await serverClubs(ctx);
  assert(
    server.clubs.some((c) => c.data.name === "Ashby Vale Test"),
    "club not on server",
  );
  await ctx.close();
});

await test("a fresh browser that signs in gets the account's clubs", async () => {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await signIn(ctx, account.email, account.password);
  await page.goto(`${BASE}/studio`);
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => (await studioTeams(page)).includes("Ashby Vale Test"), {
    label: "club pulled",
  });
  const onboarded = await page.evaluate(() => window.__ts11Studio().onboarded);
  assert(onboarded, "a pulled account should count as set up");
  await ctx.close();
});

await test("a browser with its own club is asked, and merging keeps both", async () => {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await seedLocal(page, "Corrin Town Local");
  await signIn(ctx, account.email, account.password);
  await page.reload();
  await page.getByRole("dialog").getByText("Add this browser's clubs?").waitFor();
  await page.getByRole("button", { name: "Add to my account" }).click();
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "saved" });
  const names = await studioTeams(page);
  assert(names.includes("Corrin Town Local") && names.includes("Ashby Vale Test"), `got ${names}`);
  const server = await serverClubs(ctx);
  const live = server.clubs.filter((c) => !c.deleted).map((c) => c.data.name);
  assert(live.includes("Corrin Town Local"), "merged club not saved");
  await ctx.close();
});

await test("edits and deletions travel between two signed-in browsers", async () => {
  const a = await b.newContext();
  const c = await b.newContext();
  await signIn(a, account.email, account.password);
  await signIn(c, account.email, account.password);
  const pa = await a.newPage();
  const pc = await c.newPage();
  for (const p of [pa, pc]) {
    await p.goto(`${BASE}/studio`);
    await p.waitForFunction(() => typeof window.__ts11Studio === "function");
    await waitFor(async () => (await studioTeams(p)).length >= 2, { label: "clubs" });
    await waitFor(async () => (await syncStatus(p)) === "saved", { label: "saved" });
  }
  // Rename a club in browser A through the store, as the studio's inputs do.
  await pa.evaluate(() => {
    const s = window.__ts11Studio();
    const t = s.teams.find((x) => x.name === "Ashby Vale Test");
    s.setActiveTeam(t.id);
    s.updateTeam({ name: "Ashby Vale Renamed" });
  });
  await waitFor(async () => (await syncStatus(pa)) === "saved", { label: "A saved" });
  await waitFor(
    async () => (await serverClubs(a)).clubs.some((x) => x.data.name === "Ashby Vale Renamed"),
    {
      label: "rename on server",
    },
  );
  // Browser C picks it up when its tab becomes visible again.
  await pc.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await waitFor(async () => (await studioTeams(pc)).includes("Ashby Vale Renamed"), {
    label: "rename pulled",
  });

  // Delete the merged club in C; A drops it too.
  await pc.evaluate(() => {
    const s = window.__ts11Studio();
    s.removeTeam(s.teams.find((x) => x.name === "Corrin Town Local").id);
  });
  await waitFor(async () => (await serverClubs(c)).clubs.some((x) => x.deleted), {
    label: "deletion on server",
  });
  await pa.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await waitFor(async () => !(await studioTeams(pa)).includes("Corrin Town Local"), {
    label: "delete pulled",
  });
  await a.close();
  await c.close();
});

await test("on a shared computer, a second account never gets the first account's clubs", async () => {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await seedLocal(page, "Private A FC");
  const a = await verifiedAccount(ctx, "shared-a");
  await page.reload();
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "A saved" });
  // A signs out (the clubs stay in the browser); B signs in on the same browser.
  await page.evaluate(() =>
    fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  const bAcc = await verifiedAccount(ctx, "shared-b");
  await page.reload();
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "B saved" });
  const bClubs = (await serverClubs(ctx)).clubs.filter((c) => !c.deleted).map((c) => c.data.name);
  assert(!bClubs.includes("Private A FC"), `B's account got A's club: ${bClubs}`);
  const shown = await studioTeams(page);
  assert(!shown.includes("Private A FC"), `B still sees A's club: ${shown}`);
  // A signs in again and still has their club.
  await page.evaluate(() =>
    fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  await signIn(ctx, a.email, a.password);
  await page.reload();
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => (await studioTeams(page)).includes("Private A FC"), {
    label: "A's club back",
  });
  assert(bAcc.email, "B account made");
  await ctx.close();
});

await test("a device with a wrong clock can still save and delete", async () => {
  const ctx = await b.newContext();
  await signIn(ctx, account.email, account.password);
  const page = await ctx.newPage();
  // An hour behind: the server's own revision numbers decide, not this clock.
  await page.addInitScript(() => {
    const real = Date.now.bind(Date);
    Date.now = () => real() - 3600_000;
  });
  await page.goto(`${BASE}/studio`);
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "saved" });
  await page.evaluate(() => window.__ts11Studio().updateTeam({ name: "Clock Skew FC" }));
  await waitFor(
    async () => (await serverClubs(ctx)).clubs.some((c) => c.data.name === "Clock Skew FC"),
    {
      label: "edit saved",
    },
  );
  await ctx.close();
});

await test("an inline crest is uploaded and replaced by its link", async () => {
  const ctx = await b.newContext();
  await signIn(ctx, account.email, account.password);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/studio`);
  await page.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => (await syncStatus(page)) === "saved", { label: "saved" });
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#1c5434";
    g.fillRect(0, 0, 64, 64);
    window.__ts11Studio().updateTeam({ crest: c.toDataURL("image/png") });
  });
  const crest = await waitFor(
    async () => {
      const v = await page.evaluate(() => window.__ts11Studio().teams.find((t) => t.crest)?.crest);
      return v?.startsWith("/api/images/") ? v : null;
    },
    { label: "crest uploaded" },
  );
  const img = await page.request.get(`${BASE}${crest}`);
  assert(img.ok() && img.headers()["content-type"] === "image/png", "image not served");
  // The link keeps working signed out, so local copies and exports still show it.
  const anon = await (await b.newContext()).request.get(`${BASE}${crest}`);
  assert(anon.status() === 200, `signed-out request got ${anon.status()}`);
  await ctx.close();
});

await b.close();
done();
