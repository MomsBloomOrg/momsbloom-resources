/** Admin: the Organizations list. Takes a `Db`, so PGlite tests can run it. */
import { count } from "drizzle-orm";
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
