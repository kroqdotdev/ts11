// Image limits over HTTP: the 2 MB cap, odd files, de-duplication, the storage page
// numbers, and that a crest stored in the account appears in an exported PNG.
import {
  assert,
  BASE,
  browser,
  done,
  signIn,
  syncStatus,
  test,
  verifiedAccount,
  waitFor,
} from "./lib.mjs";

const b = await browser();
const ctx = await b.newContext();
const acc = await verifiedAccount(ctx, "images");

async function upload(body, type = "image/png") {
  const r = await ctx.request.post(`${BASE}/api/images`, {
    data: body,
    headers: { "content-type": type },
  });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
}

/** A real PNG of a given size, drawn in the browser. */
async function pngOf(page, w, h, noisy = false) {
  const b64 = await page.evaluate(
    ([w, h, noisy]) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      if (noisy) {
        const img = g.createImageData(w, h);
        for (let i = 0; i < img.data.length; i++) img.data[i] = (Math.random() * 255) | 0;
        g.putImageData(img, 0, 0);
      } else {
        g.fillStyle = "#1c5434";
        g.fillRect(0, 0, w, h);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    [w, h, noisy],
  );
  return Buffer.from(b64, "base64");
}

const page = await ctx.newPage();
await page.goto(`${BASE}/`);

await test("a file over 2 MB is refused with a clear message", async () => {
  const big = await pngOf(page, 1200, 1200, true);
  assert(big.length > 2 * 1024 * 1024, `test image only ${big.length} bytes`);
  const r = await upload(big);
  assert(
    r.status === 413 && r.body.error === "too-large",
    `got ${r.status} ${JSON.stringify(r.body)}`,
  );
  assert(/2 MB/.test(r.body.message), "message should name the limit");
});

await test("an image wider than 2560px is refused", async () => {
  const r = await upload(await pngOf(page, 2700, 20));
  assert(r.status === 413 && r.body.error === "too-big-dimensions", `got ${r.status}`);
});

await test("a text file or HTML is refused", async () => {
  const r = await upload(Buffer.from("<script>alert(1)</script>"), "image/png");
  assert(r.status === 415, `got ${r.status}`);
});

await test("an SVG is turned into a PNG before it is stored", async () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#f7c600"/></svg>';
  const r = await upload(Buffer.from(svg), "image/svg+xml");
  assert(
    r.status === 201 && r.body.contentType === "image/png",
    `got ${r.status} ${r.body.contentType}`,
  );
  const served = await ctx.request.get(`${BASE}${r.body.url}`);
  assert(served.headers()["content-type"] === "image/png", "served as PNG");
  assert(
    /sandbox/.test(served.headers()["content-security-policy"] ?? ""),
    "served without a sandbox CSP",
  );
});

await test("the same image twice is stored once and counted once", async () => {
  const img = await pngOf(page, 300, 300);
  const a = await upload(img);
  const b2 = await upload(img);
  assert(a.body.id === b2.body.id && b2.body.reused, "second upload should reuse the first");
  const list = await (await ctx.request.get(`${BASE}/api/images`)).json();
  const sum = list.images.reduce((n, i) => n + i.bytes, 0);
  assert(list.used === sum, `used ${list.used} vs sum ${sum}`);
  const expected = Number(process.env.E2E_ACCOUNT_LIMIT ?? 250 * 1024 * 1024);
  assert(list.limit === expected, `limit ${list.limit}`);
});

await test("a crest stored in the account shows in the preview and in the exported PNG", async () => {
  const s = await b.newContext({ acceptDownloads: true });
  await signIn(s, acc.email, acc.password);
  const p = await s.newPage();
  await p.goto(`${BASE}/studio`);
  await p.waitForFunction(() => typeof window.__ts11Studio === "function");
  await waitFor(async () => ["saved", "merging"].includes(await syncStatus(p)), {
    label: "sync ready",
  });
  if ((await syncStatus(p)) === "merging")
    await p.getByRole("button", { name: "Add to my account" }).click();
  await p.evaluate(() => window.__ts11Studio().skipSetup?.());
  // A bright crest the export can be checked for.
  await p.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 200;
    const g = c.getContext("2d");
    g.fillStyle = "#ff00ff";
    g.fillRect(0, 0, 200, 200);
    window.__ts11Studio().updateTeam({ crest: c.toDataURL("image/png"), crestKind: "transparent" });
  });
  const url = await waitFor(
    async () => {
      const v = await p.evaluate(() => window.__ts11Studio().teams.find((t) => t.crest)?.crest);
      return v?.startsWith("/api/images/") ? v : null;
    },
    { label: "crest moved to storage" },
  );
  await p.waitForFunction(
    (u) =>
      [...document.querySelectorAll("#graphic-export img")].some(
        (i) => i.src.endsWith(u) && i.naturalWidth > 0,
      ),
    url,
    { timeout: 10000 },
  );
  // Export through the app's own download button and look for the crest's colour.
  const [dl] = await Promise.all([
    p.waitForEvent("download", { timeout: 20000 }),
    p
      .getByRole("button", { name: /Download PNG/i })
      .first()
      .click(),
  ]);
  const file = await dl.path();
  const magenta = await p.evaluate(
    async (bytes) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 230 && d[i + 1] < 40 && d[i + 2] > 230) n++;
      return n;
    },
    [...(await import("node:fs")).readFileSync(file)],
  );
  assert(magenta > 500, `crest colour missing from export (${magenta} px)`);
  await s.close();
});

await b.close();
done();
