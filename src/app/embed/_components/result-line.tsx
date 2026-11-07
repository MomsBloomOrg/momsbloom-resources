import type { ReactNode } from "react";
import type { Sort } from "@/directory/query";
import type { DirectoryResults } from "@/directory/results";
import { DIRECTORY_FORM_ID } from "./search-bar";
import { ViewToggle } from "./view-toggle";

const SORT_LABELS: Record<Sort, string> = { nearest: "Nearest", az: "A to Z", verified: "Recently verified" };

/** `24 results for "yoga" within 10 mi of 49508`. Parts that are not set are left out. */
export function resultSummary({ totalPrograms, query, origin, radius }: DirectoryResults): string {
  const place = query.near ? "your location" : query.zip;
  return [
    `${totalPrograms} ${totalPrograms === 1 ? "result" : "results"}`,
    query.q && `for "${query.q}"`,
    origin && (radius === "any" ? `near ${place}` : `within ${radius} mi of ${place}`),
  ]
    .filter(Boolean)
    .join(" ");
}

/** The result count, announced to screen readers after each change. */
export function ResultSummary({ results }: { results: DirectoryResults }) {
  return (
    <p aria-live="polite" className="font-bold">
      {resultSummary(results)}
    </p>
  );
}

/**
 * The toolbar: `children` (the mobile Filters link), the view link, and the sort dropdown. The select is a
 * field of the search form. Its default option sends no `sort` (the URL stays clean); without JavaScript
 * the "Sort" button submits it, with JavaScript DirectoryLive submits on change.
 */
export function ResultToolbar({ results, children }: { results: DirectoryResults; children?: ReactNode }) {
  const sorts: Sort[] = results.origin ? ["nearest", "az", "verified"] : ["az", "verified"];
  const valueOf = (sort: Sort) => (sort === sorts[0] ? "" : sort);
  return (
    <div className="flex items-center gap-2 max-md:justify-between md:gap-4">
      {children}
      <ViewToggle query={results.query} />
      <label className="flex min-w-0 items-center gap-1 text-sm max-md:flex-1">
        <span className="text-muted max-md:sr-only">Sort:</span>
        <select
          // Keyed: a new sort remounts it, so the browser never keeps a stale choice after Back or a chip click.
          key={results.sort}
          name="sort"
          form={DIRECTORY_FORM_ID}
          defaultValue={valueOf(results.sort)}
          className="min-h-11 w-full min-w-0 rounded-full border border-line bg-surface px-3 md:min-h-8"
        >
          {sorts.map((sort) => (
            <option key={sort} value={valueOf(sort)}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" form={DIRECTORY_FORM_ID} className="min-h-11 w-full min-w-0 rounded-full border border-line bg-surface px-3 text-sm">
          Sort
        </button>
      </noscript>
    </div>
  );
}
