/** The save action checks the login first, and a successful save reloads the Directory (tag "directory"). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(async () => ({ id: "a1", email: "staff@example.org" })),
  save: vi.fn(async () => ({ ok: true, value: {} }) as Record<string, unknown>),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/admin/help-box", () => ({ saveHelpBoxContent: mocks.save }));

import { saveHelpBoxAction } from "./actions";

const idle = { result: "idle" } as const;
beforeEach(() => vi.clearAllMocks());

describe("saveHelpBoxAction", () => {
  it("refuses without a login and saves nothing", async () => {
    mocks.requireStaffAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(saveHelpBoxAction(idle, new FormData())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("reloads the Directory on success", async () => {
    expect((await saveHelpBoxAction(idle, new FormData())).result).toBe("ok");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("shows the error and does not reload on a refusal", async () => {
    mocks.save.mockResolvedValueOnce({ ok: false, error: "Nope." });
    expect(await saveHelpBoxAction(idle, new FormData())).toEqual({ result: "error", message: "Nope." });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
