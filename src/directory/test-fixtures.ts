/**
 * A small made-up snapshot for tests (and for UI work before the database is ready).
 * Never put real people or real contact details here: this repo is public.
 *
 * Distances from ZIP 49508 (42.873, -85.628):
 *   Riverbend Health ~0.5 mi, Eastown Family Yoga ~5.3 mi, Lakeshore Lactation ~22 mi,
 *   Kent Basic Needs has no map point.
 */
import { FACET_KEYS, type DirectoryOrganization, type DirectoryProgram, type DirectorySnapshot, type FacetKey, type FacetValueKeys } from "./types";

export function facetValues(values: Partial<Record<FacetKey, string[]>>): FacetValueKeys {
  return Object.fromEntries(FACET_KEYS.map((facet) => [facet, values[facet] ?? []])) as unknown as FacetValueKeys;
}

const RIVERBEND = { id: "O-001", name: "Riverbend Health" };
const RIVERBEND_PLACE = { lat: 42.88, lng: -85.63 };
const LAKESHORE = { id: "O-003", name: "Lakeshore Lactation" };
const LAKESHORE_PLACE = { lat: 42.8, lng: -86.05 };

function organization(fields: Pick<DirectoryOrganization, "id" | "name">): DirectoryOrganization {
  return { about: null, phone: null, website: null, address: null, location: null, lastVerified: null, custom: {}, ...fields };
}

function program(fields: Partial<DirectoryProgram> & Pick<DirectoryProgram, "id" | "name" | "organization">): DirectoryProgram {
  return {
    description: "",
    searchKeywords: "",
    facetValues: facetValues({}),
    address: null,
    location: null,
    virtualOnly: false,
    phone: null,
    website: null,
    hours: null,
    acceptsInsurance: null,
    eligibilityNotes: null,
    lastVerified: null,
    contacts: [],
    custom: {},
    organizationCustom: {},
    ...fields,
  };
}

