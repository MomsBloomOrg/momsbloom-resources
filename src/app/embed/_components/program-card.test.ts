import { describe, expect, it } from "vitest";
import { formatText, supportTags, type LabelOf } from "./program-card";
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
