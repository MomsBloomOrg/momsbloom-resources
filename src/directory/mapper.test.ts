import { describe, expect, it } from "vitest";
import { toDirectorySnapshot, toWebsite, type DirectoryRows } from "./mapper";
import { BILLING_EMAIL, DOULA, INTAKE_NOTES, OLD_FIELD, TEST_FIELDS } from "@/custom-fields/test-fixtures";

// Made-up rows only: this repo is public.
const ACTIVE = 1;
const INACTIVE = 3;
const IN_PERSON = 1;
const VIRTUAL = 2;
const BOTH = 3;

type ProgramRow = DirectoryRows["programs"][number];
type OrgRow = DirectoryRows["organizations"][number];

const noPlace = {
  streetAddress: null,
  suite: null,
  city: null,
  state: null,
  zip: null,
  latitude: null,
  longitude: null,
  phone: null,
  website: null,
};

function org(fields: Partial<OrgRow> & Pick<OrgRow, "id">): OrgRow {
  return { name: `Org ${fields.id}`, statusId: ACTIVE, custom: {}, ...noPlace, ...fields };
}

function program(fields: Partial<ProgramRow> & Pick<ProgramRow, "id">): ProgramRow {
  return {
    organizationId: 10,
    name: `Program ${fields.id}`,
    description: null,
    searchKeywords: null,
    serviceFormatId: null,
    hours: null,
    costOptionId: null,
    insuranceAcceptanceId: null,
    eligibilityNotes: null,
    lastVerified: null,
    statusId: ACTIVE,
    custom: {},
    ...noPlace,
    ...fields,
  };
}

function rows(overrides: Partial<DirectoryRows> = {}): DirectoryRows {
  return {
    statuses: [
      { id: ACTIVE, showOnSite: true },
      { id: 2, showOnSite: true },
      { id: INACTIVE, showOnSite: false },
    ],
    organizations: [
      org({ id: 10, streetAddress: "1 Example St", city: "Grand Rapids", state: "MI", zip: "49503", latitude: 42.9, longitude: -85.6, phone: "(616) 555-0100", website: "example.org" }),
      org({ id: 11, statusId: INACTIVE }),
    ],
    programs: [],
    contacts: [],
    documents: [],
    categories: [
      { id: 2, name: "Mental health", sortOrder: 2 },
      { id: 1, name: "Basic needs", sortOrder: 1 },
    ],
    subcategories: [{ id: 5, categoryId: 2, name: "Support groups", sortOrder: 1 }],
    insurancePlans: [],
    languages: [{ id: 1, name: "English", sortOrder: 1 }],
    audiences: [],
    costOptions: [{ id: 4, name: "Free", sortOrder: 1 }],
    serviceFormats: [
      { id: IN_PERSON, name: "In person", sortOrder: 1 },
      { id: VIRTUAL, name: "Virtual", sortOrder: 2 },
      { id: BOTH, name: "In person and virtual", sortOrder: 3 },
    ],
    insuranceAcceptanceOptions: [
      { id: 1, name: "Yes", sortOrder: 1 },
      { id: 2, name: "No", sortOrder: 2 },
      { id: 3, name: "Not applicable", sortOrder: 3 },
    ],
    programCategories: [],
    programSubcategories: [],
    programInsurancePlans: [],
    programLanguages: [],
    programAudiences: [],
    documentCategories: [],
    documentSubcategories: [],
    documentLanguages: [],
    customFields: [],
    ...overrides,
  };
}

