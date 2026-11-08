/**
 * The public data that the Directory searches (ADR 0004). The server loads it from the database
 * once, caches it, and every search works on this copy (the "snapshot").
 *
 * These types are the contract between the database side and the Directory:
 * - The mapper (tables → snapshot) fills them. It is the only code that knows the tables.
 * - Everything in src/directory/ and the Directory pages uses only these types.
 *
 * Rules for the mapper (see CONTEXT.md and docs/specs/public-directory.md):
 * - Only records with Status Active or Needs review. No Program whose Organization is Inactive.
 * - Never Internal notes. Only Contacts with "Show on website" set to yes.
 * - Apply Inheritance: a Program's blank address, phone, or website becomes its Organization's.
 */

/** The groups of filter checkboxes. The order here is the order on screen. */
export const FACET_KEYS = [
  "category",
  "subcategory",
  "insurance",
  "cost",
  "language",
  "whoItServes",
  "format",
] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

/** For each Facet, the keys of the Facet values a record has. A Facet with no values is []. */
export type FacetValueKeys = Readonly<Record<FacetKey, readonly string[]>>;

export interface FacetValue {
  /** Stable key, used in URLs and on records. The database id, an integer as a string, for example "12". Unique only within its Facet. */
  key: string;
  /** What families see, for example "Medicaid / Healthy Michigan". */
  label: string;
  /** Subcategories only: the key of the Category it belongs to. */
  parentKey?: string;
}

export interface FacetDefinition {
  key: FacetKey;
  /** The group title on screen, for example "Insurance". */
  label: string;
  /** Visible values only (hidden values are left out), in the order staff set. */
  values: readonly FacetValue[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PostalAddress {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  zip: string;
}

import type { CustomFieldDefinition, CustomValues } from "@/custom-fields/types";

export interface DirectoryContact {
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
}

export interface DirectoryProgram {
  /** The database id, an integer as a string, for example "12". */
  id: string;
  name: string;
  /** `id` is the database id, an integer as a string, for example "12". */
  organization: { id: string; name: string };
  description: string;
  /** Extra words a parent might type ("PPD, baby blues"). Searched, never shown. */
  searchKeywords: string;
  facetValues: FacetValueKeys;
  /** After Inheritance. Null when neither the Program nor its Organization has one. */
  address: PostalAddress | null;
  /** The map point of `address`. Null when unknown. */
  location: LatLng | null;
  /** True when the Program is only virtual or by phone: it has no Distance. */
  virtualOnly: boolean;
  phone: string | null;
  /** A full URL, or null. The mapper drops values that are not URLs. */
  website: string | null;
  hours: string | null;
  /** Null means "we don't know". Never show null as "No". */
  acceptsInsurance: "yes" | "no" | "not-applicable" | null;
  eligibilityNotes: string | null;
  /** ISO date, for example "2026-10-15". */
  lastVerified: string | null;
  contacts: readonly DirectoryContact[];
  /** Custom field answers, public fields only (field id → value). */
  custom: CustomValues;
  /** The Organization's custom field answers, public fields only. Shown on Program detail. */
  organizationCustom: CustomValues;
}

export interface DirectoryDocument {
  /** The database id, an integer as a string, for example "12". */
  id: string;
  title: string;
  description: string;
  searchKeywords: string;
  /** Only category, subcategory, and language are used; the other Facets are []. */
  facetValues: FacetValueKeys;
  pdfUrl: string;
  /** The Organization whose page also shows this Document; null when it has none or its Status is hidden. */
  organization: { id: string; name: string } | null;
  lastVerified: string | null;
}

/** An Organization with a shown Status, for its detail page. Never Internal notes, never email. */
export interface DirectoryOrganization {
  /** The database id, an integer as a string, for example "12". */
  id: string;
  name: string;
  about: string | null;
  phone: string | null;
  /** A full URL, or null. */
  website: string | null;
  /** The Organization's own address only (not one from its Programs). */
  address: PostalAddress | null;
  location: LatLng | null;
  /** ISO date, for example "2026-10-15". */
  lastVerified: string | null;
  /** Custom field answers, public fields only (field id → value). */
  custom: CustomValues;
}

export interface DirectorySnapshot {
  programs: readonly DirectoryProgram[];
  /** Shown Organizations, also those with no shown Programs. */
  organizations: readonly DirectoryOrganization[];
  documents: readonly DirectoryDocument[];
  facets: readonly FacetDefinition[];
  /** Custom fields shown on the website and not archived. Staff-only fields never reach the snapshot. */
  customFields: readonly CustomFieldDefinition[];
}
