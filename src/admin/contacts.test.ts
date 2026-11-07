import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDirectoryTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { addContact, listContactsForAdmin, parseContactInput, removeContact, updateContact } from "./contacts";
import { insertSampleData, type SampleIds } from "./sample-data";

describe("Contacts of a Program", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ids: SampleIds;

  beforeAll(async () => {
    ({ db, close } = await createDirectoryTestDb());
    ids = await insertSampleData(db);
  });
  afterAll(() => close());

  const parse = (raw: Record<string, string>) => {
    const r = parseContactInput({ name: " Sam Example ", ...raw });
    if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
    return r.value;
  };

  it("parse trims, turns blanks into null, and reads the checkbox", () => {
    expect(parse({ title: "  ", showOnWebsite: "on" })).toMatchObject({ name: "Sam Example", title: null, showOnWebsite: true });
    expect(parse({}).showOnWebsite).toBe(false);
  });

  it("parse refuses a missing name, a bad email, and long text", () => {
    const r = parseContactInput({ name: " ", email: "not-an-email", phone: "5".repeat(51) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["email", "name", "phone"]);
  });

  it("adds, edits, lists, and removes a Contact", async () => {
    const program = ids.yogaProgram;
    const added = await addContact(db, program, parse({ email: "sam@example.org", internalNotes: "Made-up note." }));
    if (!added.ok) throw new Error(added.error);
    expect(await listContactsForAdmin(db, program)).toMatchObject([{ name: "Sam Example", showOnWebsite: false, internalNotes: "Made-up note." }]);

    const edited = await updateContact(db, program, added.value.id, parse({ name: "Sam E.", showOnWebsite: "on" }));
    expect(edited.ok).toBe(true);
    expect(await listContactsForAdmin(db, program)).toMatchObject([{ name: "Sam E.", showOnWebsite: true, email: null }]);

    expect((await removeContact(db, program, added.value.id)).ok).toBe(true);
    expect(await listContactsForAdmin(db, program)).toEqual([]);
  });

  it("refuses an unknown Program or Contact, and a Contact of another Program", async () => {
    expect((await addContact(db, 999999, parse({}))).ok).toBe(false);
    const added = await addContact(db, ids.yogaProgram, parse({}));
    if (!added.ok) throw new Error(added.error);
    const other = ids.yogaProgram + 1;
    expect((await updateContact(db, other, added.value.id, parse({ name: "Changed" }))).ok).toBe(false);
    expect((await removeContact(db, other, added.value.id)).ok).toBe(false);
    expect((await updateContact(db, ids.yogaProgram, 999999, parse({}))).ok).toBe(false);
    expect(await listContactsForAdmin(db, ids.yogaProgram)).toMatchObject([{ name: "Sam Example" }]);
  });
});
