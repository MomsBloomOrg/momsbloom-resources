/** Each Program write checks the login first and clears the Directory cache after a good write. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(),
  write: vi.fn(),
  custom: vi.fn(),
  old: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/custom-fields/form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/custom-fields/form")>()),
  parseCustomForm: mocks.custom,
}));
vi.mock("@/admin/programs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/programs")>()),
  saveProgram: mocks.write,
  markProgramVerified: mocks.write,
  getProgramForAdmin: mocks.old,
}));

import { saveProgramAction } from "./actions";

const idle = { status: "idle" } as const;
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = { name: "Sample Program", description: "Made-up.", organizationId: "1", statusId: "1", categoryIds: "1" };

describe("saveProgramAction", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.requireStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    mocks.write.mockResolvedValue({ ok: true, value: { id: 7, lastVerified: "2026-11-07" } });
    mocks.custom.mockResolvedValue({ ok: true, values: null });
    mocks.old.mockResolvedValue(null);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("without a login: nothing is written", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));
    await expect(saveProgramAction(idle, form(valid))).rejects.toThrow("redirect:/login");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("Mark verified passes the logged-in email", async () => {
    expect(await saveProgramAction(idle, form({ id: "7", intent: "verify" }))).toMatchObject({ status: "saved", lastVerifiedBy: "staff@example.org" });
    expect(mocks.write).toHaveBeenCalledWith({}, 7, "staff@example.org");
  });

  it("a Save that changes the date records the email; the same date keeps the old one", async () => {
    mocks.old.mockResolvedValue({ program: { lastVerified: "2026-01-01", lastVerifiedBy: "old@example.org" } });
    expect(await saveProgramAction(idle, form({ ...valid, id: "7", lastVerified: "2026-02-02" }))).toMatchObject({ lastVerifiedBy: "staff@example.org" });
    expect(mocks.write.mock.lastCall![2]).toMatchObject({ lastVerifiedBy: "staff@example.org" });
    expect(await saveProgramAction(idle, form({ ...valid, id: "7", lastVerified: "2026-01-01" }))).toMatchObject({ lastVerifiedBy: "old@example.org" });
    expect(mocks.write.mock.lastCall![2]).not.toHaveProperty("lastVerifiedBy");
  });

  it("save clears the Directory cache", async () => {
    expect(await saveProgramAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "saved" });
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("create clears the cache, then goes to the new page", async () => {
    await expect(saveProgramAction(idle, form(valid))).rejects.toThrow("redirect:/admin/programs/7");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("Mark verified clears the cache", async () => {
    await saveProgramAction(idle, form({ id: "7", intent: "verify" }));
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("invalid input and refused writes do not clear the cache", async () => {
    expect(await saveProgramAction(idle, form({ ...valid, id: "7", name: "" }))).toMatchObject({ status: "invalid" });
    mocks.write.mockResolvedValue({ ok: false, error: "gone", fieldErrors: { subcategoryIds: "x" } });
    expect(await saveProgramAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "invalid", errors: { subcategoryIds: "x" } });
    expect(await saveProgramAction(idle, form({ ...valid, id: "abc" }))).toMatchObject({ status: "invalid" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("custom field answers are saved with the record", async () => {
    mocks.custom.mockResolvedValue({ ok: true, values: { "21": "1" } });
    expect(await saveProgramAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "saved" });
    expect(mocks.write.mock.calls[0][2]).toMatchObject({ custom: { "21": "1" } });
  });

  it("no custom fields on the form: the custom column is left alone", async () => {
    await saveProgramAction(idle, form({ ...valid, id: "7" }));
    expect(mocks.write.mock.calls[0][2]).not.toHaveProperty("custom");
  });

  it("a bad custom answer and a bad field show together, and nothing is written", async () => {
    mocks.custom.mockResolvedValue({ ok: false, fieldErrors: { "custom.21": "Pick from the list." } });
    const state = await saveProgramAction(idle, form({ ...valid, id: "7", name: "" }));
    expect(state).toMatchObject({ status: "invalid", errors: { "custom.21": "Pick from the list." } });
    expect(state.status === "invalid" && state.errors.name).toBeTruthy();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  const withAddress = { ...valid, id: "7", streetAddress: "1 Example Way", city: "Sampletown", state: "MI", zip: "48000" };
  const census = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

  it("a changed address is geocoded and the coordinates are saved", async () => {
    const fetchMock = census({ result: { addressMatches: [{ coordinates: { x: -84.5, y: 42.7 } }] } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await saveProgramAction(idle, form(withAddress))).toMatchObject({ status: "saved", notice: undefined, latitude: 42.7, longitude: -84.5 });
    expect(mocks.write.mock.calls[0].at(-1)).toMatchObject({ latitude: 42.7, longitude: -84.5 });
  });

  it("a geocoder failure still saves, with a notice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await saveProgramAction(idle, form(withAddress))).toMatchObject({ status: "saved", notice: expect.stringContaining("couldn't place") });
    expect(mocks.write).toHaveBeenCalled();
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("typed coordinates skip the geocoder", async () => {
    mocks.old.mockResolvedValue({ program: { streetAddress: null, city: null, state: null, zip: null, latitude: null, longitude: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await saveProgramAction(idle, form({ ...withAddress, latitude: "42.1", longitude: "-84.1" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
