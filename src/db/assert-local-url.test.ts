import { describe, expect, it } from "vitest";
import { assertLocalUrl } from "./assert-local-url";

describe("assertLocalUrl", () => {
  it("accepts localhost", () => {
    expect(() => assertLocalUrl("postgres://u:p@localhost:5432/db")).not.toThrow();
    expect(() => assertLocalUrl("postgres://u:p@127.0.0.1:5432/db")).not.toThrow();
  });
  it("refuses a remote host", () => {
    expect(() => assertLocalUrl("postgres://u:p@db.example.org/db")).toThrow(/not a local/);
  });
  it("refuses a host query parameter", () => {
    expect(() => assertLocalUrl("postgres://u:p@localhost/db?host=db.example.org")).toThrow(/not a local/);
  });
});
