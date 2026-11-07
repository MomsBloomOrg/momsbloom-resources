import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { getHelpBoxContent, HELP_BOX_DEFAULTS, saveHelpBoxContent } from "./help-box";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const form = (fields: Record<string, string>) => new Map(Object.entries(fields));

describe("help box content", () => {
  it("help-box-defaults: an empty table gives the defaults", async () => {
    expect(await getHelpBoxContent(db)).toEqual(HELP_BOX_DEFAULTS);
  });

  it("help-box-save-roundtrip: saved values show, a blank field keeps its default", async () => {
    const result = await saveHelpBoxContent(db, form({ heading: " Need more help? ", phone: "616-555-0100", body: "Call {phone}." }));
    expect(result).toMatchObject({ ok: true, value: { heading: "Need more help?", phone: "616-555-0100", body: "Call {phone}.", buttonLabel: HELP_BOX_DEFAULTS.buttonLabel } });
    expect(await getHelpBoxContent(db)).toMatchObject({ heading: "Need more help?", phone: "616-555-0100" });
  });

  it("help-box-blank-resets: a blank field deletes its row", async () => {
    await saveHelpBoxContent(db, form({ heading: "Hello" }));
    await saveHelpBoxContent(db, form({ heading: "" }));
    expect(await getHelpBoxContent(db)).toEqual(HELP_BOX_DEFAULTS);
  });

  it("help-box-url-https-only: http and javascript links are refused and nothing is saved", async () => {
    for (const buttonUrl of ["http://example.org", "javascript:alert(1)", "example.org"]) {
      expect((await saveHelpBoxContent(db, form({ heading: "Nope", buttonUrl }))).ok).toBe(false);
    }
    expect(await getHelpBoxContent(db)).toEqual(HELP_BOX_DEFAULTS);
    expect((await saveHelpBoxContent(db, form({ buttonUrl: "https://example.org/help" }))).ok).toBe(true);
  });

  it("help-box-phone-digits: 3 to 11 digits, no letters", async () => {
    for (const phone of ["211", "616-555-0100", "(616) 555-0100", "1-616-555-0100"]) {
      expect((await saveHelpBoxContent(db, form({ phone }))).ok, phone).toBe(true);
    }
    for (const phone of ["21", "1-616-555-01000", "call me", "211 abc"]) {
      expect((await saveHelpBoxContent(db, form({ phone }))).ok, phone).toBe(false);
    }
  });

  it("help-box-length-limits: long values are refused", async () => {
    expect((await saveHelpBoxContent(db, form({ heading: "x".repeat(101) }))).ok).toBe(false);
    expect((await saveHelpBoxContent(db, form({ body: "x".repeat(501) }))).ok).toBe(false);
    expect((await saveHelpBoxContent(db, form({ buttonLabel: "x".repeat(41) }))).ok).toBe(false);
    expect((await saveHelpBoxContent(db, form({ heading: "x".repeat(100), body: "x".repeat(500) }))).ok).toBe(true);
  });
});
