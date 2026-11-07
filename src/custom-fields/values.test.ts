import { describe, expect, it } from "vitest";
import { formatCustomValue, onlyPublicValues, parseCustomValues, publicCustomValues } from "./values";
import { AGES, BILLING_EMAIL, DOULA, INTAKE_NOTES, PARKING, SIGN_UP, STARTED, TEST_FIELDS, WAITLIST } from "./test-fixtures";

describe("parseCustomValues", () => {
  it("turns the form's text into typed values; blank inputs are not stored", () => {
    const result = parseCustomValues(TEST_FIELDS, "program", {
      [DOULA.id]: "yes",
      [PARKING.id]: "1",
      [AGES.id]: ["3", "1"],
      [INTAKE_NOTES.id]: "  Call first.\r\nAsk for Dana.  ",
      [WAITLIST.id]: "1,200",
      [STARTED.id]: "2024-03-01",
      [SIGN_UP.id]: "example.org/signup",
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      [DOULA.id]: true,
      [PARKING.id]: "1",
      [AGES.id]: ["1", "3"], // in the list's order
      [INTAKE_NOTES.id]: "Call first.\nAsk for Dana.",
      [WAITLIST.id]: 1200,
      [STARTED.id]: "2024-03-01",
      [SIGN_UP.id]: "https://example.org/signup",
    });
  });

  it("blank removes a value: 'we don't know', never No", () => {
    const result = parseCustomValues(TEST_FIELDS, "program", { [DOULA.id]: "" }, { [DOULA.id]: false });
    expect(result.values).toEqual({});
  });

  it("keeps values of archived fields and of fields from other record types", () => {
    const previous = { "8": "kept while archived", [WAITLIST.id]: 3 };
    const result = parseCustomValues(TEST_FIELDS, "program", { [WAITLIST.id]: "4" }, previous);
    expect(result.values).toEqual({ "8": "kept while archived", [WAITLIST.id]: 4 });
  });

  it("explains each bad value next to its input", () => {
    const result = parseCustomValues(TEST_FIELDS, "program", {
      [DOULA.id]: "maybe",
      [PARKING.id]: "42",
      [WAITLIST.id]: "a few",
      [STARTED.id]: "2024-02-30",
      [SIGN_UP.id]: "javascript:alert(1)",
    });
    expect(result.errors).toEqual({
      [DOULA.id]: "Pick Yes, No, or leave it blank.",
      [PARKING.id]: "Pick from the list.",
      [WAITLIST.id]: "Enter a number, for example 12 or 4.5.",
      [STARTED.id]: "Enter a date.",
      [SIGN_UP.id]: "Enter a website address, for example https://example.org.",
    });
  });

  it("accepts a hidden option only on a record that already has it", () => {
    const hidden = { [PARKING.id]: "3" };
    expect(parseCustomValues(TEST_FIELDS, "program", hidden).errors).toEqual({ [PARKING.id]: "Pick from the list." });
    expect(parseCustomValues(TEST_FIELDS, "program", hidden, { [PARKING.id]: "3" }).errors).toEqual({});
  });

  it("checks phone and email fields", () => {
    expect(parseCustomValues(TEST_FIELDS, "organization", { [BILLING_EMAIL.id]: "billing@example" }).errors).toEqual({
      [BILLING_EMAIL.id]: "Enter an email address.",
    });
    expect(parseCustomValues(TEST_FIELDS, "organization", { [BILLING_EMAIL.id]: "billing@example.org" }).values).toEqual({
      [BILLING_EMAIL.id]: "billing@example.org",
    });
  });
});

describe("formatCustomValue", () => {
  it("formats each type for reading", () => {
    expect(formatCustomValue(DOULA, false)).toBe("No");
    expect(formatCustomValue(PARKING, "3")).toBe("Paid garage"); // hidden options still read correctly
    expect(formatCustomValue(AGES, ["1", "2"])).toBe("Pregnancy, Newborn");
    expect(formatCustomValue(WAITLIST, 1200)).toBe("1,200");
    expect(formatCustomValue(STARTED, "2026-10-01")).toBe("Oct 1, 2026");
  });

  it("shows nothing for a stored value of the wrong shape", () => {
    expect(formatCustomValue(DOULA, "yes")).toBeNull();
    expect(formatCustomValue(PARKING, "99")).toBeNull();
    expect(formatCustomValue(STARTED, "soon")).toBeNull();
  });
});

describe("public values", () => {
  const stored = {
    [DOULA.id]: true,
    [INTAKE_NOTES.id]: "Staff only",
    [AGES.id]: ["2"],
    "8": "archived",
  };

  it("lists only fields shown on the website, not archived, with a value, in form order", () => {
    expect(publicCustomValues(TEST_FIELDS, "program", stored)).toEqual([
      { fieldId: DOULA.id, label: "Doula on staff", type: "yesNo", text: "Yes" },
      { fieldId: AGES.id, label: "Ages served", type: "multiChoice", text: "Newborn" },
    ]);
  });

  it("strips private and archived values before they leave the server", () => {
    expect(onlyPublicValues(TEST_FIELDS, "program", stored)).toEqual({ [DOULA.id]: true, [AGES.id]: ["2"] });
  });
});
