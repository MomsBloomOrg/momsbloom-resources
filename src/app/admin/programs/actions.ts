"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { FIX_FIELDS, GONE, parseId, stampVerifiedBy, verifiedByAfterSave } from "@/admin/organizations";
import { getProgramForAdmin, markProgramVerified, parseProgramInput, reorderFeaturedPrograms, saveProgram } from "@/admin/programs";
import { NOT_PLACED, geocodeOnSave } from "@/admin/geocode";
import { parseCustomForm } from "@/custom-fields/form";
import { getDb } from "@/db";

export type ProgramFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; lastVerified?: string; lastVerifiedBy?: string | null; notice?: string; latitude?: number | null; longitude?: number | null }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): ProgramFormState => ({ status: "invalid", message, errors });

/**
 * Create or save a Program. Hidden `id` is empty on the "new" page. `intent=verify` only sets Last
 * verified to today. A create redirects to the new page; an update shows "Saved".
 */
export async function saveProgramAction(_prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const admin = await requireStaffAdmin();
  const db = getDb();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  if (formData.get("intent") === "verify") {
    if (id === null) return invalid(GONE);
    const result = await markProgramVerified(db, id, admin.email);
    if (!result.ok) return invalid(result.error);
    directoryChanged();
    return { status: "saved", message: "Marked verified today.", lastVerified: result.value.lastVerified, lastVerifiedBy: admin.email };
  }

  // Both checks run, so one save shows every marked field.
  const parsed = parseProgramInput(formData);
  const custom = await parseCustomForm(db, "program", formData, id);
  if (!parsed.ok || !custom.ok) {
    return invalid(parsed.ok ? FIX_FIELDS : parsed.error, { ...(parsed.ok ? {} : parsed.fieldErrors), ...(custom.ok ? {} : custom.fieldErrors) });
  }
  const withCustom = custom.values === null ? parsed.value : { ...parsed.value, custom: custom.values };
  // geocodeOnSave passes every other field through, so the custom answers stay on the input.
  const old = id === null ? null : ((await getProgramForAdmin(db, id))?.program ?? null);
  const { input, failed } = await geocodeOnSave(stampVerifiedBy(withCustom, old, admin.email), old);
  const lastVerifiedBy = verifiedByAfterSave(input, old);
  const saved = await saveProgram(db, id, input);
  if (!saved.ok) return invalid(saved.error, saved.fieldErrors);
  directoryChanged();
  if (id === null) redirect(`/admin/programs/${saved.value.id}`);
  return { status: "saved", message: "Saved.", notice: failed ? NOT_PLACED : undefined, lastVerifiedBy, latitude: input.latitude, longitude: input.longitude };
}

export type ReorderFeaturedState = { result: "idle" } | { result: "ok" | "error"; message: string };

/** A drag and drop on the Admin home: the new order of the featured Programs. Editors may too (it is a Program field). */
export async function reorderFeaturedProgramsAction(ids: unknown): Promise<ReorderFeaturedState> {
  await requireStaffAdmin();
  const result = await reorderFeaturedPrograms(getDb(), ids);
  if (!result.ok) return { result: "error", message: result.error };
  directoryChanged();
  return { result: "ok", message: "Saved the new order." };
}
