const button = "flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-bold";

/**
 * No Programs match. "Clear filters" shows when filters are active; "Widen to 25 mi" when a location
 * is set with a smaller radius. Both are "?..." links, so DirectoryLive handles them and they work without JavaScript.
 */
export function NoResults({
  keyword,
  clearFiltersHref,
  widenHref,
}: {
  keyword: string;
  clearFiltersHref: string | null;
  widenHref: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <p>{keyword ? `No matches for "${keyword}" with these filters.` : "No matches with these filters."}</p>
      {(clearFiltersHref || widenHref) && (
        <div className="flex flex-wrap gap-3">
          {clearFiltersHref && (
            <a href={clearFiltersHref} className={button}>
              Clear filters
            </a>
          )}
          {widenHref && (
            <a href={widenHref} className={button}>
              Widen to 25 mi
            </a>
          )}
        </div>
      )}
    </div>
  );
}
