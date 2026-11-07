/**
 * Tables → snapshot (ADR 0004). The only code that knows the tables. Pure: the loader in snapshot.ts
 * selects the rows, and the unit tests call this with made-up rows.
 *
 * Privacy: the rows have no Internal notes (the loader names its columns). This function leaves out
 * records whose Status is not shown on the site, Programs whose Organization is hidden, and Contacts
 * without "Show on website".
 */
import type * as schema from "@/db/schema";
import {
  FACET_KEYS,
  type DirectoryContact,
  type DirectoryDocument,
  type DirectoryProgram,
  type DirectorySnapshot,
  type FacetDefinition,
  type FacetKey,
  type FacetValue,
  type FacetValueKeys,
  type LatLng,
  type PostalAddress,
} from "./types";

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
// `hidden`: staff hid the value (Admin settings). Optional, because the fixed lists (insurance acceptance) have none.
type ListRow = { id: number; name: string; sortOrder: number; hidden?: boolean };
type PlaceFields = "streetAddress" | "suite" | "city" | "state" | "zip" | "latitude" | "longitude" | "phone" | "website";

export interface DirectoryRows {
  statuses: Pick<Row<typeof schema.statuses>, "id" | "showOnSite">[];
  organizations: Pick<Row<typeof schema.organizations>, "id" | "name" | "statusId" | PlaceFields>[];
  programs: Pick<
    Row<typeof schema.programs>,
    | "id"
    | "organizationId"
    | "name"
    | "description"
    | "searchKeywords"
    | "serviceFormatId"
    | "hours"
    | "costOptionId"
    | "insuranceAcceptanceId"
    | "eligibilityNotes"
    | "lastVerified"
    | "statusId"
    | PlaceFields
  >[];
  contacts: Pick<Row<typeof schema.contacts>, "programId" | "name" | "title" | "specialty" | "email" | "phone" | "showOnWebsite">[];
  documents: Pick<Row<typeof schema.documents>, "id" | "title" | "description" | "searchKeywords" | "url" | "lastVerified" | "statusId">[];
  categories: ListRow[];
  subcategories: (ListRow & { categoryId: number })[];
  insurancePlans: ListRow[];
  languages: ListRow[];
  audiences: ListRow[];
  costOptions: ListRow[];
  serviceFormats: ListRow[];
  insuranceAcceptanceOptions: ListRow[];
  programCategories: { programId: number; categoryId: number }[];
  programSubcategories: { programId: number; subcategoryId: number }[];
  programInsurancePlans: { programId: number; insurancePlanId: number }[];
  programLanguages: { programId: number; languageId: number }[];
  programAudiences: { programId: number; audienceId: number }[];
  documentCategories: { documentId: number; categoryId: number }[];
  documentSubcategories: { documentId: number; subcategoryId: number }[];
  documentLanguages: { documentId: number; languageId: number }[];
}

/** The group titles on screen (the same as the sample data). */
const FACET_LABELS: Record<FacetKey, string> = {
  category: "Type of support",
  subcategory: "Type of support",
  insurance: "Insurance",
  cost: "Cost",
  language: "Language",
  whoItServes: "Who it serves",
  format: "How you'll connect",
};

// Service format names (matched without case). The combined value is not a filter: it becomes both.
const IN_PERSON = "in person";
const VIRTUAL = "virtual";
const COMBINED = "in person and virtual";
/** The Service format names that this file reads (lower case). The Admin refuses to rename them. */
export const SERVICE_FORMAT_NAMES_READ: readonly string[] = [IN_PERSON, VIRTUAL, COMBINED];

const ACCEPTS_INSURANCE: Record<string, DirectoryProgram["acceptsInsurance"]> = {
  yes: "yes",
  no: "no",
  "not applicable": "not-applicable",
};

/** Trimmed text, or null when blank. */
function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const nameKey = (name: string) => name.trim().toLowerCase();

/** A full URL, or null. Adds https:// to a bare domain ("example.org/page"); drops anything else. */
export function toWebsite(value: string | null): string | null {
  const site = text(value);
  if (!site) return null;
  if (/^https?:\/\/\S+$/i.test(site)) return site;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(site) ? `https://${site}` : null;
}

type Place = Pick<Row<typeof schema.programs>, PlaceFields>;

function addressOf(place: Place): { address: PostalAddress; location: LatLng | null } | null {
  const street = text(place.streetAddress);
  if (!street) return null;
  return {
    address: {
      street,
      suite: text(place.suite),
      city: text(place.city) ?? "",
      state: text(place.state) ?? "MI",
      zip: text(place.zip) ?? "",
    },
    // From the same record only: never put a Program's own address on its Organization's point.
    location: place.latitude != null && place.longitude != null ? { lat: place.latitude, lng: place.longitude } : null,
  };
}

/** Facet values in the order staff set (sort_order). Hidden values are left out: records keep their keys. */
function values<T extends ListRow>(rows: readonly T[], parentKey?: (row: T) => string): FacetValue[] {
  return rows
    .filter((row) => !row.hidden)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => (parentKey ? { key: String(row.id), label: row.name, parentKey: parentKey(row) } : { key: String(row.id), label: row.name }));
}

/** owner id → the keys of its values, from a join table. */
function keysBy<T>(rows: readonly T[], owner: (row: T) => number, value: (row: T) => number): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const keys = map.get(owner(row));
    if (keys) keys.push(String(value(row)));
    else map.set(owner(row), [String(value(row))]);
  }
  return map;
}

