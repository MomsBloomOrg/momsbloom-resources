import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { listOrganizationsForAdmin } from "./organizations";
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
