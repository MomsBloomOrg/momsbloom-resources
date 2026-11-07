import { describe, expect, it } from "vitest";
import { emptyFilters } from "./query";
import { countFacetValues, matchesFilters } from "./filter";
import { facetValues } from "./test-fixtures";

const record = facetValues({ insurance: ["medicaid"], language: ["english", "spanish"] });

describe("matchesFilters", () => {
  it("OR inside one Facet", () => {
    const filters = { ...emptyFilters(), insurance: ["priority-health", "medicaid"] };
    expect(matchesFilters(record, filters)).toBe(true);
  });

  it("AND between Facets", () => {
    expect(matchesFilters(record, { ...emptyFilters(), insurance: ["medicaid"], language: ["spanish"] })).toBe(true);
    expect(matchesFilters(record, { ...emptyFilters(), insurance: ["medicaid"], cost: ["free"] })).toBe(false);
  });

  it("no active filters matches everything", () => {
    expect(matchesFilters(facetValues({}), emptyFilters())).toBe(true);
  });
});

describe("countFacetValues", () => {
  const records = [
    { facetValues: facetValues({ insurance: ["medicaid"], language: ["english"] }) },
    { facetValues: facetValues({ insurance: ["priority-health"], language: ["english", "spanish"] }) },
    { facetValues: facetValues({ insurance: ["medicaid"], language: ["spanish"] }) },
  ];

  it("counts each value with the OTHER Facets' filters applied", () => {
    const counts = countFacetValues(records, { ...emptyFilters(), insurance: ["medicaid"], language: ["english"] });
    // Insurance counts use only the language filter (english): records 1 and 2.
    expect(counts.insurance).toEqual({ medicaid: 1, "priority-health": 1 });
    // Language counts use only the insurance filter (medicaid): records 1 and 3.
    expect(counts.language).toEqual({ english: 1, spanish: 1 });
  });
});
