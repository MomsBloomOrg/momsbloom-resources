/** Each Organization write checks the login first and clears the Directory cache after a good write. */
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
vi.mock("@/admin/organizations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/organizations")>()),
  createOrganization: mocks.write,
  updateOrganization: mocks.write,
  markOrganizationVerified: mocks.write,
}));

import { saveOrganizationAction } from "./actions";

const idle = { status: "idle" } as const;
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = { name: "Sample Org", statusId: "1" };

describe("saveOrganizationAction", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.requireStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    mocks.write.mockResolvedValue({ ok: true, value: { id: 7, lastVerified: "2026-11-07" } });
  });

  it("without a login: nothing is written", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));
    await expect(saveOrganizationAction(idle, form(valid))).rejects.toThrow("redirect:/login");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("save clears the Directory cache", async () => {
    expect(await saveOrganizationAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "saved" });
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("create clears the cache, then goes to the new page", async () => {
    await expect(saveOrganizationAction(idle, form(valid))).rejects.toThrow("redirect:/admin/organizations/7");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("Mark verified clears the cache", async () => {
    await saveOrganizationAction(idle, form({ id: "7", intent: "verify" }));
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("invalid input and refused writes do not clear the cache", async () => {
    expect(await saveOrganizationAction(idle, form({ id: "7", name: "" }))).toMatchObject({ status: "invalid" });
    mocks.write.mockResolvedValue({ ok: false, error: "gone" });
    expect(await saveOrganizationAction(idle, form({ ...valid, id: "7" }))).toMatchObject({ status: "invalid" });
    expect(await saveOrganizationAction(idle, form({ id: "abc", ...valid }))).toMatchObject({ status: "invalid" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