describe("toDirectorySnapshot", () => {
  it("keeps only records whose Status and Organization are shown", () => {
    const snapshot = toDirectorySnapshot(
      rows({
        programs: [program({ id: 1 }), program({ id: 2, statusId: 2 }), program({ id: 3, statusId: INACTIVE }), program({ id: 4, organizationId: 11 })],
        documents: [
          { id: 7, title: "Guide", description: null, searchKeywords: null, url: "https://example.org/guide.pdf", lastVerified: null, statusId: ACTIVE },
          { id: 8, title: "Old guide", description: null, searchKeywords: null, url: "https://example.org/old.pdf", lastVerified: null, statusId: INACTIVE },
        ],
      }),
    );
    expect(snapshot.programs.map((p) => p.id)).toEqual(["1", "2"]);
    expect(snapshot.programs[0].organization).toEqual({ id: "10", name: "Org 10" });
    expect(snapshot.documents.map((d) => d.id)).toEqual(["7"]);
  });

  it("shows only Contacts with Show on website, and uses the specialty when there is no title", () => {
    const snapshot = toDirectorySnapshot(
      rows({
        programs: [program({ id: 1 })],
        contacts: [
          { programId: 1, name: "Sam Example", title: null, specialty: "Doula", email: "sam@example.org", phone: null, showOnWebsite: true },
          { programId: 1, name: "Pat Private", title: "Nurse", specialty: null, email: "pat@example.org", phone: "(616) 555-0101", showOnWebsite: false },
        ],
      }),
    );
    expect(snapshot.programs[0].contacts).toEqual([{ name: "Sam Example", title: "Doula", phone: null, email: "sam@example.org" }]);
  });

  it("never lets a private Contact or any Internal notes reach the snapshot, even if a row carries them", () => {
    const withNotes = <T extends object>(row: T) => ({ ...row, internalNotes: "SECRET-NOTE" });
    const snapshot = toDirectorySnapshot(
      rows({
        organizations: [withNotes(org({ id: 10 }))],
        programs: [withNotes(program({ id: 1 }))],
        contacts: [
          withNotes({ programId: 1, name: "Sam Example", title: "Doula", specialty: null, email: null, phone: null, showOnWebsite: true }),
          withNotes({ programId: 1, name: "Pat Private", title: null, specialty: null, email: "pat@example.org", phone: "616-555-0101", showOnWebsite: false }),
        ],
        documents: [withNotes({ id: 7, title: "Guide", description: null, searchKeywords: null, url: "https://example.org/guide.pdf", lastVerified: null, statusId: ACTIVE })],
      }),
    );
    const json = JSON.stringify(snapshot);
    expect(json).not.toMatch(/SECRET-NOTE|internalNotes|showOnWebsite|Pat Private|pat@example.org|555-0101/);
    expect(json).toContain("Sam Example");
  });

  it("takes a blank address, phone, and website from the Organization, with the Organization's point", () => {
    const [program1] = toDirectorySnapshot(rows({ programs: [program({ id: 1 })] })).programs;
    expect(program1.address).toEqual({ street: "1 Example St", suite: null, city: "Grand Rapids", state: "MI", zip: "49503" });
    expect(program1.location).toEqual({ lat: 42.9, lng: -85.6 });
    expect(program1.phone).toBe("(616) 555-0100");
    expect(program1.website).toBe("https://example.org");
  });

  it("never puts the Organization's point on a Program's own address", () => {
    const [program1] = toDirectorySnapshot(
      rows({ programs: [program({ id: 1, streetAddress: "9 Sample Ave", phone: "(616) 555-0199" })] }),
    ).programs;
    expect(program1.address).toEqual({ street: "9 Sample Ave", suite: null, city: "", state: "MI", zip: "" });
    expect(program1.location).toBeNull();
    expect(program1.phone).toBe("(616) 555-0199");
  });

  it("expands In person and virtual to both values, and keeps it out of the filter list", () => {
    const snapshot = toDirectorySnapshot(
      rows({ programs: [program({ id: 1, serviceFormatId: BOTH }), program({ id: 2, serviceFormatId: VIRTUAL })] }),
    );
    expect(snapshot.programs[0].facetValues.format).toEqual(["1", "2"]);
    expect(snapshot.programs[0].virtualOnly).toBe(false);
    expect(snapshot.programs[1].facetValues.format).toEqual(["2"]);
    expect(snapshot.programs[1].virtualOnly).toBe(true);
    expect(snapshot.facets.find((f) => f.key === "format")?.values.map((v) => v.label)).toEqual(["In person", "Virtual"]);
  });

  it("maps Accepts insurance, with null as unknown", () => {
    const snapshot = toDirectorySnapshot(
      rows({ programs: [program({ id: 1, insuranceAcceptanceId: 3 }), program({ id: 2, insuranceAcceptanceId: null })] }),
    );
    expect(snapshot.programs.map((p) => p.acceptsInsurance)).toEqual(["not-applicable", null]);
  });

  it("gives facet values in sort order, with subcategory parents and joins as string keys", () => {
    const snapshot = toDirectorySnapshot(
      rows({
        programs: [program({ id: 1, costOptionId: 4 })],
        programCategories: [{ programId: 1, categoryId: 2 }],
        programSubcategories: [{ programId: 1, subcategoryId: 5 }],
        programLanguages: [{ programId: 1, languageId: 1 }],
      }),
    );
    expect(snapshot.facets.map((f) => f.key)).toEqual(["category", "subcategory", "insurance", "cost", "language", "whoItServes", "format"]);
    expect(snapshot.facets[0].values).toEqual([
      { key: "1", label: "Basic needs" },
      { key: "2", label: "Mental health" },
    ]);
    expect(snapshot.facets[1].values).toEqual([{ key: "5", label: "Support groups", parentKey: "2" }]);
    expect(snapshot.programs[0].facetValues).toMatchObject({ category: ["2"], subcategory: ["5"], language: ["1"], cost: ["4"] });
  });

  it("leaves hidden Facet values (and the Subcategories of a hidden Category) out of the filters, not out of the records", () => {
    const snapshot = toDirectorySnapshot(
      rows({
        categories: [
          { id: 1, name: "Basic needs", sortOrder: 1 },
          { id: 2, name: "Mental health", sortOrder: 2, hidden: true },
        ],
        subcategories: [
          { id: 5, categoryId: 2, name: "Support groups", sortOrder: 1 },
          { id: 6, categoryId: 1, name: "Diapers", sortOrder: 1, hidden: true },
          { id: 7, categoryId: 1, name: "Food", sortOrder: 2 },
        ],
        languages: [
          { id: 1, name: "English", sortOrder: 1 },
          { id: 2, name: "Spanish", sortOrder: 2, hidden: true },
        ],
        programs: [program({ id: 1 })],
        programCategories: [{ programId: 1, categoryId: 2 }],
        programLanguages: [{ programId: 1, languageId: 2 }],
      }),
    );
    const labels = (key: string) => snapshot.facets.find((f) => f.key === key)?.values.map((v) => v.label);
    expect(labels("category")).toEqual(["Basic needs"]);
    expect(labels("subcategory")).toEqual(["Food"]);
    expect(labels("language")).toEqual(["English"]);
    expect(snapshot.programs[0].facetValues).toMatchObject({ category: ["2"], language: ["2"] });
  });

  it("leaves out a Document whose link is not a URL", () => {
    const document = { description: null, searchKeywords: null, lastVerified: null, statusId: ACTIVE };
    const snapshot = toDirectorySnapshot(
      rows({
        documents: [
          { ...document, id: 7, title: "Guide", url: "example.org/guide.pdf" },
          { ...document, id: 8, title: "Bad link", url: "see the front desk" },
        ],
      }),
    );
    expect(snapshot.documents.map((d) => [d.id, d.pdfUrl])).toEqual([["7", "https://example.org/guide.pdf"]]);
  });
});

