import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "../env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

function open(path: string): { sqlite: Database.Database; db: Db } {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  // WAL lets reads continue during a write and is what Litestream replicates.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return { sqlite, db };
}

// One connection per process, kept across dev hot reloads.
const g = globalThis as unknown as { __ts11db?: { sqlite: Database.Database; db: Db } };
const conn = g.__ts11db ?? open(env.databasePath);
if (!env.isProd) g.__ts11db = conn;

export const db = conn.db;
export const sqlite = conn.sqlite;
export { schema };
