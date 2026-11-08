import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { NEEDS_REVIEW_STATUS } from "@/admin/organizations";
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  isResourceSort,
  isResourceType,
  listResourcesForAdmin,
  type ResourceRow,
  type ResourceSort,
  type ResourceType,
  type SortDirection,
} from "@/admin/resources";
import { SubmitOnChangeSelect } from "./_components/submit-on-change";
import {
  Badge,
  EmptyState,
  PageHeader,
  buttonClass,
  inputClass,
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

/** `2026-09-15` as "Sep 15, 2026". Read as UTC, so the time zone cannot move the day. */
function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

/** The filter selects: the input style, sized to their text (the design's small selects), not full width. */
const selectClass = `${inputClass.replace("w-full ", "")} w-full pr-9 md:w-auto`;

/** The tabs. "All" covers Programs too; the Type select narrows to Programs. */
const TABS: { type?: ResourceType; label: string }[] = [
  { label: "All" },
  { type: "organization", label: "Organizations" },
  { type: "guide", label: "Guides & Downloads" },
];

/** "New Resource" follows the tab (or the Type select); on All it asks for the type. */
const NEW_PAGES: Record<ResourceType, string> = {
  organization: "/admin/organizations/new",
  program: "/admin/programs/new",
  guide: "/admin/documents/new",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** `?status=` is an integer ID; anything else means "All". */
function parseStatusId(value: string): number | undefined {
  const id = Number(value);
  return value !== "" && Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

interface ListParams {
  q: string;
  type?: ResourceType;
  status?: number;
  /** Not set: the default order (A to Z by name), with no column marked as sorted. */
  sort?: ResourceSort;
  dir: SortDirection;
}

function href({ q, type, status, sort, dir }: ListParams): string {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (type) search.set("type", type);
  if (status !== undefined) search.set("status", String(status));
  if (sort) search.set("sort", sort);
  if (sort && dir !== "asc") search.set("dir", dir);
  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

/** Two small triangles; the one for the current direction is dark. */
function SortTriangles({ dir }: { dir?: SortDirection }) {
  const shade = (on: boolean) => (on ? "fill-ink" : "fill-muted/35");
  return (
    <svg aria-hidden viewBox="0 0 8 12" className="size-3 shrink-0">
      <path d="M4 0 8 5H0Z" className={shade(dir === "asc")} />
      <path d="M4 12 0 7h8Z" className={shade(dir === "desc")} />
    </svg>
  );
}

/**
 * A column header that sorts the list: ascending, then descending, then back to the default sort. A link
 * (the sort is in the URL), so it works without JavaScript; `aria-sort` tells screen readers the order.
 */
function SortHeader({ column, label, current, align = "left", className = "" }: {
  column: ResourceSort;
  label: string;
  current: ListParams;
  align?: "left" | "right";
  className?: string;
}) {
  const active = current.sort === column;
  // Each click: ascending, then descending, then back to the default order (no column marked).
  const next: { sort?: ResourceSort; dir: SortDirection; label: string } = !active
    ? { sort: column, dir: "asc", label: "sort ascending" }
    : current.dir === "asc"
      ? { sort: column, dir: "desc", label: "sort descending" }
      : { sort: undefined, dir: "asc", label: "back to the default sort" };
  return (
    <th
      role="columnheader"
      scope="col"
      aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`${thClass} text-base lg:py-4 ${align === "right" ? "lg:text-right" : ""} ${className}`}
    >
      <Link
        href={href({ ...current, sort: next.sort, dir: next.dir })}
        className={`inline-flex items-center gap-1.5 hover:text-primary-text ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <SortTriangles dir={active ? current.dir : undefined} />
        <span className="sr-only">, {next.label}</span>
      </Link>
    </th>
  );
}

function StatusBadge({ row }: { row: ResourceRow }) {
  const tone = row.statusName === NEEDS_REVIEW_STATUS ? "warning" : row.showOnSite ? "good" : "neutral";
  return <Badge tone={tone}>{row.statusName}</Badge>;
}

function NewResource({ type }: { type?: ResourceType }) {
  const primary = buttonClass("primary");
  if (type) {
    return (
      <Link href={NEW_PAGES[type]} className={primary}>
        New {type.charAt(0).toUpperCase() + type.slice(1)} <span className="sr-only">: {RESOURCE_TYPE_LABELS[type]}</span>
      </Link>
    );
  }
  // On All: pick the type first. <details> works without JavaScript.
  return (
    <details className="relative">
      <summary className={`${primary} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        New Resource
        <ChevronDown aria-hidden className="size-4" />
      </summary>
      <ul className="absolute right-0 z-10 mt-2 w-56 rounded-2xl border border-line bg-surface py-2 shadow-lg">
        {RESOURCE_TYPES.map((t) => (
          <li key={t}>
            <Link href={NEW_PAGES[t]} className="block px-4 py-2 hover:bg-background">
              New {RESOURCE_TYPE_LABELS[t]}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The Admin home: every Organization, Program, and Guide & Download in one list (the "Resources Admin" design). */
export default async function ResourcesPage({ searchParams }: PageProps<"/admin">) {
  await requireStaffAdmin();
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 200);
  const typeParam = first(params.type);
  const type = isResourceType(typeParam) ? typeParam : undefined;
  const statusId = parseStatusId(first(params.status));
  const sortParam = first(params.sort);
  const sort = isResourceSort(sortParam) ? sortParam : undefined;
  const dir: SortDirection = first(params.dir) === "desc" ? "desc" : "asc";

  const { rows, statuses } = await listResourcesForAdmin(getDb(), { q, type, statusId, sort, dir });
  const current: ListParams = { q, type, status: statusId, sort, dir };
  // Programs live under All: the Type select narrows to them.
  const activeTab = type === "program" ? undefined : type;

  return (
    <>
      <PageHeader title="Resources Admin" actions={<NewResource type={type} />} />

      <nav aria-label="Resource type" className="mb-8 flex flex-wrap gap-x-8 border-b border-line">
        {TABS.map((tab) => {
          const isCurrent = tab.type === activeTab;
          return (
            <Link
              key={tab.label}
              href={href({ ...current, type: tab.type })}
              aria-current={isCurrent ? "page" : undefined}
              className={`-mb-px flex min-h-12 items-center border-b-[3px] px-2 ${
                isCurrent ? "border-primary-text text-ink" : "border-transparent text-ink hover:border-line"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* key: a tab or sort link is a client navigation; a new key resets the inputs to the new URL. */}
      <form
        key={href(current)}
        action="/admin"
        method="get"
        role="search"
        className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-5"
      >
        <div className="relative min-w-0 flex-1">
          <label htmlFor="resource-search" className="sr-only">
            Search for name, organization, or keyword
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="resource-search"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={200}
            placeholder="Search for name, organization, or keyword"
            className={`${inputClass} pl-11`}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:shrink-0 md:gap-5">
          <label className="sr-only" htmlFor="resource-type">
            Type
          </label>
          <SubmitOnChangeSelect id="resource-type" name="type" defaultValue={type ?? ""} className={selectClass}>
            <option value="">Type: All</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </SubmitOnChangeSelect>
          <label className="sr-only" htmlFor="resource-status">
            Status
          </label>
          <SubmitOnChangeSelect id="resource-status" name="status" defaultValue={statusId === undefined ? "" : String(statusId)} className={selectClass}>
            <option value="">Status: All</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SubmitOnChangeSelect>
          {sort && <input type="hidden" name="sort" value={sort} />}
          {sort && dir !== "asc" && <input type="hidden" name="dir" value={dir} />}
          {/* Without JavaScript the selects need a button; with it they apply at once. Shown on keyboard focus. */}
          <button type="submit" className={`${buttonClass("secondary", "sm")} sr-only focus:not-sr-only`}>
            Apply
          </button>
        </div>
      </form>

      <p role="status" className="mb-3 px-1 text-sm">
        {rows.length} {rows.length === 1 ? "result" : "results"}
      </p>

      {rows.length === 0 ? (
        <EmptyState>No resources match.</EmptyState>
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-4 lg:px-0">
          <table role="table" className={stackTableClass}>
            <caption className="sr-only">Resources</caption>
            <thead role="rowgroup" className={stackTheadClass}>
              <tr role="row" className={stackTheadRowClass}>
                <SortHeader column="name" label="Name" current={current} className="lg:first:pl-10" />
                <SortHeader column="type" label="Type" current={current} />
                {/* Ascending: oldest first; never verified counts as oldest. */}
                <SortHeader column="verified" label="Last Verified" current={current} align="right" />
                <SortHeader column="status" label="Status" current={current} align="right" className="lg:last:pr-8" />
              </tr>
            </thead>
            <tbody role="rowgroup" className={stackTbodyClass}>
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id}`} role="row" className={stackRowClass}>
                  <td role="cell" className={`${stackTdClass} lg:py-5 lg:first:pl-10`}>
                    <Link href={row.href} className="font-semibold underline decoration-1 underline-offset-4 hover:text-primary-text">
                      {row.name}
                    </Link>
                    {row.organizationName && <div className="text-sm text-muted">{row.organizationName}</div>}
                  </td>
                  <td role="cell" data-label="Type" className={`${stackTdClass} lg:py-5`}>
                    {row.typeText}
                  </td>
                  <td role="cell" data-label="Last verified" className={`${stackTdClass} lg:py-5 lg:text-right`}>
                    {formatDate(row.lastVerified)}
                  </td>
                  <td role="cell" data-label="Status" className={`${stackTdClass} lg:py-5 lg:text-right lg:last:pr-8`}>
                    <StatusBadge row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
