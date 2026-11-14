import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "./db";

/**
 * An account whose email is never confirmed is removed a week after sign-up, as the
 * confirmation email promises. Unconfirmed accounts can't save clubs or images, so
 * only the account's own rows go (sessions and sign-in methods cascade).
 */
export const UNCONFIRMED_DAYS = 7;

export function removeUnconfirmedAccounts(now = Date.now()): number {
  const cutoff = new Date(now - UNCONFIRMED_DAYS * 24 * 60 * 60 * 1000);
  return db
    .delete(schema.user)
    .where(and(eq(schema.user.emailVerified, false), lt(schema.user.createdAt, cutoff)))
    .run().changes;
}

const g = globalThis as unknown as { __ts11Cleanup?: boolean };

/** Runs the cleanup now and every six hours, once per server process. */
export function startCleanup(): void {
  if (g.__ts11Cleanup || process.env.VITEST) return;
  g.__ts11Cleanup = true;
  const run = () => {
    try {
      const n = removeUnconfirmedAccounts();
      if (n) console.info(`[cleanup] removed ${n} unconfirmed account(s)`);
    } catch (e) {
      console.error(`[cleanup] failed: ${(e as Error).message}`);
    }
  };
  run();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}
