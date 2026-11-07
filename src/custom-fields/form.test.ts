/** Custom field answers on a record's Admin form, on a fresh PGlite database with sample rows. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProgramForAdmin, saveProgram } from "@/admin/programs";
import { insertSampleData, type SampleIds } from "@/admin/sample-data";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { createDefinition } from "./definitions";
import { CUSTOM_FIELD_IDS, customInputName, listActiveFields, parseCustomForm, readCustomInput } from "./form";
import { archiveField } from "./manage";
import { getCustomValues, insertDefinition, setCustomValues } from "./store";
import type { CustomFieldDefinition, NewCustomFieldDefinition } from "./types";

function definition(input: Parameters<typeof createDefinition>[0]): NewCustomFieldDefinition {
  const result = createDefinition(input, []);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

/** A submitted form: `fields` are the custom inputs by field id; `shown` the ids the form showed. */
function form(shown: CustomFieldDefinition[], fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  data.set(CUSTOM_FIELD_IDS, shown.map((f) => f.id).join(","));
  for (const [id, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(customInputName(id), v);
  }
  return data;
}

describe("readCustomInput", () => {
  it("reads one value per field; a list of checkboxes as an array", () => {
    const fields = [
      { id: "1", type: "yesNo" },
      { id: "2", type: "multiChoice" },
      { id: "3", type: "text" },
    ] as CustomFieldDefinition[];
    const data = new FormData();
    data.set("custom.1", "yes");
    data.append("custom.2", "1");
    data.append("custom.2", "3");
    expect(readCustomInput(data, fields)).toEqual({ "1": "yes", "2": ["1", "3"], "3": "" });
  });
});

describe("parseCustomForm", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;
  let parking: CustomFieldDefinition;
  let doula: CustomFieldDefinition;

  beforeEach(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
    parking = await insertDefinition(db, definition({ entity: "program", type: "choice", label: "Parking", options: ["Covered", "Standard Lot"] }));
    doula = await insertDefinition(db, { ...definition({ entity: "program", type: "yesNo", label: "Doula on staff" }), sortOrder: 2 });
  });
  afterEach(() => close());

  it("builds the custom column from the answers", async () => {
    const result = await parseCustomForm(db, "program", form([parking, doula], { [parking.id]: "1", [doula.id]: "no" }), ids.yogaProgram);
    expect(result).toEqual({ ok: true, values: { [parking.id]: "1", [doula.id]: false } });
  });

  it("errors are keyed by input name, like the other form errors", async () => {
    const result = await parseCustomForm(db, "program", form([parking], { [parking.id]: "99" }), ids.yogaProgram);
    expect(result).toEqual({ ok: false, fieldErrors: { [customInputName(parking.id)]: "Pick from the list." } });
  });

  it("a form without custom fields leaves the column alone", async () => {
    expect(await parseCustomForm(db, "program", new FormData(), ids.yogaProgram)).toEqual({ ok: true, values: null });
  });

  it("only the fields the form showed change: an older form can't blank a newer field", async () => {
    await setCustomValues(db, "program", String(ids.yogaProgram), { [doula.id]: true });
    // This form was opened before "Doula on staff" existed, so it shows only Parking.
    const result = await parseCustomForm(db, "program", form([parking], { [parking.id]: "2" }), ids.yogaProgram);
    expect(result).toEqual({ ok: true, values: { [parking.id]: "2", [doula.id]: true } });
  });

  it("answers of archived fields are kept", async () => {
    await setCustomValues(db, "program", String(ids.yogaProgram), { [doula.id]: true });
    await archiveField(db, doula.id);
    const shown = await listActiveFields(db, "program");
    expect(shown.map((f) => f.id)).toEqual([parking.id]);
    const result = await parseCustomForm(db, "program", form(shown, { [parking.id]: "" }), ids.yogaProgram);
    expect(result).toEqual({ ok: true, values: { [doula.id]: true } });
  });

  it("saves with the Program, in the same write, and only on that Program", async () => {
    const detail = await getProgramForAdmin(db, ids.yogaProgram);
    const custom = await parseCustomForm(db, "program", form([parking], { [parking.id]: "1" }), ids.yogaProgram);
    if (!custom.ok || !custom.values) throw new Error("expected values");
    const { id, updatedAt, ...input } = detail!.program;
    void updatedAt;
    expect((await saveProgram(db, id, { ...input, custom: custom.values })).ok).toBe(true);

    expect(await getCustomValues(db, "program", String(ids.yogaProgram))).toEqual({ [parking.id]: "1" });
    expect((await getProgramForAdmin(db, ids.yogaProgram))!.program.custom).toEqual({ [parking.id]: "1" });
  });
});
