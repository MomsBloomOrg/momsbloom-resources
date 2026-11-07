import { describe, expect, it } from "vitest";
import { formatText, supportTags, telHref, type LabelOf } from "./program-card";
import { facetValues } from "@/directory/test-fixtures";

const labelOf: LabelOf = (facet, key) => `${facet}:${key}`;

describe("formatText", () => {
  it("two or more formats read In person and virtual", () => {
    expect(formatText(["1", "2"], labelOf)).toBe("In person and virtual");
  });

  it("one format shows its own label", () => {
    expect(formatText(["2"], labelOf)).toBe("format:2");
  });

  it("no format shows nothing", () => {
    expect(formatText([], labelOf)).toBeNull();
  });
});

describe("supportTags", () => {
  it("shows each label once, keeping the first", () => {
    const labels: Record<string, string> = { "category-1": "Therapist", "subcategory-9": "Therapist", "subcategory-4": "Yoga" };
    const labelOf: LabelOf = (facet, key) => labels[`${facet}-${key}`] ?? key;
    expect(supportTags(facetValues({ category: ["1"], subcategory: ["9", "4"] }), labelOf)).toEqual([
      { id: "category-1", label: "Therapist" },
      { id: "subcategory-4", label: "Yoga" },
    ]);
  });
});

describe("telHref", () => {
  it("uses +1 for a displayed US number and drops its extension", () => {
    expect(telHref("(616) 555-0100 x12")).toBe("tel:+16165550100");
  });

  it("keeps an explicit international country code", () => {
    expect(telHref("+44 20 7946 0958")).toBe("tel:+442079460958");
  });

  it("does not turn a short service number into a US ten-digit number", () => {
    expect(telHref("211")).toBe("tel:211");
  });
});