describe("toWebsite", () => {
  it("keeps URLs, adds https:// to a bare domain, and drops other text", () => {
    expect(toWebsite("http://example.org/a")).toBe("http://example.org/a");
    expect(toWebsite(" www.example.org/page ")).toBe("https://www.example.org/page");
    expect(toWebsite("call for info")).toBeNull();
    expect(toWebsite("")).toBeNull();
  });
});

describe("custom fields", () => {
  it("keeps only public, active fields and their answers", () => {
    const snapshot = toDirectorySnapshot(
      rows({
        customFields: TEST_FIELDS,
        organizations: [org({ id: 10, custom: { [BILLING_EMAIL.id]: "billing@example.org" } })],
        programs: [
          program({ id: 1, custom: { [DOULA.id]: true, [INTAKE_NOTES.id]: "Staff only", [OLD_FIELD.id]: "Archived" } }),
        ],
      }),
    );
    const ids = snapshot.customFields.map((field) => field.id);
    expect(ids).toContain(DOULA.id);
    expect(ids).not.toContain(INTAKE_NOTES.id);
    expect(ids).not.toContain(OLD_FIELD.id);
    expect(ids).not.toContain(BILLING_EMAIL.id);
    expect(snapshot.programs[0].custom).toEqual({ [DOULA.id]: true });
    expect(snapshot.programs[0].organizationCustom).toEqual({});
  });
});
