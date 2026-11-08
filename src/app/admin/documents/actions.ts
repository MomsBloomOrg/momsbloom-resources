"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { getDocumentForAdmin, markDocumentVerified, parseDocumentInput, saveDocument } from "@/admin/documents";
import { FIX_FIELDS, GONE, parseId, stampVerifiedBy, verifiedByAfterSave } from "@/admin/organizations";
import { parseCustomForm } from "@/custom-fields/form";
import { getDb } from "@/db";

export type DocumentFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; lastVerified?: string; lastVerifiedBy?: string | null }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): DocumentFormState => ({ status: "invalid", message, errors });

/** Create or save a Document. Hidden `id` is empty on the "new" page. `intent=verify` only sets Last verified to today. A create redirects to the new page; an update shows "Saved". */
export async function saveDocumentAction(_prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const admin = await requireStaffAdmin();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  if (formData.get("intent") === "verify") {
    if (id === null) return invalid(GONE);
    const result = await markDocumentVerified(getDb(), id, admin.email);
    if (!result.ok) return invalid(result.error);
    directoryChanged();
    return { status: "saved", message: "Marked verified today.", lastVerified: result.value.lastVerified, lastVerifiedBy: admin.email };
  }

  const db = getDb();
  // Both checks run, so one save shows every marked field.
  const parsed = parseDocumentInput(formData);
  const custom = await parseCustomForm(db, "document", formData, id);
  if (!parsed.ok || !custom.ok) {
    return invalid(parsed.ok ? FIX_FIELDS : parsed.error, { ...(parsed.ok ? {} : parsed.fieldErrors), ...(custom.ok ? {} : custom.fieldErrors) });
  }
  const withCustom = custom.values === null ? parsed.value : { ...parsed.value, custom: custom.values };
  const old = id === null ? null : ((await getDocumentForAdmin(db, id))?.document ?? null);
  const input = stampVerifiedBy(withCustom, old, admin.email);
  const saved = await saveDocument(db, id, input);
  if (!saved.ok) return invalid(saved.error, saved.fieldErrors);
  directoryChanged();
  if (id === null) redirect(`/admin/documents/${saved.value.id}`);
  return { status: "saved", message: "Saved.", lastVerifiedBy: verifiedByAfterSave(input, old) };
}
