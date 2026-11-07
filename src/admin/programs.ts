/** Admin: one Program. Takes a `Db`, so PGlite tests can run it. Results never throw for bad input. */
import { eq, inArray } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import type { CustomValues } from "@/custom-fields/types";
import {
  FIX_FIELDS,
  GONE,
  NO_STATUS,
  listStatuses,
  parseId,
  parseName,
  parseSharedFields,
  parseTextFields,
  statusExists,
  str,
  todayInDetroit,
  type AdminResult,
  type Raw,
  type StatusOption,
} from "./organizations";

/** The Facet value lists of a Program: one join table each. */
export const PROGRAM_LISTS = ["categoryIds", "subcategoryIds", "insurancePlanIds", "languageIds", "audienceIds"] as const;
export type ProgramListKey = (typeof PROGRAM_LISTS)[number];

export interface ProgramFields {
  organizationId: number;
  name: string;
  description: string;
  searchKeywords: string | null;
  streetAddress: string | null;
  suite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  serviceFormatId: number | null;
  hours: string | null;
  costOptionId: number | null;
  insuranceAcceptanceId: number | null;
  eligibilityNotes: string | null;
  /** ISO date or null. */
  lastVerified: string | null;
  statusId: number;
  internalNotes: string | null;
  /** Custom field answers (src/custom-fields/form.ts). Left out: the `custom` column does not change. */
  custom?: CustomValues;
}

export type ProgramInput = ProgramFields & Record<ProgramListKey, number[]>;

const TEXT_FIELDS = [
  ["searchKeywords", "Search keywords", 1000],
  ["streetAddress", "Street address", 200],
  ["suite", "Suite", 100],
  ["city", "City", 100],
  ["state", "State", 50],
  ["zip", "ZIP", 20],
  ["phone", "Phone", 50],
  ["hours", "Hours", 500],
  ["eligibilityNotes", "Eligibility notes", 5000],
  ["internalNotes", "Internal notes", 5000],
] as const;

const RELOAD = "Reload the page and try again.";

/**
 * Trims and checks the form values of a Program. Checks the shape of each ID, not that it exists:
 * `saveProgram` does that, in its transaction.
 */
export function parseProgramInput(data: FormData): AdminResult<ProgramInput> {
  const raw: Raw = Object.fromEntries(data);
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};
  parseName(raw, errors, out);
  parseTextFields(raw, TEXT_FIELDS, errors, out);
  parseSharedFields(raw, errors, out);

  out.description = str(raw, "description");
  if (!out.description) errors.description = "Enter a description.";
  else if ((out.description as string).length > 5000) errors.description = "Use 5000 characters or fewer.";

  out.organizationId = parseId(raw.organizationId);
  if (out.organizationId === null) errors.organizationId = "Select an Organization.";

  // One optional Facet value each: blank is null.
  for (const key of ["serviceFormatId", "costOptionId", "insuranceAcceptanceId"] as const) {
    const v = str(raw, key);
    out[key] = v ? parseId(v) : null;
    if (v && out[key] === null) errors[key] = RELOAD;
  }

  for (const key of PROGRAM_LISTS) {
    const ids = data.getAll(key).map(parseId);
    if (ids.some((id) => id === null)) errors[key] = RELOAD;
    out[key] = [...new Set(ids.filter((id) => id !== null))];
  }
  if (!errors.categoryIds && (out.categoryIds as number[]).length === 0) errors.categoryIds = "Check at least one Category.";

  if (Object.keys(errors).length > 0) return { ok: false, error: FIX_FIELDS, fieldErrors: errors };
  return { ok: true, value: out as unknown as ProgramInput };
}

export type IdTable = PgTable & { id: PgColumn };

