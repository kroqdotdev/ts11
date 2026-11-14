import "server-only";
import { z } from "zod";
import { env } from "../env";
import { clientIp, problem } from "../http";
import { allow } from "../rate-limit";
import { DbuUnavailable } from "./client";
import { DbuNotFound, DbuPageError } from "./parse";

/*
  Shared by the /api/dbu routes. They work signed out (the import is part of the
  club setup), so they're limited per IP instead of per account. Each import step
  is one request here and a few to DBU, cached.
*/

const LIMITS = {
  search: { max: 60, windowMs: 10 * 60_000 },
  club: { max: 40, windowMs: 10 * 60_000 },
  fixtures: { max: 20, windowMs: 10 * 60_000 },
  match: { max: 40, windowMs: 10 * 60_000 },
} as const;

/** A ready 429 when this IP has made too many requests of this kind, else null. */
export function limitDbu(request: Request, kind: keyof typeof LIMITS): Response | null {
  if (env.relaxedRateLimits) return null;
  const { max, windowMs } = LIMITS[kind];
  if (allow(`dbu-${kind}:${clientIp(request)}`, max, windowMs)) return null;
  return problem(429, "rate-limited", "That's a lot of DBU lookups. Try again in a few minutes.");
}

export const clubIdSchema = z.string().regex(/^\d{1,7}$/);

/** "184253_502551": DBU's match number and pool. */
export const matchRefSchema = z
  .string()
  .regex(/^\d{1,9}_\d{1,9}$/)
  .transform((s) => {
    const [matchId, poolId] = s.split("_");
    return { matchId, poolId };
  });

/** "218563_502551,819632_515169": the team and pool ids picked in the import. */
export const teamsSchema = z
  .string()
  .regex(/^\d{1,9}_\d{1,9}(,\d{1,9}_\d{1,9}){0,9}$/)
  .transform((s) =>
    s.split(",").map((pair) => {
      const [teamId, poolId] = pair.split("_");
      return { teamId, poolId };
    }),
  );

/** The answer for a DBU failure. The details go to the server log, not the visitor. */
export function dbuProblem(e: unknown): Response {
  if (e instanceof DbuUnavailable) {
    console.warn(`[dbu] ${e.message}`);
    return problem(502, "dbu-unavailable", "DBU didn't answer. Try again in a minute.");
  }
  if (e instanceof DbuNotFound) {
    return problem(
      404,
      "dbu-not-found",
      "DBU has no page for this match. It may have been moved: update your fixtures from DBU.",
    );
  }
  if (e instanceof DbuPageError) {
    console.error(`[dbu] page not understood: ${e.message}`);
    return problem(
      502,
      "dbu-changed",
      "DBU's pages have changed, so the import can't read them right now. Add the details by hand for now.",
    );
  }
  throw e;
}
