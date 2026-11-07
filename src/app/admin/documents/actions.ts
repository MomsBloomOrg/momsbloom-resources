"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { parseDocumentInput, saveDocument } from "@/admin/documents";
import { GONE, parseId } from "@/admin/organizations";
import { getDb } from "@/db";

export type DocumentFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): DocumentFormState => ({ status: "invalid", message, errors });

/** Create or save a Document. Hidden `id` is empty on the "new" page. A create redirects to the new page; an update shows "Saved". */
export async function saveDocumentAction(_prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  await requireStaffAdmin();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  const parsed = parseDocumentInput(formData);
  if (!parsed.ok) return invalid(parsed.error, parsed.fieldErrors);
  const saved = await saveDocument(getDb(), id, parsed.value);
  if (!saved.ok) return invalid(saved.error, saved.fieldErrors);
  directoryChanged();
  if (id === null) redirect(`/admin/documents/${saved.value.id}`);
  return { status: "saved", message: "Saved." };
}
