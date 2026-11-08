import { describe, expect, it } from "vitest";
import { lastGoodPin, pinForState } from "./last-good-pin";

const old = { latitude: 42.9, longitude: -85.6 };
const fresh = { latitude: 42.96, longitude: -85.67 };

describe("lastGoodPin", () => {
  it("takes the pin of a good save", () => {
    expect(lastGoodPin(old, { status: "saved", ...fresh })).toEqual(fresh);
  });

  it("keeps the saved pin after a refused save, not the page-load pin", () => {
    const afterSave = lastGoodPin(old, { status: "saved", ...fresh });
    expect(lastGoodPin(afterSave, { status: "invalid" })).toEqual(fresh);
  });

  it("keeps the pin on Mark verified, which carries none", () => {
    expect(lastGoodPin(fresh, { status: "saved" })).toEqual(fresh);
  });

  it("takes a null pin from a save that found no match", () => {
    expect(lastGoodPin(old, { status: "saved", latitude: null, longitude: null })).toEqual({ latitude: null, longitude: null });
  });
});

describe("pinForState", () => {
  const saved = { status: "saved", ...old };

  it("applies the pin of a new save state", () => {
    expect(pinForState(fresh, saved, { status: "idle" })).toEqual(old);
  });

  it("keeps a later pin (a lookup) while the page still holds the same save state", () => {
    expect(pinForState(fresh, saved, saved)).toBe(fresh);
  });
});
