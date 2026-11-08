import { describe, expect, it } from "vitest";
import { describeDatabase } from "./describe-database";

describe("describeDatabase", () => {
  it("shows host, port and database only", () => {
    const out = describeDatabase("postgres://user:s3cret@ep-x.neon.tech:5432/momsbloom?sslmode=require");
    expect(out).toBe("ep-x.neon.tech:5432/momsbloom");
    expect(out).not.toMatch(/s3cret|user/);
  });
  it("does not echo a bad value", () => {
    expect(describeDatabase("not a url s3cret")).toBe("(unreadable DATABASE_URL)");
  });
});
