import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import * as schema from "./schema";
import { createTestDb } from "./test-db";

// Catalog queries, sorted so the two databases compare as plain arrays.
const queries = [
  `select table_name, column_name, data_type, is_nullable, column_default
     from information_schema.columns where table_schema = 'public' order by 1, 2`,
  `select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def
     from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`,
  `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`,
];

test("migrations give the same schema as schema.ts", async () => {
  const { db, close } = await createTestDb();
  const fromSchema = new PGlite();
  try {
    const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
    await fromSchema.exec(statements.join("\n"));
    for (const q of queries) {
      const migrated = ((await db.execute(sql.raw(q))) as unknown as { rows: unknown[] }).rows;
      expect(migrated).toEqual((await fromSchema.query(q)).rows);
      expect(migrated.length).toBeGreaterThan(0);
    }
  } finally {
    await fromSchema.close();
    await close();
  }
}, 60_000);
