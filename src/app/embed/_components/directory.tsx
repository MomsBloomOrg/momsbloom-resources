import { FileText, SlidersHorizontal } from "lucide-react";
import { clearFilters, hasActiveFilters, isBadZip, parseDirectoryQuery, serializeDirectoryQuery, shareSearch } from "@/directory/query";
import { searchDirectory, type ProgramResult } from "@/directory/results";
import { facetLabelLookup } from "@/directory/search";
import { getDirectorySnapshot } from "@/directory/snapshot";
import { FACET_KEYS } from "@/directory/types";
import { ActiveChips } from "./active-chips";
import { AnalyticsReporter } from "./analytics-reporter";
import { DirectoryHeader } from "./directory-header";
import { DirectoryLive } from "./directory-live";
import { DocumentCard } from "./document-card";
import { activeFilterCount, FilterColumn } from "./filter-column";
import { FilterSheet } from "./filter-sheet";
import { HelpBox } from "./help-box";
import { NoResults } from "./no-results";
import { addressText, detailsHref, organizationHref, ProgramCard, type LabelOf } from "./program-card";
import { ProgramMap, type MapProgram } from "./program-map";
import { ResizeReporter } from "./resize-reporter";
import { ResultLine } from "./result-line";
import { SearchBar } from "./search-bar";
import { ShowMore } from "./show-more";

/**
 * The Directory list and map views: search, filters, results, guides, and help. Shared by the Embed
 * (/embed) and the standalone home page (/). `embed` adds the iframe resize and analytics reporters.
 *
 * The server reads the state from the URL, searches the snapshot (ADR 0004), and renders everything.
 * Every control is a link or a GET form, so the page works without JavaScript; DirectoryLive adds the
 * live updates on top.
 */
