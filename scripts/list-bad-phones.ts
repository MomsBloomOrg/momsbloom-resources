/** Read-only report of stored phone numbers that the Admin will refuse. Prints IDs only. */
import { asc } from "drizzle-orm";
import { normalizePhone } from "../src/admin/phone";
import { openDb, requireDatabaseUrl } from "../src/db/client";
import { loadLocalEnv } from "../src/db/load-env";
import * as t from "../src/db/schema";

loadLocalEnv();
const { db, close } = openDb(requireDatabaseUrl(), { max: 1 });

async function main() {
  const sources = [
    ["organization", t.organizations] as const,
    ["program", t.programs] as const,
    ["contact", t.contacts] as const,
  ];

  for (const [label, table] of sources) {
    const rows = await db.select({ id: table.id, phone: table.phone }).from(table).orderBy(asc(table.id));
    for (const row of rows) {
      if (row.phone?.trim() && !normalizePhone(row.phone)) console.log(`${label} ${row.id}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Phone report failed:", error instanceof Error ? error.name : error);
    process.exitCode = 1;
  })
  .finally(close);
