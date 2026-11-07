/**
 * The Directory's state, read from and written to the URL (ADR 0004). Every result page has its
 * own URL, so the back button works and a link can be shared.
 *
 * Example: ?q=yoga&zip=49508&r=10&cat=postpartum-recovery&ins=medicaid&ins=priority-health
 *
 * The URL comes from anyone, so reading it never throws: a bad value is dropped.
 */
import type { CustomFilters } from "@/custom-fields/filter";
import { FACET_KEYS, type FacetKey, type LatLng } from "./types";

/** The URL key for each Facet. Several values repeat the key: `ins=a&ins=b`. */
export const FACET_URL_KEYS: Readonly<Record<FacetKey, string>> = {
  category: "cat",
  subcategory: "sub",
  insurance: "ins",
  cost: "cost",
  language: "lang",
  whoItServes: "who",
  format: "fmt",
};

/** The URL key of a custom field filter: "cf" + the field id, for example `cf12=1&cf12=3`. */
export const customFilterUrlKey = (fieldId: string) => `cf${fieldId}`;
const CUSTOM_URL_KEY = /^cf(\d{1,9})$/;
const MAX_CUSTOM_FIELDS = 20;

export const RADIUS_MILES = [5, 10, 25] as const;
export type RadiusMiles = (typeof RADIUS_MILES)[number];
/** "any" = no distance limit. Null = not chosen: Any. */
export type Radius = RadiusMiles | "any" | null;

export const SORTS = ["nearest", "az", "verified"] as const;
export type Sort = (typeof SORTS)[number];

export const PAGE_SIZE = 10;
const MAX_PAGES = 30;
const MAX_KEYWORD_LENGTH = 100;
const MAX_VALUES_PER_FACET = 50;
const MAX_VALUE_LENGTH = 100;

export interface DirectoryQuery {
  /** The keyword, trimmed. "" = none. */
  q: string;
  /** A 5-digit ZIP code, or null. Whether it is a real Michigan ZIP code is checked later. */
  zip: string | null;
  /**
   * From "Use my location", rounded to 2 decimals (about 1 km), so the URL never holds an exact
   * home address. Null when not used. When both are set, `near` wins over `zip`.
   */
  near: LatLng | null;
  radius: Radius;
  filters: Readonly<Record<FacetKey, readonly string[]>>;
  /** Custom field filters: field id → checked value keys. Unknown fields are dropped by searchDirectory. */
  custom: CustomFilters;
  /** Organization ID ("See all programs at ..."), or null. */
  org: string | null;
  /** Null = the default: nearest when a location is known, otherwise A to Z. */
  sort: Sort | null;
  /** How many pages of 10 are shown ("Show more" adds one). At least 1. */
  pages: number;
  /** "map" shows the map beside the cards. Anything else in the URL is the list. */
  view: "list" | "map";
}

/** What Next.js gives a page as `searchParams`, or a plain URLSearchParams. */
export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

export function emptyFilters(): Record<FacetKey, string[]> {
  return Object.fromEntries(FACET_KEYS.map((key) => [key, []])) as unknown as Record<FacetKey, string[]>;
}

export const EMPTY_QUERY: DirectoryQuery = {
  q: "",
  zip: null,
  near: null,
  radius: null,
  filters: emptyFilters(),
  custom: {},
  org: null,
  sort: null,
  pages: 1,
  view: "list",
};

function getAll(input: SearchParamsInput, key: string): string[] {
  if (input instanceof URLSearchParams) return input.getAll(key);
  const value = input[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const getFirst = (input: SearchParamsInput, key: string): string | null => getAll(input, key)[0] ?? null;

const roundTo2 = (n: number) => Math.round(n * 100) / 100;

function parseNear(value: string | null): LatLng | null {
  const match = value?.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: roundTo2(lat), lng: roundTo2(lng) };
}

function parseCustom(input: SearchParamsInput): CustomFilters {
  const keys = input instanceof URLSearchParams ? [...new Set(input.keys())] : Object.keys(input);
  const custom: Record<string, string[]> = {};
  for (const key of keys) {
    const fieldId = key.match(CUSTOM_URL_KEY)?.[1];
    if (!fieldId || Object.keys(custom).length >= MAX_CUSTOM_FIELDS) continue;
    const values = getAll(input, key)
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && value.length <= MAX_VALUE_LENGTH);
    if (values.length > 0) custom[fieldId] = [...new Set(values)].slice(0, MAX_VALUES_PER_FACET);
  }
  return custom;
}

