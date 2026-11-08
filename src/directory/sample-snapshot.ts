/**
 * Made-up sample data (TEST_SNAPSHOT plus the Programs below). `getDirectorySnapshot()` returns it
 * when DIRECTORY_SAMPLE_DATA=1, so the e2e tests (and UI work) need no database.
 *
 * Never put real people or real contact details here: this repo is public. Use example.org and 555
 * phone numbers.
 */
import { facetValues, TEST_SNAPSHOT } from "./test-fixtures";
import type { CustomFieldDefinition, CustomValues } from "@/custom-fields/types";
import type { DirectoryOrganization, DirectoryProgram, DirectorySnapshot, PostalAddress } from "./types";

const address = (street: string, zip: string, suite: string | null = null): PostalAddress => ({
  street,
  suite,
  city: "Grand Rapids",
  state: "MI",
  zip,
});

// Addresses, phones, and websites for the Organizations in TEST_SNAPSHOT (the fixture has none), so
// the cards look like the design. The unit tests use the fixture as it is.
const ORGANIZATION_DETAILS: Record<string, Pick<DirectoryProgram, "address" | "phone" | "website">> = {
  "O-001": { address: address("123 Example Ave SE", "49508", "Suite 200"), phone: "(616) 555-0142", website: "https://example.org/riverbend" },
  "O-002": { address: address("456 Sample St SE", "49506"), phone: "(616) 555-0157", website: "https://example.org/eastown-yoga" },
  "O-003": { address: { ...address("789 Shoreline Dr", "49417"), city: "Grand Haven" }, phone: "(616) 555-0163", website: null },
  "O-004": { address: null, phone: "(616) 555-0170", website: "https://example.org/kent-basic-needs" },
};

