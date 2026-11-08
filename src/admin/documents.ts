/** Admin: Documents (PDF guides). Takes a `Db`, so PGlite tests can run it. Results never throw for bad input. */
import { eq, inArray } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import {
  FIX_FIELDS,
  GONE,
  NO_STATUS,
  isRealDate,
  listStatuses,
  parseId,
  parseTextFields,
  statusExists,
  str,
  todayInDetroit,
  type AdminResult,
  type Raw,
  type StatusOption,
} from "./organizations";
import { allExist, shownOptions, shownSubcategories, type Option } from "./programs";

export const DOCUMENT_LISTS = ["categoryIds", "subcategoryIds", "languageIds"] as const;
export type DocumentListKey = (typeof DOCUMENT_LISTS)[number];

export interface DocumentFields {
  title: string;
  description: string | null;
  searchKeywords: string | null;
  /** A full http(s) URL: the PDF stays on momsbloom.org. */
  url: string;
  /** ISO date or null. */
  lastVerified: string | null;
  /** Staff admin email. Left out: the column does not change (see stampVerifiedBy). */
  lastVerifiedBy?: string | null;
  statusId: number;
  /** Optional: the Document also shows on this Organization's page. */
  organizationId: number | null;
  internalNotes: string | null;
}

export type DocumentInput = DocumentFields & Record<DocumentListKey, number[]>;

const TEXT_FIELDS = [
  ["description", "Description", 5000],
  ["searchKeywords", "Search keywords", 1000],
  ["internalNotes", "Internal notes", 5000],
] as const;

const RELOAD = "Reload the page and try again.";

/** Trims and checks the form values of a Document. Checks the shape of each ID, not that it exists: `saveDocument` does that. */
export function parseDocumentInput(data: FormData): AdminResult<DocumentInput> {
  const raw: Raw = Object.fromEntries(data);
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};

  out.title = str(raw, "title");
  if (!out.title) errors.title = "Enter a title.";
  else if ((out.title as string).length > 200) errors.title = "Use 200 characters or fewer.";

  parseTextFields(raw, TEXT_FIELDS, errors, out);

  const url = str(raw, "url");
  out.url = url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
    if (url.length > 2000) throw new Error("length");
  } catch {
    errors.url = "Enter the full PDF link, starting with https:// or http://.";
  }

  const verified = str(raw, "lastVerified");
  out.lastVerified = verified || null;
  if (verified && (!/^\d{4}-\d{2}-\d{2}$/.test(verified) || !isRealDate(verified))) errors.lastVerified = "Enter a date.";

  out.statusId = parseId(raw.statusId);
  if (out.statusId === null) errors.statusId = "Select a Status.";

  // Blank means no Organization; any other value must be an ID.
  const organization = str(raw, "organizationId");
  out.organizationId = organization ? parseId(organization) : null;
  if (organization && out.organizationId === null) errors.organizationId = RELOAD;

  for (const key of DOCUMENT_LISTS) {
    const ids = data.getAll(key).map(parseId);
    if (ids.some((id) => id === null)) errors[key] = RELOAD;
    out[key] = [...new Set(ids.filter((id) => id !== null))];
  }

  if (Object.keys(errors).length > 0) return { ok: false, error: FIX_FIELDS, fieldErrors: errors };
  return { ok: true, value: out as unknown as DocumentInput };
}

/** Checks every ID against the database. Returns a refusal, or null when all is well. */
async function checkReferences(db: Db, input: DocumentInput): Promise<AdminResult<never> | null> {
  const refused = (key: string, message = "This value does not exist. Reload the page.") =>
    ({ ok: false, error: FIX_FIELDS, fieldErrors: { [key]: message } }) as const;

  if (!(await statusExists(db, input.statusId))) return NO_STATUS;
  if (input.organizationId !== null && !(await allExist(db, t.organizations, [input.organizationId])))
    return refused("organizationId", "That Organization does not exist. Reload the page.");
  if (!(await allExist(db, t.categories, input.categoryIds))) return refused("categoryIds");
  if (!(await allExist(db, t.languages, input.languageIds))) return refused("languageIds");
  if (input.subcategoryIds.length > 0) {
    const subs = await db
      .select({ categoryId: t.subcategories.categoryId })
      .from(t.subcategories)
      .where(inArray(t.subcategories.id, input.subcategoryIds));
    if (subs.length !== input.subcategoryIds.length) return refused("subcategoryIds");
    if (subs.some((s) => !input.categoryIds.includes(s.categoryId))) return refused("subcategoryIds", "Each Subcategory needs its Category checked.");
  }
  return null;
}

/**
 * Creates (`id` null) or updates a Document and replaces its three join tables, all in one transaction:
 * a refused check or a failed write leaves the Document as it was.
 */
