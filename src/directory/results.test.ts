/**
 * searchDirectory against the made-up snapshot. Most tests match an item in the acceptance
 * checklist of docs/specs/public-directory.md.
 */
import { describe, expect, it } from "vitest";
import { AGES, DOULA, PARKING, TEST_FIELDS } from "@/custom-fields/test-fixtures";
import type { CustomValues } from "@/custom-fields/types";
import { parseDirectoryQuery } from "./query";
import { searchDirectory } from "./results";
import { facetLabelLookup } from "./search";
import { facetValues, TEST_SNAPSHOT } from "./test-fixtures";
import type { DirectorySnapshot } from "./types";

const search = (url: string, snapshot: DirectorySnapshot = TEST_SNAPSHOT) =>
  searchDirectory(snapshot, parseDirectoryQuery(new URLSearchParams(url)));
const ids = (url: string) => search(url).programs.map((result) => result.program.id);

describe("keyword", () => {
  it("an Organization's name returns all of its Programs", () => {
    expect(ids("q=riverbend")).toEqual(["P-001", "P-002"]);
  });

  it("a Contact's name finds their Program", () => {
    expect(ids("q=maria")).toEqual(["P-001"]);
  });

  it("search keywords and Facet value labels are searched", () => {
    expect(ids("q=ppd")).toEqual(["P-005"]);
    expect(ids("q=support groups")).toEqual(["P-005"]);
  });

  it("Facet value keys are unique only within a Facet: Category 1 and Language 1 keep their own labels", () => {
    const snapshot: DirectorySnapshot = {
      facets: [
        { key: "category", label: "Type of support", values: [{ key: "1", label: "Doula care" }] },
        { key: "language", label: "Language", values: [{ key: "1", label: "Arabic" }] },
      ],
      programs: [
        { ...TEST_SNAPSHOT.programs[0], id: "12", facetValues: facetValues({ category: ["1"], language: ["1"] }), contacts: [] },
      ],
      documents: [],
      customFields: [],
    };
    const labelOf = facetLabelLookup(snapshot.facets);
    expect([labelOf("category", "1"), labelOf("language", "1"), labelOf("cost", "1")]).toEqual(["Doula care", "Arabic", undefined]);
    // The keyword searches Category labels, not Language labels.
    expect(search("q=doula", snapshot).programs.map((r) => r.program.id)).toEqual(["12"]);
    expect(search("q=arabic", snapshot).totalPrograms).toBe(0);
    expect(search("cat=1&lang=1&cost=1", snapshot).query.filters).toMatchObject({ category: ["1"], language: ["1"], cost: [] });
  });

  it("Documents are searched too", () => {
    expect(search("q=ppd").documents.map((d) => d.id)).toEqual(["D-001"]);
  });
});

describe("filters", () => {
  it("two insurance options give more results; adding a language gives fewer", () => {
    expect(ids("ins=medicaid")).toEqual(["P-001", "P-002"]);
    expect(ids("ins=medicaid&ins=priority-health")).toEqual(["P-003", "P-001", "P-002"]);
    expect(ids("ins=medicaid&ins=priority-health&lang=spanish")).toEqual(["P-001"]);
  });

  it("a filter value that does not exist is dropped, not matched", () => {
    const results = search("cat=no-such-category");
    expect(results.totalPrograms).toBe(6);
    expect(results.query.filters.category).toEqual([]);
  });

  it("the Organization filter shows that Organization's Programs and no Documents", () => {
    const results = search("org=O-003");
    expect(results.programs.map((r) => r.program.id)).toEqual(["P-004", "P-005"]);
    expect(results.documents).toEqual([]);
  });

  it("Documents follow the Category and Language filters, and ignore the others", () => {
    expect(search("lang=spanish").documents.map((d) => d.id)).toEqual(["D-001"]);
    expect(search("ins=medicaid").documents).toHaveLength(2);
  });

  it("counts each option given the other filters", () => {
    const { counts } = search("q=yoga&lang=english");
    // "yoga" finds P-001 and P-003, and both are in English.
    expect(counts.subcategory).toEqual({ yoga: 2 });
    expect(counts.insurance).toEqual({ medicaid: 1, "priority-health": 2 });
    // The language counts ignore the language filter itself.
    expect(counts.language).toEqual({ english: 2, spanish: 1 });
  });
});

