/** Each Document write checks the login first and clears the Directory cache after a good write. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(),
  write: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/admin/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/documents")>()),
  saveDocument: mocks.write,
  markDocumentVerified: mocks.verify,
}));

import { saveDocumentAction } from "./actions";

const idle = { status: "idle" } as const;
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = { title: "Sample Guide", url: "https://example.org/guide.pdf", statusId: "1" };

describe("saveDocumentAction", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.requireStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    mocks.write.mockResolvedValue({ ok: true, value: { id: 7 } });
    mocks.verify.mockResolvedValue({ ok: true, value: { lastVerified: "2026-11-07" } });
  });

  it("Mark verified clears the cache", async () => {
    expect(await saveDocumentAction(idle, form({ id: "7", intent: "verify" }))).toEqual({
      status: "saved",
      message: "Marked verified today.",
      lastVerified: "2026-11-07",
    });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("Mark verified without an id is refused", async () => {
    expect(await saveDocumentAction(idle, form({ intent: "verify" }))).toMatchObject({ status: "invalid" });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("without a login: nothing is written", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));
    await expect(saveDocumentAction(idle, form(valid))).rejects.toThrow("redirect:/login");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("save clears the Directory cache", async () => {
    expect(await saveDocumentAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "saved" });
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("create clears the cache, then goes to the new page", async () => {
    await expect(saveDocumentAction(idle, form(valid))).rejects.toThrow("redirect:/admin/documents/7");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("invalid input and refused writes do not clear the cache", async () => {
    expect(await saveDocumentAction(idle, form({ ...valid, id: "7", url: "" }))).toMatchObject({ status: "invalid" });
    mocks.write.mockResolvedValue({ ok: false, error: "gone", fieldErrors: { categoryIds: "x" } });
    expect(await saveDocumentAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "invalid", errors: { categoryIds: "x" } });
    expect(await saveDocumentAction(idle, form({ ...valid, id: "abc" }))).toMatchObject({ status: "invalid" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
