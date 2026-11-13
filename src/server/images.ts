import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import sharp, { type Metadata, type OutputInfo } from "sharp";
import { db, schema } from "./db";
import { env } from "./env";
import { storage } from "./storage";

export type ImageError =
  | { code: "too-large"; message: string }
  | { code: "too-big-dimensions"; message: string }
  | { code: "not-an-image"; message: string }
  | { code: "busy"; message: string }
  | { code: "quota"; message: string; used: number; limit: number };

export interface StoredImage {
  id: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  contentType: string;
  createdAt: number;
}

export function imageUrl(id: string) {
  return `/api/images/${id}`;
}

/** Bytes counted against the account, including uploads still in progress. */
export function usedBytes(userId: string): number {
  const row = db
    .select({ n: sql<number>`coalesce(sum(${schema.image.bytes}), 0)` })
    .from(schema.image)
    .where(eq(schema.image.userId, userId))
    .get();
  return row?.n ?? 0;
}

const megabytes = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
const fail = (error: ImageError) => ({ ok: false as const, error });

// Image work is CPU heavy; a few at a time keeps the site responsive.
let running = 0;
const MAX_RUNNING = 2;
const MAX_PIXELS = 40_000_000;
const READABLE = ["jpeg", "png", "webp", "heif", "avif", "gif", "tiff", "svg"];

/**
 * Checks an upload and re-encodes it into something safe to serve back: JPEG, PNG or
 * WebP, within the limits, with metadata (EXIF, GPS) removed. SVG crests are rendered
 * to PNG here, since an SVG served from our own origin could run script.
 */
export async function prepareImage(
  input: Uint8Array,
): Promise<
  | { ok: true; body: Uint8Array; type: string; width: number; height: number }
  | { ok: false; error: ImageError }
> {
  const { imageBytes, imageSide } = env.limits;
  const tooLarge = () =>
    fail({ code: "too-large", message: `Images can be up to ${megabytes(imageBytes)}.` });
  if (input.byteLength > imageBytes) return tooLarge();
  if (running >= MAX_RUNNING) {
    return fail({ code: "busy", message: "Lots of uploads right now. Try again in a moment." });
  }

  running++;
  try {
    let meta: Metadata;
    try {
      meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
    } catch {
      return fail({ code: "not-an-image", message: "That file isn't an image we can read." });
    }
    const format = meta.format ?? "";
    const vector = format === "svg";
    if (!READABLE.includes(format)) {
      return fail({ code: "not-an-image", message: "Use a PNG, JPEG, WebP or SVG image." });
    }
    if (!vector && ((meta.width ?? 0) > imageSide || (meta.height ?? 0) > imageSide)) {
      return fail({
        code: "too-big-dimensions",
        message: `Images can be up to ${imageSide} pixels on the longest side.`,
      });
    }

    let out: { data: Buffer; info: OutputInfo };
    try {
      let img = sharp(input, {
        limitInputPixels: MAX_PIXELS,
        density: vector ? 144 : undefined,
        animated: false,
      })
        .timeout({ seconds: 4 })
        .rotate();
      if (vector) img = img.resize({ width: 1024, height: 1024, fit: "inside" });
      // Photos stay JPEG; anything that may have transparency becomes PNG or WebP.
      if (format === "jpeg") img = img.jpeg({ quality: 88, mozjpeg: true });
      else if (format === "webp") img = img.webp({ quality: 90 });
      else if (format === "png" || meta.hasAlpha || vector) img = img.png({ compressionLevel: 9 });
      else img = img.webp({ quality: 90 });
      out = await img.toBuffer({ resolveWithObject: true });
    } catch {
      return fail({
        code: "not-an-image",
        message: "That image couldn't be read. Try a PNG or JPEG.",
      });
    }

    if (out.data.byteLength > imageBytes) return tooLarge();
    return {
      ok: true,
      body: new Uint8Array(out.data),
      type: `image/${out.info.format}`,
      width: out.info.width,
      height: out.info.height,
    };
  } finally {
    running--;
  }
}

