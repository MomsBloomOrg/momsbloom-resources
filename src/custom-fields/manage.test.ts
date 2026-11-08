/** The Admin "Custom fields" page logic, on a fresh PGlite database. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { addField, archiveField, editField, listFieldsForAdmin, moveField, restoreField } from "./manage";

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  return data;
};

describe("custom fields admin", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(() => close());

  const add = async (entries: Record<string, string>) => {
    const result = await addField(db, form(entries));
    if (!result.ok) throw new Error(JSON.stringify(result));
    return result.field;
  };

  it("adds a list field from the form: options one per line, checkboxes", async () => {
    const field = await add({ entity: "program", type: "choice", label: " Parking ", options: "Covered\n\nStandard Lot\n", showOnWebsite: "on", filterable: "on" });
    expect(field).toMatchObject({
      entity: "program",
      label: "Parking",
      showOnWebsite: true,
      filterable: true,
      options: [
        { key: "1", label: "Covered", hidden: false },
        { key: "2", label: "Standard Lot", hidden: false },
      ],
    });
  });

  it("refuses bad input with messages for the form", async () => {
    expect(await addField(db, form({ entity: "contact", type: "text", label: "X" }))).toMatchObject({ ok: false, error: "Unknown record type. Reload the page." });
    expect(await addField(db, form({ entity: "program", type: "spreadsheet", label: "X" }))).toMatchObject({ fieldErrors: { type: "Pick a field type." } });
    await add({ entity: "program", type: "text", label: "Parking" });
    expect(await addField(db, form({ entity: "program", type: "text", label: "parking" }))).toMatchObject({
      fieldErrors: { label: "Another field already has this name." },
    });
    expect(await addField(db, form({ entity: "organization", type: "yesNo", label: "Y", showOnWebsite: "on", filterable: "on" }))).toMatchObject({
      fieldErrors: { filterable: "Only Program fields can be filters." },
    });
  });

  it("edits: renames, hides an option, adds options; the type never changes", async () => {
    const field = await add({ entity: "program", type: "choice", label: "Parking", options: "Covered\nStandard Lot" });
    const result = await editField(
      db,
      field.id,
      form({ label: "Parking at the site", optionKey: ["1", "2"], optionLabel: ["Covered garage", "Standard Lot"], optionHidden: ["2"], newOptions: "Street", type: "text" }),
    );
    expect(result).toMatchObject({
      ok: true,
      field: {
        label: "Parking at the site",
        type: "choice",
        options: [
          { key: "1", label: "Covered garage", hidden: false },
          { key: "2", label: "Standard Lot", hidden: true },
          { key: "3", label: "Street", hidden: false },
        ],
      },
    });
  });

  it("moves up and down within one record type", async () => {
    const a = await add({ entity: "program", type: "text", label: "A" });
    const b = await add({ entity: "program", type: "text", label: "B" });
    const c = await add({ entity: "program", type: "text", label: "C" });
    await add({ entity: "organization", type: "text", label: "Org field" });
    await moveField(db, c.id, "up");
    expect((await listFieldsForAdmin(db, "program")).active.map((f) => f.label)).toEqual(["A", "C", "B"]);
    await moveField(db, a.id, "up"); // already first: no change
    await moveField(db, b.id, "down"); // already last: no change
    expect((await listFieldsForAdmin(db, "program")).active.map((f) => f.label)).toEqual(["A", "C", "B"]);
    expect((await listFieldsForAdmin(db, "organization")).active.map((f) => f.label)).toEqual(["Org field"]);
  });

  it("archives and restores; restore is refused when the name is taken", async () => {
    const field = await add({ entity: "program", type: "text", label: "Parking" });
    await archiveField(db, field.id);
    expect(await listFieldsForAdmin(db, "program")).toMatchObject({ active: [], archived: [{ label: "Parking" }] });

    const other = await add({ entity: "program", type: "text", label: "Parking" });
    expect(await restoreField(db, field.id)).toEqual({ ok: false, error: "Another field already has this name." });

    await archiveField(db, other.id);
    expect(await restoreField(db, field.id)).toMatchObject({ ok: true, field: { archived: false } });
  });

  it("an unknown id is a message, not a crash", async () => {
    for (const result of [await editField(db, "999", form({})), await archiveField(db, "999"), await restoreField(db, null), await moveField(db, "x", "up")]) {
      expect(result).toEqual({ ok: false, error: "This field does not exist. Reload the page." });
    }
  });
});
