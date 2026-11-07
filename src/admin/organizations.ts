/** Admin: the Organizations list. Takes a `Db`, so PGlite tests can run it. */
import { count, eq } from "drizzle-orm";
import { organizations, programs, statuses } from "@/db/schema";
import type { Db } from "@/db/types";

/**
 * The Status name that "n need review" counts.
 * shortcut: matches the Status by name, breaks if staff rename it; add a flag column when the settings slice allows renames.
 */
export const NEEDS_REVIEW_STATUS = "Needs review";

export type OrganizationSort = "name" | "verified";

export interface OrganizationListRow {
  id: number;
  name: string;
  statusId: number;
  statusName: string;
  showOnSite: boolean;
  programCount: number;
  needsReviewCount: number;
  /** ISO date (`2026-03-01`), or null: never verified. */
  lastVerified: string | null;
  updatedAt: string;
}

export interface OrganizationList {
  rows: OrganizationListRow[];
  /** Every Status with the number of Organizations that match the search (before the Status filter). */
  statusCounts: { id: number; name: string; count: number }[];
  total: number;
}

/**
 * Organizations with their Program counts. The search matches the name (case-insensitive). `sort`
 * "verified" puts the oldest Last verified first; never verified counts as oldest. The data set is a
 * few hundred rows, so filtering and sorting happen here, not in SQL.
 */
export async function listOrganizationsForAdmin(
  db: Db,
  { q = "", statusId, sort = "name" }: { q?: string; statusId?: number; sort?: OrganizationSort } = {},
): Promise<OrganizationList> {
  const [orgs, statusRows, programRows] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        statusId: organizations.statusId,
        lastVerified: organizations.lastVerified,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations),
    db.select().from(statuses).orderBy(statuses.sortOrder, statuses.id),
    db
      .select({ organizationId: programs.organizationId, statusId: programs.statusId, n: count() })
      .from(programs)
      .groupBy(programs.organizationId, programs.statusId),
  ]);

  const status = new Map(statusRows.map((s) => [s.id, s]));
  const needsReviewId = statusRows.find((s) => s.name === NEEDS_REVIEW_STATUS)?.id;
  const programCounts = new Map<number, { all: number; review: number }>();
  for (const p of programRows) {
    const c = programCounts.get(p.organizationId) ?? { all: 0, review: 0 };
    c.all += p.n;
    if (p.statusId === needsReviewId) c.review += p.n;
    programCounts.set(p.organizationId, c);
  }

  const needle = q.trim().toLowerCase();
  const matching = orgs.filter((o) => !needle || o.name.toLowerCase().includes(needle));
  const statusCounts = statusRows.map((s) => ({
    id: s.id,
    name: s.name,
    count: matching.filter((o) => o.statusId === s.id).length,
  }));

  const rows = matching
    .filter((o) => statusId === undefined || o.statusId === statusId)
    .map((o): OrganizationListRow => {
      const s = status.get(o.statusId);
      const c = programCounts.get(o.id);
      return {
        id: o.id,
        name: o.name,
        statusId: o.statusId,
        statusName: s?.name ?? "",
        showOnSite: s?.showOnSite ?? false,
        programCount: c?.all ?? 0,
        needsReviewCount: c?.review ?? 0,
        lastVerified: o.lastVerified,
        updatedAt: o.updatedAt,
      };
    })
    .sort((a, b) => {
      if (sort === "verified") {
        // ISO dates sort as text; "" (never verified) sorts first.
        const [x, y] = [a.lastVerified ?? "", b.lastVerified ?? ""];
        if (x !== y) return x < y ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return { rows, statusCounts, total: matching.length };
}

// --- One Organization: read, parse, write. Results never throw for bad input; actions show `error`. ---

export type AdminResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const GONE = "This record does not exist. Reload the page.";

export interface OrganizationInput {
  name: string;
  about: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  suite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  /** ISO date or null. */
  lastVerified: string | null;
  statusId: number;
  internalNotes: string | null;
}

export type Raw = Record<string, FormDataEntryValue | null | undefined>;
type Errors = Record<string, string>;
type Out = Record<string, unknown>;

export const str = (raw: Raw, key: string) => {
  const v = raw[key];
  return typeof v === "string" ? v.trim() : "";
};

/** A positive integer ID from untrusted text, or null. */
export function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Today in Michigan, as `2026-11-07`. */
export function todayInDetroit(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Detroit" });
}

/** Round trip: `2026-02-31` rolls over to March in Date, so it does not match. */
const isRealDate = (v: string) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Optional text fields: trimmed, blank becomes null, too long is an error. */
export function parseTextFields(raw: Raw, fields: readonly (readonly [string, string, number])[], errors: Errors, out: Out): void {
  for (const [key, label, max] of fields) {
    const v = str(raw, key);
    if (v.length > max) errors[key] = `${label}: use ${max} characters or fewer.`;
    out[key] = v || null;
  }
}

/** The fields that Organizations and Programs share: website, map coordinates, Last verified, Status. */
export function parseSharedFields(raw: Raw, errors: Errors, out: Out): void {
  const website = str(raw, "website");
  out.website = website || null;
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
    } catch {
      errors.website = "Enter a full web address that starts with https:// or http://.";
    }
  }

  for (const [key, label, limit] of [["latitude", "Latitude", 90], ["longitude", "Longitude", 180]] as const) {
    const v = str(raw, key);
    const n = Number(v);
    out[key] = v ? n : null;
    if (v && (!Number.isFinite(n) || Math.abs(n) > limit)) errors[key] = `${label} is a number from -${limit} to ${limit}.`;
  }

  const verified = str(raw, "lastVerified");
  out.lastVerified = verified || null;
  if (verified && (!/^\d{4}-\d{2}-\d{2}$/.test(verified) || !isRealDate(verified))) {
    errors.lastVerified = "Enter a date.";
  }

  const statusId = parseId(raw.statusId);
  if (statusId === null) errors.statusId = "Select a Status.";
  out.statusId = statusId;
}

