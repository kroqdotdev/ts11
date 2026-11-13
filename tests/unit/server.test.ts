import { readdirSync, readFileSync, rmSync } from "node:fs";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { currentRev, imagesInUse, listClubs, pushClubs } from "@/server/clubs";
import { db, schema } from "@/server/db";
import { sendMail } from "@/server/mail";
import { resetPassword, verifyEmail } from "@/server/mail-templates";
import { deleteImage, listImages, prepareImage, saveImage, usedBytes } from "@/server/images";

const DIR = "./data/test-unit";

beforeAll(() => {
  rmSync(DIR, { recursive: true, force: true });
  db.insert(schema.user)
    .values([
      { id: "u1", name: "One", email: "one@example.org", emailVerified: true },
      { id: "u2", name: "Two", email: "two@example.org", emailVerified: true },
    ])
    .run();
});
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

const png = (w: number, h: number, seed = 0) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: seed, g: 80, b: 40 } } })
    .png()
    .toBuffer()
    .then((b) => new Uint8Array(b));

describe("club sync", () => {
  it("saves clubs per account and keeps accounts apart", () => {
    const r = pushClubs("u1", {
      clubs: [{ id: "a", baseRev: 0, data: { id: "a", name: "Ashby" } }],
    });
    expect(r.accepted).toEqual([{ id: "a", rev: 1 }]);
    expect(listClubs("u1")).toHaveLength(1);
    expect(listClubs("u2")).toHaveLength(0);
  });

  it("numbers saves itself and refuses a change based on an old revision", () => {
    const r1 = pushClubs("u1", {
      clubs: [{ id: "a", baseRev: 1, data: { id: "a", name: "Second" } }],
    });
    expect(r1.accepted).toEqual([{ id: "a", rev: 2 }]);
    // A device that last saw revision 1 (whatever its clock says) gets the newer copy.
    const r2 = pushClubs("u1", {
      clubs: [{ id: "a", baseRev: 1, data: { id: "a", name: "Stale" } }],
    });
    expect(r2.accepted).toEqual([]);
    expect(r2.conflicts[0]).toMatchObject({ rev: 2, data: { name: "Second" } });
  });

  it("lists only what changed after a revision", () => {
    pushClubs("u1", { clubs: [{ id: "b", baseRev: 0, data: { id: "b" } }] });
    expect(listClubs("u1", 2).map((c) => c.id)).toEqual(["b"]);
    expect(currentRev("u1")).toBe(3);
  });

  it("records deletions, and ignores deletions of clubs it never had", () => {
    pushClubs("u1", { clubs: [{ id: "a", baseRev: 2, deleted: true }] });
    expect(listClubs("u1").find((c) => c.id === "a")?.deleted).toBe(true);
    const ghost = pushClubs("u1", {
      clubs: Array.from({ length: 50 }, (_, i) => ({ id: `ghost${i}`, baseRev: 0, deleted: true })),
    });
    expect(ghost.accepted).toHaveLength(50);
    expect(listClubs("u1").filter((c) => c.id.startsWith("ghost"))).toHaveLength(0);
  });

  it("refuses inline images (any spelling), mismatched ids and too many clubs", () => {
    const big = "DATA:image/png;x=y;base64," + "A".repeat(4000);
    const r = pushClubs("u2", {
      clubs: [
        { id: "x", baseRev: 0, data: { id: "x", crest: big } },
        { id: "y", baseRev: 0, data: { id: "not-y" } },
      ],
    });
    expect(r.rejected.map((x) => x.reason).sort()).toEqual(["bad-data", "inline-image"]);
    // LIMIT_CLUBS=3 in the test env.
    const many = pushClubs("u2", {
      clubs: ["1", "2", "3", "4"].map((id) => ({ id, baseRev: 0, data: { id } })),
    });
    expect(many.accepted).toHaveLength(3);
    expect(many.rejected).toEqual([{ id: "4", reason: "too-many" }]);
  });

  it("saves the studio state with revisions too", () => {
    const first = pushClubs("u2", {
      clubs: [],
      state: { baseRev: 0, data: { design: { font: "anton" } } },
    });
    expect(first.state).toMatchObject({ rev: expect.any(Number) });
    const stale = pushClubs("u2", { clubs: [], state: { baseRev: 0, data: { design: {} } } });
    expect(stale.state).toMatchObject({ conflict: { data: { design: { font: "anton" } } } });
  });

  it("finds images that saved clubs link to", () => {
    pushClubs("u2", {
      clubs: [
        {
          id: "1",
          baseRev: listClubs("u2").find((c) => c.id === "1")!.rev,
          data: { id: "1", crest: "/api/images/0123456789abcdef0123456789abcdef" },
        },
      ],
    });
    expect(imagesInUse("u2").has("0123456789abcdef0123456789abcdef")).toBe(true);
  });
});

