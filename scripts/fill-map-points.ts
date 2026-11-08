/**
 * One-time fill of missing map points for stored Organizations and Programs, from the US Census geocoder.
 * Dry run by default: lists what it would look up. `--write` saves the points that the Census returns.
 * Never changes Last verified. Run only against the DATABASE_URL you mean to change.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { geocodeAddress, needsMapPoint } from "../src/admin/geocode";
import { openDb, requireDatabaseUrl } from "../src/db/client";
import { loadLocalEnv } from "../src/db/load-env";
import * as t from "../src/db/schema";

loadLocalEnv();
const write = process.argv.includes("--write");
const DELAY_MS = 250; // one Census call at a time, politely spaced
const { db, close } = openDb(requireDatabaseUrl(), { max: 1 });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const formats = await db.select().from(t.serviceFormats);
  const virtualId = formats.find((f) => f.name.trim().toLowerCase() === "virtual")?.id ?? null;

  const orgs = (await db.select().from(t.organizations).orderBy(asc(t.organizations.id)))
    .filter((r) => needsMapPoint(r, null))
    .map((r) => ({ label: "organization", id: r.id, name: r.name, row: r, table: t.organizations }));
  const programs = (await db.select().from(t.programs).orderBy(asc(t.programs.id)))
    .filter((r) => needsMapPoint(r, virtualId))
    .map((r) => ({ label: "program", id: r.id, name: r.name, row: r, table: t.programs }));
  const todo = [...orgs, ...programs];
  console.log(`${write ? "WRITE" : "DRY RUN"}: ${todo.length} record(s) need a map point.`);

  let filled = 0;
  const notPlaced: string[] = [];
  for (const { label, id, name, row, table } of todo) {
    const address = [row.streetAddress, row.city, row.state, row.zip].filter(Boolean).join(", ");
    if (!write) {
      console.log(`would look up ${label} ${id} "${name}": ${address}`);
      continue;
    }
    const point = await geocodeAddress(address);
    if (point) {
      // Only where the point is still empty, so a save in the Admin since the read is never overwritten.
      const done = await db
        .update(table)
        .set(point)
        .where(and(eq(table.id, id), isNull(table.latitude), isNull(table.longitude)))
        .returning({ id: table.id });
      if (done.length) filled++;
      console.log(`filled ${label} ${id} "${name}": ${point.latitude}, ${point.longitude}`);
    } else {
      notPlaced.push(`${label} ${id} "${name}": ${address}`);
      console.log(`NOT PLACED ${label} ${id} "${name}"`);
    }
    await sleep(DELAY_MS);
  }

  if (!write) return console.log("Nothing saved. Run again with --write to save.");
  console.log(`\nFilled ${filled}. The Census could not place ${notPlaced.length}:`);
  for (const line of notPlaced) console.log(`  ${line}`);
  console.log("\nSave any record in the Admin, or redeploy.");
}

main()
  .catch((error) => {
    console.error("Fill failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(close);
