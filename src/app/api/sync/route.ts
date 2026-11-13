import { currentRev, getState, listClubs, pushClubs, pushSchema } from "@/server/clubs";
import { env } from "@/server/env";
import { json, problem, readBody, requireUser } from "@/server/http";
import { allow } from "@/server/rate-limit";

const MAX_BODY = 8 * 1024 * 1024;

/**
 * What changed in the account after revision `since` (0 for everything): clubs
 * (including deletions) and the studio state, plus the account's current revision.
 */
export async function GET(request: Request) {
  const auth = await requireUser(request, { verified: true });
  if ("response" in auth) return auth.response;
  const id = auth.user.id;
  const since = Math.max(0, Number(new URL(request.url).searchParams.get("since") ?? 0) || 0);
  const state = getState(id);
  return json({
    clubs: listClubs(id, since),
    state: state && state.rev > since ? state : null,
    rev: currentRev(id),
  });
}

/** Saves a device's changes. Each names the revision it was based on. */
export async function PUT(request: Request) {
  const auth = await requireUser(request, { verified: true });
  if ("response" in auth) return auth.response;
  if (!allow(`sync:${auth.user.id}`, env.relaxedRateLimits ? 100000 : 600, 60 * 60 * 1000)) {
    return problem(
      429,
      "rate-limited",
      "Too many saves in a short time. Try again in a few minutes.",
    );
  }
  const raw = await readBody(request, MAX_BODY);
  if (!raw) return problem(413, "too-large", "That change is too big to save.");
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return problem(400, "bad-json", "The save didn't arrive in one piece. It will be retried.");
  }
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success)
    return problem(400, "bad-data", "The save didn't look right and was refused.");
  return json({ ...pushClubs(auth.user.id, parsed.data), rev: currentRev(auth.user.id) });
}
