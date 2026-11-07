/** Each Contact write checks the login first and clears the Directory cache after a good write. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireStaffAdmin: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));
vi.mock("@/admin/contacts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/contacts")>()),
  addContact: mocks.add,
  updateContact: mocks.update,
  removeContact: mocks.remove,
}));

import { saveContactAction } from "./contact-actions";

const idle = { status: "idle" } as const;
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = { programId: "3", name: "Sam Example" };

describe("saveContactAction", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.requireStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    for (const m of [mocks.add, mocks.update, mocks.remove]) m.mockResolvedValue({ ok: true, value: { id: 9 } });
  });

  it("without a login: nothing is written", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));
    await expect(saveContactAction(idle, form(valid))).rejects.toThrow("redirect:/login");
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("add, save, and remove each clear the Directory cache", async () => {
    expect(await saveContactAction(idle, form(valid))).toMatchObject({ status: "saved", message: "Contact added." });
    expect(await saveContactAction(idle, form({ ...valid, contactId: "9" }))).toMatchObject({ status: "saved" });
    expect(await saveContactAction(idle, form({ ...valid, contactId: "9", intent: "remove" }))).toMatchObject({ status: "saved" });
    expect(mocks.add).toHaveBeenCalledWith({}, 3, expect.objectContaining({ showOnWebsite: false }));
    expect(mocks.update).toHaveBeenCalledWith({}, 3, 9, expect.anything());
    expect(mocks.remove).toHaveBeenCalledWith({}, 3, 9);
    expect(mocks.updateTag).toHaveBeenCalledTimes(3);
  });

  it("invalid input, bad IDs, and refused writes do not clear the cache", async () => {
    expect(await saveContactAction(idle, form({ ...valid, name: "" }))).toMatchObject({ status: "invalid" });
    expect(await saveContactAction(idle, form({ ...valid, programId: "x" }))).toMatchObject({ status: "invalid" });
    expect(await saveContactAction(idle, form({ ...valid, contactId: "abc" }))).toMatchObject({ status: "invalid" });
    expect(await saveContactAction(idle, form({ ...valid, intent: "remove" }))).toMatchObject({ status: "invalid" });
    mocks.update.mockResolvedValue({ ok: false, error: "gone" });
    expect(await saveContactAction(idle, form({ ...valid, contactId: "9" }))).toMatchObject({ status: "invalid" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
