/** Admin: the Contacts of one Program. Takes a `Db`, so PGlite tests can run it. Results never throw for bad input. */
import { and, eq } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";
import { FIX_FIELDS, GONE, parseTextFields, str, type AdminResult, type Raw } from "./organizations";
import { checkPhone } from "./phone";

export interface ContactInput {
  name: string;
  title: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  /** Only Contacts with this set reach the Embed. */
  showOnWebsite: boolean;
  internalNotes: string | null;
}

export interface ContactRow extends ContactInput {
  id: number;
}

const TEXT_FIELDS = [
  ["title", "Title", 200],
  ["specialty", "Specialty", 200],
  ["phone", "Phone", 50],
  ["internalNotes", "Internal notes", 5000],
] as const;

/** Trims and checks the form values of a Contact. "Show on website" is a checkbox: present means yes. */
export function parseContactInput(raw: Raw): AdminResult<ContactInput> {
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};

  out.name = str(raw, "name");
  if (!out.name) errors.name = "Enter a name.";
  else if ((out.name as string).length > 200) errors.name = "Use 200 characters or fewer.";

  parseTextFields(raw, TEXT_FIELDS, errors, out);
  checkPhone(raw.phone, errors, out);

  const email = str(raw, "email");
  out.email = email || null;
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = "Enter a valid email address.";

  out.showOnWebsite = raw.showOnWebsite === "on";

  if (Object.keys(errors).length > 0) return { ok: false, error: FIX_FIELDS, fieldErrors: errors };
  return { ok: true, value: out as unknown as ContactInput };
}

/** Every Contact of a Program, Internal notes too. Admin only. */
export async function listContactsForAdmin(db: Db, programId: number): Promise<ContactRow[]> {
  const c = t.contacts;
  return db
    .select({
      id: c.id,
      name: c.name,
      title: c.title,
      specialty: c.specialty,
      phone: c.phone,
      email: c.email,
      showOnWebsite: c.showOnWebsite,
      internalNotes: c.internalNotes,
    })
    .from(c)
    .where(eq(c.programId, programId))
    .orderBy(c.name, c.id);
}

export async function addContact(db: Db, programId: number, input: ContactInput): Promise<AdminResult<{ id: number }>> {
  const [program] = await db.select({ id: t.programs.id }).from(t.programs).where(eq(t.programs.id, programId));
  if (!program) return { ok: false, error: GONE };
  const [row] = await db.insert(t.contacts).values({ ...input, programId }).returning({ id: t.contacts.id });
  return { ok: true, value: row };
}

/** The Contact must belong to the Program in the page URL, so a forged ID cannot edit another Program's Contact. */
export async function updateContact(db: Db, programId: number, id: number, input: ContactInput): Promise<AdminResult<{ id: number }>> {
  const rows = await db
    .update(t.contacts)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(t.contacts.id, id), eq(t.contacts.programId, programId)))
    .returning({ id: t.contacts.id });
  return rows.length ? { ok: true, value: rows[0] } : { ok: false, error: GONE };
}

/** Hard delete: the spec allows it for Contacts. */
export async function removeContact(db: Db, programId: number, id: number): Promise<AdminResult<{ id: number }>> {
  const rows = await db
    .delete(t.contacts)
    .where(and(eq(t.contacts.id, id), eq(t.contacts.programId, programId)))
    .returning({ id: t.contacts.id });
  return rows.length ? { ok: true, value: rows[0] } : { ok: false, error: GONE };
}
