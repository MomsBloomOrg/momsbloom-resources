import { eq } from "drizzle-orm";
import * as t from "@/db/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { getDocumentForAdmin, getDocumentFormOptions, listDocumentsForAdmin, markDocumentVerified, parseDocumentInput, saveDocument, type DocumentFormOptions } from "./documents";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("Document edit", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;
  let options: DocumentFormOptions;
  const byName = (list: { id: number; name: string }[], name: string) => String(list.find((o) => o.name === name)!.id);

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
    options = await getDocumentFormOptions(db);
  });
  afterAll(() => close());

  const form = (extra: Record<string, string> = {}, lists: Record<string, string[]> = {}) => {
    const data = new FormData();
    const fields = { title: " Sample Guide ", url: "https://example.org/guide.pdf", statusId: String(ids.statuses.active), ...extra };
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    const all = { categoryIds: [byName(options.categories, "Mental health")], subcategoryIds: [byName(options.subcategories, "Counseling")], ...lists };
    for (const [key, values] of Object.entries(all)) for (const v of values) data.append(key, v);
    return data;
  };
  const parse = (...args: Parameters<typeof form>) => {
    const r = parseDocumentInput(form(...args));
    if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
    return r.value;
  };

  it("parse trims, turns blanks into null, and reads ID lists without repeats", () => {
    expect(parse({ description: "  " }, { languageIds: ["1", "1", "2"] })).toMatchObject({
      title: "Sample Guide",
      description: null,
      languageIds: [1, 2],
    });
  });

  it("parse refuses a missing title, a missing or non-http link, a bad date, and a bad ID", () => {
    for (const url of ["", "guide.pdf", "javascript:alert(1)", "ftp://example.org/a.pdf"]) {
      const r = parseDocumentInput(form({ url }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(Object.keys(r.fieldErrors ?? {})).toEqual(["url"]);
    }
    const r = parseDocumentInput(form({ title: "", lastVerified: "2026-02-31", statusId: "x" }, { languageIds: ["abc"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["languageIds", "lastVerified", "statusId", "title"]);
  });

  it("creates a Document with its Facet values, reads it back, lists it, and replaces the joins on update", async () => {
    const created = await saveDocument(db, null, parse({ internalNotes: "Made-up note." }, { languageIds: [byName(options.languages, "Spanish")] }));
    if (!created.ok) throw new Error(created.error);
    const { id } = created.value;
    const detail = await getDocumentForAdmin(db, id);
    expect(detail?.document).toMatchObject({
      title: "Sample Guide",
      url: "https://example.org/guide.pdf",
      internalNotes: "Made-up note.",
      categoryIds: [Number(byName(options.categories, "Mental health"))],
      languageIds: [Number(byName(options.languages, "Spanish"))],
    });
    expect(await listDocumentsForAdmin(db)).toMatchObject([{ id, title: "Sample Guide", statusName: "Active" }]);

    const updated = await saveDocument(db, id, parse({ title: "Sample Guide 2" }, { categoryIds: [], subcategoryIds: [], languageIds: [] }));
    expect(updated.ok).toBe(true);
    expect((await getDocumentForAdmin(db, id))?.document).toMatchObject({ title: "Sample Guide 2", categoryIds: [], subcategoryIds: [], languageIds: [] });
  });

  it("refuses unknown IDs and a Subcategory without its Category, and changes nothing", async () => {
    const before = await listDocumentsForAdmin(db);
    const feeding = byName(options.categories, "Lactation and feeding");
    const refusals = [
      await saveDocument(db, null, parse({ statusId: "999999" })),
      await saveDocument(db, null, parse({}, { categoryIds: ["999999"] })),
      await saveDocument(db, null, parse({}, { languageIds: ["999999"] })),
      await saveDocument(db, null, parse({}, { categoryIds: [feeding] })), // Counseling belongs to Mental health
      await saveDocument(db, 999999, parse({})),
    ];
    expect(refusals.map((r) => r.ok)).toEqual([false, false, false, false, false]);
    expect(await listDocumentsForAdmin(db)).toEqual(before);
  });

  it("Organization is optional: blank is null, an unknown ID is refused, a saved ID reloads, clearing sets null", async () => {
    expect(parse({ organizationId: "" }).organizationId).toBeNull();
    expect(parse({}).organizationId).toBeNull();
    expect(parseDocumentInput(form({ organizationId: "x" })).ok).toBe(false);
    expect(options.organizations.map((o) => o.id)).toContain(ids.organizations.cedar);

    expect(await saveDocument(db, null, parse({ organizationId: "999999" }))).toMatchObject({ ok: false, fieldErrors: { organizationId: expect.any(String) } });

    const saved = await saveDocument(db, null, parse({ organizationId: String(ids.organizations.cedar) }));
    if (!saved.ok) throw new Error(saved.error);
    expect((await getDocumentForAdmin(db, saved.value.id))?.document.organizationId).toBe(ids.organizations.cedar);
    expect((await saveDocument(db, saved.value.id, parse({ organizationId: "" }))).ok).toBe(true);
    expect((await getDocumentForAdmin(db, saved.value.id))?.document.organizationId).toBeNull();
  });

  it("Mark verified changes only Last verified", async () => {
    const saved = await saveDocument(db, null, parse({ lastVerified: "2020-01-01" }));
    if (!saved.ok) throw new Error(saved.error);
    const id = saved.value.id;
    const before = (await getDocumentForAdmin(db, id))!.document;
    expect(await markDocumentVerified(db, id, "staff@example.org", new Date("2026-11-08T03:30:00Z"))).toEqual({ ok: true, value: { lastVerified: "2026-11-07" } });
    const after = (await getDocumentForAdmin(db, id))!.document;
    expect({ ...after, lastVerified: null, lastVerifiedBy: null, updatedAt: "" }).toEqual({ ...before, lastVerified: null, lastVerifiedBy: null, updatedAt: "" });
    expect(after.lastVerifiedBy).toBe("staff@example.org");
    expect(after.lastVerified).toBe("2026-11-07");
    expect(await markDocumentVerified(db, 999999, "staff@example.org")).toMatchObject({ ok: false });
  });
});

describe("Document form hides hidden Facet values", () => {
  let db: Db;
  let close: () => Promise<void>;
  let category: number;
  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    await insertSampleData(db);
    category = (await db.select().from(t.categories).limit(1))[0].id;
    await db.update(t.categories).set({ hidden: true }).where(eq(t.categories.id, category));
  });
  afterAll(() => close());

  it("document-hidden-options: a new Document drops it, a Document that uses it keeps it marked", async () => {
    const fresh = await getDocumentFormOptions(db);
    expect(fresh.categories.map((c) => c.id)).not.toContain(category);
    expect(fresh.subcategories.some((s) => s.categoryId === category)).toBe(false);
    const used = await getDocumentFormOptions(db, { categoryIds: [category] });
    expect(used.categories.find((c) => c.id === category)?.name).toMatch(/ \(hidden\)$/);
  });
});
