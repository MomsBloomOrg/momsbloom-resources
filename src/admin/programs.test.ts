import { eq } from "drizzle-orm";
import * as t from "@/db/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { getProgramForAdmin, getProgramFormOptions, markProgramVerified, parseProgramInput, saveProgram, type ProgramFormOptions } from "./programs";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("Program edit", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;
  let options: ProgramFormOptions;
  const byName = (list: { id: number; name: string }[], name: string) => String(list.find((o) => o.name === name)!.id);

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
    options = await getProgramFormOptions(db);
  });
  afterAll(() => close());

  /** A valid form: Mental health with its Counseling Subcategory. `lists` adds repeated keys (checkboxes). */
  const form = (extra: Record<string, string> = {}, lists: Record<string, string[]> = {}) => {
    const data = new FormData();
    const fields = {
      organizationId: String(ids.organizations.riverbend),
      name: " Sample Program ",
      description: "Made-up test Program.",
      statusId: String(ids.statuses.active),
      ...extra,
    };
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    const all = { categoryIds: [byName(options.categories, "Mental health")], subcategoryIds: [byName(options.subcategories, "Counseling")], ...lists };
    for (const [key, values] of Object.entries(all)) for (const v of values) data.append(key, v);
    return data;
  };
  const parse = (...args: Parameters<typeof form>) => {
    const r = parseProgramInput(form(...args));
    if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
    return r.value;
  };

  it("parse trims, turns blanks into null, and reads ID lists without repeats", () => {
    const v = parse({ phone: "  ", costOptionId: "" }, { languageIds: ["1", "1", "2"] });
    expect(v).toMatchObject({ name: "Sample Program", phone: null, costOptionId: null, languageIds: [1, 2] });
  });

  it("parse refuses a missing name and description, no Category, a bad URL, and a bad ID", () => {
    const r = parseProgramInput(
      form({ name: "", description: "", website: "javascript:alert(1)", organizationId: "x", costOptionId: "-1" }, { categoryIds: [], languageIds: ["abc"] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["categoryIds", "costOptionId", "description", "languageIds", "name", "organizationId", "website"]);
    }
  });

  it("creates a Program with its Facet values and reads it back", async () => {
    const created = await saveProgram(
      db,
      null,
      parse({ internalNotes: "staff only", serviceFormatId: byName(options.serviceFormats, "Virtual") }, { languageIds: [byName(options.languages, "Spanish")] }),
    );
    if (!created.ok) throw new Error(created.error);
    const detail = await getProgramForAdmin(db, created.value.id);
    expect(detail?.program).toMatchObject({
      name: "Sample Program",
      internalNotes: "staff only",
      categoryIds: [Number(byName(options.categories, "Mental health"))],
      subcategoryIds: [Number(byName(options.subcategories, "Counseling"))],
      languageIds: [Number(byName(options.languages, "Spanish"))],
    });
  });

  it("update replaces the join tables", async () => {
    const feeding = byName(options.categories, "Lactation and feeding");
    const r = await saveProgram(db, ids.yogaProgram, parse({ name: "Sample Yoga Renamed" }, { categoryIds: [feeding], subcategoryIds: [] }));
    expect(r.ok).toBe(true);
    const p = (await getProgramForAdmin(db, ids.yogaProgram))!.program;
    expect([p.name, p.categoryIds, p.subcategoryIds]).toEqual(["Sample Yoga Renamed", [Number(feeding)], []]);
  });

  it("refuses a Subcategory whose Category is not checked, and writes nothing", async () => {
    const before = await getProgramForAdmin(db, ids.yogaProgram);
    const homeVisits = byName(options.subcategories, "Lactation consultants"); // under Lactation and feeding
    const r = await saveProgram(db, ids.yogaProgram, parse({ name: "Should not save" }, { subcategoryIds: [homeVisits] }));
    expect(r).toMatchObject({ ok: false, fieldErrors: { subcategoryIds: expect.stringContaining("Category") } });
    expect(await getProgramForAdmin(db, ids.yogaProgram)).toEqual(before);
  });

  it("keeps Insurance plans only when Accepts insurance is Yes", async () => {
    const plans = { insurancePlanIds: [byName(options.insurancePlans, "Medicaid")] };
    const yes = await saveProgram(db, null, parse({ insuranceAcceptanceId: byName(options.insuranceAcceptanceOptions, "Yes") }, plans));
    const no = await saveProgram(db, null, parse({ insuranceAcceptanceId: byName(options.insuranceAcceptanceOptions, "No") }, plans));
    const blank = await saveProgram(db, null, parse({}, plans));
    if (!yes.ok || !no.ok || !blank.ok) throw new Error("save");
    expect((await getProgramForAdmin(db, yes.value.id))!.program.insurancePlanIds).toHaveLength(1);
    expect((await getProgramForAdmin(db, no.value.id))!.program.insurancePlanIds).toEqual([]);
    expect((await getProgramForAdmin(db, blank.value.id))!.program.insurancePlanIds).toEqual([]);
  });

  it("refuses unknown IDs without a throw", async () => {
    expect(await saveProgram(db, 999999, parse())).toMatchObject({ ok: false, error: expect.stringContaining("does not exist") });
    expect(await saveProgram(db, null, parse({ organizationId: "999999" }))).toMatchObject({ ok: false, fieldErrors: { organizationId: expect.any(String) } });
    expect(await saveProgram(db, null, parse({ statusId: "999999" }))).toMatchObject({ ok: false });
    expect(await saveProgram(db, null, parse({}, { languageIds: ["999999"] }))).toMatchObject({ ok: false, fieldErrors: { languageIds: expect.any(String) } });
    expect(await saveProgram(db, null, parse({ costOptionId: "999999" }))).toMatchObject({ ok: false, fieldErrors: { costOptionId: expect.any(String) } });
  });

  it("Mark verified changes only Last verified", async () => {
    const before = (await getProgramForAdmin(db, ids.yogaProgram))!.program;
    const r = await markProgramVerified(db, ids.yogaProgram, new Date("2026-11-08T03:30:00Z"));
    expect(r).toEqual({ ok: true, value: { lastVerified: "2026-11-07" } });
    const after = (await getProgramForAdmin(db, ids.yogaProgram))!.program;
    expect({ ...after, lastVerified: null, updatedAt: "" }).toEqual({ ...before, lastVerified: null, updatedAt: "" });
    expect(await markProgramVerified(db, 999999)).toMatchObject({ ok: false });
  });

  it("form options carry the Organization values for Inheritance", () => {
    const riverbend = options.organizations.find((o) => o.id === ids.organizations.riverbend);
    expect(riverbend).toMatchObject({ phone: "616-555-0100", website: "https://example.org", city: "Grand Rapids" });
  });
});

