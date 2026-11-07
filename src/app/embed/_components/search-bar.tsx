import { LocateFixed, MapPin, Search } from "lucide-react";
import type { DirectoryQuery } from "@/directory/query";

export const DIRECTORY_FORM_ID = "directory-form";

/**
 * Keyword, ZIP, "Use my location", and Search. A plain GET form, so it works without JavaScript.
 * The filter checkboxes in the filter column belong to this form too (form={DIRECTORY_FORM_ID}).
 * DirectoryLive adds the live behavior (debounce, no page reload, location).
 */
export function SearchBar({
  query,
  zipNotFound,
  zipText,
}: {
  query: DirectoryQuery;
  zipNotFound: boolean;
  /** What the family typed when it is not a 5-digit ZIP (the query drops it). */
  zipText?: string;
}) {
  return (
    <form
      id={DIRECTORY_FORM_ID}
      method="get"
      role="search"
      // No browser validation: a half-typed ZIP must not block the keyword search. A bad ZIP shows the ZIP message.
      noValidate
      className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-start md:rounded-full md:bg-surface md:p-2 md:shadow-md"
    >
      {/* Keep the Organization filter and the sort when the family searches again. */}
      {query.org && <input type="hidden" name="org" value={query.org} />}
      {query.view === "map" && <input type="hidden" name="view" value="map" />}
      {query.sort && <input type="hidden" name="sort" value={query.sort} />}
      <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 md:border-0">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">Keyword</span>
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Try yoga, lactation, diapers"
          maxLength={100}
          className="w-full bg-transparent py-2 outline-none"
        />
      </label>
      <div className="flex flex-col gap-1 md:w-56 md:border-l md:border-line">
        <div className="flex items-center gap-3">
          <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 md:border-0">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">ZIP code</span>
            <input
              type="text"
              name="zip"
              defaultValue={zipText ?? query.zip ?? ""}
              placeholder="ZIP code"
              inputMode="numeric"
              autoComplete="postal-code"
              pattern="\d{5}"
              maxLength={5}
              aria-invalid={zipNotFound || undefined}
              aria-describedby={zipNotFound ? "zip-not-found" : undefined}
              className="w-full bg-transparent py-2 outline-none"
            />
          </label>
          <button
            type="button"
            data-action="locate"
            className="flex min-h-11 items-center gap-1 text-sm font-bold text-primary-text md:hidden"
          >
            <LocateFixed aria-hidden="true" className="size-4" />
            Use my location
          </button>
        </div>
        {zipNotFound && (
          <p id="zip-not-found" role="alert" className="px-4 text-sm font-bold text-primary-text">
            We don&apos;t recognize that ZIP. Try a Michigan ZIP code.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-action="locate"
          className="hidden min-h-12 items-center gap-1 px-2 text-sm font-bold text-primary-text md:flex"
        >
          <LocateFixed aria-hidden="true" className="size-4" />
          Use my location
        </button>
        <button
          type="submit"
          className="min-h-12 w-full rounded-full bg-primary-text px-6 font-bold text-white hover:bg-primary-hover md:w-auto"
        >
          Search
        </button>
      </div>
    </form>
  );
}
