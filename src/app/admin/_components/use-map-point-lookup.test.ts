import { describe, expect, it } from "vitest";
import { addressKey } from "@/admin/geocode";
import { shouldLookUp } from "./use-map-point-lookup";

const loaded = { streetAddress: "1 Example Way", city: "Sampletown", state: "MI", zip: "48000" };
const lastKey = addressKey(loaded);

describe("shouldLookUp", () => {
  it("never looks up a blank street", () => {
    expect(shouldLookUp({ ...loaded, streetAddress: null }, null)).toBe(false);
    expect(shouldLookUp({ ...loaded, streetAddress: null }, lastKey)).toBe(false);
  });

  it("does not look up the address it looked up or loaded last", () => {
    expect(shouldLookUp({ ...loaded }, lastKey)).toBe(false);
  });

  it("looks up a changed street, city, state, or ZIP", () => {
    expect(shouldLookUp({ ...loaded, streetAddress: "2 Example Way" }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, city: "Othertown" }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, state: null }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, zip: "48001" }, lastKey)).toBe(true);
  });

  it("does not look up a suite-only change", () => {
    const withSuite = { ...loaded, suite: "Suite 200" };
    expect(shouldLookUp(withSuite, lastKey)).toBe(false);
  });
});
