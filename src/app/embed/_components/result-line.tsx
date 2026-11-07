import { serializeDirectoryQuery, type Sort } from "@/directory/query";
import type { DirectoryResults } from "@/directory/results";
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

/** The result count (announced to screen readers after each change) and the sort links. */
export function ResultLine({ results }: { results: DirectoryResults }) {
  const sorts: Sort[] = results.origin ? ["nearest", "az", "verified"] : ["az", "verified"];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p aria-live="polite" className="font-bold">
        {resultSummary(results)}
      </p>
      <div className="flex flex-wrap items-center gap-x-4">
        <nav aria-label="Sort" className="flex items-center gap-1 text-sm">
          <span className="text-muted">Sort:</span>
          {sorts.map((sort) => (
            <a
              key={sort}
              href={`?${serializeDirectoryQuery({ ...results.query, sort, pages: 1 })}`}
              aria-current={results.sort === sort ? "true" : undefined}
              className="flex min-h-11 items-center rounded-full px-3 aria-[current]:border aria-[current]:border-line aria-[current]:bg-surface aria-[current]:font-bold md:min-h-8"
            >
              {SORT_LABELS[sort]}
            </a>
          ))}
        </nav>
        <ViewToggle query={results.query} />
      </div>
    </div>
  );
}
