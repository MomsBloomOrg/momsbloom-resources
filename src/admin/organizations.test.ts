import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { geocodeOnSave } from "./geocode";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import {
  createOrganization,
  getOrganizationForAdmin,
  listOrganizationsForAdmin,
  markOrganizationVerified,
  parseOrganizationInput,
  todayInDetroit,
  updateOrganization,
} from "./organizations";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("listOrganizationsForAdmin", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
  });
  afterAll(() => close());

  it("lists every Organization by name with Program counts", async () => {
    const { rows, total } = await listOrganizationsForAdmin(db);
    expect(total).toBe(3);
    expect(rows.map((r) => r.name)).toEqual([
      "Sample Cedar Family Center",
      "Sample Lakeshore Support",
      "Sample Riverbend Health",
    ]);
    const cedar = rows[0];
    expect([cedar.programCount, cedar.needsReviewCount]).toEqual([3, 2]);
    expect(rows[1].programCount).toBe(0);
  });

  it("filters by Status and keeps the Status counts for the whole search", async () => {
    const { rows, statusCounts } = await listOrganizationsForAdmin(db, { statusId: ids.statuses.inactive });
    expect(rows.map((r) => r.name)).toEqual(["Sample Lakeshore Support"]);
    expect(rows[0].showOnSite).toBe(false);
    expect(statusCounts.map((s) => [s.name, s.count])).toEqual([["Active", 1], ["Needs review", 1], ["Inactive", 1]]);
  });

  it("searches the name without case", async () => {
    const { rows, statusCounts } = await listOrganizationsForAdmin(db, { q: " RIVERBEND " });
    expect(rows.map((r) => r.id)).toEqual([ids.organizations.riverbend]);
    expect(statusCounts.find((s) => s.name === "Inactive")?.count).toBe(0);
  });

  it("sorts the oldest Last verified first, never verified before all", async () => {
    const { rows } = await listOrganizationsForAdmin(db, { sort: "verified" });
    expect(rows.map((r) => r.lastVerified)).toEqual([null, "2025-11-02", "2026-09-15"]);
  });
});

describe("Organization edit", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
  });
  afterAll(() => close());

  const form = (extra: Record<string, string> = {}) => ({ name: " Sample Org ", statusId: String(ids.statuses.active), ...extra });

  it("parse trims, turns blanks into null, and reads numbers", () => {
    const r = parseOrganizationInput(form({ about: "  ", latitude: "42.96", website: "https://example.org" }));
    expect(r).toMatchObject({ ok: true, value: { name: "Sample Org", about: null, latitude: 42.96, longitude: null } });
  });

  it("parse refuses a missing name, bad URL, bad email, bad number, bad date, bad Status ID", () => {
    const r = parseOrganizationInput({
      name: "",
      website: "ftp://example.org",
      email: "nope",
      latitude: "200",
      lastVerified: "2026-13-45",
      statusId: "0",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["email", "lastVerified", "latitude", "name", "statusId", "website"]);
  });

  it("parse refuses an impossible date such as 2026-02-31", () => {
    expect(parseOrganizationInput(form({ lastVerified: "2026-02-31" })).ok).toBe(false);
    expect(parseOrganizationInput(form({ lastVerified: "2026-02-28" })).ok).toBe(true);
  });

  it("creates and reads back an Organization with no Programs", async () => {
    const parsed = parseOrganizationInput(form({ internalNotes: "call in May" }));
    if (!parsed.ok) throw new Error("parse");
    const created = await createOrganization(db, parsed.value);
    if (!created.ok) throw new Error("create");
    const detail = await getOrganizationForAdmin(db, created.value.id);
    expect(detail?.organization).toMatchObject({ name: "Sample Org", internalNotes: "call in May" });
    expect(detail?.programs).toEqual([]);
  });

  it("lists the Programs of an Organization with their Status", async () => {
    const detail = await getOrganizationForAdmin(db, ids.organizations.cedar);
    expect(detail?.programs.map((p) => [p.name, p.statusName])).toEqual([
      ["Sample Home Visits", "Needs review"],
      ["Sample Lactation Visits", "Needs review"],
      ["Sample Parent Classes", "Active"],
    ]);
  });

  it("update changes fields and updatedAt; an unknown ID or Status is refused, not thrown", async () => {
    const before = await getOrganizationForAdmin(db, ids.organizations.riverbend);
    const parsed = parseOrganizationInput(form({ name: "Sample Riverbend Renamed" }));
    if (!parsed.ok) throw new Error("parse");
    expect((await updateOrganization(db, ids.organizations.riverbend, parsed.value)).ok).toBe(true);
    const after = await getOrganizationForAdmin(db, ids.organizations.riverbend);
    expect(after?.organization.name).toBe("Sample Riverbend Renamed");
    expect(after!.organization.updatedAt >= before!.organization.updatedAt).toBe(true);

    expect(await updateOrganization(db, 999999, parsed.value)).toMatchObject({ ok: false, error: expect.stringContaining("does not exist") });
    expect(await createOrganization(db, { ...parsed.value, statusId: 999999 })).toMatchObject({ ok: false });
  });

  describe("a changed address (#32)", () => {
    const census = (matches: unknown[]) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { addressMatches: matches } }) });
    const change = { streetAddress: "300 Monroe Ave NW", city: "Grand Rapids", state: "MI", zip: "49503" };

    async function save(fetchFn: ReturnType<typeof census>, to = change) {
      const id = ids.organizations.riverbend;
      const old = (await getOrganizationForAdmin(db, id))!.organization;
      const parsed = parseOrganizationInput(form({ ...to, latitude: String(old.latitude ?? ""), longitude: String(old.longitude ?? "") }));
      if (!parsed.ok) throw new Error("parse");
      const { input, failed } = await geocodeOnSave(parsed.value, old, fetchFn);
      expect((await updateOrganization(db, id, input)).ok).toBe(true);
      return { failed, saved: (await getOrganizationForAdmin(db, id))!.organization };
    }

    it("saves the new address and the geocoded pin, and a reload reads them back", async () => {
      const { failed, saved } = await save(census([{ coordinates: { x: -85.67, y: 42.96 } }]));
      expect(failed).toBe(false);
      expect(saved).toMatchObject({ ...change, latitude: 42.96, longitude: -85.67 });
    });

    it("saves the new address with no pin when the geocoder finds no match", async () => {
      const nowhere = { ...change, streetAddress: "1 Nowhere Rd", zip: "49504" }; // the first case already saved `change`
      const { failed, saved } = await save(census([]), nowhere);
      expect(failed).toBe(true);
      expect(saved).toMatchObject({ ...nowhere, latitude: null, longitude: null });
    });
  });

  it("Mark verified changes only Last verified", async () => {
    const before = (await getOrganizationForAdmin(db, ids.organizations.cedar))!.organization;
    const r = await markOrganizationVerified(db, ids.organizations.cedar, new Date("2026-11-07T15:00:00Z"));
    expect(r).toEqual({ ok: true, value: { lastVerified: "2026-11-07" } });
    const after = (await getOrganizationForAdmin(db, ids.organizations.cedar))!.organization;
    expect({ ...after, lastVerified: null, updatedAt: "" }).toEqual({ ...before, lastVerified: null, updatedAt: "" });
    expect(after.lastVerified).toBe("2026-11-07");
    expect(await markOrganizationVerified(db, 999999)).toMatchObject({ ok: false });
  });

  it("today uses Michigan time", () => {
    expect(todayInDetroit(new Date("2026-11-08T03:30:00Z"))).toBe("2026-11-07");
  });
});