/**
 * Saves an upload for a user, reusing an identical earlier upload. The bytes are
 * reserved in one synchronous transaction before anything is stored, so parallel
 * uploads can't slip past the quota or store the same image twice.
 */
export async function saveImage(
  userId: string,
  input: Uint8Array,
): Promise<{ ok: true; image: StoredImage; reused: boolean } | { ok: false; error: ImageError }> {
  const prepared = await prepareImage(input);
  if (!prepared.ok) return prepared;

  const sha256 = createHash("sha256").update(prepared.body).digest("hex");
  const id = randomUUID().replace(/-/g, "");
  const key = `u/${userId}/${id}.${prepared.type.split("/")[1]}`;
  const limit = env.limits.accountBytes;

  const reserved = db.transaction((tx) => {
    const same = tx
      .select()
      .from(schema.image)
      .where(and(eq(schema.image.userId, userId), eq(schema.image.sha256, sha256)))
      .get();
    if (same) return { kind: "reused" as const, row: same };
    const used =
      tx
        .select({ n: sql<number>`coalesce(sum(${schema.image.bytes}), 0)` })
        .from(schema.image)
        .where(eq(schema.image.userId, userId))
        .get()?.n ?? 0;
    if (used + prepared.body.byteLength > limit) return { kind: "full" as const, used };
    const row = {
      id,
      userId,
      key,
      sha256,
      bytes: prepared.body.byteLength,
      width: prepared.width,
      height: prepared.height,
      contentType: prepared.type,
      ready: false,
      createdAt: new Date(),
    };
    tx.insert(schema.image).values(row).run();
    return { kind: "new" as const, row };
  });

  if (reserved.kind === "full") {
    return fail({
      code: "quota",
      message: "Your image storage is full. Delete images you no longer use to make room.",
      used: reserved.used,
      limit,
    });
  }
  if (reserved.kind === "reused") {
    // A parallel upload of the same image may still be on its way; it's the same bytes.
    return { ok: true, image: toStored(reserved.row), reused: true };
  }

  try {
    await storage.put(key, prepared.body, prepared.type);
  } catch (e) {
    db.delete(schema.image).where(eq(schema.image.id, id)).run();
    throw e;
  }
  const done = db
    .update(schema.image)
    .set({ ready: true })
    .where(eq(schema.image.id, id))
    .returning()
    .get();
  if (!done) {
    // The account was deleted while this was uploading: don't leave the file behind.
    await storage.remove(key).catch(() => undefined);
    return fail({ code: "not-an-image", message: "Your account no longer exists." });
  }
  return { ok: true, image: toStored(done), reused: false };
}

function toStored(r: typeof schema.image.$inferSelect): StoredImage {
  return {
    id: r.id,
    url: imageUrl(r.id),
    bytes: r.bytes,
    width: r.width,
    height: r.height,
    contentType: r.contentType,
    createdAt: r.createdAt.getTime(),
  };
}

export function listImages(userId: string): StoredImage[] {
  return db
    .select()
    .from(schema.image)
    .where(and(eq(schema.image.userId, userId), eq(schema.image.ready, true)))
    .orderBy(desc(schema.image.createdAt))
    .all()
    .map(toStored);
}

/** Looks an image up by its unguessable id alone (for serving it). */
export function findImageById(id: string) {
  if (!/^[a-f0-9]{20,32}$/.test(id)) return null;
  return (
    db
      .select()
      .from(schema.image)
      .where(and(eq(schema.image.id, id), eq(schema.image.ready, true)))
      .get() ?? null
  );
}

export function findImage(userId: string, id: string) {
  return (
    db
      .select()
      .from(schema.image)
      .where(and(eq(schema.image.userId, userId), eq(schema.image.id, id)))
      .get() ?? null
  );
}

export async function deleteImage(userId: string, id: string): Promise<boolean> {
  const row = findImage(userId, id);
  if (!row || !row.ready) return false;
  db.delete(schema.image).where(eq(schema.image.id, id)).run();
  await storage.remove(row.key);
  return true;
}