export async function saveDocument(db: Db, id: number | null, input: DocumentInput): Promise<AdminResult<{ id: number }>> {
  return db.transaction(async (tx) => {
    const refusal = await checkReferences(tx, input);
    if (refusal) return refusal;
    const { categoryIds, subcategoryIds, languageIds, ...fields } = input;

    const [row] =
      id === null
        ? await tx.insert(t.documents).values(fields).returning({ id: t.documents.id })
        : await tx
            .update(t.documents)
            .set({ ...fields, updatedAt: new Date().toISOString() })
            .where(eq(t.documents.id, id))
            .returning({ id: t.documents.id });
    if (!row) return { ok: false, error: GONE } as const;
    const documentId = row.id;

    await tx.delete(t.documentCategories).where(eq(t.documentCategories.documentId, documentId));
    await tx.delete(t.documentSubcategories).where(eq(t.documentSubcategories.documentId, documentId));
    await tx.delete(t.documentLanguages).where(eq(t.documentLanguages.documentId, documentId));
    if (categoryIds.length) await tx.insert(t.documentCategories).values(categoryIds.map((categoryId) => ({ documentId, categoryId })));
    if (subcategoryIds.length) await tx.insert(t.documentSubcategories).values(subcategoryIds.map((subcategoryId) => ({ documentId, subcategoryId })));
    if (languageIds.length) await tx.insert(t.documentLanguages).values(languageIds.map((languageId) => ({ documentId, languageId })));
    return { ok: true, value: { id: documentId } } as const;
  });
}

/** Sets Last verified to today (Michigan) and Verified by to `by` (the Staff admin's email); changes nothing else. */
export async function markDocumentVerified(db: Db, id: number, by: string, now = new Date()): Promise<AdminResult<{ lastVerified: string }>> {
  const lastVerified = todayInDetroit(now);
  const rows = await db
    .update(t.documents)
    .set({ lastVerified, lastVerifiedBy: by, updatedAt: now.toISOString() })
    .where(eq(t.documents.id, id))
    .returning({ id: t.documents.id });
  return rows.length ? { ok: true, value: { lastVerified } } : { ok: false, error: GONE };
}

export interface DocumentListRow {
  id: number;
  title: string;
  statusName: string;
  showOnSite: boolean;
  lastVerified: string | null;
}

/** Every Document, A to Z. */
export async function listDocumentsForAdmin(db: Db): Promise<DocumentListRow[]> {
  return db
    .select({
      id: t.documents.id,
      title: t.documents.title,
      statusName: t.statuses.name,
      showOnSite: t.statuses.showOnSite,
      lastVerified: t.documents.lastVerified,
    })
    .from(t.documents)
    .innerJoin(t.statuses, eq(t.statuses.id, t.documents.statusId))
    .orderBy(t.documents.title, t.documents.id);
}

export interface DocumentDetail {
  document: DocumentInput & { id: number; updatedAt: string };
}

/** The Document with all its fields (Internal notes too) and its Facet values; null when the ID is unknown. */
export async function getDocumentForAdmin(db: Db, id: number): Promise<DocumentDetail | null> {
  const [document] = await db.select().from(t.documents).where(eq(t.documents.id, id));
  if (!document) return null;
  const [categories, subcategories, languages] = await Promise.all([
    db.select({ id: t.documentCategories.categoryId }).from(t.documentCategories).where(eq(t.documentCategories.documentId, id)),
    db.select({ id: t.documentSubcategories.subcategoryId }).from(t.documentSubcategories).where(eq(t.documentSubcategories.documentId, id)),
    db.select({ id: t.documentLanguages.languageId }).from(t.documentLanguages).where(eq(t.documentLanguages.documentId, id)),
  ]);
  const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
  const fields = { ...document, createdAt: undefined };
  return {
    document: { ...fields, categoryIds: ids(categories), subcategoryIds: ids(subcategories), languageIds: ids(languages) },
  };
}

export interface DocumentFormOptions {
  statuses: StatusOption[];
  categories: Option[];
  subcategories: (Option & { categoryId: number })[];
  languages: Option[];
  organizations: Option[];
}

/** Every choice the Document form shows. `used` is the saved record: its hidden values stay, marked "(hidden)". */
export async function getDocumentFormOptions(db: Db, used: Partial<DocumentInput> = {}): Promise<DocumentFormOptions> {
  const [statuses, allCategories, allSubcategories, allLanguages, organizations] = await Promise.all([
    listStatuses(db),
    db.select({ id: t.categories.id, name: t.categories.name, hidden: t.categories.hidden }).from(t.categories).orderBy(t.categories.sortOrder, t.categories.id),
    db
      .select({ id: t.subcategories.id, name: t.subcategories.name, categoryId: t.subcategories.categoryId, hidden: t.subcategories.hidden })
      .from(t.subcategories)
      .orderBy(t.subcategories.sortOrder, t.subcategories.id),
    db.select({ id: t.languages.id, name: t.languages.name, hidden: t.languages.hidden }).from(t.languages).orderBy(t.languages.sortOrder, t.languages.id),
    db.select({ id: t.organizations.id, name: t.organizations.name }).from(t.organizations).orderBy(t.organizations.name, t.organizations.id),
  ]);
  const categories = shownOptions(allCategories, used.categoryIds);
  return {
    statuses,
    categories,
    subcategories: shownSubcategories(allSubcategories, categories, used.subcategoryIds),
    languages: shownOptions(allLanguages, used.languageIds),
    organizations,
  };
}
