// Shared helpers for the end-to-end tests. They drive a real browser against a running
// dev server (default http://localhost:3000) that writes mail to data/dev/outbox.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

export const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
export const OUTBOX = join(process.env.DEV_DATA_DIR ?? "./data/dev", "outbox");

export async function browser() {
  const executablePath =
    process.env.CHROME_PATH ??
    ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
  const b = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  // Each context looks like its own visitor, so per-IP sign-up limits apply per test
  // the way they would per real person (production trusts X-Forwarded-For from Caddy).
  const newContext = b.newContext.bind(b);
  b.newContext = (opts = {}) =>
    newContext({
      ...opts,
      extraHTTPHeaders: {
        "x-real-ip": `10.${rnd()}.${rnd()}.${rnd()}`,
        // Browsers send Origin on every write; the API request client doesn't by itself.
        origin: BASE,
        ...opts.extraHTTPHeaders,
      },
    });
  return b;
}
const rnd = () => Math.floor(Math.random() * 250) + 1;

export function uniqueEmail(tag) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.org`;
}

/** The newest mail of a kind for an address, waiting for it to arrive. */
export async function mailFor(email, kind, { after = 0, timeout = 10000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (existsSync(OUTBOX)) {
      const files = readdirSync(OUTBOX)
        .filter((f) => f.includes(`-${kind}-`) && f.includes(email.replace(/[^a-z0-9@.]/gi, "_")))
        .filter((f) => Number(f.split("-")[0]) >= after)
        .sort();
      if (files.length) {
        const mail = JSON.parse(readFileSync(join(OUTBOX, files.at(-1)), "utf8"));
        const link = mail.text.match(/https?:\/\/\S+/)?.[0];
        return { ...mail, link };
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no ${kind} mail for ${email}`);
}

/** Signs up through the API inside a browser context, then confirms the email. */
export async function verifiedAccount(context, tag, password = "correct-horse-battery") {
  const email = uniqueEmail(tag);
  const page = await context.newPage();
  const before = Date.now() - 1000;
  const res = await page.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers: { origin: BASE },
    data: { email, password, name: tag, callbackURL: "/studio?verified=1" },
  });
  if (!res.ok()) throw new Error(`sign-up failed ${res.status()} ${await res.text()}`);
  const mail = await mailFor(email, "verify", { after: before });
  await page.goto(mail.link);
  await page.close();
  return { email, password };
}

export async function signIn(context, email, password) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { origin: BASE },
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`sign-in failed ${res.status()}`);
  await page.close();
}

export async function serverClubs(context) {
  const page = await context.newPage();
  const res = await page.request.get(`${BASE}/api/sync`);
  const body = await res.json();
  await page.close();
  return body;
}

export async function syncStatus(page) {
  return page.evaluate(() => window.__ts11SyncStatus?.()?.status ?? null);
}

export async function waitFor(
  fn,
  { timeout = 15000, every = 250, label = "condition", onTimeout } = {},
) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, every));
  }
  const extra = onTimeout ? ` ${await onTimeout()}` : "";
  throw new Error(`timed out waiting for ${label} (last: ${JSON.stringify(last)})${extra}`);
}

let failures = 0;
export async function test(name, fn) {
  const t = Date.now();
  try {
    await fn();
    console.log(`  ok   ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${e?.stack?.split("\n").slice(0, 3).join("\n       ")}`);
  }
}
export function done() {
  console.log(failures ? `\n${failures} failed` : "\nall passed");
  process.exit(failures ? 1 : 0);
}
export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
