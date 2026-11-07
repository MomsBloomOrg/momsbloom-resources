/**
 * The custom fields table and `custom` columns, on a fresh in-process Postgres (PGlite) with the real
 * migrations and made-up sample rows. No local database or Neon needed, so it also runs on CI.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { insertSampleData, type SampleIds } from "@/admin/sample-data";
import { createDirectoryTestDb } from "@/db/test-db";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import { archiveDefinition, createDefinition, updateDefinition } from "./definitions";
import { getCustomValues, insertDefinition, listDefinitions, saveDefinition, setCustomValues } from "./store";
import { parseCustomValues, publicCustomValues } from "./values";

describe("custom fields in the database", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;

  // A fresh database per test, so no test sees another's fields.
  beforeEach(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
  });
  afterEach(() => close());

  it("the migration adds the table and an empty `custom` column on every record", async () => {
    expect(await listDefinitions(db)).toEqual([]);
    expect(await getCustomValues(db, "program", String(ids.yogaProgram))).toEqual({});
    expect(await getCustomValues(db, "organization", String(ids.organizations.riverbend))).toEqual({});
  });

  it("adds, edits, and archives a field", async () => {
    const created = createDefinition(
      { entity: "program", type: "choice", label: "Parking", options: ["Free lot", "Street"], showOnWebsite: true, filterable: true },
      await listDefinitions(db),
    );
    if (!created.ok) throw new Error(JSON.stringify(created.errors));
    const parking = await insertDefinition(db, created.value);
    expect(parking.id).toMatch(/^\d+$/);
    expect(await listDefinitions(db)).toEqual([parking]);

    // Same name again: the rules see the saved field and refuse.
    expect(createDefinition({ entity: "program", type: "text", label: "parking" }, await listDefinitions(db)).ok).toBe(false);

    const edited = updateDefinition(
      parking,
      { options: [{ key: "1", label: "Free parking lot" }, { key: "2", label: "Street" }, { label: "Bus stop" }] },
      await listDefinitions(db),
    );
    if (!edited.ok) throw new Error(JSON.stringify(edited.errors));
    const saved = await saveDefinition(db, edited.value);
    expect(saved.options.map((o) => `${o.key}:${o.label}`)).toEqual(["1:Free parking lot", "2:Street", "3:Bus stop"]);

    const archived = await saveDefinition(db, archiveDefinition(saved));
    expect(archived.archived).toBe(true);
  });

  it("saves answers on one Program only, and reads them back", async () => {
    const programId = String(ids.yogaProgram);
    const doula = createDefinition({ entity: "program", type: "yesNo", label: "Doula on staff", showOnWebsite: true }, []);
    const notes = createDefinition({ entity: "program", type: "longText", label: "Intake notes" }, []);
    if (!doula.ok || !notes.ok) throw new Error("bad test fields");
    const fields = [await insertDefinition(db, doula.value), await insertDefinition(db, { ...notes.value, sortOrder: 2 })];

    const parsed = parseCustomValues(fields, "program", { [fields[0].id]: "yes", [fields[1].id]: "Call first." }, {});
    expect(parsed.errors).toEqual({});
    await setCustomValues(db, "program", programId, parsed.values);

    const stored = await getCustomValues(db, "program", programId);
    expect(stored).toEqual({ [fields[0].id]: true, [fields[1].id]: "Call first." });
    // Families see the Yes / No field, not the staff-only notes.
    expect(publicCustomValues(fields, "program", stored!)).toEqual([
      { fieldId: fields[0].id, label: "Doula on staff", type: "yesNo", text: "Yes" },
    ]);

    // Every other Program still has no answers.
    const others = await db.select({ id: t.programs.id, custom: t.programs.custom }).from(t.programs);
    expect(others.filter((p) => String(p.id) !== programId).every((p) => Object.keys(p.custom).length === 0)).toBe(true);
  });

  it("the database refuses a type that isn't on the list", async () => {
    await expect(db.insert(t.customFields).values({ entity: "program", type: "spreadsheet", label: "Bad" })).rejects.toThrow();
  });

  it("a record that doesn't exist is an error, not a silent no-op", async () => {
    await expect(setCustomValues(db, "program", "999999999", {})).rejects.toThrow("program 999999999 not found");
    expect(await getCustomValues(db, "program", "999999999")).toBeNull();
  });
});
