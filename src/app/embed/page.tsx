import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { clearFilters, hasActiveFilters, parseDirectoryQuery, serializeDirectoryQuery } from "@/directory/query";
import { searchDirectory, type ProgramResult } from "@/directory/results";
import { getDirectorySnapshot } from "@/directory/snapshot";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { ActiveChips } from "./_components/active-chips";
import { DirectoryHeader } from "./_components/directory-header";
import { DirectoryLive } from "./_components/directory-live";
import { DocumentCard } from "./_components/document-card";
import { activeFilterCount, FilterColumn } from "./_components/filter-column";
import { HelpBox } from "./_components/help-box";
import { NoResults } from "./_components/no-results";
import { ProgramCard } from "./_components/program-card";
import { ResizeReporter } from "./_components/resize-reporter";
import { ResultLine } from "./_components/result-line";
import { SearchBar } from "./_components/search-bar";
import { ShowMore } from "./_components/show-more";

/** Embed pages are not for search engines. The momsbloom.org/resources page is the real page. */
export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

/**
 * The Directory list view, shown in an iframe on momsbloom.org/resources by `public/embed.js`.
 *
 * The server reads the state from the URL, searches the snapshot (ADR 0004), and renders everything.
 * Every control is a link or a GET form, so the page works without JavaScript; DirectoryLive adds the
 * live updates on top.
 *
 * The element with id EMBED_ROOT_ID is the one that ResizeReporter measures. Keep all content inside it.
 */
export default async function EmbedPage({ searchParams }: PageProps<"/embed">) {
  const params = await searchParams;
  // Test-only switch for the error screen (e2e). Vercel never sets the env var.
  if (process.env.DIRECTORY_TEST_ERRORS === "1" && params.fail === "1") throw new Error("Test error");
  const snapshot = getDirectorySnapshot();
  const results = searchDirectory(snapshot, parseDirectoryQuery(params));
  const { query } = results;

  const labels = new Map(snapshot.facets.flatMap((facet) => facet.values.map((value) => [value.key, value.label])));
  const labelOf = (key: string) => labels.get(key) ?? key;
  const search = serializeDirectoryQuery(query);
  const clearAllHref = hasActiveFilters(query) ? `?${serializeDirectoryQuery(clearFilters(query))}` : null;
  const organizationName = snapshot.programs.find((program) => program.organization.id === query.org)?.organization.name ?? null;
  const widenHref =
    results.origin && typeof results.radius === "number" && results.radius < 25
      ? `?${serializeDirectoryQuery({ ...query, radius: 25, pages: 1 })}`
      : null;
  // parseDirectoryQuery drops a ZIP that is not 5 digits; show the ZIP message for it (DirectoryLive sends it only on an explicit search).
  const rawZip = typeof params.zip === "string" ? params.zip : "";
  const zipInvalid = rawZip !== "" && !/^\d{5}$/.test(rawZip);
  const filterCount = activeFilterCount(query);

  const cards = (list: ProgramResult[]) => (
    <ul className="flex flex-col gap-4">
      {list.map((result) => (
        <li key={result.program.id}>
          <ProgramCard
            result={result}
            labelOf={labelOf}
            detailsHref={`/embed/programs/${result.program.id}${search ? `?${search}` : ""}`}
          />
        </li>
      ))}
    </ul>
  );
  const nearby = results.programs.filter((result) => result.group !== "virtual-and-phone");
  const virtual = results.programs.filter((result) => result.group === "virtual-and-phone");

  return (
    <main id={EMBED_ROOT_ID} className="mx-auto w-full max-w-6xl px-4 py-8">
      <DirectoryHeader />

      <DirectoryLive>
        <div className="mt-6">
          <SearchBar query={query} zipNotFound={results.zipNotFound || zipInvalid} zipText={zipInvalid ? rawZip : undefined} />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-[17rem_1fr]">
          <div className="order-last md:order-first">
            <FilterColumn facets={snapshot.facets} results={results} clearAllHref={clearAllHref} />
          </div>
          {/* While new results load, the old ones stay, faded (spec, "States and edge cases"). */}
          <div className="flex min-w-0 flex-col gap-4 transition-opacity group-data-[pending]/live:opacity-60">
            <ResultLine results={results} />
            <a
              href="#filters"
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
              <ActiveChips query={query} labelOf={labelOf} organizationName={organizationName} clearAllHref={clearAllHref} />
            )}

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

            {results.documents.length > 0 && (
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
      <ResizeReporter />
    </main>
  );
}
