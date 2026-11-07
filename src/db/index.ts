import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { openDb, requireDatabaseUrl } from "./client";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

// One database handle per server instance. `globalThis` keeps it across dev hot reloads, unless the
// schema changed: Drizzle caches each table's column names in the handle, so after a hot reload of
// schema.ts a new column would have no name and every query using it would fail. Then reopen.
const instance = globalThis as unknown as {
  __momsbloomDb?: Db;
  __momsbloomDbSchema?: typeof schema;
  __momsbloomDbClose?: () => Promise<void>;
};

/**
 * The app's database. Nothing connects until the first call, so `next build` needs no database.
 *
 * - Neon (production, and local dev with a Neon URL): one module-scope WebSocket `Pool`, attached
 *   with `attachDatabasePool` (Vercel Fluid compute guidance). Vercel keeps the function instance
 *   alive until idle connections are closed, and requests on the same instance share the Pool.
 *   Outside Vercel, `attachDatabasePool` does nothing.
 * - postgres-js (Docker): one client for the life of the server.
 */
export function getDb(): Db {
  if (instance.__momsbloomDb && instance.__momsbloomDbSchema === schema) return instance.__momsbloomDb;
  instance.__momsbloomDbClose?.().catch(() => {}); // Dev only: the handle from before the schema reload.
  const opened = openDb(requireDatabaseUrl());
  if (opened.neonPool) attachDatabasePool(opened.neonPool);
  instance.__momsbloomDb = opened.db;
  instance.__momsbloomDbSchema = schema;
  instance.__momsbloomDbClose = opened.close;
  return opened.db;
}