describe("distance", () => {
  it("49508 sorts by distance; virtual Programs and Documents still show at 5 mi", () => {
    const results = search("zip=49508&r=5");
    expect(results.sort).toBe("nearest");
    expect(results.programs.map((r) => [r.program.id, r.group, r.distanceMiles])).toEqual([
      ["P-001", "nearby", 0.5],
      ["P-002", "nearby", 0.5],
      ["P-006", "virtual-and-phone", null],
      ["P-004", "virtual-and-phone", null],
    ]);
    expect(results.documents).toHaveLength(2);
  });

  it("there is no distance limit when a ZIP code is set and no radius is in the link", () => {
    const results = search("zip=49508");
    expect(results.radius).toBe("any");
    expect(results.programs.map((r) => r.program.id)).toContain("P-005");
  });

  it("an old link with a radius still limits the distance", () => {
    const results = search("zip=49508&r=10");
    expect(results.radius).toBe(10);
    expect(results.programs.map((r) => r.program.id)).toEqual(["P-001", "P-002", "P-003", "P-006", "P-004"]);
  });

  it("Any radius keeps far Programs", () => {
    expect(search("zip=49508&r=any").programs.map((r) => r.program.id)).toContain("P-005");
  });

  it("an unknown ZIP code is reported, and the results show without distances", () => {
    const results = search("zip=90210");
    expect(results.zipNotFound).toBe(true);
    expect(results.origin).toBeNull();
    expect(results.radius).toBe("any");
    expect(results.programs.every((r) => r.group === null && r.distanceMiles === null)).toBe(true);
  });

  it("Use my location works like a ZIP code", () => {
    expect(search("near=42.87,-85.63&r=5").programs[0]).toMatchObject({ group: "nearby" });
  });
});

describe("sorting and pages", () => {
  it("A to Z is the default without a location", () => {
    expect(ids("")).toEqual(["P-003", "P-006", "P-004", "P-001", "P-005", "P-002"]);
  });

  it("Recently verified puts the newest date first and no date last", () => {
    expect(ids("sort=verified")).toEqual(["P-003", "P-001", "P-002", "P-005", "P-006", "P-004"]);
  });

  it("Nearest without a location falls back to A to Z", () => {
    expect(search("sort=nearest").sort).toBe("az");
  });

  it("shows 10 per page, and Show more adds 10", () => {
    const many: DirectorySnapshot = {
      ...TEST_SNAPSHOT,
      programs: Array.from({ length: 25 }, (_, i) => ({
        ...TEST_SNAPSHOT.programs[0],
        id: `P-${String(i + 100)}`,
        name: `Program ${String(i).padStart(2, "0")}`,
      })),
    };
    const first = search("", many);
    expect(first).toMatchObject({ totalPrograms: 25, hasMore: true });
    expect(first.programs).toHaveLength(10);
    expect(search("n=3", many)).toMatchObject({ hasMore: false });
    expect(search("n=3", many).programs).toHaveLength(25);
  });
});

describe("custom field filters", () => {
  const answers: Record<string, Record<string, unknown>> = {
    "P-001": { [DOULA.id]: true, [PARKING.id]: "1" },
    "P-002": { [DOULA.id]: false, [PARKING.id]: "2" },
    "P-003": { [PARKING.id]: "1" },
  };
  const snapshot: DirectorySnapshot = {
    ...TEST_SNAPSHOT,
    customFields: TEST_FIELDS,
    programs: TEST_SNAPSHOT.programs.map((program) => ({ ...program, custom: (answers[program.id] ?? {}) as CustomValues })),
  };
  const customIds = (url: string) => search(url, snapshot).programs.map((r) => r.program.id).sort();

  it("a checked value keeps only Programs with that answer; blank never matches", () => {
    expect(customIds(`cf${DOULA.id}=yes`)).toEqual(["P-001"]);
    expect(customIds(`cf${DOULA.id}=no`)).toEqual(["P-002"]);
  });

  it("values in one field combine with OR", () => {
    expect(customIds(`cf${PARKING.id}=1&cf${PARKING.id}=2`)).toEqual(["P-001", "P-002", "P-003"]);
  });

  it("fields combine with AND, with each other and with the Facets", () => {
    expect(customIds(`cf${PARKING.id}=1&cf${DOULA.id}=yes`)).toEqual(["P-001"]);
    const withFacet = search(`cf${PARKING.id}=1&cat=postpartum-recovery`, snapshot).programs.map((r) => r.program.id);
    const facetOnly = search("cat=postpartum-recovery", snapshot).programs.map((r) => r.program.id);
    expect(withFacet).toEqual(facetOnly.filter((id) => answers[id]?.[PARKING.id] === "1"));
  });

  it("counts each custom value given the other filters", () => {
    const results = search(`cf${DOULA.id}=yes`, snapshot);
    expect(results.customCounts[PARKING.id]).toEqual({ "1": 1 });
    // Its own field is left out of its counts, so both answers stay visible.
    expect(results.customCounts[DOULA.id]).toEqual({ yes: 1, no: 1 });
  });

  it("the Facet counts respect the custom filters", () => {
    const all = search("", snapshot).counts;
    const filtered = search(`cf${DOULA.id}=yes`, snapshot).counts;
    const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum(filtered.category)).toBeLessThan(sum(all.category));
  });

  it("drops filters for fields that are not filters, hidden options, and unknown fields", () => {
    const results = search(`cf${AGES.id}=1&cf${PARKING.id}=3&cf999=1`, snapshot);
    expect(results.query.custom).toEqual({});
    expect(results.totalPrograms).toBe(TEST_SNAPSHOT.programs.length);
  });
});
