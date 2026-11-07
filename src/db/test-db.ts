/**
 * Test helper: a fresh in-process Postgres (PGlite) with the real migrations applied.
 * Use only in tests.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import type { Db } from "./types";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}

// The directory tables, as DDL generated from schema.ts. The auth tables are skipped: migrations
// already make them. `pushSchema` would be shorter, but its introspection queries fail on PGlite.
const AUTH_TABLES = new Set<unknown>([schema.staffAdmins, schema.authSessions, schema.authVerificationTokens, schema.rateLimits]);
const directoryTables = Object.fromEntries(Object.entries(schema).filter(([, table]) => !AUTH_TABLES.has(table)));

/**
 * Like `createTestDb`, plus the directory tables. The 0000 baseline is a comment (the tables were made
 * outside this repo), so migrations alone create none of them.
 */
let ddlCache: Promise<string> | undefined;
async function buildDirectoryDdl(): Promise<string> {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(directoryTables));
  return statements.join("\n");
}

export async function createDirectoryTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  await client.exec(await (ddlCache ??= buildDirectoryDdl()));
  return { db, close: () => client.close() };
}
