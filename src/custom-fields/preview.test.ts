import { describe, expect, it } from "vitest";
import { previewFromForm } from "./preview";

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) for (const v of [value].flat()) data.append(name, v);
  return data;
};

describe("previewFromForm", () => {
  it("shows nothing for Staff only or no choice yet", () => {
    for (const visibility of [{ visibility: "staff" } as Record<string, string>, {} as Record<string, string>]) {
      const p = previewFromForm("program", "yesNo", form({ label: "Doula", filterable: "on", ...visibility }));
      expect(p).toMatchObject({ shown: null, filter: null });
    }
  });

  it("shows a Yes / No line and filter for a public Program filter", () => {
    const p = previewFromForm("program", "yesNo", form({ label: "Doula on staff", visibility: "public", filterable: "on" }));
    expect(p.shown).toMatchObject({ label: "Doula on staff", text: "Yes" });
    expect(p.filter?.values.map((v) => v.label)).toEqual(["Yes", "No"]);
  });

  it("gives an Organization field no filter group", () => {
    const p = previewFromForm("organization", "choice", form({ label: "Type", visibility: "public", filterable: "on", options: "A\nB" }));
    expect(p.shown?.text).toBe("A");
    expect(p.filter).toBeNull();
  });

  it("drops hidden options and adds new ones on the Edit form", () => {
    const p = previewFromForm(
      "program",
      "multiChoice",
      form({ visibility: "public", filterable: "on", optionKey: ["1", "2"], optionLabel: ["Covered", "Lot"], optionHidden: "1", newOptions: "Street" }),
    );
    expect(p.filter?.values.map((v) => v.label)).toEqual(["Lot", "Street"]);
    expect(p.shown?.text).toBe("Lot, Street");
  });

  it("uses a placeholder name, and shows no line for a list without options", () => {
    expect(previewFromForm("program", "text", form({ visibility: "public" })).shown?.label).toBe("Field name");
    expect(previewFromForm("program", "choice", form({ visibility: "public" })).shown).toBeNull();
    expect(previewFromForm("program", "choice", form({ visibility: "public" })).needsOptions).toBe(true);
  });
});