function parseRadius(value: string | null): Radius {
  if (value === "any") return "any";
  const miles = Number(value);
  return (RADIUS_MILES as readonly number[]).includes(miles) ? (miles as RadiusMiles) : null;
}

export function parseDirectoryQuery(input: SearchParamsInput): DirectoryQuery {
  const filters = emptyFilters();
  for (const facet of FACET_KEYS) {
    const values = getAll(input, FACET_URL_KEYS[facet])
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && value.length <= MAX_VALUE_LENGTH);
    filters[facet] = [...new Set(values)].slice(0, MAX_VALUES_PER_FACET);
  }

  const zip = getFirst(input, "zip")?.trim() ?? null;
  const sort = getFirst(input, "sort");
  const pages = Number.parseInt(getFirst(input, "n") ?? "1", 10);
  const org = getFirst(input, "org")?.trim() ?? null;

  return {
    q: (getFirst(input, "q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_KEYWORD_LENGTH),
    zip: zip && !isBadZip(zip) ? zip : null,
    near: parseNear(getFirst(input, "near")),
    radius: parseRadius(getFirst(input, "r")),
    filters,
    custom: parseCustom(input),
    // An opaque ID: a database id ("12") or a test fixture id ("O-001").
    org: org && /^[\w-]{1,20}$/.test(org) ? org : null,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : null,
    pages: Number.isFinite(pages) ? Math.min(Math.max(pages, 1), MAX_PAGES) : 1,
    view: getFirst(input, "view") === "map" ? "map" : "list",
  };
}

/** The query as a URL search string, without "?". Default values are left out, so URLs stay short. */
export function serializeDirectoryQuery(query: DirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.zip) params.set("zip", query.zip);
  if (query.near) params.set("near", `${roundTo2(query.near.lat)},${roundTo2(query.near.lng)}`);
  if (query.radius !== null) params.set("r", String(query.radius));
  for (const facet of FACET_KEYS) {
    for (const value of query.filters[facet]) params.append(FACET_URL_KEYS[facet], value);
  }
  for (const [fieldId, values] of Object.entries(query.custom)) {
    for (const value of values) params.append(customFilterUrlKey(fieldId), value);
  }
  if (query.org) params.set("org", query.org);
  if (query.sort) params.set("sort", query.sort);
  if (query.pages > 1) params.set("n", String(query.pages));
  if (query.view === "map") params.set("view", "map");
  return params.toString();
}

/** The query for the host page URL (ADR 0005): no `zip`, `near`, or `r` (analytics sees that URL; `r` means nothing without them) and no `n` ("Show more" pages). */
export function shareSearch(query: DirectoryQuery): string {
  return serializeDirectoryQuery({ ...query, zip: null, near: null, radius: null, pages: 1 });
}

/** True when any filter checkbox or the Organization filter is active (the chips row shows). */
export function hasActiveFilters(query: DirectoryQuery): boolean {
  return query.org !== null || FACET_KEYS.some((facet) => query.filters[facet].length > 0) || Object.values(query.custom).some((values) => values.length > 0);
}

/** The query after a chip's "x": one value removed. Back to the first page. */
export function removeFilter(query: DirectoryQuery, facet: FacetKey, value: string): DirectoryQuery {
  return {
    ...query,
    filters: { ...query.filters, [facet]: query.filters[facet].filter((v) => v !== value) },
    pages: 1,
  };
}

/** The query after a checkbox click: the value added or removed. Back to the first page. */
export function toggleFilter(query: DirectoryQuery, facet: FacetKey, value: string): DirectoryQuery {
  if (query.filters[facet].includes(value)) return removeFilter(query, facet, value);
  return { ...query, filters: { ...query.filters, [facet]: [...query.filters[facet], value] }, pages: 1 };
}

/** "Clear all": every filter and the Organization filter go; the keyword and location stay. */
export function clearFilters(query: DirectoryQuery): DirectoryQuery {
  return { ...query, filters: emptyFilters(), custom: {}, org: null, pages: 1 };
}

/** The query after a custom filter chip's "x": one value removed. Back to the first page. */
export function removeCustomFilter(query: DirectoryQuery, fieldId: string, value: string): DirectoryQuery {
  const rest = (query.custom[fieldId] ?? []).filter((v) => v !== value);
  const custom = { ...query.custom };
  if (rest.length > 0) custom[fieldId] = rest;
  else delete custom[fieldId];
  return { ...query, custom, pages: 1 };
}

/** True when the family typed a ZIP that is not 5 digits (after trimming). Empty is not bad. */
export function isBadZip(raw: string): boolean {
  const zip = raw.trim();
  return zip !== "" && !/^\d{5}$/.test(zip);
}
