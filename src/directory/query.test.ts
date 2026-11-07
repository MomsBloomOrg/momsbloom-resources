import { describe, expect, it } from "vitest";
import {
  clearFilters,
  EMPTY_QUERY,
  hasActiveFilters,
  parseDirectoryQuery,
  removeFilter,
  serializeDirectoryQuery,
  toggleFilter,
} from "./query";

describe("parseDirectoryQuery", () => {
  it("reads every key, with repeated keys as several values", () => {
    const query = parseDirectoryQuery(
      new URLSearchParams("q=yoga&zip=49508&r=5&cat=postpartum-recovery&ins=medicaid&ins=priority-health&org=o-001&sort=az&n=2"),
    );
    expect(query).toMatchObject({ q: "yoga", zip: "49508", radius: 5, org: "O-001", sort: "az", pages: 2 });
    expect(query.filters.category).toEqual(["postpartum-recovery"]);
    expect(query.filters.insurance).toEqual(["medicaid", "priority-health"]);
  });

  it("reads Next.js searchParams objects too", () => {
    const query = parseDirectoryQuery({ q: "  yoga   class ", lang: ["english", "spanish"], r: "any" });
    expect(query.q).toBe("yoga class");
    expect(query.filters.language).toEqual(["english", "spanish"]);
    expect(query.radius).toBe("any");
  });

  it("drops bad values instead of failing", () => {
    const query = parseDirectoryQuery(
      new URLSearchParams("zip=4950&r=7&sort=best&n=-3&org=Riverbend&near=999,1&cat=&cat=yoga&cat=yoga"),
    );
    expect(query).toMatchObject({ zip: null, radius: null, sort: null, pages: 1, org: null, near: null });
    expect(query.filters.category).toEqual(["yoga"]);
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
