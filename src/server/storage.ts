import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { AwsClient } from "aws4fetch";
import { env } from "./env";

/**
 * Object storage for uploaded images. Production uses the Hetzner bucket over
 * the S3 API; without S3 settings (development, tests) objects live on disk.
 * Keys look like `u/<userId>/<imageId>.<ext>` and are never shown to users.
 */
export interface Storage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

function s3Storage(cfg: NonNullable<typeof env.s3>): Storage {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "s3",
  });
  const url = (key: string) =>
    `${cfg.endpoint}/${cfg.bucket}/${(cfg.prefix + key).split("/").map(encodeURIComponent).join("/")}`;
  return {
    async put(key, body, contentType) {
      const res = await client.fetch(url(key), {
        method: "PUT",
        body: body as Uint8Array<ArrayBuffer>,
        headers: { "content-type": contentType, "content-length": String(body.byteLength) },
      });
      if (!res.ok) throw new Error(`Storage refused the upload (${res.status})`);
    },
    async get(key) {
      const res = await client.fetch(url(key));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Storage read failed (${res.status})`);
      return new Uint8Array(await res.arrayBuffer());
    },
    async remove(key) {
      const res = await client.fetch(url(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed (${res.status})`);
    },
  };
}

function diskStorage(root: string): Storage {
  const path = (key: string) => {
    const p = normalize(join(root, key));
    if (!p.startsWith(normalize(root))) throw new Error("Bad storage key");
    return p;
  };
  return {
    async put(key, body) {
      await mkdir(dirname(path(key)), { recursive: true });
      await writeFile(path(key), body);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(path(key)));
      } catch {
        return null;
      }
    },
    async remove(key) {
      await rm(path(key), { force: true });
    },
  };
}

export const storage: Storage = env.s3
  ? s3Storage(env.s3)
  : diskStorage(join(env.devDir, "objects"));
export const storageKind = env.s3 ? "s3" : "disk";
