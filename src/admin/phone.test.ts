import { describe, expect, it } from "vitest";
import { PHONE_ERROR, checkPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["616-555-0100", "(616) 555-0100"],
    ["(616) 555-0100", "(616) 555-0100"],
    ["616.555.0100", "(616) 555-0100"],
    ["6165550100", "(616) 555-0100"],
    ["1 616 555 0100", "(616) 555-0100"],
    ["+1 616 555 0100", "(616) 555-0100"],
    ["616-555-0100 ext. 12", "(616) 555-0100 x12"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("turns a blank into null", () => {
    expect(normalizePhone("  ")).toBeNull();
  });

  it.each(["555-0100", "abc", "016-555-0100", "616-055-0100", "+44 20 7946 0958"])("refuses %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("writes the shared field error for an invalid number", () => {
    const errors: Record<string, string> = {};
    const out: Record<string, unknown> = {};
    checkPhone("555-0100", errors, out);
    expect(errors).toEqual({ phone: PHONE_ERROR });
    expect(out.phone).toBeNull();
  });
});
