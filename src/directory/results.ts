/**
 * searchDirectory: one call gives everything a results page needs (ADR 0004).
 *
 *   const results = searchDirectory(snapshot, parseDirectoryQuery(searchParams));
 *
 * The steps, in order:
 * 1. Drop filter values that are not in the snapshot (an old link may name a removed value).
 * 2. Keep Programs that match the Organization filter and the keyword.
 * 3. Work out the Distance, and drop places outside the radius. Virtual-only Programs, and
 *    Programs with no map point, go to the "Virtual and phone" group and are never dropped.
 * 4. Count the filter options (from the Programs left after step 3).
 * 5. Apply the filters, sort (featured Programs first, in rank order), and cut out the pages that are shown.
 * 6. Documents: the Organization filter (its linked Documents only), keyword, and their three Facets, and Document field filters. Never paged, never limited by distance.
 */
import { cleanCustomFilters, countCustomFilterValues, matchesCustomFilters } from "@/custom-fields/filter";
import { distanceMiles, roundMiles } from "./distance";
import { countFacetValues, DOCUMENT_FACETS, matchesFilters, type FacetCounts } from "./filter";
import { emptyFilters, PAGE_SIZE, type DirectoryQuery, type RadiusMiles, type Sort } from "./query";
import { documentSearchText, facetLabelLookup, keywordWords, matchesWords, programSearchText } from "./search";
import { FACET_KEYS, type DirectoryDocument, type DirectoryProgram, type DirectorySnapshot, type LatLng } from "./types";
import { lookupMichiganZip } from "./zip";


export interface ProgramResult {
  program: DirectoryProgram;
  /** Miles, one decimal. Null when there is no location, or the Program has no Distance. */
  distanceMiles: number | null;
  /** Null when no location is known (one plain list). */
  group: "nearby" | "virtual-and-phone" | null;
}

export interface DirectoryResults {
  /** The query actually used: filter values that do not exist were dropped. Build chips from this. */
  query: DirectoryQuery;
  /** Where distances are measured from, or null. */
  origin: LatLng | null;
  /** True when a ZIP code was given but is not a Michigan ZIP code we know. */
  zipNotFound: boolean;
  radius: RadiusMiles | "any";
  sort: Sort;
  /** The Programs on the pages shown, in order. With a location, "nearby" comes before "virtual-and-phone". */
  programs: ProgramResult[];
  /** All matching Programs, not only the ones shown. For "24 results". */
  totalPrograms: number;
  /** True when "Show more" has more to show. */
  hasMore: boolean;
  documents: DirectoryDocument[];
  /** For each Facet value key: the count to show next to its checkbox. A missing key means 0. */
  counts: FacetCounts;
  /** Custom filter counts: field id → value key → count. A missing key means 0. */
  customCounts: Record<string, Record<string, number>>;
}

// The search text of each record, worked out once per cached snapshot (the records are the same
// objects on every request). A WeakMap lets the old texts go when a new snapshot replaces the old.
const searchTextCache = new WeakMap<object, string>();

function cachedText<T extends object>(record: T, make: (record: T) => string): string {
  let text = searchTextCache.get(record);
  if (text === undefined) {
    text = make(record);
    searchTextCache.set(record, text);
  }
  return text;
}

const byName = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

function compareResults(sort: Sort) {
  return (a: ProgramResult, b: ProgramResult): number => {
    // Featured Programs first, in rank order, for every sort; not featured (null) after them.
    const rankA = a.program.featuredRank ?? Infinity;
    const rankB = b.program.featuredRank ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    if (sort === "nearest" && a.distanceMiles !== null && b.distanceMiles !== null && a.distanceMiles !== b.distanceMiles) {
      return a.distanceMiles - b.distanceMiles;
    }
    if (sort === "verified") {
      const dateA = a.program.lastVerified ?? "";
      const dateB = b.program.lastVerified ?? "";
      if (dateA !== dateB) return dateA < dateB ? 1 : -1; // newest first; no date last
    }
    return byName(a.program.name, b.program.name);
  };
}

