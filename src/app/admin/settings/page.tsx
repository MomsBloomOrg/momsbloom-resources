import type { ReactNode } from "react";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { listFacetsForAdmin, type AdminFacetValue } from "@/admin/facets";
import { Card, EmptyState, PageHeader } from "../_components/ui";
import { AddValueForm, ValueRow } from "./facet-forms";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

const SINGULAR: Record<string, string> = {
  insurancePlan: "Insurance plan",
  language: "Language",
  audience: "Who it serves value",
  cost: "Cost value",
  serviceFormat: "Service format",
};

function List({ children }: { children: ReactNode }) {
  return <ul className="mb-4">{children}</ul>;
}

/** Filter options: one card per Facet. Subcategories show indented under their Category. */
export default async function SettingsPage() {
  await requireStaffAdmin();
  const facets = await listFacetsForAdmin(getDb());
  const categories = facets.find((f) => f.key === "category")!.values;
  const subcategories = facets.find((f) => f.key === "subcategory")!.values;
  const childrenOf = (id: number): AdminFacetValue[] => subcategories.filter((sub) => sub.categoryId === id);

  return (
    <>
      <PageHeader title="Filter options" />
      <p className="mb-6 max-w-2xl">
        These are the options families filter by. The order here is the order on the website. A hidden
        option stays on the Programs that have it, but families no longer see it as a filter. You can
        delete an option only when no Program or Document uses it.
      </p>

      <Card title="Categories" className="mb-8">
        {categories.length === 0 ? (
          <EmptyState>No Categories yet.</EmptyState>
        ) : (
          <List>
            {categories.map((category, index) => {
              const children = childrenOf(category.id);
              return (
                <li key={category.id}>
                  <ul>
                    <ValueRow facet="category" value={category} first={index === 0} last={index === categories.length - 1} />
                    {children.map((sub, i) => (
                      <ValueRow key={sub.id} facet="subcategory" value={sub} first={i === 0} last={i === children.length - 1} indent />
                    ))}
                  </ul>
                  <div className="border-b border-line py-3 pl-6 sm:pl-10">
                    <AddValueForm facet="subcategory" categoryId={category.id} label={`New Subcategory of ${category.name}`} />
                  </div>
                </li>
              );
            })}
          </List>
        )}
        <AddValueForm facet="category" label="New Category" />
      </Card>

      {facets
        .filter((f) => f.key !== "category" && f.key !== "subcategory")
        .map((facet) => (
          <Card key={facet.key} title={facet.title} className="mb-8">
            {facet.key === "serviceFormat" && (
              <p className="mb-2 text-sm text-muted">
                The website reads the names In person, Virtual, and In person and virtual, so you cannot rename them.
              </p>
            )}
            {facet.values.length === 0 ? (
              <EmptyState>No options yet.</EmptyState>
            ) : (
              <List>
                {facet.values.map((value, index) => (
                  <ValueRow key={value.id} facet={facet.key} value={value} first={index === 0} last={index === facet.values.length - 1} />
                ))}
              </List>
            )}
            <AddValueForm facet={facet.key} label={`New ${SINGULAR[facet.key]}`} />
          </Card>
        ))}
    </>
  );
}
