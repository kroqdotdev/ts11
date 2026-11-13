import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

// ---- Better Auth core tables (names and columns as Better Auth expects) ----

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(now),
  updatedAt: timestamp("updated_at").notNull().default(now),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at").notNull().default(now),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at").notNull().default(now),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at").notNull().default(now),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Better Auth's rate limiter, kept in the database so limits survive restarts. */
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

// ---- teamsheet11 data ----

/**
 * One club (a Team in the studio) per row, saved as the studio's own JSON. `rev` is a
 * per-account counter set by the server on every write, so ordering never depends on
 * a device's clock; devices fetch "everything after rev N".
 */
export const club = sqliteTable(
  "club",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    data: text("data", { mode: "json" }).notNull(),
    rev: integer("rev").notNull(),
    /** Server time of the last write (ms), for display and clean-up only. */
    updatedAt: integer("updated_at").notNull(),
    /** Set when the club was deleted, so other devices drop it too. */
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("club_user_rev_idx").on(t.userId, t.rev),
  ],
);

/** Per-account studio state that isn't a club: the design and the open club. */
export const studioState = sqliteTable("studio_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: text("data", { mode: "json" }).notNull(),
  rev: integer("rev").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** The last revision handed out per account (clubs and studio state share it). */
export const syncCounter = sqliteTable("sync_counter", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  rev: integer("rev").notNull(),
});

/** Uploaded images; the bytes live in object storage under `key`. */
export const image = sqliteTable(
  "image",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    sha256: text("sha256").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    contentType: text("content_type").notNull(),
    /** False while the bytes are being uploaded; counts towards the quota already. */
    ready: integer("ready", { mode: "boolean" }).notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [
    index("image_user_idx").on(t.userId),
    uniqueIndex("image_user_sha_idx").on(t.userId, t.sha256),
  ],
);
