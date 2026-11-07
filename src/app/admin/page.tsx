import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import {
  NEEDS_REVIEW_STATUS,
  listOrganizationsForAdmin,
  type OrganizationListRow,
  type OrganizationSort,
} from "@/admin/organizations";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  buttonClass,
  inputClass,
  linkClass,
  stackRowClass,
  stackTableClass,
  stackTbodyClass,
  stackTdClass,
  stackTheadClass,
  stackTheadRowClass,
  thClass,
} from "./_components/ui";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** `?status=` is an integer ID; anything else means "All". */
function parseStatusId(value: string): number | undefined {
  const id = Number(value);
  return value !== "" && Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

/** `2026-09-15` as "Sep 15, 2026". Read as UTC, so the time zone cannot move the day. */
function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function href(params: { q: string; status?: number; sort: OrganizationSort }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status !== undefined) search.set("status", String(params.status));
  if (params.sort !== "name") search.set("sort", params.sort);
  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

function StatusBadge({ row }: { row: OrganizationListRow }) {
  const tone = row.statusName === NEEDS_REVIEW_STATUS ? "warning" : row.showOnSite ? "good" : "neutral";
  return <Badge tone={tone}>{row.statusName}</Badge>;
}

/** The Admin home: every Organization, with its Programs counted. */
export default async function OrganizationsPage({ searchParams }: PageProps<"/admin">) {
  await requireStaffAdmin();
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 200);
  const statusId = parseStatusId(first(params.status));
  const sort: OrganizationSort = first(params.sort) === "verified" ? "verified" : "name";

  const { rows, statusCounts, total } = await listOrganizationsForAdmin(getDb(), { q, statusId, sort });
  const filters = [{ id: undefined, name: "All", count: total }, ...statusCounts];

  return (
    <>
      <PageHeader
        title="Organizations"
        actions={
          <Link href="/admin/organizations/new" className={buttonClass("primary", "sm")}>
            New Organization
          </Link>
        }
      />
      <Card>
        <form action="/admin" method="get" role="search" className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="org-search" className="mb-1 block font-semibold">
              Search by name
            </label>
            <input id="org-search" name="q" type="search" defaultValue={q} maxLength={200} className={inputClass} />
          </div>
          {statusId !== undefined && <input type="hidden" name="status" value={statusId} />}
          {sort !== "name" && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className={buttonClass("primary")}>
            Search
          </button>
        </form>

        <nav aria-label="Filter by Status" className="mb-2 flex flex-wrap gap-x-5 gap-y-1">
          {filters.map((f) => {
            const current = f.id === statusId;
            return (
              <Link
                key={f.name}
                href={href({ q, status: f.id, sort })}
                aria-current={current ? "true" : undefined}
                className={`min-h-9 content-center border-b-2 ${
                  current ? "border-primary-text font-semibold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {f.name} ({f.count})
              </Link>
            );
          })}
        </nav>
        <p className="mb-4 text-sm">
          <Link href={href({ q, status: statusId, sort: sort === "verified" ? "name" : "verified" })} className={linkClass}>
            {sort === "verified" ? "Sort by name" : "Sort oldest verified first"}
          </Link>
        </p>

        {rows.length === 0 ? (
          <EmptyState>No Organizations match.</EmptyState>
        ) : (
          <table role="table" className={stackTableClass}>
            <caption className="sr-only">Organizations</caption>
            <thead role="rowgroup" className={stackTheadClass}>
              <tr role="row" className={stackTheadRowClass}>
                <th role="columnheader" scope="col" className={thClass}>Name</th>
                <th role="columnheader" scope="col" className={thClass}>Status</th>
                <th role="columnheader" scope="col" className={thClass}>Programs</th>
                <th role="columnheader" scope="col" className={thClass}>Last verified</th>
              </tr>
            </thead>
            <tbody role="rowgroup" className={stackTbodyClass}>
              {rows.map((row) => (
                <tr key={row.id} role="row" className={stackRowClass}>
                  <td role="cell" className={stackTdClass}>
                    <Link href={`/admin/organizations/${row.id}`} className={`${linkClass} font-semibold`}>
                      {row.name}
                    </Link>
                  </td>
                  <td role="cell" data-label="Status" className={stackTdClass}>
                    <StatusBadge row={row} />
                  </td>
                  <td role="cell" data-label="Programs" className={stackTdClass}>
                    {row.programCount}
                    {row.needsReviewCount > 0 && (
                      <span className="text-muted"> ({row.needsReviewCount} {row.needsReviewCount === 1 ? "needs" : "need"} review)</span>
                    )}
                  </td>
                  <td role="cell" data-label="Last verified" className={stackTdClass}>
                    {formatDate(row.lastVerified)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
