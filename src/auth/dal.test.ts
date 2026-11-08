/** `requireAdmin()`: an editor goes to the Admin home, no login goes to the login page. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn(), auth: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));
vi.mock("./config", () => ({ findStaffAdmin: mocks.find }));
vi.mock("./index", () => ({ LOGIN_PATH: "/login", auth: mocks.auth }));

import { requireAdmin } from "./dal";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "a1" } });
});

describe("requireAdmin", () => {
  it("returns an admin", async () => {
    const admin = { id: "a1", email: "staff@example.org", role: "admin" };
    mocks.find.mockResolvedValue(admin);
    expect(await requireAdmin()).toEqual(admin);
  });

  it("sends an editor to the Admin home", async () => {
    mocks.find.mockResolvedValue({ id: "a1", email: "staff@example.org", role: "editor" });
    await expect(requireAdmin()).rejects.toThrow("redirect:/admin");
  });

  it("sends no login to the login page", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("redirect:/login");
  });
});
