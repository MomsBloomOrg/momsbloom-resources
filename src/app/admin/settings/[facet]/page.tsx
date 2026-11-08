import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { isFacetKey, listFacetsForAdmin } from "@/admin/facets";
import { Card, EmptyState, PageHeader } from "../../_components/ui";
import { AddValueForm } from "../facet-forms";
import { SortableValues } from "../sortable-list";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

const SINGULAR: Record<string, string> = {
  category: "Category",
  insurancePlan: "Insurance plan",
  language: "Language",
  audience: "Who it serves value",
  cost: "Cost value",
  serviceFormat: "Service format",
};

/**
 * Filter options for one Facet (`/admin/settings/category`, `/language`, ...). The Facet nav is a
 * side column on wide screens and a row that scrolls sideways on a phone. Subcategories have no page
 * of their own: they are in groups under their Category.
 */
export default async function FacetSettingsPage({ params }: PageProps<"/admin/settings/[facet]">) {
  await requireAdmin();
  const key = (await params).facet;
  if (!isFacetKey(key) || key === "subcategory") notFound();
  const facets = await listFacetsForAdmin(getDb());
  const facet = facets.find((f) => f.key === key)!;
  const subcategories = key === "category" ? facets.find((f) => f.key === "subcategory")!.values : undefined;

  return (
    <>
      <PageHeader title="Filter options" />
      <p className="mb-6 max-w-2xl">
        These are the options families filter by. The order here is the order on the website: drag a
        value by its handle, or use Move up and Move down in its menu. A hidden option stays on the
        Programs that have it, but families no longer see it as a filter. You can delete an option only
        when no Program or Document uses it.
      </p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav aria-label="Filter groups" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:w-56 lg:shrink-0 lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {facets
              .filter((f) => f.key !== "subcategory")
              .map((f) => (
                <li key={f.key} className="shrink-0">
                  <Link
                    href={`/admin/settings/${f.key}`}
                    aria-current={f.key === key ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-between gap-3 whitespace-nowrap rounded-full px-4 ${
                      f.key === key ? "bg-ink font-semibold text-white" : "bg-field text-ink hover:bg-line"
                    }`}
                  >
                    {f.title}
                    <span className="text-sm">{f.values.length}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <Card title={facet.title} className="min-w-0 flex-1">
          {key === "serviceFormat" && (
            <p className="mb-2 text-sm text-ink">
              The website reads the names In person, Virtual, and In person and virtual, so you cannot rename them.
            </p>
          )}
          {facet.values.length === 0 ? (
            <EmptyState>No options yet.</EmptyState>
          ) : (
            <div className="mb-4">
              <SortableValues facet={key} values={facet.values} subcategories={subcategories} />
            </div>
          )}
          <AddValueForm facet={key} label={`New ${SINGULAR[key]}`} />
        </Card>
      </div>
    </>
  );
}
