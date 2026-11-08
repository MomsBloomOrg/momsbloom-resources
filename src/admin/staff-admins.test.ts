import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authSessions, authVerificationTokens, staffAdmins } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { addStaffAdmin, listStaffAdmins, removeStaffAdmin, setStaffAdminRole } from "./staff-admins";

const ENV = { ADMIN_EMAILS: "owner@example.org, second-owner@example.org" };

describe("Staff admins", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(() => close());
  beforeEach(async () => {
    await db.delete(authVerificationTokens);
    await db.delete(staffAdmins);
  });

  const rowOf = async (email: string) => (await db.select().from(staffAdmins).where(eq(staffAdmins.email, email)))[0];
  const ownerRow = async () => (await db.insert(staffAdmins).values({ email: "owner@example.org" }).returning())[0];

  it("lists the Owners (with and without a row) first, then the added Staff admins", async () => {
    await ownerRow();
    await addStaffAdmin(db, "zed@example.org", undefined, ENV);
    await addStaffAdmin(db, "amy@example.org", undefined, ENV);
    // A first-login row that is not an Owner any more and was never added: not on the list.
    await db.insert(staffAdmins).values({ email: "gone@example.org" });

    const list = await listStaffAdmins(db, ENV);
    expect(list.map((s) => [s.email, s.kind])).toEqual([
      ["owner@example.org", "owner"],
      ["second-owner@example.org", "owner"],
      ["amy@example.org", "added"],
      ["zed@example.org", "added"],
    ]);
    expect(list[0]).toMatchObject({ id: null, addedAt: null });
    expect(list[2].id).toBe((await rowOf("amy@example.org")).id);
    expect(list[2].addedAt).toBeInstanceOf(Date);
  });

  it("adds a normalized address (case, NFKC, spaces)", async () => {
    expect(await addStaffAdmin(db, "  New＠Example.ORG ", undefined, ENV)).toEqual({ ok: true, value: { email: "new@example.org" } });
    expect((await rowOf("new@example.org")).addedAt).toBeInstanceOf(Date);
  });

  it("refuses an invalid email, an Owner, and a duplicate", async () => {
    for (const bad of ["not-an-email", "", null, "a@b", `${"a".repeat(250)}@example.org`]) {
      expect(await addStaffAdmin(db, bad, undefined, ENV)).toEqual({ ok: false, error: "Enter a valid email address, for example name@example.org." });
    }
    expect(await addStaffAdmin(db, "Owner@example.org", undefined, ENV)).toEqual({
      ok: false,
      error: "owner@example.org is an Owner. Owners can always log in.",
    });
    await addStaffAdmin(db, "dup@example.org", undefined, ENV);
    expect(await addStaffAdmin(db, "DUP@example.org", undefined, ENV)).toEqual({ ok: false, error: "dup@example.org is already a Staff admin." });
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(staffAdmins);
    expect(n).toBe(1);
  });

  it("turns a stale first-login row into an added row and keeps its id", async () => {
    const [stale] = await db.insert(staffAdmins).values({ email: "former-owner@example.org" }).returning();
    expect(await addStaffAdmin(db, "former-owner@example.org", undefined, ENV)).toMatchObject({ ok: true });
    const row = await rowOf("former-owner@example.org");
    expect(row.id).toBe(stale.id);
    expect(row.addedAt).toBeInstanceOf(Date);
  });

  it("refuses to remove yourself, an Owner, an unknown id, or a bad id", async () => {
    const owner = await ownerRow();
    await addStaffAdmin(db, "added@example.org", undefined, ENV);
    const added = await rowOf("added@example.org");

    expect(await removeStaffAdmin(db, added.id, added.id, ENV)).toEqual({ ok: false, error: "You cannot remove yourself. Ask another Staff admin." });
    // The same id in capitals is still you (Postgres matches a uuid in any letter case).
    expect(await removeStaffAdmin(db, added.id, added.id.toUpperCase(), ENV)).toEqual({
      ok: false,
      error: "You cannot remove yourself. Ask another Staff admin.",
    });
    expect(await removeStaffAdmin(db, added.id, owner.id, ENV)).toEqual({
      ok: false,
      error: "You cannot remove an Owner. Owners are set by the developer.",
    });
    const notFound = { ok: false, error: "This Staff admin does not exist. Reload the page." };
    expect(await removeStaffAdmin(db, owner.id, "00000000-0000-4000-8000-000000000000", ENV)).toEqual(notFound);
    expect(await removeStaffAdmin(db, owner.id, "1; drop table", ENV)).toEqual(notFound);
    expect(await removeStaffAdmin(db, owner.id, null, ENV)).toEqual(notFound);
    expect(await db.select().from(staffAdmins)).toHaveLength(2);
  });

  it("remove deletes the row, its sessions, and its open Login links; other rows stay", async () => {
    const owner = await ownerRow();
    await addStaffAdmin(db, "added@example.org", undefined, ENV);
    const added = await rowOf("added@example.org");
    const expires = new Date(Date.now() + 86_400_000);
    await db.insert(authSessions).values([
      { sessionToken: "s-added", userId: added.id, expires },
      { sessionToken: "s-owner", userId: owner.id, expires },
    ]);
    await db.insert(authVerificationTokens).values([
      { identifier: "added@example.org", token: "t-added", expires },
      { identifier: "owner@example.org", token: "t-owner", expires },
    ]);

    expect(await removeStaffAdmin(db, owner.id, added.id, ENV)).toEqual({ ok: true, value: { email: "added@example.org" } });
    expect(await rowOf("added@example.org")).toBeUndefined();
    expect((await db.select().from(authSessions)).map((s) => s.sessionToken)).toEqual(["s-owner"]);
    expect((await db.select().from(authVerificationTokens)).map((t) => t.token)).toEqual(["t-owner"]);
  });

  it("adds with the chosen role; a missing role is editor; a bad role is refused", async () => {
    await addStaffAdmin(db, "boss@example.org", "admin", ENV);
    await addStaffAdmin(db, "helper@example.org", undefined, ENV);
    expect((await rowOf("boss@example.org")).role).toBe("admin");
    expect((await rowOf("helper@example.org")).role).toBe("editor");
    expect(await addStaffAdmin(db, "x@example.org", "owner", ENV)).toEqual({ ok: false, error: "Choose a role: Admin or Editor." });
    expect(await rowOf("x@example.org")).toBeUndefined();
    const list = await listStaffAdmins(db, ENV);
    expect(list.map((s) => [s.email, s.role])).toEqual([
      ["owner@example.org", "admin"],
      ["second-owner@example.org", "admin"],
      ["boss@example.org", "admin"],
      ["helper@example.org", "editor"],
    ]);
  });

  it("re-adding a stale first-login row sets the chosen role (the column default is admin)", async () => {
    await db.insert(staffAdmins).values({ email: "former-owner@example.org" });
    expect((await rowOf("former-owner@example.org")).role).toBe("admin");
    await addStaffAdmin(db, "former-owner@example.org", "editor", ENV);
    expect((await rowOf("former-owner@example.org")).role).toBe("editor");
  });

  it("changes the role of an added Staff admin", async () => {
    const owner = await ownerRow();
    await addStaffAdmin(db, "added@example.org", "editor", ENV);
    const added = await rowOf("added@example.org");
    expect(await setStaffAdminRole(db, owner.id, added.id, "admin", ENV)).toEqual({ ok: true, value: { email: "added@example.org", role: "admin" } });
    expect((await rowOf("added@example.org")).role).toBe("admin");
    await setStaffAdminRole(db, owner.id, added.id, "editor", ENV);
    expect((await rowOf("added@example.org")).role).toBe("editor");
  });

  it("refuses to change your own role, an Owner's role, an unknown id, or a bad role", async () => {
    const owner = await ownerRow();
    await addStaffAdmin(db, "added@example.org", "admin", ENV);
    const added = await rowOf("added@example.org");

    expect(await setStaffAdminRole(db, added.id, added.id.toUpperCase(), "editor", ENV)).toEqual({
      ok: false,
      error: "You cannot change your own role. Ask another Staff admin.",
    });
    expect(await setStaffAdminRole(db, added.id, owner.id, "editor", ENV)).toEqual({
      ok: false,
      error: "You cannot change an Owner's role. Owners are always Admin.",
    });
    expect(await setStaffAdminRole(db, owner.id, "00000000-0000-4000-8000-000000000000", "editor", ENV)).toEqual({
      ok: false,
      error: "This Staff admin does not exist. Reload the page.",
    });
    for (const bad of ["owner", "", null]) {
      expect(await setStaffAdminRole(db, owner.id, added.id, bad, ENV)).toEqual({ ok: false, error: "Choose a role: Admin or Editor." });
    }
    expect((await rowOf("added@example.org")).role).toBe("admin");
    expect((await rowOf("owner@example.org")).role).toBe("admin");
  });

  it("refuses to change a stale first-login row (not an added Staff admin)", async () => {
    const owner = await ownerRow();
    const [stale] = await db.insert(staffAdmins).values({ email: "former-owner@example.org" }).returning();
    expect(await setStaffAdminRole(db, owner.id, stale.id, "editor", ENV)).toEqual({
      ok: false,
      error: "This Staff admin does not exist. Reload the page.",
    });
    expect((await rowOf("former-owner@example.org")).role).toBe("admin");
  });
});
