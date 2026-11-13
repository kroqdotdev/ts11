import { env } from "@/server/env";
import { json, problem, requireUser } from "@/server/http";
import { deleteImage, findImageById, usedBytes } from "@/server/images";
import { storage } from "@/server/storage";

/**
 * Serves an uploaded image. The id is 128 random bits and only ever appears in
 * the owner's own clubs, so the link works as the key: crests keep showing in
 * this browser after signing out, and in exported graphics. Deleting the image
 * or the account makes the link stop working.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  const row = findImageById(id);
  if (!row) return problem(404, "not-found", "That image no longer exists.");

  const etag = `"${row.sha256.slice(0, 32)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  const body = await storage.get(row.key);
  if (!body) return problem(404, "missing", "That image couldn't be found in storage.");
  return new Response(body as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": row.contentType,
      "content-length": String(body.byteLength),
      // The id never points at different bytes, so the browser can keep it.
      "cache-control": "private, max-age=31536000, immutable",
      "x-robots-tag": "noindex",
      etag,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const auth = await requireUser(request, { verified: true });
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const removed = await deleteImage(auth.user.id, id);
  if (!removed) return problem(404, "not-found", "That image isn't in your account.");
  return json({ deleted: id, used: usedBytes(auth.user.id), limit: env.limits.accountBytes });
}
