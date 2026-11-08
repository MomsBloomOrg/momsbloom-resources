import { describe, expect, it } from "vitest";
import { previewFromForm, savedFieldData } from "./preview";
import { PARKING } from "./test-fixtures";

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) for (const v of [value].flat()) data.append(name, v);
  return data;
};

describe("previewFromForm", () => {
  it.each([
    ["Staff only", { visibility: "staff" }],
    ["no choice yet", {}],
  ])("shows nothing for %s", (_name, visibility: Record<string, string>) => {
    const p = previewFromForm("program", "yesNo", form({ label: "Doula", filterable: "on", ...visibility }));
    expect(p).toEqual({ shown: null, where: "detail", filter: null, needsOptions: false });
  });

  it("shows a Yes / No line and filter for a public Program filter", () => {
    const p = previewFromForm("program", "yesNo", form({ label: "Doula on staff", visibility: "public", filterable: "on" }));
    expect(p.shown).toMatchObject({ label: "Doula on staff", text: "Yes" });
    expect(p.filter?.values.map((v) => v.label)).toEqual(["Yes", "No"]);
  });

  it("shows the filter group for a public Document filter", () => {
    const p = previewFromForm("document", "yesNo", form({ label: "Printable worksheet", visibility: "public", filterable: "on" }));
    expect(p.where).toBe("card");
    expect(p.filter?.values.map((v) => v.label)).toEqual(["Yes", "No"]);
  });

  it("gives an Organization field no filter group", () => {
    const p = previewFromForm("organization", "choice", form({ label: "Type", visibility: "public", filterable: "on", options: "A\nB" }));
    expect(p.shown?.text).toBe("A");
    expect(p.filter).toBeNull();
  });

  it("says a Document answer shows on the card; the others on the detail page", () => {
    const data = form({ label: "Printable worksheet", visibility: "public" });
    expect(previewFromForm("document", "yesNo", data)).toMatchObject({ where: "card", shown: { label: "Printable worksheet", text: "Yes" } });
    expect(previewFromForm("program", "yesNo", data).where).toBe("detail");
    expect(previewFromForm("organization", "yesNo", data).where).toBe("detail");
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

  it("starts the Edit form from the saved field", () => {
    // PARKING is a public, filterable list with one hidden option ("Paid garage").
    const p = previewFromForm("program", PARKING.type, savedFieldData(PARKING));
    expect(p.filter?.values.map((v) => v.label)).toEqual(["Free lot", "Street"]);
    expect(p.shown).toMatchObject({ label: "Parking" });
  });
});
