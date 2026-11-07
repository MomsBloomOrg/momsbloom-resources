/** The Census geocoder never runs for real here: `fetch` is a stub. */
import { describe, expect, it, vi } from "vitest";
import { geocodeAddress, geocodeOnSave } from "./geocode";

const reply = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });
const match = { result: { addressMatches: [{ coordinates: { x: -84.5, y: 42.7 } }] } };
const blank = { streetAddress: null, city: null, state: null, zip: null, latitude: null, longitude: null };
const place = { ...blank, streetAddress: "1 Example Way", city: "Sampletown", state: "MI", zip: "48000" };

describe("geocodeAddress", () => {
  it("returns the first match, latitude from y and longitude from x", async () => {
    const f = reply(match);
    expect(await geocodeAddress("1 Example Way", f)).toEqual({ latitude: 42.7, longitude: -84.5 });
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("geocoding.geo.census.gov");
    expect(url).toContain("benchmark=Public_AR_Current");
    expect(init.signal).toBeInstanceOf(AbortSignal); // the timeout
  });

  it("returns null for no match, a bad status, bad JSON, or a thrown error", async () => {
    expect(await geocodeAddress("x", reply({ result: { addressMatches: [] } }))).toBeNull();
    expect(await geocodeAddress("x", reply(match, false))).toBeNull();
    expect(await geocodeAddress("x", reply(null))).toBeNull();
    expect(await geocodeAddress("x", vi.fn().mockRejectedValue(new Error("timeout")))).toBeNull();
  });
});

describe("geocodeOnSave", () => {
  it("geocodes a new address and fills the coordinates", async () => {
    const r = await geocodeOnSave(place, null, reply(match));
    expect(r).toEqual({ input: { ...place, latitude: 42.7, longitude: -84.5 }, failed: false });
  });

  it("reports a failed lookup and keeps the input", async () => {
    expect(await geocodeOnSave(place, null, reply({ result: { addressMatches: [] } }))).toEqual({ input: place, failed: true });
  });

  it("skips a blank street address (a Program then inherits)", async () => {
    const f = reply(match);
    expect((await geocodeOnSave({ ...place, streetAddress: null }, null, f)).failed).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("skips an unchanged address and edited coordinates", async () => {
    const f = reply(match);
    const old = { ...place, latitude: 1, longitude: 2 };
    await geocodeOnSave(old, old, f);
    await geocodeOnSave({ ...place, city: "Elsewhere", latitude: 3, longitude: 4 }, old, f);
    expect(f).not.toHaveBeenCalled();
  });

  it("geocodes a changed address with untouched coordinates", async () => {
    const old = { ...place, latitude: 1, longitude: 2 };
    const r = await geocodeOnSave({ ...old, city: "Elsewhere" }, old, reply(match));
    expect(r.input).toMatchObject({ latitude: 42.7, longitude: -84.5 });
  });
});
