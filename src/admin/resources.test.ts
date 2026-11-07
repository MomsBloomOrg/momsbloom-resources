/** The Admin home "Resources" list, on a fresh PGlite database with sample rows. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDirectoryTestDb } from "@/db/test-db";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import { listResourcesForAdmin } from "./resources";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("listResourcesForAdmin", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
    await db.insert(t.programs).values({ organizationId: ids.organizations.riverbend, name: "Sample Breastfeeding Circle", searchKeywords: "nursing, latch", statusId: ids.statuses.active });
    await db.insert(t.documents).values([
      { title: "Sample Postpartum Warning Signs", url: "https://example.org/a.pdf", searchKeywords: "PPD", statusId: ids.statuses.active, lastVerified: "2024-01-01" },
      { title: "Sample Old Guide", url: "https://example.org/b.pdf", statusId: ids.statuses.inactive },
    ]);
  });
  afterAll(() => close());

  const names = async (filters: Parameters<typeof listResourcesForAdmin>[1]) => (await listResourcesForAdmin(db, filters)).rows.map((r) => r.name);

  it("All: Organizations, Programs, and Guides together, A to Z", async () => {
    const { rows, statuses } = await listResourcesForAdmin(db);
    expect(rows).toHaveLength(3 + 6 + 2);
    expect(rows.map((r) => r.name)).toEqual([...rows.map((r) => r.name)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    expect(statuses.map((s) => s.name)).toEqual(["Active", "Needs review", "Inactive"]);
  });

  it("the Type column: a Program's Organization, else the type", async () => {
    const { rows } = await listResourcesForAdmin(db);
    const by = (name: string) => rows.find((r) => r.name === name)!;
    expect(by("Sample Mom and Baby Yoga")).toMatchObject({ type: "program", typeText: "Sample Riverbend Health", href: expect.stringMatching(/^\/admin\/programs\/\d+$/) });
    expect(by("Sample Riverbend Health")).toMatchObject({ type: "organization", typeText: "Organization", href: `/admin/organizations/${ids.organizations.riverbend}` });
    expect(by("Sample Old Guide")).toMatchObject({ type: "guide", typeText: "Guide & Download", href: expect.stringMatching(/^\/admin\/documents\/\d+$/) });
  });

  it("each type on its own", async () => {
    expect(await names({ type: "organization" })).toEqual(["Sample Cedar Family Center", "Sample Lakeshore Support", "Sample Riverbend Health"]);
    expect(await names({ type: "guide" })).toEqual(["Sample Old Guide", "Sample Postpartum Warning Signs"]);
    expect(await names({ type: "program" })).toHaveLength(6);
  });

  it("search matches names, a Program's Organization, and keywords, ignoring case", async () => {
    expect(await names({ q: "YOGA" })).toEqual(["Sample Mom and Baby Yoga"]);
    // "cedar": the Organization itself and its three Programs.
    expect(await names({ q: "cedar" })).toEqual(["Sample Cedar Family Center", "Sample Home Visits", "Sample Lactation Visits", "Sample Parent Classes"]);
    expect(await names({ q: "latch" })).toEqual(["Sample Breastfeeding Circle"]);
    expect(await names({ q: "ppd" })).toEqual(["Sample Postpartum Warning Signs"]);
    expect(await names({ q: "  " })).toHaveLength(11);
  });

  it("Status narrows every type; Needs review is kept", async () => {
    expect(await names({ statusId: ids.statuses.inactive })).toEqual(["Sample Lakeshore Support", "Sample Old Guide"]);
    expect(await names({ statusId: ids.statuses.needsReview, type: "program" })).toEqual(["Sample Home Visits", "Sample Lactation Visits", "Sample Postpartum Support Group"]);
  });

  it("filters combine", async () => {
    expect(await names({ type: "program", statusId: ids.statuses.active, q: "riverbend" })).toEqual(["Sample Breastfeeding Circle", "Sample Mom and Baby Yoga"]);
  });

  it("sorts by any column, both ways; ties stay A to Z by name", async () => {
    expect(await names({ type: "organization", dir: "desc" })).toEqual(["Sample Riverbend Health", "Sample Lakeshore Support", "Sample Cedar Family Center"]);

    const byType = (await listResourcesForAdmin(db, { type: "program", sort: "type" })).rows;
    expect(byType.map((r) => r.typeText)).toEqual([...Array(3).fill("Sample Cedar Family Center"), ...Array(3).fill("Sample Riverbend Health")]);
    // Within one Organization, Programs stay A to Z even when the Type sort is descending.
    const byTypeDesc = (await listResourcesForAdmin(db, { type: "program", sort: "type", dir: "desc" })).rows;
    expect(byTypeDesc.map((r) => r.name)).toEqual([
      "Sample Breastfeeding Circle",
      "Sample Mom and Baby Yoga",
      "Sample Postpartum Support Group",
      "Sample Home Visits",
      "Sample Lactation Visits",
      "Sample Parent Classes",
    ]);
  });

  it("Status sorts in the Status order (Active, Needs review, Inactive), not A to Z", async () => {
    const statusNames = async (dir: "asc" | "desc") => [...new Set((await listResourcesForAdmin(db, { sort: "status", dir })).rows.map((r) => r.statusName))];
    expect(await statusNames("asc")).toEqual(["Active", "Needs review", "Inactive"]);
    expect(await statusNames("desc")).toEqual(["Inactive", "Needs review", "Active"]);
  });

  it("oldest verified first: never verified counts as oldest", async () => {
    const rows = (await listResourcesForAdmin(db, { sort: "verified" })).rows;
    const dates = rows.map((r) => r.lastVerified);
    const firstDated = dates.findIndex((d) => d !== null);
    expect(dates.slice(0, firstDated).every((d) => d === null)).toBe(true);
    expect(dates.slice(firstDated)).toEqual(["2024-01-01", "2025-11-02", "2025-11-02", "2026-09-15", "2026-09-15"]);
  });
});
