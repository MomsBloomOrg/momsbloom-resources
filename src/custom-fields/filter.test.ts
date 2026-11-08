import { describe, expect, it } from "vitest";
import { cleanCustomFilters, countCustomFilterValues, customFilterGroups, matchesCustomFilters } from "./filter";
import { AGES, DOULA, PARKING, TEST_FIELDS, WORKSHEET } from "./test-fixtures";

const programs = [
  { name: "A", custom: { [DOULA.id]: true, [PARKING.id]: "1" } },
  { name: "B", custom: { [DOULA.id]: false, [PARKING.id]: "2" } },
  { name: "C", custom: { [PARKING.id]: "1" } }, // doula unknown
];

describe("customFilterGroups", () => {
  it("shows filterable Program fields, without hidden options", () => {
    expect(customFilterGroups(TEST_FIELDS)).toEqual([
      { fieldId: DOULA.id, entity: "program", label: "Doula on staff", values: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }] },
      { fieldId: PARKING.id, entity: "program", label: "Parking", values: [{ key: "1", label: "Free lot" }, { key: "2", label: "Street" }] },
    ]);
  });

  it("scopes groups to one record type, or shows both", () => {
    const all = [...TEST_FIELDS, WORKSHEET];
    expect(customFilterGroups(all, "document").map((g) => g.fieldId)).toEqual([WORKSHEET.id]);
    expect(customFilterGroups(all, "program").map((g) => g.fieldId)).toEqual([DOULA.id, PARKING.id]);
    expect(customFilterGroups(all).map((g) => g.fieldId)).toEqual([DOULA.id, PARKING.id, WORKSHEET.id]);
  });
});

describe("matchesCustomFilters", () => {
  const names = (filters: Record<string, string[]>) =>
    programs.filter((p) => matchesCustomFilters(TEST_FIELDS, "program", p.custom, filters)).map((p) => p.name);

  it("OR inside a field, AND between fields", () => {
    expect(names({ [PARKING.id]: ["1", "2"] })).toEqual(["A", "B", "C"]);
    expect(names({ [PARKING.id]: ["1"], [DOULA.id]: ["yes"] })).toEqual(["A"]);
  });

  it("a blank Yes / No matches neither Yes nor No", () => {
    expect(names({ [DOULA.id]: ["no"] })).toEqual(["B"]);
  });

  it("ignores filters of the other record type", () => {
    const all = [...TEST_FIELDS, WORKSHEET];
    expect(matchesCustomFilters(all, "program", {}, { [WORKSHEET.id]: ["yes"] })).toBe(true);
    expect(matchesCustomFilters(all, "document", {}, { [WORKSHEET.id]: ["yes"] })).toBe(false);
    expect(matchesCustomFilters(all, "document", {}, { [PARKING.id]: ["1"] })).toBe(true);
  });

  it("ignores filters on fields that are not filters", () => {
    expect(names({ [AGES.id]: ["1"] })).toEqual(["A", "B", "C"]);
  });
});

describe("cleanCustomFilters", () => {
  it("drops unknown fields, hidden options, and made-up values from an old link", () => {
    expect(
      cleanCustomFilters(TEST_FIELDS, { [PARKING.id]: ["1", "3", "zzz", "1"], [AGES.id]: ["1"], "404": ["yes"] }),
    ).toEqual({ [PARKING.id]: ["1"] });
  });

  it("keeps filters of both record types", () => {
    expect(cleanCustomFilters([...TEST_FIELDS, WORKSHEET], { [PARKING.id]: ["1"], [WORKSHEET.id]: ["yes"] })).toEqual({
      [PARKING.id]: ["1"],
      [WORKSHEET.id]: ["yes"],
    });
  });
});

describe("countCustomFilterValues", () => {
  it("counts each value with the OTHER fields' filters applied", () => {
    const counts = countCustomFilterValues(TEST_FIELDS, "program", programs, { [DOULA.id]: ["yes"], [PARKING.id]: ["1"] });
    // Doula counts use only the parking filter (Free lot): A and C. C has no doula value.
    expect(counts[DOULA.id]).toEqual({ yes: 1 });
    // Parking counts use only the doula filter (yes): A.
    expect(counts[PARKING.id]).toEqual({ "1": 1 });
  });
});
