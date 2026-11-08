/** A failed database read (for example a missing `site_content` table) falls back to the defaults. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/admin/directory-heading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/directory-heading")>()),
  getDirectoryHeadingContent: mocks.read,
}));

import { DIRECTORY_HEADING_DEFAULTS } from "@/admin/directory-heading";
import { loadDirectoryHeadingContent } from "./directory-heading-content";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadDirectoryHeadingContent", () => {
  it("returns the defaults when the read fails", async () => {
    mocks.read.mockRejectedValueOnce(new Error('relation "site_content" does not exist'));
    expect(await loadDirectoryHeadingContent()).toEqual(DIRECTORY_HEADING_DEFAULTS);
  });

  it("returns the saved content when the read works", async () => {
    mocks.read.mockResolvedValueOnce({ ...DIRECTORY_HEADING_DEFAULTS, heading: "Hi" });
    expect((await loadDirectoryHeadingContent()).heading).toBe("Hi");
  });
});
