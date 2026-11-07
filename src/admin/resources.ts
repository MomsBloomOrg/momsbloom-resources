/**
 * Admin home: one "Resources" list of Organizations, Programs, and Guides & Downloads (Documents).
 * Takes a `Db`, so PGlite tests can run it. The data set is a few hundred rows, so filtering and
 * sorting happen here, not in SQL (like listOrganizationsForAdmin).
 */
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import { listStatuses, type StatusOption } from "./organizations";

/** The record types in the list. "guide" is a Document ("Guides & Downloads" in the Admin). */
export const RESOURCE_TYPES = ["organization", "program", "guide"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  organization: "Organization",
  program: "Program",
  guide: "Guide & Download",
};

export const isResourceType = (value: unknown): value is ResourceType => RESOURCE_TYPES.includes(value as ResourceType);

/** The sortable columns, plus "verified" (Last verified, which the design does not show as a column). */
export const RESOURCE_SORTS = ["name", "type", "status", "verified"] as const;
export type ResourceSort = (typeof RESOURCE_SORTS)[number];
export type SortDirection = "asc" | "desc";

export const isResourceSort = (value: unknown): value is ResourceSort => RESOURCE_SORTS.includes(value as ResourceSort);

export interface ResourceRow {
  type: ResourceType;
  id: number;
  name: string;
  /** The Type column: a Program's Organization name, else the type ("Organization", "Guide & Download"). */
  typeText: string;
  statusId: number;
  statusName: string;
  showOnSite: boolean;
  /** ISO date, or null: never verified. */
  lastVerified: string | null;
  /** The edit page. */
  href: string;
}

export interface ResourceList {
  rows: ResourceRow[];
  statuses: StatusOption[];
}

export interface ResourceFilters {
  /** Empty: all types. */
  type?: ResourceType;
  statusId?: number;
  /** Matches names, a Program's Organization name, and search keywords (case-insensitive). */
  q?: string;
  /**
   * The column to sort by. "status" follows the Status order staff set (Active, Needs review,
   * Inactive), not A to Z. "verified": ascending is oldest first, and never verified counts as oldest.
   * Ties sort by name, A to Z.
   */
  sort?: ResourceSort;
  dir?: SortDirection;
}

export async function listResourcesForAdmin(db: Db, { type, statusId, q = "", sort = "name", dir = "asc" }: ResourceFilters = {}): Promise<ResourceList> {
  const wants = (kind: ResourceType) => type === undefined || type === kind;
  const [statuses, organizations, programs, documents] = await Promise.all([
    listStatuses(db),
    // Programs need every Organization's name, even when only Programs are shown.
    db.select({ id: t.organizations.id, name: t.organizations.name, statusId: t.organizations.statusId, lastVerified: t.organizations.lastVerified }).from(t.organizations),
    wants("program")
      ? db
          .select({
            id: t.programs.id,
            name: t.programs.name,
            organizationId: t.programs.organizationId,
            searchKeywords: t.programs.searchKeywords,
            statusId: t.programs.statusId,
            lastVerified: t.programs.lastVerified,
          })
          .from(t.programs)
      : [],
    wants("guide")
      ? db
          .select({ id: t.documents.id, name: t.documents.title, searchKeywords: t.documents.searchKeywords, statusId: t.documents.statusId, lastVerified: t.documents.lastVerified })
          .from(t.documents)
      : [],
  ]);

  const status = new Map(statuses.map((s) => [s.id, s]));
  const orgName = new Map(organizations.map((o) => [o.id, o.name]));
  const needle = q.trim().toLowerCase();
  const rows: (ResourceRow & { haystack: string })[] = [];
  const push = (row: Omit<ResourceRow, "statusName" | "showOnSite">, haystack: (string | null | undefined)[]) => {
    const s = status.get(row.statusId);
    rows.push({ ...row, statusName: s?.name ?? "", showOnSite: s?.showOnSite ?? false, haystack: haystack.filter(Boolean).join("\n").toLowerCase() });
  };

  if (wants("organization")) {
    for (const o of organizations) {
      push({ type: "organization", id: o.id, name: o.name, typeText: RESOURCE_TYPE_LABELS.organization, statusId: o.statusId, lastVerified: o.lastVerified, href: `/admin/organizations/${o.id}` }, [o.name]);
    }
  }
  for (const p of programs) {
    const org = orgName.get(p.organizationId) ?? "";
    push({ type: "program", id: p.id, name: p.name, typeText: org, statusId: p.statusId, lastVerified: p.lastVerified, href: `/admin/programs/${p.id}` }, [p.name, org, p.searchKeywords]);
  }
  for (const d of documents) {
    push({ type: "guide", id: d.id, name: d.name, typeText: RESOURCE_TYPE_LABELS.guide, statusId: d.statusId, lastVerified: d.lastVerified, href: `/admin/documents/${d.id}` }, [d.name, d.searchKeywords]);
  }

  const text = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });
  const statusOrder = new Map(statuses.map((s, i) => [s.id, i]));
  const byColumn: Record<ResourceSort, (a: ResourceRow, b: ResourceRow) => number> = {
    name: (a, b) => text(a.name, b.name),
    type: (a, b) => text(a.typeText, b.typeText),
    status: (a, b) => (statusOrder.get(a.statusId) ?? 0) - (statusOrder.get(b.statusId) ?? 0),
    verified: (a, b) => (a.lastVerified ?? "").localeCompare(b.lastVerified ?? ""),
  };
  const sign = dir === "desc" ? -1 : 1;
  // The direction flips the chosen column only; ties stay A to Z by name, so the list reads well.
  const tieBreak = (a: ResourceRow, b: ResourceRow) => text(a.name, b.name) || text(a.typeText, b.typeText) || a.id - b.id;
  const matching = rows
    .filter((r) => (!needle || r.haystack.includes(needle)) && (statusId === undefined || r.statusId === statusId))
    .sort((a, b) => sign * byColumn[sort](a, b) || tieBreak(a, b));

  return { rows: matching.map(({ haystack, ...row }) => (void haystack, row)), statuses };
}