export const TEST_SNAPSHOT: DirectorySnapshot = {
  customFields: [],
  facets: [
    {
      key: "category",
      label: "Type of support",
      values: [
        { key: "postpartum-recovery", label: "Postpartum recovery" },
        { key: "mental-health", label: "Mental health" },
        { key: "lactation-and-feeding", label: "Lactation and feeding" },
        { key: "medical-care", label: "Medical care" },
        { key: "basic-needs", label: "Basic needs and baby supplies" },
      ],
    },
    {
      key: "subcategory",
      label: "Type of support",
      values: [
        { key: "yoga", label: "Yoga", parentKey: "postpartum-recovery" },
        { key: "chiropractic", label: "Chiropractic", parentKey: "postpartum-recovery" },
        { key: "support-groups", label: "Support groups", parentKey: "mental-health" },
        { key: "lactation-consultants", label: "Lactation consultants", parentKey: "lactation-and-feeding" },
        { key: "diapers", label: "Diapers and wipes", parentKey: "basic-needs" },
      ],
    },
    {
      key: "insurance",
      label: "Insurance",
      values: [
        { key: "medicaid", label: "Medicaid / Healthy Michigan Plan" },
        { key: "priority-health", label: "Priority Health" },
      ],
    },
    { key: "cost", label: "Cost", values: [{ key: "free", label: "Free" }, { key: "sliding-scale", label: "Sliding scale" }] },
    { key: "language", label: "Language", values: [{ key: "english", label: "English" }, { key: "spanish", label: "Spanish" }] },
    { key: "whoItServes", label: "Who it serves", values: [{ key: "postpartum", label: "Postpartum (up to 1 year)" }] },
    {
      key: "format",
      label: "How you'll connect",
      values: [
        { key: "in-person", label: "In person" },
        { key: "virtual", label: "Virtual" },
      ],
    },
  ],
  programs: [
    program({
      id: "P-001",
      name: "Mom and baby yoga",
      organization: RIVERBEND,
      description: "Weekly gentle yoga for new parents. Babies are welcome in class.",
      facetValues: facetValues({
        category: ["postpartum-recovery"],
        subcategory: ["yoga"],
        insurance: ["medicaid", "priority-health"],
        cost: ["sliding-scale"],
        language: ["english", "spanish"],
        whoItServes: ["postpartum"],
        format: ["in-person", "virtual"],
      }),
      location: RIVERBEND_PLACE,
      lastVerified: "2026-10-01",
      contacts: [{ name: "Maria Sample", title: "Yoga instructor", phone: null, email: null }],
    }),
    program({
      id: "P-002",
      name: "Postpartum chiropractic",
      organization: RIVERBEND,
      description: "Chiropractic care for back pain and recovery after birth.",
      facetValues: facetValues({
        category: ["postpartum-recovery"],
        subcategory: ["chiropractic"],
        insurance: ["medicaid"],
        language: ["english"],
        format: ["in-person"],
      }),
      location: RIVERBEND_PLACE,
      lastVerified: "2026-09-01",
      contacts: [{ name: "Dr. Jane Example", title: "Chiropractor", phone: null, email: null }],
    }),
    program({
      id: "P-003",
      name: "Baby-and-me yoga",
      organization: { id: "O-002", name: "Eastown Family Yoga" },
      description: "Baby-and-me yoga and a postpartum circle.",
      facetValues: facetValues({
        category: ["postpartum-recovery"],
        subcategory: ["yoga"],
        insurance: ["priority-health"],
        cost: ["free"],
        language: ["english"],
        format: ["in-person"],
      }),
      location: { lat: 42.95, lng: -85.62 },
      lastVerified: "2026-10-20",
    }),
    program({
      id: "P-004",
      name: "Lactation help line",
      organization: LAKESHORE,
      description: "Call a lactation consultant from home.",
      facetValues: facetValues({
        category: ["lactation-and-feeding"],
        subcategory: ["lactation-consultants"],
        language: ["spanish"],
        format: ["virtual"],
      }),
      location: LAKESHORE_PLACE,
      virtualOnly: true,
    }),
    program({
      id: "P-005",
      name: "New parent support group",
      organization: LAKESHORE,
      description: "A weekly group for new parents.",
      searchKeywords: "PPD, baby blues",
      facetValues: facetValues({
        category: ["mental-health"],
        subcategory: ["support-groups"],
        cost: ["free"],
        language: ["english"],
        format: ["in-person"],
      }),
      location: LAKESHORE_PLACE,
      lastVerified: "2026-08-15",
    }),
    program({
      id: "P-006",
      name: "Diaper bank",
      organization: { id: "O-004", name: "Kent Basic Needs" },
      description: "Free diapers and wipes for families.",
      facetValues: facetValues({ category: ["basic-needs"], subcategory: ["diapers"], cost: ["free"], language: ["english"] }),
    }),
  ],
  organizations: [
    organization(RIVERBEND),
    organization({ id: "O-002", name: "Eastown Family Yoga" }),
    organization(LAKESHORE),
    organization({ id: "O-004", name: "Kent Basic Needs" }),
  ],
  documents: [
    {
      id: "D-001",
      title: "Postpartum Warning Signs",
      description: "Warning signs after birth and when to call a doctor.",
      searchKeywords: "PPD, bleeding, fever",
      facetValues: facetValues({ category: ["medical-care", "mental-health"], language: ["english", "spanish"] }),
      pdfUrl: "https://example.org/warning-signs.pdf",
      organization: null,
      lastVerified: "2026-10-01",
      custom: {},
    },
    {
      id: "D-002",
      title: "Gentle Yoga for Postpartum Recovery",
      description: "Six beginner poses to do at home.",
      searchKeywords: "",
      facetValues: facetValues({ category: ["postpartum-recovery"], subcategory: ["yoga"], language: ["english"] }),
      pdfUrl: "https://example.org/gentle-yoga.pdf",
      organization: null,
      lastVerified: null,
      custom: {},
    },
  ],
};
