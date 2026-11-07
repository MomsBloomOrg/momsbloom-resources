/**
 * Local dev only: builds the tables with `drizzle-kit push`, then inserts made-up sample rows
 * (src/admin/sample-data.ts). Run it with `pnpm db:seed-sample`.
 *
 * It refuses any host except localhost, so it can never write to Neon. It does nothing when the
 * statuses table already has rows.
 */
import { execFileSync } from "node:child_process";
import { insertSampleData } from "../src/admin/sample-data";
import { openDb, requireDatabaseUrl } from "../src/db/client";
import { loadLocalEnv } from "../src/db/load-env";
import { statuses } from "../src/db/schema";

loadLocalEnv();
const url = requireDatabaseUrl();
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  console.error("Refusing to seed: DATABASE_URL is not a local database.");
  process.exit(1);
}

// --force skips the data-loss prompt; the local database is throwaway.
execFileSync("pnpm", ["drizzle-kit", "push", "--force"], { stdio: "inherit" });

async function main() {
  const { db, close } = openDb(url, { max: 1 });
  try {
    if ((await db.select({ id: statuses.id }).from(statuses).limit(1)).length > 0) {
      console.log("Sample data skipped: the database already has rows.");
    } else {
      await insertSampleData(db);
      console.log("Sample data inserted.");
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.name : error);
  process.exit(1);
});