function sample(fields: Partial<DirectoryProgram> & Pick<DirectoryProgram, "id" | "name" | "organization">): DirectoryProgram {
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

const NORTHSIDE = { id: "O-005", name: "Northside Family Center" };
const NORTHSIDE_DETAILS = {
  address: address("10 Example Blvd NE", "49505"),
  location: { lat: 43.0, lng: -85.64 },
  phone: "(616) 555-0181",
  website: "https://example.org/northside",
};
const WESTSIDE = { id: "O-006", name: "Westside Parent Network" };

const SAMPLE_PROGRAMS: DirectoryProgram[] = [
  sample({
    id: "P-101",
    name: "Car seat check",
    organization: NORTHSIDE,
    ...NORTHSIDE_DETAILS,
    description: "A trained technician checks that your car seat is installed safely. Free, by appointment.",
    facetValues: facetValues({
      category: ["basic-needs"],
      cost: ["free"],
      language: ["english", "spanish"],
      format: ["in-person"],
    }),
    lastVerified: "2026-10-05",
    contacts: [{ name: "Sam Example", title: "Safety technician", phone: null, email: null }],
  }),
  sample({
    id: "P-102",
    name: "Prenatal and postpartum checkups",
    organization: NORTHSIDE,
    ...NORTHSIDE_DETAILS,
    description: "Checkups during pregnancy and in the first weeks after birth. Walk-ins welcome on Tuesdays.",
    facetValues: facetValues({
      category: ["medical-care"],
      insurance: ["medicaid", "priority-health"],
      cost: ["sliding-scale"],
      language: ["english", "spanish"],
      whoItServes: ["postpartum"],
      format: ["in-person"],
    }),
    acceptsInsurance: "yes",
    lastVerified: "2026-09-20",
  }),
  sample({
    id: "P-103",
    name: "Feeding support visits",
    organization: NORTHSIDE,
    ...NORTHSIDE_DETAILS,
    description: "A lactation consultant visits you at home or meets you at the center.",
    facetValues: facetValues({
      category: ["lactation-and-feeding"],
      subcategory: ["lactation-consultants"],
      insurance: ["medicaid"],
      language: ["english"],
      whoItServes: ["postpartum"],
      format: ["in-person"],
    }),
    acceptsInsurance: "yes",
    lastVerified: "2026-10-12",
    contacts: [
      { name: "Lee Sample", title: "Lactation consultant", phone: null, email: null },
      { name: "Pat Example", title: "Nurse", phone: null, email: null },
    ],
  }),
  sample({
    id: "P-104",
    name: "Moms night out circle",
    organization: WESTSIDE,
    address: address("22 Sample Rd NW", "49504"),
    location: { lat: 42.98, lng: -85.71 },
    phone: "(616) 555-0190",
    description: "An evening group where parents share how they feel. Childcare is free during the group.",
    searchKeywords: "PPD, anxiety, baby blues",
    facetValues: facetValues({
      category: ["mental-health"],
      subcategory: ["support-groups"],
      cost: ["free"],
      language: ["english"],
      whoItServes: ["postpartum"],
      format: ["in-person"],
    }),
    lastVerified: "2026-07-30",
  }),
  sample({
    id: "P-105",
    name: "Online parent chat",
    organization: WESTSIDE,
    virtualOnly: true,
    phone: "(616) 555-0190",
    website: "https://example.org/westside-chat",
    description: "A video chat for new parents, twice a week. Join from your phone.",
    facetValues: facetValues({
      category: ["mental-health"],
      subcategory: ["support-groups"],
      cost: ["free"],
      language: ["english", "spanish"],
      whoItServes: ["postpartum"],
      format: ["virtual"],
    }),
    lastVerified: "2026-10-25",
  }),
  sample({
    id: "P-106",
    name: "Pelvic floor therapy",
    organization: { id: "O-007", name: "Southkent Physical Therapy" },
    address: address("300 Example Ct SW", "49509"),
    location: { lat: 42.86, lng: -85.72 },
    phone: "(616) 555-0111",
    website: "https://example.org/southkent-pt",
    description: "One-on-one physical therapy for pelvic pain and recovery after birth.",
    facetValues: facetValues({
      category: ["postpartum-recovery"],
      insurance: ["priority-health"],
      language: ["english"],
      whoItServes: ["postpartum"],
      format: ["in-person"],
    }),
    acceptsInsurance: "yes",
    lastVerified: "2026-06-15",
  }),
  sample({
    id: "P-107",
    name: "Crisis and warm line",
    organization: { id: "O-008", name: "Kent Family Help Line" },
    virtualOnly: true,
    phone: "(616) 555-0199",
    description: "Talk to a trained listener any time, day or night. Call or text.",
    searchKeywords: "PPD, crisis, anxiety",
    facetValues: facetValues({
      category: ["mental-health"],
      cost: ["free"],
      language: ["english", "spanish"],
      format: ["virtual"],
    }),
    acceptsInsurance: "not-applicable",
    lastVerified: "2026-11-01",
  }),
  sample({
    id: "P-108",
    name: "Baby clothes closet",
    organization: { id: "O-009", name: "Cherry Hill Neighbors" },
    address: address("55 Sample Ave SE", "49503"),
    location: { lat: 42.95, lng: -85.66 },
    phone: "(616) 555-0124",
    description: "Free clothes for babies and toddlers, newborn to 2T. Open Saturdays.",
    facetValues: facetValues({ category: ["basic-needs"], cost: ["free"], language: ["english"], format: ["in-person"] }),
    lastVerified: "2026-09-02",
  }),
];

// Custom fields, so the e2e tests see the "More details" cards and a custom filter group.
const sampleField = (fields: Pick<CustomFieldDefinition, "id" | "entity" | "label" | "type"> & Partial<CustomFieldDefinition>): CustomFieldDefinition => ({
  helpText: null,
  options: [],
  sortOrder: Number(fields.id),
  showOnWebsite: true,
  filterable: false,
  archived: false,
  ...fields,
});
const PARKING = sampleField({
  id: "1",
  entity: "program",
  label: "Parking",
  type: "choice",
  filterable: true,
  options: [
    { key: "1", label: "Free lot", hidden: false },
    { key: "2", label: "Street", hidden: false },
  ],
});
const ENTRANCE = sampleField({ id: "2", entity: "organization", label: "Accessible entrance", type: "text" });
const PROGRAM_CUSTOM: Record<string, CustomValues> = {
  "P-001": { [PARKING.id]: "1" },
  "P-003": { [PARKING.id]: "2" },
  "P-101": { [PARKING.id]: "1" },
};
const ORGANIZATION_CUSTOM: Record<string, CustomValues> = {
  "O-001": { [ENTRANCE.id]: "Ramp at the side door" },
  "O-005": { [ENTRANCE.id]: "Step-free main door" },
};
const withCustom = (program: DirectoryProgram): DirectoryProgram => ({
  ...program,
  custom: PROGRAM_CUSTOM[program.id] ?? {},
  organizationCustom: ORGANIZATION_CUSTOM[program.organization.id] ?? {},
});

const programs = [
  ...TEST_SNAPSHOT.programs.map((program) => ({ ...program, ...ORGANIZATION_DETAILS[program.organization.id] })),
  ...SAMPLE_PROGRAMS,
].map(withCustom);

// Each Organization's own details: the ones above, Northside, and Westside. The others have only a name.
const ORGANIZATION_EXTRAS: Record<string, Partial<DirectoryOrganization>> = {
  ...ORGANIZATION_DETAILS,
  "O-005": {
    ...NORTHSIDE_DETAILS,
    about: "A neighborhood center for families on the north side of Grand Rapids. Checkups, feeding support, and car seat checks in one place.",
    lastVerified: "2026-10-12",
  },
  "O-006": { address: address("22 Sample Rd NW", "49504"), location: { lat: 42.98, lng: -85.71 }, phone: "(616) 555-0190" },
};

// O-010 has no Programs: its page shows the empty state.
const EMPTY_ORGANIZATION = { id: "O-010", name: "Eastside Doula Collective" };

/** One per Organization that has a sample Program, plus one with none. */
const organizations: DirectoryOrganization[] = [
  ...new Map(programs.map((program) => [program.organization.id, program.organization])).values(),
  EMPTY_ORGANIZATION,
].map((org) => ({
  about: null,
  phone: null,
  website: null,
  address: null,
  location: null,
  lastVerified: null,
  ...org,
  ...ORGANIZATION_EXTRAS[org.id],
  custom: ORGANIZATION_CUSTOM[org.id] ?? {},
}));

export const SAMPLE_SNAPSHOT: DirectorySnapshot = { ...TEST_SNAPSHOT, customFields: [PARKING, ENTRANCE],
  programs,
  organizations,
  // D-002 is linked to Northside Family Center (O-005): its page and `?org=O-005` show it.
  documents: TEST_SNAPSHOT.documents.map((d) => (d.id === "D-002" ? { ...d, organization: { id: "O-005", name: "Northside Family Center" } } : d)),
};
