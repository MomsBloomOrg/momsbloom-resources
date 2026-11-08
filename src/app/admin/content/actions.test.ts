/** The save action checks for the `admin` role first (`requireAdmin`), and a successful save reloads the Directory (tag "directory"). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireAdmin: vi.fn(async () => ({ id: "a1", email: "staff@example.org", role: "admin" })),
  save: vi.fn(async () => ({ ok: true, value: {} }) as Record<string, unknown>),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/admin/help-box", () => ({
  saveHelpBoxContent: mocks.save,
  HELP_BOX_FIELDS: ["heading", "body", "phone", "buttonLabel", "buttonUrl"],
}));

import { saveHelpBoxAction } from "./actions";

const idle = { result: "idle" } as const;
beforeEach(() => vi.clearAllMocks());

describe("saveHelpBoxAction", () => {
  it("refuses an editor or a missing login (requireAdmin redirects) and saves nothing", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(saveHelpBoxAction(idle, new FormData())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("reloads the Directory on success", async () => {
    expect((await saveHelpBoxAction(idle, new FormData())).result).toBe("ok");
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });

  it("shows the error, keeps the typed values, and does not reload on a refusal", async () => {
    mocks.save.mockResolvedValueOnce({ ok: false, error: "Nope." });
    const data = new FormData();
    data.set("heading", "Typed");
    expect(await saveHelpBoxAction(idle, data)).toEqual({
      result: "error",
      message: "Nope.",
      values: { heading: "Typed", body: "", phone: "", buttonLabel: "", buttonUrl: "" },
    });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
