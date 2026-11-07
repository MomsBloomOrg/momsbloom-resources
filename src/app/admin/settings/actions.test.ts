/**
 * Each Facet value action checks the login first, and a successful write reloads the Directory
 * snapshot (`updateTag("directory")`). The domain module is mocked; facets.test.ts covers the writes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(async () => ({ id: "a1", email: "staff@example.org" })),
  write: vi.fn(async () => ({ ok: true, value: { id: 1, name: "Sample" } }) as Record<string, unknown>),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/admin/facets", () => ({
  isFacetKey: (value: unknown) => value === "language",
  addFacetValue: mocks.write,
  renameFacetValue: mocks.write,
  moveFacetValue: mocks.write,
  setFacetValueHidden: mocks.write,
  deleteFacetValue: mocks.write,
}));

import { addFacetValueAction, facetValueRowAction } from "./actions";

const idle = { result: "idle" } as const;
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("Facet value actions", () => {
  it("refuse without a login and write nothing", async () => {
    mocks.requireStaffAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(addFacetValueAction(idle, form({ facet: "language", name: "Arabic" }))).rejects.toThrow("NEXT_REDIRECT");
    mocks.requireStaffAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(facetValueRowAction(idle, form({ facet: "language", id: "1", intent: "delete" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it.each(["rename", "up", "down", "hide", "show", "delete"])("%s reloads the Directory after a write", async (intent) => {
    const state = await facetValueRowAction(idle, form({ facet: "language", id: "1", intent, name: "Sample" }));
    expect(state.result).toBe("ok");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("add reloads the Directory after a write", async () => {
    expect(await addFacetValueAction(idle, form({ facet: "language", name: "Arabic" }))).toEqual({ result: "ok", message: 'Added "Sample".' });
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("does not reload when the write is refused, or the Facet or intent is unknown", async () => {
    mocks.write.mockResolvedValueOnce({ ok: false, error: "In use. Hide it instead." });
    expect(await facetValueRowAction(idle, form({ facet: "language", id: "1", intent: "delete" }))).toEqual({
      result: "error",
      message: "In use. Hide it instead.",
    });
    expect((await facetValueRowAction(idle, form({ facet: "statuses", id: "1", intent: "delete" }))).result).toBe("error");
    expect((await facetValueRowAction(idle, form({ facet: "language", id: "1", intent: "drop" }))).result).toBe("error");
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