export function toDirectorySnapshot(rows: DirectoryRows): DirectorySnapshot {
  const shown = new Set(rows.statuses.filter((status) => status.showOnSite).map((status) => status.id));
  const organizations = new Map(rows.organizations.filter((org) => shown.has(org.statusId)).map((org) => [org.id, org]));

  const formatName = new Map(rows.serviceFormats.map((format) => [format.id, nameKey(format.name)]));
  const formatKeyOf = (name: string) => rows.serviceFormats.filter((format) => nameKey(format.name) === name).map((format) => String(format.id));
  const formatKeys = (id: number | null): string[] => {
    if (id == null) return [];
    return formatName.get(id) === COMBINED ? [...formatKeyOf(IN_PERSON), ...formatKeyOf(VIRTUAL)] : [String(id)];
  };
  const acceptance = new Map(rows.insuranceAcceptanceOptions.map((option) => [option.id, ACCEPTS_INSURANCE[nameKey(option.name)] ?? null]));

  const programCategories = keysBy(rows.programCategories, (row) => row.programId, (row) => row.categoryId);
  const programSubcategories = keysBy(rows.programSubcategories, (row) => row.programId, (row) => row.subcategoryId);
  const programInsurance = keysBy(rows.programInsurancePlans, (row) => row.programId, (row) => row.insurancePlanId);
  const programLanguages = keysBy(rows.programLanguages, (row) => row.programId, (row) => row.languageId);
  const programAudiences = keysBy(rows.programAudiences, (row) => row.programId, (row) => row.audienceId);

  const contacts = new Map<number, DirectoryContact[]>();
  for (const contact of rows.contacts) {
    if (!contact.showOnWebsite) continue;
    const list = contacts.get(contact.programId) ?? [];
    list.push({ name: contact.name, title: text(contact.title) ?? text(contact.specialty), phone: text(contact.phone), email: text(contact.email) });
    contacts.set(contact.programId, list);
  }

  const programs: DirectoryProgram[] = [];
  for (const program of rows.programs) {
    const org = organizations.get(program.organizationId);
    if (!org || !shown.has(program.statusId)) continue;
    const place = addressOf(program) ?? addressOf(org);
    const facetValues: FacetValueKeys = {
      category: programCategories.get(program.id) ?? [],
      subcategory: programSubcategories.get(program.id) ?? [],
      insurance: programInsurance.get(program.id) ?? [],
      cost: program.costOptionId == null ? [] : [String(program.costOptionId)],
      language: programLanguages.get(program.id) ?? [],
      whoItServes: programAudiences.get(program.id) ?? [],
      format: formatKeys(program.serviceFormatId),
    };
    programs.push({
      id: String(program.id),
      name: program.name,
      organization: { id: String(org.id), name: org.name },
      description: text(program.description) ?? "",
      searchKeywords: text(program.searchKeywords) ?? "",
      facetValues,
      address: place?.address ?? null,
      location: place?.location ?? null,
      virtualOnly: program.serviceFormatId != null && formatName.get(program.serviceFormatId) === VIRTUAL,
      phone: text(program.phone) ?? text(org.phone),
      website: toWebsite(text(program.website) ?? text(org.website)),
      hours: text(program.hours),
      acceptsInsurance: program.insuranceAcceptanceId == null ? null : (acceptance.get(program.insuranceAcceptanceId) ?? null),
      eligibilityNotes: text(program.eligibilityNotes),
      lastVerified: program.lastVerified,
      contacts: contacts.get(program.id) ?? [],
    });
  }

  const documentCategories = keysBy(rows.documentCategories, (row) => row.documentId, (row) => row.categoryId);
  const documentSubcategories = keysBy(rows.documentSubcategories, (row) => row.documentId, (row) => row.subcategoryId);
  const documentLanguages = keysBy(rows.documentLanguages, (row) => row.documentId, (row) => row.languageId);
  const documents: DirectoryDocument[] = rows.documents.flatMap((document) => {
    const pdfUrl = toWebsite(document.url);
    // A Document with no usable link has nothing to download, so it is left out.
    if (!shown.has(document.statusId) || !pdfUrl) return [];
    return [{
      id: String(document.id),
      title: document.title,
      description: text(document.description) ?? "",
      searchKeywords: text(document.searchKeywords) ?? "",
      facetValues: {
        category: documentCategories.get(document.id) ?? [],
        subcategory: documentSubcategories.get(document.id) ?? [],
        insurance: [],
        cost: [],
        language: documentLanguages.get(document.id) ?? [],
        whoItServes: [],
        format: [],
      },
      pdfUrl,
      lastVerified: document.lastVerified,
    }];
  });

  const hiddenCategories = new Set(rows.categories.filter((category) => category.hidden).map((category) => category.id));
  const facetValueLists: Record<FacetKey, FacetValue[]> = {
    category: values(rows.categories),
    // A Subcategory of a hidden Category is hidden too (else the filter column shows it alone).
    subcategory: values(
      rows.subcategories.filter((sub) => !hiddenCategories.has(sub.categoryId)),
      (row) => String(row.categoryId),
    ),
    insurance: values(rows.insurancePlans),
    cost: values(rows.costOptions),
    language: values(rows.languages),
    whoItServes: values(rows.audiences),
    format: values(rows.serviceFormats.filter((format) => nameKey(format.name) !== COMBINED)),
  };
  const facets: FacetDefinition[] = FACET_KEYS.map((key) => ({
    key,
    label: FACET_LABELS[key],
    values: facetValueLists[key],
  }));

  return { programs, documents, facets };
}