describe("images", () => {
  it("accepts a PNG and reports its size", async () => {
    const r = await prepareImage(await png(200, 100));
    expect(r.ok && r.type).toBe("image/png");
  });

  it("refuses text pretending to be an image", async () => {
    const r = await prepareImage(new TextEncoder().encode("<html>hi</html>"));
    expect(!r.ok && r.error.code).toBe("not-an-image");
  });

  it("removes photo metadata when it re-encodes", async () => {
    const withExif = new Uint8Array(
      await sharp({ create: { width: 50, height: 50, channels: 3, background: "#123456" } })
        .jpeg()
        .withExif({ IFD0: { Copyright: "secret-gps-test" } })
        .toBuffer(),
    );
    const r = await prepareImage(withExif);
    if (!r.ok) throw new Error(r.error.message);
    expect(Buffer.from(r.body).includes(Buffer.from("secret-gps-test"))).toBe(false);
  });

  it("survives a hostile SVG without crashing", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="7000" height="7000"><rect width="7000" height="7000"/></svg>',
    );
    const r = await prepareImage(svg);
    expect(r.ok || r.error.code === "not-an-image").toBe(true);
  });

  it("refuses images larger than the side limit", async () => {
    const r = await prepareImage(await png(2600, 10));
    expect(!r.ok && r.error.code).toBe("too-big-dimensions");
  });

  it("turns an SVG crest into a PNG", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#1c5434"/></svg>',
    );
    const r = await prepareImage(svg);
    expect(r.ok && r.type).toBe("image/png");
  });

  it("stores, reuses identical uploads, enforces the quota and deletes", async () => {
    const a = await saveImage("u1", await png(40, 40, 1));
    expect(a.ok).toBe(true);
    const again = await saveImage("u1", await png(40, 40, 1));
    expect(again.ok && again.reused).toBe(true);
    // Parallel uploads of one image are stored once.
    const same = await png(41, 41, 3);
    const parallel = await Promise.all([saveImage("u1", same), saveImage("u1", same)]);
    const ids = new Set(parallel.map((p) => (p.ok ? p.image.id : p.error.code)));
    expect(ids.size).toBe(1);
    expect(listImages("u1")).toHaveLength(2);

    // LIMIT_ACCOUNT_BYTES=4000 in the test env: fill it with noisy images.
    const noisy = async (seed: number) =>
      new Uint8Array(
        await sharp(
          Buffer.from(
            Array.from({ length: 60 * 60 * 3 }, (_, i) => (i * 7919 + seed * 104729) % 251),
          ),
          {
            raw: { width: 60, height: 60, channels: 3 },
          },
        )
          .png({ compressionLevel: 0 })
          .toBuffer(),
      );
    let blocked = false;
    for (let i = 0; i < 6 && !blocked; i++) {
      const r = await saveImage("u1", await noisy(i));
      if (!r.ok) {
        expect(r.error.code).toBe("quota");
        blocked = true;
      }
    }
    expect(blocked).toBe(true);
    expect(usedBytes("u1")).toBeLessThanOrEqual(4000);

    if (!a.ok) throw new Error("upload failed");
    expect(await deleteImage("u1", a.image.id)).toBe(true);
    expect(await deleteImage("u2", "nope")).toBe(false);
  });
});

describe("mail", () => {
  it("builds both emails with the link in text and HTML", () => {
    const v = verifyEmail("a@example.org", "https://teamsheet11.com/x?token=1&b=2");
    expect(v.text).toContain("https://teamsheet11.com/x?token=1&b=2");
    expect(v.html).toContain("token=1&#38;b=2");
    expect(resetPassword("a@example.org", "https://t/r").subject).toMatch(/password/i);
  });

  it("writes to the dev outbox without SES", async () => {
    await sendMail(verifyEmail("box@example.org", "https://t/v"));
    const files = readdirSync(`${DIR}/outbox`);
    expect(files.some((f) => f.includes("verify-box@example.org"))).toBe(true);
    const mail = JSON.parse(readFileSync(`${DIR}/outbox/${files[0]}`, "utf8"));
    expect(mail.to).toBe("box@example.org");
  });
});
