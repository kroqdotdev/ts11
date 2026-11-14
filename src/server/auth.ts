import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { env } from "./env";
import { sendMail } from "./mail";
import { resetPassword, verifyEmail } from "./mail-templates";
import { storage } from "./storage";
import { startCleanup } from "./cleanup";

/** Per-route limits for the sign-in endpoints, per client IP. */
const strict = env.relaxedRateLimits ? 1000 : 1;
const authLimits = {
  "/sign-up/email": { window: 60 * 60, max: 5 * strict },
  "/sign-in/email": { window: 15 * 60, max: 10 * strict },
  "/request-password-reset": { window: 60 * 60, max: 5 * strict },
  "/send-verification-email": { window: 60 * 60, max: 5 * strict },
  "/reset-password": { window: 60 * 60, max: 10 * strict },
  // Read on every page load and tab focus; it can't be abused to guess anything.
  "/get-session": false,
} as const;

export const auth = betterAuth({
  appName: "teamsheet11",
  baseURL: env.baseURL,
  secret: env.secret,
  trustedOrigins: [env.baseURL],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // People can sign in straight away; syncing waits for a confirmed email.
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(resetPassword(user.email, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Off on purpose: someone could sign up with another person's address, and a
    // click on the link would then put that person's browser into their account.
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(verifyEmail(user.email, url));
    },
  },

  socialProviders: env.google
    ? {
        google: {
          clientId: env.google.clientId,
          clientSecret: env.google.clientSecret,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  databaseHooks: {
    account: {
      create: {
        // Google proves the person owns the address. If a password account already
        // claimed it without ever confirming the email, that password could belong to
        // someone else: drop it, and mark the email as confirmed.
        after: async (acc) => {
          if (acc.providerId !== "google") return;
          const owner = db
            .select({ verified: schema.user.emailVerified })
            .from(schema.user)
            .where(eq(schema.user.id, acc.userId))
            .get();
          if (owner?.verified) return;
          db.delete(schema.account)
            .where(
              and(
                eq(schema.account.userId, acc.userId),
                eq(schema.account.providerId, "credential"),
              ),
            )
            .run();
          db.update(schema.user)
            .set({ emailVerified: true })
            .where(eq(schema.user.id, acc.userId))
            .run();
          db.delete(schema.session).where(eq(schema.session.userId, acc.userId)).run();
        },
      },
    },
  },

  user: {
    deleteUser: {
      enabled: true,
      // Rows cascade from the user; the image bytes live in the bucket.
      beforeDelete: async (u) => {
        const rows = await db
          .select({ key: schema.image.key })
          .from(schema.image)
          .where(eq(schema.image.userId, u.id));
        const failed = (await Promise.allSettled(rows.map((r) => storage.remove(r.key)))).filter(
          (r) => r.status === "rejected",
        ).length;
        if (failed) console.error(`[account] ${failed} image file(s) left in storage for ${u.id}`);
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 60,
    updateAge: 60 * 60 * 24,
    // A fresh session (or the password) is needed to delete the account.
    freshAge: 60 * 60 * 24,
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 120 * strict,
    customRules: authLimits,
  },

  advanced: {
    // Caddy works out the visitor's address (it trusts Cloudflare's CF-Connecting-IP
    // only from Cloudflare's ranges) and overwrites X-Real-IP with it, so this header
    // can't be spoofed. X-Forwarded-For can: Cloudflare passes on whatever a client
    // sent. In development there's no proxy, so the tests set X-Forwarded-For.
    ipAddress: { ipAddressHeaders: env.isProd ? ["x-real-ip"] : ["x-real-ip", "x-forwarded-for"] },
    useSecureCookies: env.baseURL.startsWith("https://"),
    cookiePrefix: "ts11",
  },

  plugins: [nextCookies()],
});

startCleanup();

export type Session = typeof auth.$Infer.Session;

/** The signed-in user for an API request, or null. */
export async function currentUser(headers: Headers) {
  const s = await auth.api.getSession({ headers });
  return s?.user ?? null;
}