describe("Program form hides hidden Facet values", () => {
  let db: Db;
  let close: () => Promise<void>;
  let spanish: number;
  let free: number;
  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    await insertSampleData(db);
    const lang = await db.select().from(t.languages).limit(1);
    const cost = await db.select().from(t.costOptions).limit(1);
    spanish = lang[0].id;
    free = cost[0].id;
    await db.update(t.languages).set({ hidden: true }).where(eq(t.languages.id, spanish));
    await db.update(t.costOptions).set({ hidden: true }).where(eq(t.costOptions.id, free));
  });
  afterAll(() => close());

  it("new-form-drops-hidden: a new Program does not list hidden values", async () => {
    const o = await getProgramFormOptions(db);
    expect(o.languages.map((l) => l.id)).not.toContain(spanish);
    expect(o.costOptions.map((c) => c.id)).not.toContain(free);
  });

  it("used-hidden-labeled: a hidden value the Program uses stays, marked (hidden)", async () => {
    const o = await getProgramFormOptions(db, { languageIds: [spanish], costOptionId: free });
    expect(o.languages.find((l) => l.id === spanish)?.name).toMatch(/ \(hidden\)$/);
    expect(o.costOptions.find((c) => c.id === free)?.name).toMatch(/ \(hidden\)$/);
  });
});
