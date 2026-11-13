// Storage full: run against a server started with a small LIMIT_ACCOUNT_BYTES (the
// test script does this). The studio must say saving is blocked and why, and the
// storage page must show the account as full.
import { assert, BASE, browser, done, syncStatus, test, verifiedAccount, waitFor } from "./lib.mjs";

const b = await browser();

await test("a full account blocks the upload and says so in the studio", async () => {
  const ctx = await b.newContext();
  await verifiedAccount(ctx, "quota");
  const p = await ctx.newPage();
  await p.goto(`${BASE}/studio`);
  await p.waitForFunction(() => typeof window.__ts11Studio === "function");
  await p.evaluate(() => window.__ts11Studio().skipSetup?.());
  await waitFor(async () => (await syncStatus(p)) === "saved", { label: "saved" });
  // A noisy photo bigger than the tiny test allowance.
  await p.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 400;
    const g = c.getContext("2d");
    const img = g.createImageData(400, 400);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (Math.random() * 255) | 0;
    g.putImageData(img, 0, 0);
    window.__ts11Studio().updateTeam({ crest: c.toDataURL("image/png") });
  });
  await waitFor(async () => (await syncStatus(p)) === "blocked", { label: "blocked" });
  const detail = await p.evaluate(() => window.__ts11SyncStatus().detail);
  assert(/storage is full/i.test(detail), `detail: ${detail}`);
  await p.getByText("Not saved").first().waitFor({ timeout: 5000 });
  // Nothing was lost: the crest is still there in this browser.
  const crest = await p.evaluate(() => window.__ts11Studio().teams[0].crest);
  assert(crest?.startsWith("data:image/"), "the local crest should be kept");
  await ctx.close();
});

await b.close();
done();
