/**
 * Filters and their counts (docs/specs/public-directory.md, "Filters").
 *
 * - Inside one Facet, values combine with OR: Medicaid OR Priority Health.
 * - Between Facets, they combine with AND: (Medicaid OR Priority Health) AND Spanish.
 * - A Category and its Subcategories are separate Facets: checking a Category does not check its
 *   Subcategories.
 */
import { FACET_KEYS, type FacetKey, type FacetValueKeys } from "./types";

export type ActiveFilters = Readonly<Record<FacetKey, readonly string[]>>;

/** Facets that a Document can be filtered by. Other filters do not hide Documents. */
export const DOCUMENT_FACETS: readonly FacetKey[] = ["category", "subcategory", "language"];

/**
 * True when the record passes every active Facet. `skip` leaves one Facet out; the counts use it.
 * `facets` limits which Facets are checked (Documents use DOCUMENT_FACETS).
 */
export function matchesFilters(
  values: FacetValueKeys,
  filters: ActiveFilters,
  { skip, facets = FACET_KEYS }: { skip?: FacetKey; facets?: readonly FacetKey[] } = {},
): boolean {
  return facets.every((facet) => {
    const selected = filters[facet];
    if (facet === skip || selected.length === 0) return true;
    return selected.some((value) => values[facet].includes(value));
  });
}

export type FacetCounts = Record<FacetKey, Record<string, number>>;

/**
 * For each Facet value: how many records the family would see with that value checked, given all
 * the OTHER active filters. (Checking one more value in the same Facet only adds results, because
 * of the OR, so the Facet's own selection is left out.)
 *
 * Pass the records that already passed the keyword, distance, and Organization checks.
 */
export function countFacetValues<T extends { facetValues: FacetValueKeys }>(
  records: readonly T[],
  filters: ActiveFilters,
): FacetCounts {
  const counts = Object.fromEntries(FACET_KEYS.map((facet) => [facet, {}])) as FacetCounts;
  for (const facet of FACET_KEYS) {
    for (const record of records) {
      if (!matchesFilters(record.facetValues, filters, { skip: facet })) continue;
      for (const value of new Set(record.facetValues[facet])) {
        counts[facet][value] = (counts[facet][value] ?? 0) + 1;
      }
    }
  }
  return counts;
}
