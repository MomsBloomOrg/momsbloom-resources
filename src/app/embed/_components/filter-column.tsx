import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { customFilterGroups } from "@/custom-fields/filter";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { customFilterUrlKey, FACET_URL_KEYS, type DirectoryQuery } from "@/directory/query";
import type { DirectoryResults } from "@/directory/results";
import type { FacetDefinition, FacetKey, FacetValue } from "@/directory/types";
import { DIRECTORY_FORM_ID } from "./search-bar";

const VISIBLE_OPTIONS = 4;

/**
 * One fieldset per Facet, then one per custom field filter (in the order staff set). The inputs belong to the search form (form=...), so without
 * JavaScript the "Apply filters" button submits them; with JavaScript, DirectoryLive submits on change.
 */
export function FilterColumn({
  facets,
  customFields,
  results,
  clearAllHref,
}: {
  facets: readonly FacetDefinition[];
  customFields: readonly CustomFieldDefinition[];
  results: DirectoryResults;
  clearAllHref: string | null;
}) {
  const { query, counts, customCounts } = results;

  /** One checkbox row, or null when its count is 0 and it is not checked (spec: hide, do not grey out). */
  const row = (facet: FacetKey, value: FacetValue, indent = false): ReactNode =>
    checkboxRow(FACET_URL_KEYS[facet], value, counts[facet][value.key] ?? 0, query.filters[facet].includes(value.key), indent);
  const checkboxRow = (name: string, value: { key: string; label: string }, count: number, checked: boolean, indent = false): ReactNode => {
    if (count === 0 && !checked) return null;
    return (
      <label key={`${name}:${value.key}`} className={`flex min-h-11 items-center gap-3 md:min-h-8 ${indent ? "pl-7" : ""}`}>
        <input
          type="checkbox"
          form={DIRECTORY_FORM_ID}
          name={name}
          value={value.key}
          defaultChecked={checked}
          className="size-5 shrink-0 accent-primary-text"
        />
        <span className="flex-1">{value.label}</span>
        <span className="text-sm text-muted">{count}</span>
      </label>
    );
  };

  const byKey = new Map(facets.map((facet) => [facet.key, facet]));
  const subcategories = byKey.get("subcategory")?.values ?? [];
  const categoryKeys = new Set(byKey.get("category")?.values.map((value) => value.key));

  const groups = facets
    .filter((facet) => facet.key !== "subcategory")
    .map((facet) => {
      // Each Category comes with its Subcategories indented under it; together they count as one option.
      let options: { node: ReactNode; checked: boolean }[] = facet.values.map((value) => {
        const children = facet.key === "category" ? subcategories.filter((sub) => sub.parentKey === value.key) : [];
        const nodes = [row(facet.key, value), ...children.map((sub) => row("subcategory", sub, true))].filter(Boolean);
        const checked =
          query.filters[facet.key].includes(value.key) || children.some((sub) => query.filters.subcategory.includes(sub.key));
        return { node: nodes.length ? <div key={value.key}>{nodes}</div> : null, checked };
      });
      if (facet.key === "category") {
        // A Subcategory whose Category is missing still gets a row.
        const orphans = subcategories.filter((sub) => !categoryKeys.has(sub.parentKey ?? ""));
        options = [...options, ...orphans.map((sub) => ({ node: row("subcategory", sub), checked: query.filters.subcategory.includes(sub.key) }))];
      }
      return group(facet.key, facet.label, options);
    });

  const customGroups = customFilterGroups(customFields).map((field) => {
    const checkedKeys = query.custom[field.fieldId] ?? [];
    const options = field.values.map((value) => {
      const checked = checkedKeys.includes(value.key);
      return { node: checkboxRow(customFilterUrlKey(field.fieldId), value, customCounts[field.fieldId]?.[value.key] ?? 0, checked), checked };
    });
    return group(`custom-${field.fieldId}`, field.label, options);
  });

  /** A fieldset of options; after VISIBLE_OPTIONS the rest go behind "Show all". Null when nothing shows. */
  function group(key: string, label: string, all: { node: ReactNode; checked: boolean }[]): ReactNode {
      const options = all.filter((option) => option.node);
      if (options.length === 0) return null;
      const shown = options.slice(0, VISIBLE_OPTIONS);
      const rest = options.slice(VISIBLE_OPTIONS);
      return (
        <fieldset key={key} className="border-t border-line pt-4">
          <legend className="float-left mb-2 w-full font-bold">{label}</legend>
          <div className="clear-left">
            {shown.map((option) => option.node)}
            {rest.length > 0 && (
              <details open={rest.some((option) => option.checked)} className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-bold text-primary-text md:min-h-8">
                  <span className="group-open:hidden">Show all {options.length}</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                  <ChevronDown aria-hidden="true" className="size-4 group-open:rotate-180" />
                </summary>
                {rest.map((option) => option.node)}
              </details>
            )}
          </div>
        </fieldset>
      );
  }

  return (
    <section id="filters" aria-labelledby="filters-heading" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 text-sm group-open/sheet:rounded-none group-open/sheet:border-0">
      {/* In the sheet: a fixed header bar (FilterSheet puts its close button on it). */}
      <div className="flex items-center justify-between group-open/sheet:sticky group-open/sheet:top-0 group-open/sheet:z-10 group-open/sheet:-mx-5 group-open/sheet:-mt-5 group-open/sheet:border-b group-open/sheet:border-line group-open/sheet:bg-surface group-open/sheet:px-5 group-open/sheet:py-4">
        <h2 id="filters-heading" className="text-lg font-bold">
          Filters
        </h2>
        {clearAllHref && (
          // In the sheet, the footer has Clear all.
          <a href={clearAllHref} className="text-sm font-bold text-primary-text underline group-open/sheet:hidden">
            Clear all
          </a>
        )}
      </div>
      {groups}
      {customGroups}
      <noscript>
        <button
          type="submit"
          form={DIRECTORY_FORM_ID}
          className="min-h-11 w-full rounded-full bg-primary-text px-6 font-bold text-white"
        >
          Apply filters
        </button>
      </noscript>
    </section>
  );
}

/** How many filter values are checked, for the mobile "Filters (n)" button. */
export function activeFilterCount(query: DirectoryQuery): number {
  const count = (lists: readonly (readonly string[])[]) => lists.reduce((sum, values) => sum + values.length, 0);
  return count(Object.values(query.filters)) + count(Object.values(query.custom)) + (query.org ? 1 : 0);
}
