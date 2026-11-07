"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { GONE, parseId } from "@/admin/organizations";
import { getProgramForAdmin, markProgramVerified, parseProgramInput, saveProgram } from "@/admin/programs";
import { NOT_PLACED, geocodeOnSave } from "@/admin/geocode";
import { getDb } from "@/db";

export type ProgramFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; lastVerified?: string; notice?: string }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): ProgramFormState => ({ status: "invalid", message, errors });

/**
 * Create or save a Program. Hidden `id` is empty on the "new" page. `intent=verify` only sets Last
 * verified to today. A create redirects to the new page; an update shows "Saved".
 */
export async function saveProgramAction(_prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  await requireStaffAdmin();
  const db = getDb();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  if (formData.get("intent") === "verify") {
    if (id === null) return invalid(GONE);
    const result = await markProgramVerified(db, id);
    if (!result.ok) return invalid(result.error);
    directoryChanged();
    return { status: "saved", message: "Marked verified today.", lastVerified: result.value.lastVerified };
  }

  const parsed = parseProgramInput(formData);
  if (!parsed.ok) return invalid(parsed.error, parsed.fieldErrors);
  const old = id === null ? null : ((await getProgramForAdmin(db, id))?.program ?? null);
  const { input, failed } = await geocodeOnSave(parsed.value, old);
  const saved = await saveProgram(db, id, input);
  if (!saved.ok) return invalid(saved.error, saved.fieldErrors);
  directoryChanged();
  if (id === null) redirect(`/admin/programs/${saved.value.id}`);
  return { status: "saved", message: "Saved.", notice: failed ? NOT_PLACED : undefined };
}
