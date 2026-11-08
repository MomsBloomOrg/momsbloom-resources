/**
 * The custom-fields manager changes the fields of every record, so each action checks for the `admin`
 * role first (`requireAdmin`). The domain module is mocked; src/custom-fields covers the writes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireAdmin: vi.fn(async () => ({ id: "a1", email: "staff@example.org", role: "admin" })),
  write: vi.fn(async () => ({ ok: true, field: { label: "Sample" } }) as Record<string, unknown>),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/auth/dal", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/custom-fields/manage", () => ({
  addField: mocks.write,
  editField: mocks.write,
  moveField: mocks.write,
  archiveField: mocks.write,
  restoreField: mocks.write,
}));

import { addFieldAction, fieldRowAction } from "./actions";

const idle = { result: "idle" } as const;
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("Custom field actions", () => {
  it("refuse an editor or a missing login (requireAdmin redirects) and write nothing", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(addFieldAction(idle, form({ label: "New" }))).rejects.toThrow("NEXT_REDIRECT");
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(fieldRowAction(idle, form({ id: "1", intent: "archive" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("an admin writes and the Directory reloads", async () => {
    expect(await addFieldAction(idle, form({ label: "New" }))).toEqual({ result: "ok", message: 'Added "Sample".' });
    expect(await fieldRowAction(idle, form({ id: "1", intent: "archive" }))).toMatchObject({ result: "ok" });
    expect(mocks.write).toHaveBeenCalledTimes(2);
    expect(mocks.updateTag).toHaveBeenCalledWith("directory");
  });
});
