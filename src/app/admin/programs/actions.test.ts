/** Each Program write checks the login first and clears the Directory cache after a good write. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(),
  write: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/admin/programs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/programs")>()),
  saveProgram: mocks.write,
  markProgramVerified: mocks.write,
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
  });

  it("without a login: nothing is written", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));
    await expect(saveProgramAction(idle, form(valid))).rejects.toThrow("redirect:/login");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
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
});
