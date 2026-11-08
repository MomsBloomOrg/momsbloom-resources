/** The Census geocoder never runs for real here: the global `fetch` is a stub. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentStaffAdmin: vi.fn() }));
vi.mock("@/auth/dal", () => ({ getCurrentStaffAdmin: mocks.getCurrentStaffAdmin }));

import { GET } from "./route";

const census = vi.fn();
const lookUp = (query: Record<string, string>) => GET(new Request(`http://localhost/api/admin/map-point?${new URLSearchParams(query)}`));
const reply = (matches: unknown[]) => census.mockResolvedValue({ ok: true, json: async () => ({ result: { addressMatches: matches } }) });

describe("map point route", () => {
  beforeEach(() => {
    mocks.getCurrentStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    census.mockReset();
    vi.stubGlobal("fetch", census);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("refuses a request without a login, and does not call the Census", async () => {
    mocks.getCurrentStaffAdmin.mockResolvedValue(null);
    const response = await lookUp({ street: "1 Example Way" });
    expect(response.status).toBe(401);
    expect(census).not.toHaveBeenCalled();
  });

  it("refuses a blank street or a part over 200 characters", async () => {
    expect((await lookUp({ street: "  ", city: "Sampletown" })).status).toBe(400);
    expect((await lookUp({ street: "1 Example Way", city: "x".repeat(201) })).status).toBe(400);
    expect(census).not.toHaveBeenCalled();
  });

  it("returns the point of a match, from the trimmed, joined address, never cached", async () => {
    reply([{ coordinates: { x: -84.5, y: 42.7 } }]);
    const response = await lookUp({ street: " 1 Example Way ", city: "Sampletown", state: "", zip: "48000" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ latitude: 42.7, longitude: -84.5 });
    expect(new URL(census.mock.calls[0][0]).searchParams.get("address")).toBe("1 Example Way, Sampletown, 48000");
  });

  it("returns a null point when the Census finds nothing", async () => {
    reply([]);
    const response = await lookUp({ street: "1 Nowhere Road" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ point: null });
  });
});
