/** No Programs match. The "Clear filters" and "Widen to 25 mi" buttons come with directory-empty-error-states. */
export function NoResults({ keyword }: { keyword: string }) {
  return (
    <p className="rounded-2xl border border-line bg-surface p-5">
      {keyword ? `No matches for "${keyword}" with these filters.` : "No matches with these filters."}
    </p>
  );
}
