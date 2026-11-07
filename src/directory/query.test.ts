import { describe, expect, it } from "vitest";
import {
  clearFilters,
  EMPTY_QUERY,
  hasActiveFilters,
  isBadZip,
  parseDirectoryQuery,
  removeCustomFilter,
  removeFilter,
  serializeDirectoryQuery,
  shareSearch,
  toggleFilter,
} from "./query";

describe("parseDirectoryQuery", () => {
  it("reads every key, with repeated keys as several values", () => {
    const query = parseDirectoryQuery(
      new URLSearchParams("q=yoga&zip=49508&r=5&cat=postpartum-recovery&ins=medicaid&ins=priority-health&org=O-001&sort=az&n=2"),
    );
    expect(query).toMatchObject({ q: "yoga", zip: "49508", radius: 5, org: "O-001", sort: "az", pages: 2 });
    expect(query.filters.category).toEqual(["postpartum-recovery"]);
    expect(query.filters.insurance).toEqual(["medicaid", "priority-health"]);
  });

  it("reads an Organization ID as an opaque string: database ids and fixture ids", () => {
    expect(parseDirectoryQuery(new URLSearchParams("org=12")).org).toBe("12");
    expect(parseDirectoryQuery(new URLSearchParams("org=O-001")).org).toBe("O-001");
  });

  it("reads Next.js searchParams objects too", () => {
    const query = parseDirectoryQuery({ q: "  yoga   class ", lang: ["english", "spanish"], r: "any" });
    expect(query.q).toBe("yoga class");
    expect(query.filters.language).toEqual(["english", "spanish"]);
    expect(query.radius).toBe("any");
  });

  it("drops bad values instead of failing", () => {
    const query = parseDirectoryQuery(
      new URLSearchParams("zip=4950&r=7&sort=best&n=-3&org=Riverbend%20Health&near=999,1&cat=&cat=yoga&cat=yoga"),
    );
    expect(query).toMatchObject({ zip: null, radius: null, sort: null, pages: 1, org: null, near: null });
    expect(query.filters.category).toEqual(["yoga"]);
    expect(parseDirectoryQuery(new URLSearchParams("org=a%26b")).org).toBeNull();
    expect(parseDirectoryQuery(new URLSearchParams(`org=${"1".repeat(21)}`)).org).toBeNull();
  });

  it("rounds a location to 2 decimals, so the URL never holds an exact address", () => {
    expect(parseDirectoryQuery(new URLSearchParams("near=42.87312,-85.62841")).near).toEqual({ lat: 42.87, lng: -85.63 });
  });

  it("limits the number of pages", () => {
    expect(parseDirectoryQuery(new URLSearchParams("n=500")).pages).toBe(30);
  });
});

describe("serializeDirectoryQuery", () => {
  it("leaves out defaults", () => {
    expect(serializeDirectoryQuery(EMPTY_QUERY)).toBe("");
  });

  it("gives back what parse read", () => {
    const search = "q=yoga&zip=49508&r=10&cat=postpartum-recovery&ins=medicaid&ins=priority-health&sort=nearest&n=3";
    expect(serializeDirectoryQuery(parseDirectoryQuery(new URLSearchParams(search)))).toBe(search);
  });
});

describe("chips and checkboxes", () => {
  const query = parseDirectoryQuery(new URLSearchParams("q=yoga&zip=49508&ins=medicaid&ins=priority-health&org=O-001&n=3"));

  it("a chip's x removes one value and goes back to page 1", () => {
    const next = removeFilter(query, "insurance", "medicaid");
    expect(next.filters.insurance).toEqual(["priority-health"]);
    expect(next.pages).toBe(1);
  });

  it("a checkbox adds or removes a value", () => {
    expect(toggleFilter(query, "language", "spanish").filters.language).toEqual(["spanish"]);
    expect(toggleFilter(query, "insurance", "medicaid").filters.insurance).toEqual(["priority-health"]);
  });

  it("Clear all keeps the keyword and the ZIP code", () => {
    const cleared = clearFilters(query);
    expect(hasActiveFilters(query)).toBe(true);
    expect(hasActiveFilters(cleared)).toBe(false);
    expect(cleared).toMatchObject({ q: "yoga", zip: "49508", pages: 1 });
  });
});

describe("view", () => {
  it("view=map parses; any other value is the list", () => {
    expect(parseDirectoryQuery(new URLSearchParams("view=map")).view).toBe("map");
    expect(parseDirectoryQuery(new URLSearchParams("view=other")).view).toBe("list");
    expect(parseDirectoryQuery(new URLSearchParams("")).view).toBe("list");
  });

  it("serializing leaves out the default list and keeps map", () => {
    expect(serializeDirectoryQuery({ ...EMPTY_QUERY, view: "list" })).toBe("");
    expect(serializeDirectoryQuery({ ...EMPTY_QUERY, view: "map" })).toBe("view=map");
  });

  it("checkboxes, chips, and Clear all keep the map view", () => {
    const query = parseDirectoryQuery(new URLSearchParams("view=map&ins=medicaid"));
    expect(toggleFilter(query, "language", "spanish").view).toBe("map");
    expect(removeFilter(query, "insurance", "medicaid").view).toBe("map");
    expect(clearFilters(query).view).toBe("map");
  });
});

describe("isBadZip", () => {
  it("is false for empty, blank, and 5 digits (trimmed)", () => {
    for (const zip of ["", "  ", "49301", " 49301 "]) expect(isBadZip(zip)).toBe(false);
  });
  it("is true for anything else", () => {
    for (const zip of ["495", "493011", "4930a", "49 301"]) expect(isBadZip(zip)).toBe(true);
  });
});

describe("shareSearch", () => {
  it("never holds zip, near or n, and keeps the rest", () => {
    const search = "q=yoga&zip=49508&near=42.96,-85.67&r=10&cat=postpartum-recovery&org=O-005&sort=az&n=3";
    expect(shareSearch(parseDirectoryQuery(new URLSearchParams(search)))).toBe(
      "q=yoga&cat=postpartum-recovery&org=O-005&sort=az",
    );
  });
});

describe("custom field filters in the URL", () => {
  it("reads cf<id> keys, and writes them back", () => {
    const query = parseDirectoryQuery(new URLSearchParams("cf12=1&cf12=3&cf7=yes&cfx=1&cf=2"));
    expect(query.custom).toEqual({ "12": ["1", "3"], "7": ["yes"] });
    // Field ids are number-like keys, so they come out in number order.
    expect(serializeDirectoryQuery(query)).toBe("cf7=yes&cf12=1&cf12=3");
  });

  it("counts as an active filter; Clear all and the chip x remove it", () => {
    const query = parseDirectoryQuery(new URLSearchParams("q=yoga&cf12=1&cf12=3"));
    expect(hasActiveFilters(query)).toBe(true);
    expect(clearFilters(query).custom).toEqual({});
    expect(removeCustomFilter(query, "12", "1").custom).toEqual({ "12": ["3"] });
    expect(removeCustomFilter(removeCustomFilter(query, "12", "1"), "12", "3").custom).toEqual({});
  });
});