/** True when every ID is a row of the table. */
export async function allExist(db: Db, table: IdTable, ids: number[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db.select({ id: table.id }).from(table).where(inArray(table.id, ids));
  return rows.length === ids.length;
}

const isYes = (name: string | undefined) => name?.trim().toLowerCase() === "yes";

/**
 * Checks the references of a Program against the database. Returns the input to write: Insurance plans
 * are kept only when Accepts insurance is "Yes".
 */
async function checkReferences(db: Db, input: ProgramInput): Promise<AdminResult<ProgramInput>> {
  const refused = (key: string, message = "This value does not exist. Reload the page.") =>
    ({ ok: false, error: FIX_FIELDS, fieldErrors: { [key]: message } }) as const;

  if (!(await allExist(db, t.organizations, [input.organizationId]))) return refused("organizationId", "That Organization does not exist. Reload the page.");
  if (!(await statusExists(db, input.statusId))) return NO_STATUS;

  const single: [keyof ProgramFields, IdTable][] = [
    ["serviceFormatId", t.serviceFormats],
    ["costOptionId", t.costOptions],
    ["insuranceAcceptanceId", t.insuranceAcceptanceOptions],
  ];
  for (const [key, table] of single) {
    const id = input[key] as number | null;
    if (id !== null && !(await allExist(db, table, [id]))) return refused(key);
  }

  const lists: [ProgramListKey, IdTable][] = [
    ["categoryIds", t.categories],
    ["insurancePlanIds", t.insurancePlans],
    ["languageIds", t.languages],
    ["audienceIds", t.audiences],
  ];
  for (const [key, table] of lists) {
    if (!(await allExist(db, table, input[key]))) return refused(key);
  }

  if (input.subcategoryIds.length > 0) {
    const subs = await db
      .select({ categoryId: t.subcategories.categoryId })
      .from(t.subcategories)
      .where(inArray(t.subcategories.id, input.subcategoryIds));
    if (subs.length !== input.subcategoryIds.length) return refused("subcategoryIds");
    if (subs.some((s) => !input.categoryIds.includes(s.categoryId))) {
      return refused("subcategoryIds", "Each Subcategory needs its Category checked.");
    }
  }

  let acceptsYes = false;
  if (input.insuranceAcceptanceId !== null) {
    const [option] = await db
      .select({ name: t.insuranceAcceptanceOptions.name })
      .from(t.insuranceAcceptanceOptions)
      .where(eq(t.insuranceAcceptanceOptions.id, input.insuranceAcceptanceId));
    acceptsYes = isYes(option?.name);
  }
  return { ok: true, value: acceptsYes ? input : { ...input, insurancePlanIds: [] } };
}

/**
 * Creates (no `id`) or updates a Program and replaces its five join tables, all in one transaction:
 * a refused check or a failed write leaves the Program as it was.
 */
export async function saveProgram(db: Db, id: number | null, input: ProgramInput): Promise<AdminResult<{ id: number }>> {
  return db.transaction(async (tx) => {
    const checked = await checkReferences(tx, input);
    if (!checked.ok) return checked;
    const { categoryIds, subcategoryIds, insurancePlanIds, languageIds, audienceIds, ...fields } = checked.value;

    const [row] =
      id === null
        ? await tx.insert(t.programs).values(fields).returning({ id: t.programs.id })
        : await tx
            .update(t.programs)
            .set({ ...fields, updatedAt: new Date().toISOString() })
            .where(eq(t.programs.id, id))
            .returning({ id: t.programs.id });
    if (!row) return { ok: false, error: GONE } as const;
    const programId = row.id;

    await tx.delete(t.programCategories).where(eq(t.programCategories.programId, programId));
    await tx.delete(t.programSubcategories).where(eq(t.programSubcategories.programId, programId));
    await tx.delete(t.programInsurancePlans).where(eq(t.programInsurancePlans.programId, programId));
    await tx.delete(t.programLanguages).where(eq(t.programLanguages.programId, programId));
    await tx.delete(t.programAudiences).where(eq(t.programAudiences.programId, programId));
    // categoryIds is never empty: parse requires one.
    await tx.insert(t.programCategories).values(categoryIds.map((categoryId) => ({ programId, categoryId })));
    if (subcategoryIds.length) await tx.insert(t.programSubcategories).values(subcategoryIds.map((subcategoryId) => ({ programId, subcategoryId })));
    if (insurancePlanIds.length) await tx.insert(t.programInsurancePlans).values(insurancePlanIds.map((insurancePlanId) => ({ programId, insurancePlanId })));
    if (languageIds.length) await tx.insert(t.programLanguages).values(languageIds.map((languageId) => ({ programId, languageId })));
    if (audienceIds.length) await tx.insert(t.programAudiences).values(audienceIds.map((audienceId) => ({ programId, audienceId })));
    return { ok: true, value: { id: programId } } as const;
  });
}

/** Sets Last verified to today (Michigan) and changes nothing else. */
export async function markProgramVerified(db: Db, id: number, now = new Date()): Promise<AdminResult<{ lastVerified: string }>> {
  const lastVerified = todayInDetroit(now);
  const rows = await db
    .update(t.programs)
    .set({ lastVerified, updatedAt: now.toISOString() })
    .where(eq(t.programs.id, id))
    .returning({ id: t.programs.id });
  return rows.length ? { ok: true, value: { lastVerified } } : { ok: false, error: GONE };
}

export interface ProgramDetail {
  program: ProgramInput & { id: number; updatedAt: string };
}

/** The Program with all its fields (Internal notes too) and its Facet values; null when the ID is unknown. */
export async function getProgramForAdmin(db: Db, id: number): Promise<ProgramDetail | null> {
  const [program] = await db.select().from(t.programs).where(eq(t.programs.id, id));
  if (!program) return null;
  const [categories, subcategories, insurancePlans, languages, audiences] = await Promise.all([
    db.select({ id: t.programCategories.categoryId }).from(t.programCategories).where(eq(t.programCategories.programId, id)),
    db.select({ id: t.programSubcategories.subcategoryId }).from(t.programSubcategories).where(eq(t.programSubcategories.programId, id)),
    db.select({ id: t.programInsurancePlans.insurancePlanId }).from(t.programInsurancePlans).where(eq(t.programInsurancePlans.programId, id)),
    db.select({ id: t.programLanguages.languageId }).from(t.programLanguages).where(eq(t.programLanguages.programId, id)),
    db.select({ id: t.programAudiences.audienceId }).from(t.programAudiences).where(eq(t.programAudiences.programId, id)),
  ]);
  const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
  return {
    program: {
      ...program,
      description: program.description ?? "",
      categoryIds: ids(categories),
      subcategoryIds: ids(subcategories),
      insurancePlanIds: ids(insurancePlans),
      languageIds: ids(languages),
      audienceIds: ids(audiences),
    },
  };
}

export interface Option {
  id: number;
  name: string;
}

/** An Organization with the values that a Program inherits when its own are blank (Inheritance). */
export interface OrganizationOption extends Option {
  streetAddress: string | null;
  suite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProgramFormOptions {
  organizations: OrganizationOption[];
  statuses: StatusOption[];
  categories: Option[];
  subcategories: (Option & { categoryId: number })[];
  insurancePlans: Option[];
  insuranceAcceptanceOptions: Option[];
  languages: Option[];
  audiences: Option[];
  costOptions: Option[];
  serviceFormats: Option[];
}

/** Every choice the Program form shows. The lists are small (tens to a few hundred rows). */
export async function getProgramFormOptions(db: Db): Promise<ProgramFormOptions> {
  const list = (table: IdTable & { name: PgColumn; sortOrder: PgColumn }) =>
    db.select({ id: table.id, name: table.name }).from(table).orderBy(table.sortOrder, table.id) as Promise<Option[]>;
  const o = t.organizations;
  const [organizations, statuses, categories, subcategories, insurancePlans, insuranceAcceptanceOptions, languages, audiences, costOptions, serviceFormats] =
    await Promise.all([
      db
        .select({
          id: o.id,
          name: o.name,
          streetAddress: o.streetAddress,
          suite: o.suite,
          city: o.city,
          state: o.state,
          zip: o.zip,
          phone: o.phone,
          website: o.website,
          latitude: o.latitude,
          longitude: o.longitude,
        })
        .from(o)
        .orderBy(o.name, o.id),
      listStatuses(db),
      list(t.categories),
      db
        .select({ id: t.subcategories.id, name: t.subcategories.name, categoryId: t.subcategories.categoryId })
        .from(t.subcategories)
        .orderBy(t.subcategories.sortOrder, t.subcategories.id),
      list(t.insurancePlans),
      list(t.insuranceAcceptanceOptions),
      list(t.languages),
      list(t.audiences),
      list(t.costOptions),
      list(t.serviceFormats),
    ]);
  return { organizations, statuses, categories, subcategories, insurancePlans, insuranceAcceptanceOptions, languages, audiences, costOptions, serviceFormats };
}
