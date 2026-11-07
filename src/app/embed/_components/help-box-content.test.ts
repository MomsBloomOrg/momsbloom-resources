/** A failed database read (for example a missing `site_content` table) falls back to the defaults. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("@/admin/help-box", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/admin/help-box")>()), getHelpBoxContent: mocks.read }));

import { HELP_BOX_DEFAULTS } from "@/admin/help-box";
import { loadHelpBoxContent } from "./help-box-content";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadHelpBoxContent", () => {
  it("returns the defaults when the read fails", async () => {
    mocks.read.mockRejectedValueOnce(new Error('relation "site_content" does not exist'));
    expect(await loadHelpBoxContent()).toEqual(HELP_BOX_DEFAULTS);
  });

  it("returns the saved content when the read works", async () => {
    mocks.read.mockResolvedValueOnce({ ...HELP_BOX_DEFAULTS, heading: "Hi" });
    expect((await loadHelpBoxContent()).heading).toBe("Hi");
  });
});
