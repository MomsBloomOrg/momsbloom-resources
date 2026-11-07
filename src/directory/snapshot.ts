/**
 * Where the Directory gets its data. Pages call `getDirectorySnapshot()` and nothing else.
 *
 * The public data loads from the database once and is cached (ADR 0004). DIRECTORY_SAMPLE_DATA=1 returns
 * the made-up sample snapshot instead, so the e2e tests need no database. Production ignores it.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { listDefinitions } from "@/custom-fields/store";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { toDirectorySnapshot } from "./mapper";
import { SAMPLE_SNAPSHOT } from "./sample-snapshot";
import type { DirectorySnapshot } from "./types";

export async function getDirectorySnapshot(): Promise<DirectorySnapshot> {
  if (process.env.DIRECTORY_SAMPLE_DATA === "1" && process.env.VERCEL_ENV !== "production") return SAMPLE_SNAPSHOT;
  return loadDirectorySnapshot();
}

const place = {
  streetAddress: t.programs.streetAddress,
  suite: t.programs.suite,
  city: t.programs.city,
  state: t.programs.state,
  zip: t.programs.zip,
  latitude: t.programs.latitude,
  longitude: t.programs.longitude,
  phone: t.programs.phone,
  website: t.programs.website,
};

/**
 * Programs, Organizations, Contacts, and Documents: named columns only, so never Internal notes (nor an
 * Organization's email). Private
 * Contacts are never selected.
 * Cached until an Admin save calls `directoryChanged()` (`updateTag("directory")`).
 */
async function loadDirectorySnapshot(): Promise<DirectorySnapshot> {
  "use cache";
  cacheTag("directory");
  cacheLife("max");

  const db = getDb();
  const [
    statuses,
    organizations,
    programs,
    contacts,
    documents,
    categories,
    subcategories,
    insurancePlans,
    languages,
    audiences,
    costOptions,
    serviceFormats,
    insuranceAcceptanceOptions,
    programCategories,
    programSubcategories,
    programInsurancePlans,
    programLanguages,
    programAudiences,
    documentCategories,
    documentSubcategories,
    documentLanguages,
    customFields,
  ] = await Promise.all([
    db.select({ id: t.statuses.id, showOnSite: t.statuses.showOnSite }).from(t.statuses),
    db
      .select({
        id: t.organizations.id,
        name: t.organizations.name,
        about: t.organizations.about,
        lastVerified: t.organizations.lastVerified,
        statusId: t.organizations.statusId,
        streetAddress: t.organizations.streetAddress,
        suite: t.organizations.suite,
        city: t.organizations.city,
        state: t.organizations.state,
        zip: t.organizations.zip,
        latitude: t.organizations.latitude,
        longitude: t.organizations.longitude,
        phone: t.organizations.phone,
        website: t.organizations.website,
        custom: t.organizations.custom,
      })
      .from(t.organizations),
    db
      .select({
        id: t.programs.id,
        organizationId: t.programs.organizationId,
        name: t.programs.name,
        description: t.programs.description,
        searchKeywords: t.programs.searchKeywords,
        ...place,
        serviceFormatId: t.programs.serviceFormatId,
        hours: t.programs.hours,
        costOptionId: t.programs.costOptionId,
        insuranceAcceptanceId: t.programs.insuranceAcceptanceId,
        eligibilityNotes: t.programs.eligibilityNotes,
        lastVerified: t.programs.lastVerified,
        statusId: t.programs.statusId,
        custom: t.programs.custom,
      })
      .from(t.programs)
      .orderBy(t.programs.id),
    db
      .select({
        programId: t.contacts.programId,
        name: t.contacts.name,
        title: t.contacts.title,
        specialty: t.contacts.specialty,
        email: t.contacts.email,
        phone: t.contacts.phone,
        showOnWebsite: t.contacts.showOnWebsite,
      })
      .from(t.contacts)
      .where(eq(t.contacts.showOnWebsite, true))
      .orderBy(t.contacts.id),
    db
      .select({
        id: t.documents.id,
        title: t.documents.title,
        description: t.documents.description,
        searchKeywords: t.documents.searchKeywords,
        url: t.documents.url,
        lastVerified: t.documents.lastVerified,
        statusId: t.documents.statusId,
      })
      .from(t.documents)
      .orderBy(t.documents.id),
    // The lists and the join tables have no private columns.
    db.select().from(t.categories),
    db.select().from(t.subcategories),
    db.select().from(t.insurancePlans),
    db.select().from(t.languages),
    db.select().from(t.audiences),
    db.select().from(t.costOptions),
    db.select().from(t.serviceFormats),
    db.select().from(t.insuranceAcceptanceOptions),
    db.select().from(t.programCategories),
    db.select().from(t.programSubcategories),
    db.select().from(t.programInsurancePlans),
    db.select().from(t.programLanguages),
    db.select().from(t.programAudiences),
    db.select().from(t.documentCategories),
    db.select().from(t.documentSubcategories),
    db.select().from(t.documentLanguages),
    listDefinitions(db),
  ]);

  return toDirectorySnapshot({
    statuses,
    organizations,
    programs,
    contacts,
    documents,
    categories,
    subcategories,
    insurancePlans,
    languages,
    audiences,
    costOptions,
    serviceFormats,
    insuranceAcceptanceOptions,
    programCategories,
    programSubcategories,
    programInsurancePlans,
    programLanguages,
    programAudiences,
    documentCategories,
    documentSubcategories,
    documentLanguages,
    customFields,
  });
}
