import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { DIRECTORY_HEADING_DEFAULTS, getDirectoryHeadingContent, saveDirectoryHeadingContent } from "./directory-heading";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const form = (fields: Record<string, string>) => new Map(Object.entries(fields));

describe("directory heading content", () => {
  it("heading-defaults: an empty table gives the defaults", async () => {
    expect(await getDirectoryHeadingContent(db)).toEqual(DIRECTORY_HEADING_DEFAULTS);
  });

  it("heading-save-roundtrip: saved values show (trimmed), a blank field keeps its default", async () => {
    const result = await saveDirectoryHeadingContent(db, form({ heading: " Hello ", subheading: "" }));
    expect(result).toEqual({ ok: true, value: { heading: "Hello", subheading: DIRECTORY_HEADING_DEFAULTS.subheading } });
    expect(await getDirectoryHeadingContent(db)).toMatchObject({ heading: "Hello" });
  });

  it("heading-blank-resets: a blank field deletes its row", async () => {
    await saveDirectoryHeadingContent(db, form({ heading: "Hello", subheading: "Sub" }));
    await saveDirectoryHeadingContent(db, form({}));
    expect(await getDirectoryHeadingContent(db)).toEqual(DIRECTORY_HEADING_DEFAULTS);
  });

  it("heading-length-limits: 80 and 250 characters are the most; a refusal saves nothing", async () => {
    expect((await saveDirectoryHeadingContent(db, form({ heading: "x".repeat(81) }))).ok).toBe(false);
    expect((await saveDirectoryHeadingContent(db, form({ heading: "ok", subheading: "x".repeat(251) }))).ok).toBe(false);
    expect(await getDirectoryHeadingContent(db)).toEqual(DIRECTORY_HEADING_DEFAULTS);
    expect((await saveDirectoryHeadingContent(db, form({ heading: "x".repeat(80), subheading: "x".repeat(250) }))).ok).toBe(true);
  });
});
