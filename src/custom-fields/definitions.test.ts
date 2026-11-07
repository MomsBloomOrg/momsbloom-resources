import { describe, expect, it } from "vitest";
import {
  archiveDefinition,
  createDefinition,
  fieldsFor,
  reorderDefinitions,
  restoreDefinition,
  updateDefinition,
} from "./definitions";
import { AGES, DOULA, OLD_FIELD, PARKING, TEST_FIELDS } from "./test-fixtures";

describe("createDefinition", () => {
  it("adds a list field with option keys 1, 2, ... at the end of the form", () => {
    const result = createDefinition(
      { entity: "program", type: "choice", label: "  Childcare on site ", options: ["Yes, free", "Yes, paid"], showOnWebsite: true },
      TEST_FIELDS,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        entity: "program",
        type: "choice",
        label: "Childcare on site",
        helpText: null,
        options: [
          { key: "1", label: "Yes, free", hidden: false },
          { key: "2", label: "Yes, paid", hidden: false },
        ],
        sortOrder: 9, // after every Program field, archived ones too
        showOnWebsite: true,
        filterable: false,
        archived: false,
      },
    });
  });

  it("needs a name that no other active field of the same record type has", () => {
    expect(createDefinition({ entity: "program", type: "text", label: "" }, TEST_FIELDS)).toMatchObject({
      ok: false,
      errors: { label: "Give the field a name." },
    });
    expect(createDefinition({ entity: "program", type: "text", label: "parking" }, TEST_FIELDS)).toMatchObject({
      ok: false,
      errors: { label: "Another field already has this name." },
    });
    // Same name on another record type, or on an archived field, is fine.
    expect(createDefinition({ entity: "organization", type: "text", label: "Parking" }, TEST_FIELDS).ok).toBe(true);
    expect(createDefinition({ entity: "program", type: "text", label: "Old field" }, TEST_FIELDS).ok).toBe(true);
  });

  it("needs at least one option for a list, and no two with the same name", () => {
    expect(createDefinition({ entity: "program", type: "multiChoice", label: "Days", options: [] }, TEST_FIELDS)).toMatchObject({
      ok: false,
      errors: { options: "Add at least one option." },
    });
    expect(
      createDefinition({ entity: "program", type: "choice", label: "Days", options: ["Monday", "monday"] }, TEST_FIELDS),
    ).toMatchObject({ ok: false, errors: { options: "Two options have the same name." } });
  });

  it("allows filters only on Program Yes / No and list fields that are shown on the website", () => {
    const base = { label: "Filter me", filterable: true, showOnWebsite: true } as const;
    expect(createDefinition({ ...base, entity: "program", type: "yesNo" }, TEST_FIELDS).ok).toBe(true);
    expect(createDefinition({ ...base, entity: "program", type: "text" }, TEST_FIELDS)).toMatchObject({
      errors: { filterable: "Only Yes / No and list fields can be filters." },
    });
    expect(createDefinition({ ...base, entity: "organization", type: "yesNo" }, TEST_FIELDS)).toMatchObject({
      errors: { filterable: "Only Program fields can be filters." },
    });
    expect(createDefinition({ ...base, entity: "program", type: "yesNo", showOnWebsite: false }, TEST_FIELDS)).toMatchObject({
      errors: { filterable: "A filter must also be shown on the website." },
    });
  });
});

describe("updateDefinition", () => {
  it("renames a field and its options without changing their keys", () => {
    const result = updateDefinition(
      PARKING,
      {
        label: "Parking at the building",
        options: [
          { key: "2", label: "Street parking" },
          { key: "1", label: "Free lot" },
          { key: "3", label: "Paid garage", hidden: true },
          { label: "Bus stop nearby" },
        ],
      },
      TEST_FIELDS,
    );
    expect(result.ok && result.value.label).toBe("Parking at the building");
    expect(result.ok && result.value.options).toEqual([
      { key: "2", label: "Street parking", hidden: false },
      { key: "1", label: "Free lot", hidden: false },
      { key: "3", label: "Paid garage", hidden: true },
      { key: "4", label: "Bus stop nearby", hidden: false },
    ]);
  });

  it("hides an option that the form left out, never removes it", () => {
    const result = updateDefinition(PARKING, { options: [{ key: "1", label: "Free lot" }] }, TEST_FIELDS);
    expect(result.ok && result.value.options.map((o) => [o.key, o.hidden])).toEqual([
      ["1", false],
      ["2", true],
      ["3", true],
    ]);
  });

  it("refuses to change the type or the record type", () => {
    expect(updateDefinition(DOULA, { type: "text" }, TEST_FIELDS)).toEqual({
      ok: false,
      errors: { type: "A field's type can't change. Archive this field and add a new one." },
    });
    expect(updateDefinition(DOULA, { entity: "organization" }, TEST_FIELDS).ok).toBe(false);
    // Sending the same type back is fine.
    expect(updateDefinition(DOULA, { type: "yesNo", label: "Doula available" }, TEST_FIELDS).ok).toBe(true);
  });

  it("keeps its own name when nothing else changed", () => {
    expect(updateDefinition(AGES, { helpText: "Pick every age group" }, TEST_FIELDS).ok).toBe(true);
  });
});

describe("archive and restore", () => {
  it("archived fields leave the form; restoring checks the name again", () => {
    const archived = archiveDefinition(DOULA);
    const all = TEST_FIELDS.map((f) => (f.id === DOULA.id ? archived : f));
    expect(fieldsFor(all, "program").map((f) => f.id)).not.toContain(DOULA.id);

    const taken = [...all, { ...DOULA, id: "99", label: "Doula on staff" }];
    expect(restoreDefinition(archived, taken)).toMatchObject({ ok: false, errors: { label: "Another field already has this name." } });
    expect(restoreDefinition(archived, all)).toEqual({ ok: true, value: { ...DOULA, archived: false } });
  });

  it("an archived field can be restored even if it is an old one", () => {
    expect(restoreDefinition(OLD_FIELD, TEST_FIELDS).ok).toBe(true);
  });
});

describe("reorderDefinitions", () => {
  it("numbers the listed fields first, then the rest in their old order", () => {
    const reordered = reorderDefinitions(TEST_FIELDS, "program", ["3", "1"]);
    expect(fieldsFor(reordered, "program", { includeArchived: true }).map((f) => f.id)).toEqual([
      "3", "1", "2", "4", "5", "6", "7", "8",
    ]);
    // Other record types are untouched.
    expect(reordered.find((f) => f.id === "9")).toBe(TEST_FIELDS.find((f) => f.id === "9"));
  });
});
