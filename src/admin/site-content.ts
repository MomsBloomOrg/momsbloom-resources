/**
 * Shared get and save for the editable text blocks (`site_content` rows: one row for each field, key =
 * prefix + field). A blank field has no row, so its default shows. The help box and the Directory
 * heading use it.
 */
import { inArray, sql } from "drizzle-orm";
import { siteContent } from "@/db/schema";
import type { Db } from "@/db/types";

export type SiteContentResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The saved rows over the defaults. */
export async function getSiteContent<T extends { [K in keyof T]: string }>(db: Db, prefix: string, defaults: T): Promise<T> {
  const fields = Object.keys(defaults) as (keyof T & string)[];
  const rows = await db
    .select({ key: siteContent.key, value: siteContent.value })
    .from(siteContent)
    .where(inArray(siteContent.key, fields.map((f) => prefix + f)));
  const content = { ...defaults };
  for (const row of rows) {
    const field = fields.find((f) => prefix + f === row.key);
    if (field) content[field] = row.value as T[typeof field];
  }
  return content;
}

/**
 * Saves the fields from the form (`FormData`-like: `get(name)`). A blank field deletes its row.
 * `check` returns the error for one trimmed, not blank value, or null. Nothing is saved when any field is refused.
 */
export async function saveSiteContent<T extends { [K in keyof T]: string }>(
  db: Db,
  prefix: string,
  defaults: T,
  form: { get(name: string): unknown },
  check: (field: keyof T & string, value: string) => string | null,
): Promise<SiteContentResult<T>> {
  const set: [string, string][] = [];
  const clear: string[] = [];
  for (const field of Object.keys(defaults) as (keyof T & string)[]) {
    const raw = form.get(field);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      clear.push(prefix + field);
      continue;
    }
    const error = check(field, value);
    if (error) return { ok: false, error };
    set.push([prefix + field, value]);
  }
  await db.transaction(async (tx) => {
    if (clear.length) await tx.delete(siteContent).where(inArray(siteContent.key, clear));
    if (set.length) {
      await tx
        .insert(siteContent)
        .values(set.map(([key, value]) => ({ key, value })))
        .onConflictDoUpdate({ target: siteContent.key, set: { value: sql`excluded.value`, updatedAt: sql`now()` } });
    }
  });
  return { ok: true, value: await getSiteContent(db, prefix, defaults) };
}
