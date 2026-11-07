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
 * 5. Apply the filters, sort, and cut out the pages that are shown.
 * 6. Documents: keyword and their three Facets only. Never paged, never limited by distance.
 */
import { distanceMiles, roundMiles } from "./distance";
import { countFacetValues, DOCUMENT_FACETS, matchesFilters, type FacetCounts } from "./filter";
import { emptyFilters, PAGE_SIZE, type DirectoryQuery, type RadiusMiles, type Sort } from "./query";
import { documentSearchText, keywordWords, matchesWords, programSearchText, type LabelLookup } from "./search";
import { FACET_KEYS, type DirectoryDocument, type DirectoryProgram, type DirectorySnapshot, type LatLng } from "./types";
import { lookupMichiganZip } from "./zip";

/** The radius when a location is known and the family has not chosen one. */
export const DEFAULT_RADIUS_MILES: RadiusMiles = 10;

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
  const labels = new Map<string, string>();
  const known = Object.fromEntries(FACET_KEYS.map((facet) => [facet, new Set<string>()]));
  for (const facet of snapshot.facets) {
    for (const value of facet.values) {
      labels.set(value.key, value.label);
      known[facet.key].add(value.key);
    }
  }
  const filters = emptyFilters();
  for (const facet of FACET_KEYS) filters[facet] = query.filters[facet].filter((value) => known[facet].has(value));
  const labelOf: LabelLookup = (key) => labels.get(key);

  // Step 2: Organization and keyword.
  const words = keywordWords(query.q);
  const matching = snapshot.programs.filter(
    (program) =>
      (query.org === null || program.organization.id === query.org) &&
      matchesWords(cachedText(program, (p) => programSearchText(p, labelOf)), words),
  );

  // Step 3: Distance and radius.
  const origin = query.near ?? (query.zip ? lookupMichiganZip(query.zip) : null);
  const radius = query.radius ?? (origin ? DEFAULT_RADIUS_MILES : "any");
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
  const counts = countFacetValues(
    placed.map((result) => result.program),
    filters,
  );
  const sort: Sort = query.sort === "nearest" && !origin ? "az" : (query.sort ?? (origin ? "nearest" : "az"));
  const filtered = placed
    .filter((result) => matchesFilters(result.program.facetValues, filters))
    .sort(compareResults(sort));
  // With a location, the nearby places always come first, then the "Virtual and phone" group.
  const ordered = origin
    ? [...filtered.filter((r) => r.group === "nearby"), ...filtered.filter((r) => r.group !== "nearby")]
    : filtered;
  const shown = query.pages * PAGE_SIZE;

  // Step 6: Documents.
  const documents =
    query.org !== null
      ? []
      : snapshot.documents
          .filter(
            (document) =>
              matchesWords(cachedText(document, (d) => documentSearchText(d, labelOf)), words) &&
              matchesFilters(document.facetValues, filters, { facets: DOCUMENT_FACETS }),
          )
          .sort((a, b) => byName(a.title, b.title));

  return {
    query: { ...query, filters },
    origin,
    zipNotFound: query.zip !== null && query.near === null && origin === null,
    radius,
    sort,
    programs: ordered.slice(0, shown),
    totalPrograms: ordered.length,
    hasMore: ordered.length > shown,
    documents,
    counts,
  };
}
