"use server";

import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { addContact, parseContactInput, removeContact, updateContact } from "@/admin/contacts";
import { GONE, parseId } from "@/admin/organizations";
import { getDb } from "@/db";

export type ContactFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): ContactFormState => ({ status: "invalid", message, errors });

/**
 * One action for the Contact forms. Hidden `programId` is always set. Hidden `contactId` is empty on
 * the "Add contact" form. `intent=remove` deletes the Contact; any other intent adds or saves it.
 */
export async function saveContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  await requireStaffAdmin();
  const db = getDb();
  const programId = parseId(formData.get("programId"));
  const contactText = formData.get("contactId");
  const contactId = contactText ? parseId(contactText) : null;
  if (programId === null || (contactText && contactId === null)) return invalid(GONE);

  if (formData.get("intent") === "remove") {
    if (contactId === null) return invalid(GONE);
    const removed = await removeContact(db, programId, contactId);
    if (!removed.ok) return invalid(removed.error);
    directoryChanged();
    return { status: "saved", message: "Contact removed." };
  }

  const parsed = parseContactInput(Object.fromEntries(formData));
  if (!parsed.ok) return invalid(parsed.error, parsed.fieldErrors);
  const saved = contactId === null ? await addContact(db, programId, parsed.value) : await updateContact(db, programId, contactId, parsed.value);
  if (!saved.ok) return invalid(saved.error);
  directoryChanged();
  return { status: "saved", message: contactId === null ? "Contact added." : "Saved." };
}
