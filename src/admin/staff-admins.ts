/**
 * Admin: the Staff admins who can log in (/admin/staff-admins). Takes a `Db`, so PGlite tests can run it.
 * Server actions check the login; these functions check the rules.
 *
 * Two kinds: Owners are the addresses on `ADMIN_EMAILS` (only the developer changes them), and added
 * Staff admins are `staff_admins` rows with `added_at` set. Any Staff admin can add or remove an added
 * Staff admin. Nobody can remove an Owner or themselves, so the Admin always keeps one Staff admin.
 */
import { asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { authVerificationTokens, staffAdmins } from "@/db/schema";
import type { Db } from "@/db/types";
import { isStaffEmail, isValidEmail, normalizeEmail, staffAllowList } from "@/auth/rules";

type Env = Record<string, string | undefined>;

export type StaffAdminResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface StaffAdminListItem {
  email: string;
  kind: "owner" | "added";
  /** The row id of an added Staff admin (the Remove form sends it). Null for an Owner. */
  id: string | null;
  addedAt: Date | null;
}

const refuse = (error: string) => ({ ok: false, error }) as const;
const NOT_FOUND = refuse("This Staff admin does not exist. Reload the page.");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The longest address that mail servers accept (RFC 5321). */
const MAX_EMAIL_LENGTH = 254;

/** Owners first (also the ones that have not logged in yet), then the added Staff admins; each by email. */
export async function listStaffAdmins(db: Db, env: Env = process.env): Promise<StaffAdminListItem[]> {
  const owners = [...staffAllowList(env)].sort();
  const added = await db
    .select({ id: staffAdmins.id, email: staffAdmins.email, addedAt: staffAdmins.addedAt })
    .from(staffAdmins)
    .where(isNotNull(staffAdmins.addedAt))
    .orderBy(asc(staffAdmins.email));
  return [
    ...owners.map((email) => ({ email, kind: "owner" as const, id: null, addedAt: null })),
    // An added address that is also on ADMIN_EMAILS shows once, as an Owner.
    ...added.filter((row) => !isStaffEmail(row.email, env)).map((row) => ({ ...row, kind: "added" as const })),
  ];
}

/**
 * Adds an address. A row that an Owner's first login made (its address has left `ADMIN_EMAILS`)
 * becomes an added row. No email is sent: the person logs in at /login.
 */
export async function addStaffAdmin(db: Db, rawEmail: unknown, env: Env = process.env): Promise<StaffAdminResult<{ email: string }>> {
  const email = normalizeEmail(typeof rawEmail === "string" ? rawEmail : "");
  if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) return refuse("Enter a valid email address, for example name@example.org.");
  if (isStaffEmail(email, env)) return refuse(`${email} is an Owner. Owners can always log in.`);
  const [row] = await db
    .insert(staffAdmins)
    .values({ email, addedAt: sql`now()` })
    .onConflictDoUpdate({ target: staffAdmins.email, set: { addedAt: sql`now()` }, setWhere: isNull(staffAdmins.addedAt) })
    .returning({ email: staffAdmins.email });
  if (!row) return refuse(`${email} is already a Staff admin.`);
  return { ok: true, value: row };
}

/**
 * Removes an added Staff admin in one transaction: their open Login links stop working, and their row
 * goes, so their sessions go too (cascade) and the next request sends them to /login.
 */
export async function removeStaffAdmin(
  db: Db,
  actorId: string,
  targetId: unknown,
  env: Env = process.env,
): Promise<StaffAdminResult<{ email: string }>> {
  if (typeof targetId !== "string" || !UUID.test(targetId)) return NOT_FOUND;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: staffAdmins.id, email: staffAdmins.email })
      .from(staffAdmins)
      .where(eq(staffAdmins.id, targetId))
      .for("update");
    if (!row) return NOT_FOUND;
    // Compare the database id, not the form text: Postgres matches a uuid in any letter case.
    if (row.id === actorId) return refuse("You cannot remove yourself. Ask another Staff admin.");
    if (isStaffEmail(row.email, env)) return refuse("You cannot remove an Owner. Owners are set by the developer.");
    await tx.delete(authVerificationTokens).where(eq(authVerificationTokens.identifier, row.email));
    await tx.delete(staffAdmins).where(eq(staffAdmins.id, row.id));
    return { ok: true, value: { email: row.email } } as const;
  });
}
