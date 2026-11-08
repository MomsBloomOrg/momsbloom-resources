/**
 * Admin: the Staff admins who can log in (/admin/staff-admins). Takes a `Db`, so PGlite tests can run it.
 * Server actions check the login; these functions check the rules.
 *
 * Two kinds: Owners are the addresses on `ADMIN_EMAILS` (only the developer changes them), and added
 * Staff admins are `staff_admins` rows with `added_at` set. A Staff admin with the `admin` role can add or
 * remove an added Staff admin and change their role. Nobody can remove an Owner or themselves, or change
 * an Owner's role or their own. Owners always have the `admin` role, so the Admin keeps an Admin while
 * `ADMIN_EMAILS` has an Owner.
 */
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { authVerificationTokens, staffAdmins } from "@/db/schema";
import type { Db } from "@/db/types";
import type { StaffRole } from "@/auth/config";
import { isStaffEmail, isValidEmail, normalizeEmail, staffAllowList } from "@/auth/rules";

type Env = Record<string, string | undefined>;

export type StaffAdminResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface StaffAdminListItem {
  email: string;
  kind: "owner" | "added";
  /** The row id of an added Staff admin (the Remove form sends it). Null for an Owner. */
  id: string | null;
  addedAt: Date | null;
  /** An Owner is always `admin`. */
  role: StaffRole;
}

const refuse = (error: string) => ({ ok: false, error }) as const;
const NOT_FOUND = refuse("This Staff admin does not exist. Reload the page.");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The longest address that mail servers accept (RFC 5321). */
const MAX_EMAIL_LENGTH = 254;
const BAD_ROLE = refuse("Choose a role: Admin or Editor.");

/** The form value as a role. A missing role is `editor` (least access); any other text is null. */
function parseRole(raw: unknown): StaffRole | null {
  if (raw === null || raw === undefined || raw === "") return "editor";
  return raw === "admin" || raw === "editor" ? raw : null;
}

/** Owners first (also the ones that have not logged in yet), then the added Staff admins; each by email. */
export async function listStaffAdmins(db: Db, env: Env = process.env): Promise<StaffAdminListItem[]> {
  const owners = [...staffAllowList(env)].sort();
  const added = await db
    .select({ id: staffAdmins.id, email: staffAdmins.email, addedAt: staffAdmins.addedAt, role: staffAdmins.role })
    .from(staffAdmins)
    .where(isNotNull(staffAdmins.addedAt))
    .orderBy(asc(staffAdmins.email));
  return [
    ...owners.map((email) => ({ email, kind: "owner" as const, id: null, addedAt: null, role: "admin" as const })),
    // An added address that is also on ADMIN_EMAILS shows once, as an Owner.
    ...added.filter((row) => !isStaffEmail(row.email, env)).map((row) => ({ ...row, kind: "added" as const, role: row.role === "admin" ? ("admin" as const) : ("editor" as const) })),
  ];
}

/**
 * Adds an address with a role (missing: `editor`). A row that an Owner's first login made (its address
 * has left `ADMIN_EMAILS`) becomes an added row with the chosen role. No email is sent: the person logs
 * in at /login.
 */
export async function addStaffAdmin(
  db: Db,
  rawEmail: unknown,
  rawRole: unknown,
  env: Env = process.env,
): Promise<StaffAdminResult<{ email: string }>> {
  const email = normalizeEmail(typeof rawEmail === "string" ? rawEmail : "");
  if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) return refuse("Enter a valid email address, for example name@example.org.");
  if (isStaffEmail(email, env)) return refuse(`${email} is an Owner. Owners can always log in.`);
  const role = parseRole(rawRole);
  if (!role) return BAD_ROLE;
  const [row] = await db
    .insert(staffAdmins)
    .values({ email, addedAt: sql`now()`, role })
    .onConflictDoUpdate({ target: staffAdmins.email, set: { addedAt: sql`now()`, role }, setWhere: isNull(staffAdmins.addedAt) })
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

/**
 * Changes the role of an added Staff admin. The next request uses the new role (it is read from the
 * database on each request).
 */
export async function setStaffAdminRole(
  db: Db,
  actorId: string,
  targetId: unknown,
  rawRole: unknown,
  env: Env = process.env,
): Promise<StaffAdminResult<{ email: string; role: StaffRole }>> {
  if (typeof targetId !== "string" || !UUID.test(targetId)) return NOT_FOUND;
  // No default here: a change must name the role.
  const role = rawRole === "admin" || rawRole === "editor" ? rawRole : null;
  if (!role) return BAD_ROLE;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: staffAdmins.id, email: staffAdmins.email })
      .from(staffAdmins)
      // Only added rows: a stale first-login row is not on the page.
      .where(and(eq(staffAdmins.id, targetId), isNotNull(staffAdmins.addedAt)))
      .for("update");
    if (!row) return NOT_FOUND;
    if (row.id === actorId) return refuse("You cannot change your own role. Ask another Staff admin.");
    if (isStaffEmail(row.email, env)) return refuse("You cannot change an Owner's role. Owners are always Admin.");
    await tx.update(staffAdmins).set({ role }).where(eq(staffAdmins.id, row.id));
    return { ok: true, value: { email: row.email, role } } as const;
  });
}