export async function Directory({ params, embed = false }: { params: Record<string, string | string[] | undefined>; embed?: boolean }) {
  // Test-only switch for the error screen (e2e). Vercel never sets the env var.
  if (process.env.DIRECTORY_TEST_ERRORS === "1" && params.fail === "1") throw new Error("Test error");
  const snapshot = await getDirectorySnapshot();
  const results = searchDirectory(snapshot, parseDirectoryQuery(params));
  const { query } = results;

  const findLabel = facetLabelLookup(snapshot.facets);
  const labelOf: LabelOf = (facet, key) => findLabel(facet, key) ?? key;
  const search = serializeDirectoryQuery(query);
  const clearAllHref = hasActiveFilters(query) ? `?${serializeDirectoryQuery(clearFilters(query))}` : null;
  const organizationName = snapshot.programs.find((program) => program.organization.id === query.org)?.organization.name ?? null;
  const widenHref =
    results.origin && typeof results.radius === "number" && results.radius < 25
      ? `?${serializeDirectoryQuery({ ...query, radius: 25, pages: 1 })}`
      : null;
  // parseDirectoryQuery drops a ZIP that is not 5 digits; show the ZIP message for it (DirectoryLive sends it only on an explicit search).
  const rawZip = typeof params.zip === "string" ? params.zip : "";
  const zipInvalid = isBadZip(rawZip);
  const filterCount = activeFilterCount(query);

  const mapView = query.view === "map";
  // Map view: each shown Program with a point gets a pin number, in card order. Virtual and phone
  // Programs stay cards with no pin.
  const mapPrograms: MapProgram[] = [];
  if (mapView) {
    for (const { program, distanceMiles, group } of results.programs) {
      if (group === "virtual-and-phone" || !program.location) continue;
      mapPrograms.push({
        id: program.id,
        number: mapPrograms.length + 1,
        name: program.name,
        organizationName: program.organization.name,
        distanceMiles,
        lat: program.location.lat,
        lng: program.location.lng,
        detailsHref: detailsHref(program.id, search),
        directionsHref: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          program.address ? addressText(program.address) : `${program.location.lat},${program.location.lng}`,
        )}`,
      });
    }
  }
  const numberOf = new Map(mapPrograms.map((program) => [program.id, program.number]));
  const documentsNote =
    mapView && results.documents.length > 0 ? (
      <p className="flex items-start gap-2 rounded-xl bg-secondary-soft p-3 text-sm">
        <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {results.documents.length} {results.documents.length === 1 ? "guide or download matches" : "guides and downloads match"} your search.{" "}
          <a href={`?${serializeDirectoryQuery({ ...query, view: "list" })}`} className="font-bold text-primary-text underline">
            Switch to list view to see {results.documents.length === 1 ? "it" : "them"}.
          </a>
        </span>
      </p>
    ) : null;

  const cards = (list: ProgramResult[]) => (
    <ul className="flex flex-col gap-4">
      {list.map((result) => (
        <li key={result.program.id}>
          <ProgramCard
            result={result}
            labelOf={labelOf}
            detailsHref={detailsHref(result.program.id, search)}
            organizationHref={organizationHref(result.program.organization.id, search)}
            number={numberOf.get(result.program.id)}
          />
        </li>
      ))}
    </ul>
  );
  const nearby = results.programs.filter((result) => result.group !== "virtual-and-phone");
  const virtual = results.programs.filter((result) => result.group === "virtual-and-phone");

  return (
    <>
      <DirectoryHeader />

      <DirectoryLive>
        <div className="mt-6">
          <SearchBar query={query} zipNotFound={results.zipNotFound || zipInvalid} zipText={zipInvalid ? rawZip : undefined} />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-[17rem_1fr]">
          <div className="order-last md:order-first">
            <FilterSheet total={results.totalPrograms} clearAllHref={clearAllHref}>
              <FilterColumn facets={snapshot.facets} customFields={snapshot.customFields} results={results} clearAllHref={clearAllHref} />
            </FilterSheet>
          </div>
          {/* While new results load, the old ones stay, faded (spec, "States and edge cases"). */}
          <div className="flex min-w-0 flex-col gap-4 transition-opacity group-data-[pending]/live:opacity-60">
            <ResultLine results={results} />
            {/* Without JavaScript: a jump to the column at the bottom. With it: FilterSheet opens the sheet. */}
            <a
              href="#filters"
              data-action="open-filters"
              aria-haspopup="dialog"
              className="flex min-h-11 w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 font-bold md:hidden"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filters
              {filterCount > 0 && (
                <span className="rounded-full bg-primary-text px-2 text-sm text-white">
                  {filterCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </a>
            {clearAllHref && (
              <ActiveChips query={query} labelOf={labelOf} customFields={snapshot.customFields} organizationName={organizationName} clearAllHref={clearAllHref} />
            )}

            {/* Map view: cards on the left, map on the right (the map goes above the cards below lg). */}
            <div className={mapView ? "grid gap-4 lg:grid-cols-[20rem_1fr]" : "contents"}>
              <div className="flex min-w-0 flex-col gap-4">
                {documentsNote}
                <section aria-labelledby="programs-heading" className="flex flex-col gap-4">
                  <h2 id="programs-heading" className="text-xl font-extrabold">
                    {results.origin ? "Places near you" : "Programs"}
                  </h2>
                  {results.totalPrograms === 0 ? <NoResults keyword={query.q} clearFiltersHref={clearAllHref} widenHref={widenHref} /> : cards(nearby)}
                </section>
                {virtual.length > 0 && (
                  <section aria-labelledby="virtual-heading" className="flex flex-col gap-4">
                    <h2 id="virtual-heading" className="text-xl font-extrabold">
                      Virtual and phone
                    </h2>
                    {cards(virtual)}
                  </section>
                )}
                {results.hasMore && <ShowMore query={query} remaining={results.totalPrograms - results.programs.length} />}
              </div>
              {mapView && mapPrograms.length > 0 && (
                <div className="order-first lg:order-last">
                  <ProgramMap programs={mapPrograms} />
                </div>
              )}
              {mapView && results.totalPrograms > 0 && mapPrograms.length === 0 && (
                <p className="order-first rounded-xl border border-line bg-surface p-4 text-sm lg:order-last">
                  These places are virtual or by phone, so they have no map pin.
                </p>
              )}
            </div>

            {!mapView && results.documents.length > 0 && (
              <section aria-labelledby="documents-heading" className="mt-4 flex flex-col gap-4">
                <h2 id="documents-heading" className="text-xl font-extrabold">
                  Guides and downloads{" "}
                  <span className="text-sm font-normal text-muted">
                    {results.documents.length} {results.documents.length === 1 ? "result" : "results"}
                  </span>
                </h2>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {results.documents.map((document) => (
                    <li key={document.id}>
                      <DocumentCard document={document} labelOf={labelOf} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <HelpBox />
          </div>
        </div>
      </DirectoryLive>
      {embed && <ResizeReporter share={shareSearch(query)} />}
      {embed && <AnalyticsReporter search={{ q: query.q, total: results.totalPrograms, filters: FACET_KEYS.flatMap((facet) => query.filters[facet].filter((value) => findLabel(facet, value) !== undefined)).join(",") }} />}
    </>
  );
}
