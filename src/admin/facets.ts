/**
 * Admin: Facet values (the filter options on /admin/settings). Takes a `Db`, so PGlite tests can run it.
 * Server actions check the login; these functions check the rules. Each write is one transaction.
 *
 * Staff add, rename, move, hide, and show values. A value can be deleted only when no Program or
 * Document uses it; otherwise staff hide it (the records keep it, the filters leave it out).
 */
import { and, asc, count, eq, isNotNull, ne, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import { SERVICE_FORMAT_NAMES_READ } from "@/directory/mapper";

export const FACET_KEYS = ["category", "subcategory", "insurancePlan", "language", "audience", "cost", "serviceFormat"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

// The Subcategory table has one more column (category_id). The other columns are the same in all
// seven tables, so the shared code types them all as the Language table.
type ValueTable = typeof t.languages;
type Use = { table: PgTable; column: PgColumn };
const valueTable = (table: PgTable) => table as unknown as ValueTable;

const FACETS: Record<FacetKey, { title: string; table: ValueTable; programs: Use[]; documents: Use[] }> = {
  category: {
    title: "Categories",
    table: valueTable(t.categories),
    programs: [{ table: t.programCategories, column: t.programCategories.categoryId }],
    documents: [{ table: t.documentCategories, column: t.documentCategories.categoryId }],
  },
  subcategory: {
    title: "Subcategories",
    table: valueTable(t.subcategories),
    programs: [{ table: t.programSubcategories, column: t.programSubcategories.subcategoryId }],
    documents: [{ table: t.documentSubcategories, column: t.documentSubcategories.subcategoryId }],
  },
  insurancePlan: {
    title: "Insurance plans",
    table: valueTable(t.insurancePlans),
    programs: [{ table: t.programInsurancePlans, column: t.programInsurancePlans.insurancePlanId }],
    documents: [],
  },
  language: {
    title: "Languages",
    table: valueTable(t.languages),
    programs: [{ table: t.programLanguages, column: t.programLanguages.languageId }],
    documents: [{ table: t.documentLanguages, column: t.documentLanguages.languageId }],
  },
  audience: {
    title: "Who it serves",
    table: valueTable(t.audiences),
    programs: [{ table: t.programAudiences, column: t.programAudiences.audienceId }],
    documents: [],
  },
  cost: {
    title: "Cost",
    table: valueTable(t.costOptions),
    programs: [{ table: t.programs, column: t.programs.costOptionId }],
    documents: [],
  },
  serviceFormat: {
    title: "Service format",
    table: valueTable(t.serviceFormats),
    programs: [{ table: t.programs, column: t.programs.serviceFormatId }],
    documents: [],
  },
};

export const MAX_NAME_LENGTH = 100;

export type FacetResult<T> = { ok: true; value: T } | { ok: false; error: string };

const refuse = (error: string) => ({ ok: false, error }) as const;
const NOT_FOUND = refuse("This record does not exist. Reload the page.");

export function isFacetKey(value: unknown): value is FacetKey {
  return typeof value === "string" && (FACET_KEYS as readonly string[]).includes(value);
}

/** A form value as a database ID, or null. */
export function parseId(value: unknown): number | null {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseName(value: unknown): FacetResult<string> {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name) return refuse("Type a name.");
  if (name.length > MAX_NAME_LENGTH) return refuse(`Use ${MAX_NAME_LENGTH} characters or fewer.`);
  return { ok: true, value: name };
}

// ---------------------------------------------------------------------------------------------
// Reads

export interface AdminFacetValue {
  id: number;
  name: string;
  hidden: boolean;
  programCount: number;
  documentCount: number;
  /** Subcategories only. */
  categoryId?: number;
}

export interface AdminFacet {
  key: FacetKey;
  title: string;
  /** In the order families see (sort_order). Subcategories: each Category's own list, in order. */
  values: AdminFacetValue[];
}

async function useCounts(db: Db, uses: Use[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  for (const use of uses) {
    const rows = await db
      .select({ id: use.column, n: count() })
      .from(use.table)
      .where(isNotNull(use.column))
      .groupBy(use.column);
    for (const row of rows) counts.set(row.id as number, (counts.get(row.id as number) ?? 0) + row.n);
  }
  return counts;
}

/** Every Facet with its values and their Program and Document counts. */
export async function listFacetsForAdmin(db: Db): Promise<AdminFacet[]> {
  return Promise.all(
    FACET_KEYS.map(async (key): Promise<AdminFacet> => {
      const facet = FACETS[key];
      const table = key === "subcategory" ? t.subcategories : facet.table;
      const [rows, programs, documents] = await Promise.all([
        db.select().from(table).orderBy(asc(table.sortOrder), asc(table.id)),
        useCounts(db, facet.programs),
        useCounts(db, facet.documents),
      ]);
      return {
        key,
        title: facet.title,
        values: rows.map((row) => ({
          id: row.id,
          name: row.name,
          hidden: row.hidden,
          programCount: programs.get(row.id) ?? 0,
          documentCount: documents.get(row.id) ?? 0,
          ...("categoryId" in row ? { categoryId: row.categoryId } : {}),
        })),
      };
    }),
  );
}

// ---------------------------------------------------------------------------------------------
// Writes

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ValueRow = { id: number; name: string; sortOrder: number; hidden: boolean; categoryId?: number };

async function findValue(tx: Tx, key: FacetKey, id: number, lock = true): Promise<ValueRow | undefined> {
  if (key === "subcategory") {
    const query = tx.select().from(t.subcategories).where(eq(t.subcategories.id, id));
    const [row] = lock ? await query.for("update") : await query;
    return row;
  }
  const table = FACETS[key].table;
  const query = tx.select().from(table).where(eq(table.id, id));
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

/**
 * The values in the same list: the Facet, or for a Subcategory the other Subcategories of its Category.
 * Locks the rows until the transaction ends, so two saves of one list cannot interleave.
 */
async function siblings(tx: Tx, key: FacetKey, categoryId: number | undefined): Promise<{ id: number; sortOrder: number }[]> {
  const table = FACETS[key].table;
  const rows =
    key === "subcategory"
      ? await tx
          .select({ id: t.subcategories.id, sortOrder: t.subcategories.sortOrder })
          .from(t.subcategories)
          .where(eq(t.subcategories.categoryId, categoryId ?? -1))
          .for("no key update")
      : await tx.select({ id: table.id, sortOrder: table.sortOrder }).from(table).for("no key update");
  // Postgres sorts before it locks: a row that waited on a lock comes back with its new sortOrder in its old place.
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** Gives the values of a locked `list` (from `siblings`) the sort orders 1, 2, 3, ... in the order of `ids`. */
async function renumber(tx: Tx, key: FacetKey, list: { id: number; sortOrder: number }[], ids: number[]): Promise<void> {
  const table = FACETS[key].table;
  const sortOrderOf = new Map(list.map((row) => [row.id, row.sortOrder]));
  for (const [index, id] of ids.entries()) {
    if (sortOrderOf.get(id) !== index + 1) await tx.update(table).set({ sortOrder: index + 1 }).where(eq(table.id, id));
  }
}

/** True when another value in the same list has this name, without case. */
async function nameTaken(tx: Tx, key: FacetKey, name: string, categoryId: number | undefined, exceptId: number | null): Promise<boolean> {
  const table = key === "subcategory" ? t.subcategories : FACETS[key].table;
  const [clash] = await tx
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        key === "subcategory" ? eq(t.subcategories.categoryId, categoryId ?? -1) : undefined,
        exceptId === null ? undefined : ne(table.id, exceptId),
        sql`lower(${table.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  return clash !== undefined;
}

const takenMessage = (name: string) => `Another value in this list is named "${name}".`;

/** Postgres unique violation (23505). Drivers put the code on the error or on its `cause`. */
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/** Runs a write; a unique violation (two saves of one name at the same moment) becomes the "name taken" refusal. */
async function refuseTakenName<T>(name: string, write: () => Promise<FacetResult<T>>): Promise<FacetResult<T>> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error)) return refuse(takenMessage(name));
    throw error;
  }
}

/** Adds a value at the end of its list. A Subcategory needs `categoryId`. */
export async function addFacetValue(
  db: Db,
  input: { key: FacetKey; name: unknown; categoryId?: unknown },
): Promise<FacetResult<{ id: number; name: string }>> {
  const parsed = parseName(input.name);
  if (!parsed.ok) return parsed;
  const name = parsed.value;
  const categoryId = input.key === "subcategory" ? parseId(input.categoryId) : undefined;
  if (categoryId === null) return NOT_FOUND;

  return refuseTakenName(name, () => db.transaction(async (tx) => {
    if (categoryId !== undefined) {
      const [category] = await tx.select({ id: t.categories.id }).from(t.categories).where(eq(t.categories.id, categoryId));
      if (!category) return NOT_FOUND;
    }
    if (await nameTaken(tx, input.key, name, categoryId, null)) return refuse(takenMessage(name));
    const list = await siblings(tx, input.key, categoryId);
    const sortOrder = Math.max(0, ...list.map((row) => row.sortOrder)) + 1;
    const [created] =
      categoryId !== undefined
        ? await tx.insert(t.subcategories).values({ categoryId, name, sortOrder }).returning({ id: t.subcategories.id, name: t.subcategories.name })
        : await tx.insert(FACETS[input.key].table).values({ name, sortOrder }).returning({ id: FACETS[input.key].table.id, name: FACETS[input.key].table.name });
    return { ok: true, value: created } as const;
  }));
}

/** Renames a value. Records point to the value, so the new name shows everywhere at once. */
export async function renameFacetValue(db: Db, input: { key: FacetKey; id: unknown; name: unknown }): Promise<FacetResult<{ name: string }>> {
  const parsed = parseName(input.name);
  if (!parsed.ok) return parsed;
  const id = parseId(input.id);
  if (id === null) return NOT_FOUND;
  const name = parsed.value;

  return refuseTakenName(name, () => db.transaction(async (tx) => {
    const current = await findValue(tx, input.key, id);
    if (!current) return NOT_FOUND;
    if (input.key === "serviceFormat" && SERVICE_FORMAT_NAMES_READ.includes(current.name.trim().toLowerCase()) && name.toLowerCase() !== current.name.trim().toLowerCase()) {
      return refuse(`The Directory reads the name "${current.name}" to sort Programs into in person and virtual. Keep this name.`);
    }
    if (await nameTaken(tx, input.key, name, current.categoryId, id)) return refuse(takenMessage(name));
    const table = FACETS[input.key].table;
    await tx.update(table).set({ name }).where(eq(table.id, id));
    return { ok: true, value: { name } } as const;
  }));
}

/**
 * Moves a value one place up or down in its list. All values of the list get new sort orders
 * (1, 2, 3, ...), so equal sort orders from the import cannot block a move.
 */
export async function moveFacetValue(db: Db, input: { key: FacetKey; id: unknown; direction: "up" | "down" }): Promise<FacetResult<{ name: string }>> {
  const id = parseId(input.id);
  if (id === null) return NOT_FOUND;

  return db.transaction(async (tx) => {
    // No row lock here: `siblings` locks the whole list, and a row lock first would deadlock with a second move.
    const current = await findValue(tx, input.key, id, false);
    if (!current) return NOT_FOUND;
    const list = await siblings(tx, input.key, current.categoryId);
    const ids = list.map((row) => row.id);
    const from = ids.indexOf(id);
    const to = input.direction === "up" ? from - 1 : from + 1;
    if (from < 0) return NOT_FOUND;
    if (to < 0 || to >= ids.length) return { ok: true, value: { name: current.name } } as const;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await renumber(tx, input.key, list, ids);
    return { ok: true, value: { name: current.name } } as const;
  });
}

/**
 * Saves a new order for one list (a drag and drop). `ids` must be exactly the values of the list:
 * the Facet, or for Subcategories the Subcategories of `categoryId`. Sort orders become 1, 2, 3, ...
 */
export async function reorderFacetValues(
  db: Db,
  input: { key: FacetKey; categoryId?: unknown; ids: unknown },
): Promise<FacetResult<{ count: number }>> {
  const ids = Array.isArray(input.ids) ? input.ids.map((id) => parseId(String(id))) : [];
  const categoryId = input.key === "subcategory" ? parseId(String(input.categoryId)) : undefined;
  if (ids.length === 0 || ids.includes(null) || new Set(ids).size !== ids.length || categoryId === null) return NOT_FOUND;

  return db.transaction(async (tx) => {
    const list = await siblings(tx, input.key, categoryId);
    if (list.length !== ids.length || list.some((row) => !ids.includes(row.id))) {
      return refuse("This list changed since you opened it. Reload the page.");
    }
    await renumber(tx, input.key, list, ids as number[]);
    return { ok: true, value: { count: ids.length } } as const;
  });
}

/** Hides or shows a value. A hidden value stays on its records; the Directory filters leave it out. */
export async function setFacetValueHidden(db: Db, input: { key: FacetKey; id: unknown; hidden: boolean }): Promise<FacetResult<{ name: string }>> {
  const id = parseId(input.id);
  if (id === null) return NOT_FOUND;
  const table = FACETS[input.key].table;
  const [updated] = await db.update(table).set({ hidden: input.hidden }).where(eq(table.id, id)).returning({ name: table.name });
  return updated ? { ok: true, value: updated } : NOT_FOUND;
}

/** Deletes a value that no Program or Document uses. A Category with Subcategories is refused. */
export async function deleteFacetValue(db: Db, input: { key: FacetKey; id: unknown }): Promise<FacetResult<{ name: string }>> {
  const id = parseId(input.id);
  if (id === null) return NOT_FOUND;
  const facet = FACETS[input.key];

  return db.transaction(async (tx) => {
    const current = await findValue(tx, input.key, id);
    if (!current) return NOT_FOUND;
    let used = 0;
    for (const use of [...facet.programs, ...facet.documents]) {
      const [row] = await tx.select({ n: count() }).from(use.table).where(eq(use.column, id));
      used += row.n;
    }
    if (used > 0) return refuse(`"${current.name}" is in use ${used} ${used === 1 ? "time" : "times"}. Hide it instead.`);
    if (input.key === "category") {
      const [row] = await tx.select({ n: count() }).from(t.subcategories).where(eq(t.subcategories.categoryId, id));
      if (row.n > 0) return refuse(`"${current.name}" has Subcategories. Delete them first, or hide the Category.`);
    }
    await tx.delete(facet.table).where(eq(facet.table.id, id));
    return { ok: true, value: { name: current.name } } as const;
  });
}
