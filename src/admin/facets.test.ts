import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as t from "@/db/schema";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import {
  addFacetValue,
  deleteFacetValue,
  listFacetsForAdmin,
  moveFacetValue,
  renameFacetValue,
  setFacetValueHidden,
  type FacetKey,
} from "./facets";
import { insertSampleData } from "./sample-data";

describe("Facet values", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    await insertSampleData(db);
  });
  afterAll(() => close());

  async function values(key: FacetKey) {
    return (await listFacetsForAdmin(db)).find((f) => f.key === key)!.values;
  }
  const idOf = async (key: FacetKey, name: string) => (await values(key)).find((v) => v.name === name)!.id;

  it("lists every Facet in order with Program counts", async () => {
    const facets = await listFacetsForAdmin(db);
    expect(facets.map((f) => f.title)).toEqual([
      "Categories",
      "Subcategories",
      "Insurance plans",
      "Languages",
      "Who it serves",
      "Cost",
      "Service format",
    ]);
    const categories = await values("category");
    expect(categories.map((v) => [v.name, v.programCount, v.hidden])).toEqual([
      ["Mental health", 1, false],
      ["Lactation and feeding", 1, false],
    ]);
    expect((await values("cost")).map((v) => [v.name, v.programCount])).toEqual([["Free", 1], ["Sliding scale", 0]]);
    const subs = await values("subcategory");
    expect(subs.map((v) => [v.name, v.categoryId, v.programCount])).toEqual([
      ["Support groups", categories[0].id, 1],
      ["Lactation consultants", categories[1].id, 0],
      ["Counseling", categories[0].id, 0],
    ]);
  });

  it("adds a value at the end of its list, and refuses a blank or used name", async () => {
    expect(await addFacetValue(db, { key: "language", name: "  Arabic " })).toMatchObject({ ok: true, value: { name: "Arabic" } });
    expect((await values("language")).map((v) => v.name)).toEqual(["English", "Spanish", "Arabic"]);
    expect(await addFacetValue(db, { key: "language", name: "spanish" })).toEqual({ ok: false, error: 'Another value in this list is named "spanish".' });
    expect(await addFacetValue(db, { key: "language", name: "   " })).toEqual({ ok: false, error: "Type a name." });
    expect(await addFacetValue(db, { key: "language", name: "x".repeat(101) })).toMatchObject({ ok: false });
  });

  it("adds a Subcategory under an existing Category only; the same name can be under two Categories", async () => {
    const feeding = await idOf("category", "Lactation and feeding");
    expect(await addFacetValue(db, { key: "subcategory", name: "Support groups", categoryId: String(feeding) })).toMatchObject({ ok: true });
    expect(await addFacetValue(db, { key: "subcategory", name: "Pumps", categoryId: "999999" })).toEqual({
      ok: false,
      error: "This record does not exist. Reload the page.",
    });
    expect(await addFacetValue(db, { key: "subcategory", name: "Pumps", categoryId: "abc" })).toMatchObject({ ok: false });
  });

  it("renames a value, and refuses a name another value has", async () => {
    const id = await idOf("audience", "New parents");
    expect(await renameFacetValue(db, { key: "audience", id: String(id), name: "Parents of newborns" })).toMatchObject({ ok: true });
    expect((await values("audience")).map((v) => v.name)).toEqual(["Pregnant people", "Parents of newborns"]);
    expect(await renameFacetValue(db, { key: "audience", id: String(id), name: "PREGNANT PEOPLE" })).toMatchObject({ ok: false });
    expect(await renameFacetValue(db, { key: "audience", id: "0", name: "Other" })).toEqual({ ok: false, error: "This record does not exist. Reload the page." });
    expect(await renameFacetValue(db, { key: "audience", id: "424242", name: "Other" })).toMatchObject({ ok: false });
  });

  it("turns a unique violation from a save at the same moment into the name-taken refusal", async () => {
    const racing = { transaction: async () => Promise.reject(Object.assign(new Error("insert failed"), { cause: { code: "23505" } })) } as unknown as Db;
    expect(await addFacetValue(racing, { key: "language", name: "Arabic" })).toEqual({ ok: false, error: 'Another value in this list is named "Arabic".' });
    expect(await renameFacetValue(racing, { key: "language", id: "1", name: "Arabic" })).toMatchObject({ ok: false });
    const broken = { transaction: async () => Promise.reject(new Error("connection lost")) } as unknown as Db;
    await expect(addFacetValue(broken, { key: "language", name: "Arabic" })).rejects.toThrow("connection lost");
  });

  it("refuses to rename the Service format names that the Directory reads", async () => {
    const id = await idOf("serviceFormat", "Virtual");
    expect(await renameFacetValue(db, { key: "serviceFormat", id: String(id), name: "Online" })).toMatchObject({ ok: false });
    expect(await renameFacetValue(db, { key: "serviceFormat", id: String(id), name: "virtual" })).toMatchObject({ ok: true });
    await renameFacetValue(db, { key: "serviceFormat", id: String(id), name: "Virtual" });
  });

  it("moves a value up and down; the first value cannot move up", async () => {
    const plans = await values("insurancePlan");
    expect(await moveFacetValue(db, { key: "insurancePlan", id: String(plans[1].id), direction: "up" })).toMatchObject({ ok: true });
    expect((await values("insurancePlan")).map((v) => v.name)).toEqual(["Sample Health Plan", "Medicaid"]);
    await moveFacetValue(db, { key: "insurancePlan", id: String(plans[1].id), direction: "up" });
    expect((await values("insurancePlan")).map((v) => v.name)).toEqual(["Sample Health Plan", "Medicaid"]);
    await moveFacetValue(db, { key: "insurancePlan", id: String(plans[1].id), direction: "down" });
    expect((await values("insurancePlan")).map((v) => v.name)).toEqual(["Medicaid", "Sample Health Plan"]);
  });

  it("moves values with equal sort orders, and a Subcategory only inside its Category", async () => {
    await db.update(t.costOptions).set({ sortOrder: 0 });
    const [first, second] = await values("cost");
    await moveFacetValue(db, { key: "cost", id: String(second.id), direction: "up" });
    expect((await values("cost")).map((v) => v.id)).toEqual([second.id, first.id]);

    const mentalHealth = await idOf("category", "Mental health");
    const counseling = (await values("subcategory")).find((v) => v.name === "Counseling")!;
    await moveFacetValue(db, { key: "subcategory", id: String(counseling.id), direction: "up" });
    const mine = (await values("subcategory")).filter((v) => v.categoryId === mentalHealth);
    expect(mine.map((v) => v.name)).toEqual(["Counseling", "Support groups"]);
  });

  it("hides and shows a value; it stays on its Programs", async () => {
    const id = await idOf("category", "Mental health");
    expect(await setFacetValueHidden(db, { key: "category", id: String(id), hidden: true })).toEqual({ ok: true, value: { name: "Mental health" } });
    const hidden = (await values("category")).find((v) => v.id === id)!;
    expect([hidden.hidden, hidden.programCount]).toEqual([true, 1]);
    await setFacetValueHidden(db, { key: "category", id: String(id), hidden: false });
    expect((await values("category")).find((v) => v.id === id)!.hidden).toBe(false);
    expect(await setFacetValueHidden(db, { key: "category", id: "999999", hidden: true })).toMatchObject({ ok: false });
  });

  it("deletes only a value that nothing uses, and never a Category with Subcategories", async () => {
    const free = await idOf("cost", "Free");
    expect(await deleteFacetValue(db, { key: "cost", id: String(free) })).toEqual({ ok: false, error: '"Free" is in use 1 time. Hide it instead.' });

    const sliding = await idOf("cost", "Sliding scale");
    expect(await deleteFacetValue(db, { key: "cost", id: String(sliding) })).toEqual({ ok: true, value: { name: "Sliding scale" } });
    expect((await values("cost")).map((v) => v.name)).toEqual(["Free"]);

    const [category] = await db.insert(t.categories).values({ name: "Sample empty", sortOrder: 9 }).returning();
    await db.insert(t.subcategories).values({ categoryId: category.id, name: "Sample child" });
    expect(await deleteFacetValue(db, { key: "category", id: String(category.id) })).toMatchObject({ ok: false });

    const [document] = await db.insert(t.documents).values({ title: "Sample guide", url: "https://example.org/guide.pdf", statusId: (await db.select().from(t.statuses))[0].id }).returning();
    const spanish = await idOf("language", "Spanish");
    await db.insert(t.documentLanguages).values({ documentId: document.id, languageId: spanish });
    expect(await deleteFacetValue(db, { key: "language", id: String(spanish) })).toMatchObject({ ok: false });
    expect((await values("language")).find((v) => v.id === spanish)!.documentCount).toBe(1);
    expect(await db.select().from(t.languages).where(eq(t.languages.id, spanish))).toHaveLength(1);
  });
});