export function searchDirectory(snapshot: DirectorySnapshot, query: DirectoryQuery): DirectoryResults {
  // Step 1: keep only filter values that exist.
  const labelOf = facetLabelLookup(snapshot.facets);
  const filters = emptyFilters();
  for (const facet of FACET_KEYS) filters[facet] = query.filters[facet].filter((value) => labelOf(facet, value) !== undefined);
  const custom = cleanCustomFilters(snapshot.customFields, query.custom);

  // Step 2: Organization and keyword.
  const words = keywordWords(query.q);
  const matching = snapshot.programs.filter(
    (program) =>
      (query.org === null || program.organization.id === query.org) &&
      matchesWords(cachedText(program, (p) => programSearchText(p, labelOf)), words),
  );

  // Step 3: Distance and radius.
  const origin = query.near ?? (query.zip ? lookupMichiganZip(query.zip) : null);
  // The Distance group shows only with a location; no limit until the family picks a radius.
  const radius = query.radius ?? "any";
  const placed: ProgramResult[] = [];
  for (const program of matching) {
    if (!origin) {
      placed.push({ program, distanceMiles: null, group: null });
    } else if (program.virtualOnly || !program.location) {
      placed.push({ program, distanceMiles: null, group: "virtual-and-phone" });
    } else {
      const miles = roundMiles(distanceMiles(origin, program.location));
      if (radius === "any" || miles <= radius) placed.push({ program, distanceMiles: miles, group: "nearby" });
    }
  }

  // Step 4: counts. Step 5: filters, sort, pages.
  // Facets and custom filters combine with AND, so each side's counts use the programs that pass the other side.
  const placedPrograms = placed.map((result) => result.program);
  const counts = countFacetValues(
    placedPrograms.filter((program) => matchesCustomFilters(snapshot.customFields, "program", program.custom, custom)),
    filters,
  );
  const programCounts = countCustomFilterValues(
    snapshot.customFields,
    "program",
    placedPrograms.filter((program) => matchesFilters(program.facetValues, filters)),
    custom,
  );
  const sort: Sort = query.sort === "nearest" && !origin ? "az" : (query.sort ?? (origin ? "nearest" : "az"));
  const filtered = placed
    .filter((result) => matchesFilters(result.program.facetValues, filters) && matchesCustomFilters(snapshot.customFields, "program", result.program.custom, custom))
    .sort(compareResults(sort));
  // With a location, the nearby places always come first, then the "Virtual and phone" group.
  const ordered = origin
    ? [...filtered.filter((r) => r.group === "nearby"), ...filtered.filter((r) => r.group !== "nearby")]
    : filtered;
  const shown = query.pages * PAGE_SIZE;

  // Step 6: Documents.
  // Document field filters apply to Documents only, and Program field filters to Programs only; field ids are unique, so one map holds both counts.
  const documentsBeforeFields = snapshot.documents.filter(
    (document) =>
      (query.org === null || document.organization?.id === query.org) &&
      matchesWords(cachedText(document, (d) => documentSearchText(d, labelOf)), words),
  );
  const documentCounts = countCustomFilterValues(
    snapshot.customFields,
    "document",
    documentsBeforeFields.filter((document) => matchesFilters(document.facetValues, filters, { facets: DOCUMENT_FACETS })),
    custom,
  );
  const customCounts = { ...programCounts, ...documentCounts };
  const documents = documentsBeforeFields
    .filter(
      (document) =>
        matchesFilters(document.facetValues, filters, { facets: DOCUMENT_FACETS }) &&
        matchesCustomFilters(snapshot.customFields, "document", document.custom, custom),
    )
    .sort((a, b) => byName(a.title, b.title));

  return {
    query: { ...query, filters, custom },
    origin,
    zipNotFound: query.zip !== null && query.near === null && origin === null,
    radius,
    sort,
    programs: ordered.slice(0, shown),
    totalPrograms: ordered.length,
    hasMore: ordered.length > shown,
    documents,
    counts,
    customCounts,
  };
}
