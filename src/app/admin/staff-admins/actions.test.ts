/**
 * Each Staff admin action checks for the `admin` role first (`requireAdmin`). The domain module is mocked; staff-admins.test.ts
 * covers the writes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(async () => ({ id: "a1", email: "staff@example.org", role: "admin" })),
  add: vi.fn(async () => ({ ok: true, value: { email: "new@example.org" } }) as Record<string, unknown>),
  remove: vi.fn(async () => ({ ok: true, value: { email: "added@example.org" } }) as Record<string, unknown>),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/admin/staff-admins", () => ({ addStaffAdmin: mocks.add, removeStaffAdmin: mocks.remove }));

import { addStaffAdminAction, removeStaffAdminAction } from "./actions";

const idle = { result: "idle" } as const;
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("Staff admin actions", () => {
  it("refuse an editor or a missing login (requireAdmin redirects) and write nothing", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(addStaffAdminAction(idle, form({ email: "new@example.org" }))).rejects.toThrow("NEXT_REDIRECT");
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(removeStaffAdminAction(idle, form({ id: "b2" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("add says how to log in and reloads the page", async () => {
    expect(await addStaffAdminAction(idle, form({ email: "new@example.org" }))).toEqual({
      result: "ok",
      message: "Added new@example.org. They can now log in at /login.",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/staff-admins");
  });

  it("remove passes the logged-in Staff admin as the actor and says the person is logged out", async () => {
    expect(await removeStaffAdminAction(idle, form({ id: "b2" }))).toEqual({
      result: "ok",
      message: "Removed added@example.org. They are logged out and can no longer log in.",
    });
    expect(mocks.remove).toHaveBeenCalledWith({}, "a1", "b2");
  });

  it("a refused write shows the error and does not reload", async () => {
    mocks.remove.mockResolvedValueOnce({ ok: false, error: "You cannot remove yourself. Ask another Staff admin." });
    expect(await removeStaffAdminAction(idle, form({ id: "a1" }))).toEqual({
      result: "error",
      message: "You cannot remove yourself. Ask another Staff admin.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
