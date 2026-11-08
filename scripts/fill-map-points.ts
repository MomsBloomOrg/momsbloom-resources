/**
 * One-time fill of missing map points for stored Organizations and Programs, from the US Census geocoder.
 * Dry run by default: lists what it would look up. `--write` saves the points that the Census returns.
 * Never changes Last verified. Run only against the DATABASE_URL you mean to change.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { geocodeAddress, needsMapPoint } from "../src/admin/geocode";
import { openDb, requireDatabaseUrl } from "../src/db/client";
import { describeDatabase } from "../src/db/describe-database";
import { loadLocalEnv } from "../src/db/load-env";
import * as t from "../src/db/schema";

// Read before loadLocalEnv: --write must not run on a value that only came from .env.local.
const explicitUrl = Boolean(process.env.DATABASE_URL);
loadLocalEnv();
const write = process.argv.includes("--write");
const DELAY_MS = 250; // one Census call at a time, politely spaced
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Error names only: an error message can contain the connection string.
/** An error whose message is safe to print (it never holds the connection string). */
class Known extends Error {}
const errName = (e: unknown) => (e instanceof Error ? e.name : "UnknownError");

async function main() {
  if (!process.env.DATABASE_URL) throw new Known("DATABASE_URL is not set");
  const url = requireDatabaseUrl();
  console.log(`Database: ${describeDatabase(url)}`);
  if (write && !explicitUrl) {
    throw new Known("--write needs DATABASE_URL set in the environment (see the PR commands), not only in .env.local.");
  }
  const { db, close } = openDb(url, { max: 1 });
  let errors = 0;
  try {
    const formats = await db.select().from(t.serviceFormats);
    const virtualId = formats.find((f) => f.name.trim().toLowerCase() === "virtual")?.id ?? null;
    if (virtualId == null) console.warn("WARNING: no Service format named Virtual. Virtual-only Programs will be looked up.");

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
      try {
        // Only one of latitude and longitude is set: a person typed it. Leave it for staff.
        if ((row.latitude == null) !== (row.longitude == null)) {
          console.log(`SKIPPED: partial point ${label} ${id} "${name}"`);
          continue;
        }
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
          if (done.length) {
            filled++;
            console.log(`filled ${label} ${id} "${name}": ${point.latitude}, ${point.longitude}`);
          } else {
            console.log(`SKIPPED: point already set ${label} ${id} "${name}"`);
          }
        } else {
          notPlaced.push(`${label} ${id} "${name}": ${address}`);
          console.log(`NOT PLACED ${label} ${id} "${name}"`);
        }
        await sleep(DELAY_MS);
      } catch (e) {
        errors++;
        console.log(`ERROR ${label} ${id}: ${errName(e)}`);
      }
    }

    if (!write) return console.log("Nothing saved. Run again with --write to save.");
    console.log(`\nFilled ${filled}. The Census could not place ${notPlaced.length}:`);
    for (const line of notPlaced) console.log(`  ${line}`);
    if (filled === 0 && notPlaced.length > 0) console.log("\nNothing was placed. The Census may be down; try again later.");
    if (errors) console.log(`\n${errors} record(s) had an ERROR. See above.`);
    console.log("\nSave any record in the Admin, or redeploy.");
  } finally {
    await close();
  }
  if (errors) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Fill failed:", error instanceof Known ? error.message : errName(error));
  process.exitCode = 1;
});
