// Auth rules at the API level: what an unconfirmed account may do, password reset,
// and deleting an account (including its images in storage).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assert,
  BASE,
  browser,
  done,
  mailFor,
  signIn,
  test,
  uniqueEmail,
  verifiedAccount,
} from "./lib.mjs";

const OBJECTS = join(process.env.DEV_DATA_DIR ?? "./data/dev", "objects");
const b = await browser();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWOQCTGBIwbiOAAJQwpBaQtIewAAAABJRU5ErkJggg==",
  "base64",
);

await test("an unconfirmed account can sign in but not save or upload", async () => {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const email = uniqueEmail("unconfirmed");
  const res = await page.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers: { origin: BASE },
    data: { email, password: "long-enough-pass", name: "U" },
  });
  assert(res.ok(), "sign-up failed");
  const session = await (await page.request.get(`${BASE}/api/auth/get-session`)).json();
  assert(session?.user?.emailVerified === false, "should be signed in, unverified");
  const sync = await page.request.get(`${BASE}/api/sync`);
  assert(
    sync.status() === 403 && (await sync.json()).error === "unverified",
    `sync got ${sync.status()}`,
  );
  const up = await page.request.post(`${BASE}/api/images`, {
    data: png,
    headers: { "content-type": "image/png" },
  });
  assert(up.status() === 403, `upload got ${up.status()}`);
  await ctx.close();
});

await test("a confirmation link doesn't sign in whoever opens it", async () => {
  const owner = await b.newContext();
  const email = uniqueEmail("prereg");
  const after = Date.now() - 1000;
  await owner.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers: { origin: BASE },
    data: { email, password: "attacker-knows-this", name: "X" },
  });
  const mail = await mailFor(email, "verify", { after });
  const victim = await b.newContext();
  const page = await victim.newPage();
  await page.goto(mail.link);
  const session = await (await victim.request.get(`${BASE}/api/auth/get-session`)).json();
  assert(!session?.user, "opening the link signed the browser in");
  await owner.close();
  await victim.close();
});

await test("account APIs refuse changes from other sites", async () => {
  const ctx = await b.newContext();
  await verifiedAccount(ctx, "origin");
  const r = await ctx.request.put(`${BASE}/api/sync`, {
    headers: { origin: "https://evil.example" },
    data: { clubs: [] },
  });
  assert(r.status() === 403, `got ${r.status()}`);
  const ok = await ctx.request.put(`${BASE}/api/sync`, {
    headers: { origin: BASE },
    data: { clubs: [] },
  });
  assert(ok.ok(), `same-site save failed ${ok.status()}`);
  await ctx.close();
});

await test("signed out, the account APIs refuse", async () => {
  const ctx = await b.newContext();
  const r = await ctx.request.get(`${BASE}/api/sync`);
  assert(r.status() === 401, `got ${r.status()}`);
  await ctx.close();
});

await test("a wrong password is refused with a plain error", async () => {
  const ctx = await b.newContext();
  const acc = await verifiedAccount(ctx, "wrongpw");
  const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { origin: BASE },
    data: { email: acc.email, password: "not-the-password" },
  });
  assert(r.status() === 401, `got ${r.status()}`);
  await ctx.close();
});

await test("password reset works end to end and the old password stops working", async () => {
  const ctx = await b.newContext();
  const acc = await verifiedAccount(ctx, "reset");
  const after = Date.now() - 1000;
  const req = await ctx.request.post(`${BASE}/api/auth/request-password-reset`, {
    headers: { origin: BASE },
    data: { email: acc.email, redirectTo: "/reset-password" },
  });
  assert(req.ok(), `reset request ${req.status()}`);
  const mail = await mailFor(acc.email, "reset", { after });
  const page = await ctx.newPage();
  await page.goto(mail.link);
  const token = new URL(page.url()).searchParams.get("token");
  assert(page.url().includes("/reset-password") && token, `landed on ${page.url()}`);
  const set = await ctx.request.post(`${BASE}/api/auth/reset-password`, {
    headers: { origin: BASE },
    data: { newPassword: "brand-new-password", token },
  });
  assert(set.ok(), `reset ${set.status()}`);
  const old = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { origin: BASE },
    data: { email: acc.email, password: acc.password },
  });
  assert(old.status() === 401, "old password still works");
  await signIn(ctx, acc.email, "brand-new-password");
  // Asking for an unknown address looks the same, so it can't be used to probe.
  const unknown = await ctx.request.post(`${BASE}/api/auth/request-password-reset`, {
    headers: { origin: BASE },
    data: { email: uniqueEmail("nobody"), redirectTo: "/reset-password" },
  });
  assert(unknown.ok(), "unknown address should look the same");
  await ctx.close();
});

await test("deleting the account removes clubs, images and the stored files", async () => {
  const ctx = await b.newContext();
  const acc = await verifiedAccount(ctx, "delete");
  await ctx.request.put(`${BASE}/api/sync`, {
    data: { clubs: [{ id: "c1", baseRev: 0, data: { id: "c1", name: "Gone FC" } }] },
  });
  const up = await (
    await ctx.request.post(`${BASE}/api/images`, {
      data: png,
      headers: { "content-type": "image/png" },
    })
  ).json();
  const session = await (await ctx.request.get(`${BASE}/api/auth/get-session`)).json();
  // With S3 configured the bytes are in the bucket (checked by the S3 test step);
  // in development they are on disk.
  const onDisk = existsSync(OBJECTS);
  const userDir = join(OBJECTS, "u", session.user.id);
  if (onDisk) assert(existsSync(userDir) && readdirSync(userDir).length === 1, "image not stored");
  const before = await ctx.request.get(`${BASE}/api/images/${up.id}`);
  assert(before.ok(), `image not served before delete: ${before.status()}`);
  console.log(`       user ${session.user.id}`);

  const wrong = await ctx.request.post(`${BASE}/api/auth/delete-user`, {
    headers: { origin: BASE },
    data: { password: "wrong-password" },
  });
  assert(!wrong.ok(), "deleted with a wrong password");
  const del = await ctx.request.post(`${BASE}/api/auth/delete-user`, {
    headers: { origin: BASE },
    data: { password: acc.password },
  });
  assert(del.ok(), `delete ${del.status()} ${await del.text()}`);
  if (onDisk)
    assert(!existsSync(userDir) || readdirSync(userDir).length === 0, "stored image left behind");
  const after = await ctx.request.get(`${BASE}/api/images/${up.id}`);
  assert(after.status() === 404, `image still reachable: ${after.status()}`);
  const again = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { origin: BASE },
    data: { email: acc.email, password: acc.password },
  });
  assert(again.status() === 401, "deleted account can still sign in");
  await ctx.close();
});

await b.close();
done();