/** A required name of at most 200 characters. */
export function parseName(raw: Raw, errors: Errors, out: Out): void {
  out.name = str(raw, "name");
  if (!out.name) errors.name = "Enter a name.";
  else if ((out.name as string).length > 200) errors.name = "Use 200 characters or fewer.";
}

export const FIX_FIELDS = "Fix the marked fields and save again.";

const TEXT_FIELDS = [
  ["about", "About", 5000],
  ["phone", "Phone", 50],
  ["streetAddress", "Street address", 200],
  ["suite", "Suite", 100],
  ["city", "City", 100],
  ["state", "State", 50],
  ["zip", "ZIP", 20],
  ["county", "County", 100],
  ["internalNotes", "Internal notes", 5000],
] as const;

/** Trims and checks the form values of an Organization. Does not check that the Status exists. */
export function parseOrganizationInput(raw: Raw): AdminResult<OrganizationInput> {
  const errors: Errors = {};
  const out: Out = {};
  parseName(raw, errors, out);
  parseTextFields(raw, TEXT_FIELDS, errors, out);
  parseSharedFields(raw, errors, out);

  const email = str(raw, "email");
  out.email = email || null;
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0) return { ok: false, error: FIX_FIELDS, fieldErrors: errors };
  return { ok: true, value: out as unknown as OrganizationInput };
}

export interface StatusOption {
  id: number;
  name: string;
  showOnSite: boolean;
}

export async function listStatuses(db: Db): Promise<StatusOption[]> {
  return db
    .select({ id: statuses.id, name: statuses.name, showOnSite: statuses.showOnSite })
    .from(statuses)
    .orderBy(statuses.sortOrder, statuses.id);
}

export interface OrganizationProgramRow {
  id: number;
  name: string;
  statusName: string;
  showOnSite: boolean;
  lastVerified: string | null;
}

export interface OrganizationDetail {
  organization: OrganizationInput & { id: number; updatedAt: string };
  programs: OrganizationProgramRow[];
}

/** The Organization with all its fields (Internal notes too) and its Programs; null when the ID is unknown. */
export async function getOrganizationForAdmin(db: Db, id: number): Promise<OrganizationDetail | null> {
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!organization) return null;
  const fields = { ...organization, createdAt: undefined };
  const programRows = await db
    .select({
      id: programs.id,
      name: programs.name,
      statusName: statuses.name,
      showOnSite: statuses.showOnSite,
      lastVerified: programs.lastVerified,
    })
    .from(programs)
    .innerJoin(statuses, eq(statuses.id, programs.statusId))
    .where(eq(programs.organizationId, id))
    .orderBy(programs.name, programs.id);
  return { organization: fields, programs: programRows };
}

export async function statusExists(db: Db, id: number): Promise<boolean> {
  const [row] = await db.select({ id: statuses.id }).from(statuses).where(eq(statuses.id, id));
  return !!row;
}

export const NO_STATUS = { ok: false, error: "That Status does not exist. Reload the page." } as const;

export async function createOrganization(db: Db, input: OrganizationInput): Promise<AdminResult<{ id: number }>> {
  if (!(await statusExists(db, input.statusId))) return NO_STATUS;
  const [row] = await db.insert(organizations).values(input).returning({ id: organizations.id });
  return { ok: true, value: row };
}

export async function updateOrganization(db: Db, id: number, input: OrganizationInput): Promise<AdminResult<{ id: number }>> {
  if (!(await statusExists(db, input.statusId))) return NO_STATUS;
  const rows = await db
    .update(organizations)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  return rows.length ? { ok: true, value: rows[0] } : { ok: false, error: GONE };
}

/** Sets Last verified to today (Michigan) and changes nothing else. */
export async function markOrganizationVerified(db: Db, id: number, now = new Date()): Promise<AdminResult<{ lastVerified: string }>> {
  const lastVerified = todayInDetroit(now);
  const rows = await db
    .update(organizations)
    .set({ lastVerified, updatedAt: now.toISOString() })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  return rows.length ? { ok: true, value: { lastVerified } } : { ok: false, error: GONE };
}
