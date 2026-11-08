import { eq } from "drizzle-orm";
import * as t from "@/db/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import {
  getProgramForAdmin,
  getProgramFormOptions,
  listFeaturedPrograms,
  markProgramVerified,
  parseProgramInput,
  reorderFeaturedPrograms,
  saveProgram,
  type ProgramFormOptions,
} from "./programs";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("Program edit", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;
  let options: ProgramFormOptions;
  const byName = (list: { id: number; name: string }[], name: string) => String(list.find((o) => o.name === name)!.id);

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
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

  it("normalizes a US phone number with an extension", () => {
    expect(parse({ phone: "(616) 555-0100 ext 42" }).phone).toBe("(616) 555-0100 x42");
  });

  it("parse refuses a missing name and description, no Category, a bad URL, and a bad ID", () => {
    const r = parseProgramInput(
      form({ name: "", description: "", website: "javascript:alert(1)", phone: "not a phone", organizationId: "x", costOptionId: "-1" }, { categoryIds: [], languageIds: ["abc"] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["categoryIds", "costOptionId", "description", "languageIds", "name", "organizationId", "phone", "website"]);
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
    const r = await markProgramVerified(db, ids.yogaProgram, "staff@example.org", new Date("2026-11-08T03:30:00Z"));
    expect(r).toEqual({ ok: true, value: { lastVerified: "2026-11-07" } });
    const after = (await getProgramForAdmin(db, ids.yogaProgram))!.program;
    expect({ ...after, lastVerified: null, lastVerifiedBy: null, updatedAt: "" }).toEqual({ ...before, lastVerified: null, lastVerifiedBy: null, updatedAt: "" });
    expect(after.lastVerifiedBy).toBe("staff@example.org");
    expect(await markProgramVerified(db, 999999, "staff@example.org")).toMatchObject({ ok: false });
  });

  it("form options carry the Organization values for Inheritance", () => {
    const riverbend = options.organizations.find((o) => o.id === ids.organizations.riverbend);
    expect(riverbend).toMatchObject({ phone: "616-555-0100", website: "https://example.org", city: "Grand Rapids" });
  });

  describe("Featured", () => {
    const create = async (featured: boolean) => {
      const r = await saveProgram(db, null, parse(featured ? { featured: "on" } : {}));
      if (!r.ok) throw new Error(r.error);
      return r.value.id;
    };
    const rankOf = async (id: number) => (await db.select({ rank: t.programs.featuredRank }).from(t.programs).where(eq(t.programs.id, id)))[0].rank;
    const featuredIds = async () => (await listFeaturedPrograms(db)).map((p) => p.id);
    let a: number, b: number, c: number;

    it("parse reads the checkbox: on is true, left out is false", () => {
      expect(parse({ featured: "on" }).featured).toBe(true);
      expect(parse().featured).toBe(false);
    });

    it("a newly featured Program goes to the end; a save keeps its rank; unchecking clears it", async () => {
      a = await create(true);
      b = await create(true);
      c = await create(false);
      expect([await rankOf(a), await rankOf(b), await rankOf(c)]).toEqual([1, 2, null]);
      expect((await getProgramForAdmin(db, a))!.program.featured).toBe(true);

      await saveProgram(db, a, parse({ featured: "on", name: "Still featured" }));
      expect(await rankOf(a)).toBe(1);

      await saveProgram(db, c, parse({ featured: "on" }));
      expect(await featuredIds()).toEqual([a, b, c]);

      await saveProgram(db, b, parse());
      expect(await rankOf(b)).toBeNull();
      expect(await featuredIds()).toEqual([a, c]);
    });

    it("re-featuring goes to the end, past a gap in the ranks", async () => {
      // Now a = 1, c = 3: b was unchecked, so rank 2 is a gap.
      expect([await rankOf(a), await rankOf(c)]).toEqual([1, 3]);
      await saveProgram(db, b, parse({ featured: "on" }));
      expect(await rankOf(b)).toBe(4);
      await saveProgram(db, b, parse());
    });

    it("a new Program saved without the field is not featured", async () => {
      const { featured, ...input } = parse();
      void featured;
      const r = await saveProgram(db, null, input);
      if (!r.ok) throw new Error(r.error);
      expect(await rankOf(r.value.id)).toBeNull();
    });

    it("a save without the field leaves the rank alone", async () => {
      const { featured, ...input } = parse();
      void featured;
      await saveProgram(db, a, input);
      expect(await rankOf(a)).toBe(1);
    });

    it("lists featured Programs in rank order with Organization and Status", async () => {
      const [first] = await listFeaturedPrograms(db);
      expect(first).toMatchObject({ id: a, organizationName: expect.any(String), statusName: expect.any(String), showOnSite: true });
    });

    it("reorder writes ranks 1..n in the given order", async () => {
      expect(await reorderFeaturedPrograms(db, [c, a])).toEqual({ ok: true, value: { count: 2 } });
      expect([await rankOf(c), await rankOf(a)]).toEqual([1, 2]);
      expect(await featuredIds()).toEqual([c, a]);
    });

    it("reorder refuses a stale or bad list and writes nothing", async () => {
      const stale = { ok: false, error: expect.stringContaining("changed since you opened it") };
      expect(await reorderFeaturedPrograms(db, [a])).toMatchObject(stale); // missing one
      expect(await reorderFeaturedPrograms(db, [a, c, b])).toMatchObject(stale); // b is not featured
      expect(await reorderFeaturedPrograms(db, [a, b])).toMatchObject(stale); // same count, wrong set
      expect(await reorderFeaturedPrograms(db, [a, a])).toMatchObject({ ok: false });
      expect(await reorderFeaturedPrograms(db, ["x", a])).toMatchObject({ ok: false });
      expect(await reorderFeaturedPrograms(db, "nope")).toMatchObject({ ok: false });
      expect(await featuredIds()).toEqual([c, a]);
    });
  });
});

describe("Program form hides hidden Facet values", () => {
  let db: Db;
  let close: () => Promise<void>;
  let spanish: number;
  let free: number;
  beforeAll(async () => {
    ({ db, close } = await createTestDb());
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

  it("sibling-lists: used hidden plan, audience, and service format stay marked; acceptance options are not filtered", async () => {
    const [plan] = await db.select().from(t.insurancePlans).limit(1);
    const [aud] = await db.select().from(t.audiences).limit(1);
    const [fmt] = await db.select().from(t.serviceFormats).limit(1);
    await db.update(t.insurancePlans).set({ hidden: true }).where(eq(t.insurancePlans.id, plan.id));
    await db.update(t.audiences).set({ hidden: true }).where(eq(t.audiences.id, aud.id));
    await db.update(t.serviceFormats).set({ hidden: true }).where(eq(t.serviceFormats.id, fmt.id));
    const fresh = await getProgramFormOptions(db);
    expect(fresh.insurancePlans.map((x) => x.id)).not.toContain(plan.id);
    const o = await getProgramFormOptions(db, { insurancePlanIds: [plan.id], audienceIds: [aud.id], serviceFormatId: fmt.id });
    for (const [list, id] of [[o.insurancePlans, plan.id], [o.audiences, aud.id], [o.serviceFormats, fmt.id]] as const) {
      expect(list.find((x) => x.id === id)?.name).toMatch(/ \(hidden\)$/);
    }
    const accept = await db.select().from(t.insuranceAcceptanceOptions);
    expect(o.insuranceAcceptanceOptions).toHaveLength(accept.length);
  });

  it("used-hidden-labeled: a hidden value the Program uses stays, marked (hidden)", async () => {
    const o = await getProgramFormOptions(db, { languageIds: [spanish], costOptionId: free });
    expect(o.languages.find((l) => l.id === spanish)?.name).toMatch(/ \(hidden\)$/);
    expect(o.costOptions.find((c) => c.id === free)?.name).toMatch(/ \(hidden\)$/);
  });
});
