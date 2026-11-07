"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import {
  GONE,
  createOrganization,
  getOrganizationForAdmin,
  markOrganizationVerified,
  parseId,
  parseOrganizationInput,
  updateOrganization,
} from "@/admin/organizations";
import { NOT_PLACED, geocodeOnSave } from "@/admin/geocode";
import { getDb } from "@/db";

export type OrganizationFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; lastVerified?: string; notice?: string }
  | { status: "invalid"; message: string; errors: Record<string, string> };

const invalid = (message: string, errors: Record<string, string> = {}): OrganizationFormState => ({
  status: "invalid",
  message,
  errors,
});

/**
 * Create or save an Organization. Hidden `id` is empty on the "new" page. `intent=verify` only sets
 * Last verified to today. A create redirects to the new page; an update shows "Saved".
 */
export async function saveOrganizationAction(_prev: OrganizationFormState, formData: FormData): Promise<OrganizationFormState> {
  await requireStaffAdmin();
  const db = getDb();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  if (formData.get("intent") === "verify") {
    if (id === null) return invalid(GONE);
    const result = await markOrganizationVerified(db, id);
    if (!result.ok) return invalid(result.error);
    directoryChanged();
    return { status: "saved", message: "Marked verified today.", lastVerified: result.value.lastVerified };
  }

  const parsed = parseOrganizationInput(Object.fromEntries(formData));
  if (!parsed.ok) return invalid(parsed.error, parsed.fieldErrors);

  const old = id === null ? null : ((await getOrganizationForAdmin(db, id))?.organization ?? null);
  const { input, failed } = await geocodeOnSave(parsed.value, old);

  if (id === null) {
    const created = await createOrganization(db, input);
    if (!created.ok) return invalid(created.error);
    directoryChanged();
    redirect(`/admin/organizations/${created.value.id}`);
  }
  const updated = await updateOrganization(db, id, input);
  if (!updated.ok) return invalid(updated.error);
  directoryChanged();
  return { status: "saved", message: "Saved.", notice: failed ? NOT_PLACED : undefined };
}
