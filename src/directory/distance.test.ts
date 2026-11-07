import { describe, expect, it } from "vitest";
import { distanceMiles, roundMiles } from "./distance";
import { lookupMichiganZip } from "./zip";

describe("distanceMiles", () => {
  it("one degree of longitude at the equator is 2π × 3958.8 / 360 ≈ 69.09 miles", () => {
    expect(distanceMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(69.09, 2);
  });

  it("Grand Rapids to Detroit is about 140 miles in a straight line (driving is longer)", () => {
    const miles = distanceMiles({ lat: 42.9634, lng: -85.6681 }, { lat: 42.3314, lng: -83.0458 });
    expect(miles).toBeGreaterThan(138);
    expect(miles).toBeLessThan(142);
  });

  it("the same point is 0", () => {
    expect(distanceMiles({ lat: 42.9, lng: -85.6 }, { lat: 42.9, lng: -85.6 })).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(roundMiles(0.84)).toBe(0.8);
    expect(roundMiles(9.96)).toBe(10);
  });
});

describe("lookupMichiganZip", () => {
  it("finds 49508 in Grand Rapids", () => {
    const center = lookupMichiganZip("49508");
    expect(center).not.toBeNull();
    expect(distanceMiles(center!, { lat: 42.9634, lng: -85.6681 })).toBeLessThan(10);
  });

  it("returns null for a ZIP code outside Michigan, a bad value, or an object key", () => {
    expect(lookupMichiganZip("90210")).toBeNull();
    expect(lookupMichiganZip("abc")).toBeNull();
    expect(lookupMichiganZip("__proto__")).toBeNull();
  });
});
