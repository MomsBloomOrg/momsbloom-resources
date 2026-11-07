import { describe, expect, it } from "vitest";
import { isStaffEmail, isValidEmail, normalizeEmail, staffAllowList } from "./rules";

describe("normalizeEmail", () => {
  it("email lookup ignores case and spaces", () => {
    expect(normalizeEmail("  Staff@Example.ORG ")).toBe("staff@example.org");
  });

  it("applies NFKC, so look-alike characters become plain ASCII", () => {
    // U+FF20 FULLWIDTH COMMERCIAL AT and fullwidth letters.
    expect(normalizeEmail("ｓｔａｆｆ＠example.org")).toBe("staff@example.org");
  });
});

describe("isValidEmail", () => {
  it("accepts a plain address", () => {
    expect(isValidEmail("new.staff+tag@example.org")).toBe(true);
  });

  it('refuses ", comma, <, and >, which can split one address into several', () => {
    for (const bad of ['"a"@b.org', "a,b@c.org", "a@b.org,c@d.org", "<a@b.org>", "a@b.org>"]) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });

  it("refuses control and format characters (NUL, BEL, DEL, zero-width space, RTL override)", () => {
    for (const bad of ["staff\0@example.org", "a\u0007b@c.org", "a@b\u007f.org", "a​@b.org", "a@‮b.org"]) {
      expect(isValidEmail(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("refuses the other RFC 5322 specials, which need quotes (and quotes are refused)", () => {
    for (const bad of ["a(b)@c.org", "a[b]@c.org", "a:b@c.org", "a;b@c.org", "a\\b@c.org", "a@[127.0.0.1]"]) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });
});

describe("staffAllowList", () => {
  it("splits on commas and whitespace, normalizes, and drops bad entries", () => {
    const env = { ADMIN_EMAILS: " Staff@Example.org,second@example.org\n third@example.org ,, not-an-email, a(b)@c.org" };
    expect([...staffAllowList(env)]).toEqual(["staff@example.org", "second@example.org", "third@example.org"]);
  });

  it("is empty when ADMIN_EMAILS is not set or blank", () => {
    expect(staffAllowList({}).size).toBe(0);
    expect(staffAllowList({ ADMIN_EMAILS: "  , " }).size).toBe(0);
  });
});

describe("isStaffEmail", () => {
  const env = { ADMIN_EMAILS: "staff@example.org, Second@Example.org" };

  it("matches in any case and with spaces", () => {
    expect(isStaffEmail("STAFF@example.org", env)).toBe(true);
    expect(isStaffEmail(" second@example.org ", env)).toBe(true);
  });

  it("refuses a stranger, an empty value, and everyone when the list is empty", () => {
    expect(isStaffEmail("stranger@example.org", env)).toBe(false);
    expect(isStaffEmail(null, env)).toBe(false);
    expect(isStaffEmail("", env)).toBe(false);
    expect(isStaffEmail("staff@example.org", {})).toBe(false);
  });
});
