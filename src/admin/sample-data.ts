/**
 * Made-up rows for tests and for the local seed (`pnpm db:seed-sample`). Never real data: this repo is
 * public. Every email uses example.org.
 */
import { eq } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";

export interface SampleIds {
  statuses: { active: number; needsReview: number; inactive: number };
  organizations: { riverbend: number; cedar: number; lakeshore: number };
}

export async function insertSampleData(db: Db): Promise<SampleIds> {
  const [active, needsReview, inactive] = await db
    .insert(t.statuses)
    .values([
      { name: "Active", showOnSite: true, sortOrder: 1 },
      { name: "Needs review", showOnSite: true, sortOrder: 2 },
      { name: "Inactive", showOnSite: false, sortOrder: 3 },
    ])
    .returning({ id: t.statuses.id });

  const [riverbend, cedar, lakeshore] = await db
    .insert(t.organizations)
    .values([
      { name: "Sample Riverbend Health", statusId: active.id, lastVerified: "2026-09-15", email: "info@example.org", city: "Grand Rapids" },
      { name: "Sample Cedar Family Center", statusId: needsReview.id, lastVerified: "2025-11-02", city: "Wyoming" },
      { name: "Sample Lakeshore Support", statusId: inactive.id, lastVerified: null, city: "Kentwood" },
    ])
    .returning({ id: t.organizations.id });

  const [mentalHealth, feeding] = await db
    .insert(t.categories)
    .values([{ name: "Mental health", sortOrder: 1 }, { name: "Lactation and feeding", sortOrder: 2 }])
    .returning({ id: t.categories.id });
  await db.insert(t.languages).values([{ name: "English", sortOrder: 1 }, { name: "Spanish", sortOrder: 2 }]);

  const programRows = await db
    .insert(t.programs)
    .values([
      { organizationId: riverbend.id, name: "Sample Mom and Baby Yoga", statusId: active.id, lastVerified: "2026-09-15" },
      { organizationId: riverbend.id, name: "Sample Postpartum Support Group", statusId: needsReview.id },
      { organizationId: cedar.id, name: "Sample Lactation Visits", statusId: needsReview.id },
      { organizationId: cedar.id, name: "Sample Parent Classes", statusId: active.id, lastVerified: "2025-11-02" },
      { organizationId: cedar.id, name: "Sample Home Visits", statusId: needsReview.id },
    ])
    .returning({ id: t.programs.id });
  await db.insert(t.programCategories).values([
    { programId: programRows[0].id, categoryId: mentalHealth.id },
    { programId: programRows[2].id, categoryId: feeding.id },
  ]);

  // More Facet values, for the settings page and the filter column.
  const [supportGroups] = await db
    .insert(t.subcategories)
    .values([
      { categoryId: mentalHealth.id, name: "Support groups", sortOrder: 1 },
      { categoryId: mentalHealth.id, name: "Counseling", sortOrder: 2 },
      { categoryId: feeding.id, name: "Lactation consultants", sortOrder: 1 },
    ])
    .returning({ id: t.subcategories.id });
  await db.insert(t.programSubcategories).values([{ programId: programRows[0].id, subcategoryId: supportGroups.id }]);
  await db.insert(t.insurancePlans).values([{ name: "Medicaid", sortOrder: 1 }, { name: "Sample Health Plan", sortOrder: 2 }]);
  await db.insert(t.audiences).values([{ name: "Pregnant people", sortOrder: 1 }, { name: "New parents", sortOrder: 2 }]);
  const [free] = await db
    .insert(t.costOptions)
    .values([{ name: "Free", sortOrder: 1 }, { name: "Sliding scale", sortOrder: 2 }])
    .returning({ id: t.costOptions.id });
  await db.insert(t.serviceFormats).values([
    { name: "In person", sortOrder: 1 },
    { name: "Virtual", sortOrder: 2 },
    { name: "In person and virtual", sortOrder: 3 },
  ]);
  await db.update(t.programs).set({ costOptionId: free.id }).where(eq(t.programs.id, programRows[0].id));

  return {
    statuses: { active: active.id, needsReview: needsReview.id, inactive: inactive.id },
    organizations: { riverbend: riverbend.id, cedar: cedar.id, lakeshore: lakeshore.id },
  };
}
