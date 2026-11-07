import { describe, expect, it } from "vitest";
import { formatText, type LabelOf } from "./program-card";

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
