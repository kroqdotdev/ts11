import "server-only";
import { currentUser } from "./auth";
import { env } from "./env";

export type User = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

export function problem(status: number, code: string, message: string, extra?: object) {
  return json({ error: code, message, ...extra }, status);
}

/**
 * The signed-in user, or a ready error response. Saving to the account needs a
 * confirmed email, so a throwaway sign-up can't use storage.
 */
export async function requireUser(
  request: Request,
  opts: { verified?: boolean } = {},
): Promise<{ user: User } | { response: Response }> {
  // Changes must come from our own pages (the session cookie alone isn't enough).
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin !== new URL(env.baseURL).origin) {
      return { response: problem(403, "bad-origin", "That request didn't come from teamsheet11.") };
    }
  }
  const user = await currentUser(request.headers);
  if (!user) return { response: problem(401, "signed-out", "Sign in to save to your account.") };
  if (opts.verified && !user.emailVerified) {
    return {
      response: problem(
        403,
        "unverified",
        "Confirm your email first. We sent you a link when you signed up.",
      ),
    };
  }
  return { user };
}

/**
 * Reads a request body up to `max` bytes. Content-Length can be left out (chunked
 * uploads), so the stream itself is counted. Returns null when it's too big.
 */
export async function readBody(request: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > max) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}
