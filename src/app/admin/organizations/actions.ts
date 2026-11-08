"use server";

import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { directoryChanged } from "@/admin/directory-changed";
import { parseCustomForm } from "@/custom-fields/form";
import {
  FIX_FIELDS,
  GONE,
  createOrganization,
  getOrganizationForAdmin,
  markOrganizationVerified,
  parseId,
  parseOrganizationInput,
  stampVerifiedBy,
  verifiedByAfterSave,
  updateOrganization,
} from "@/admin/organizations";
import { NOT_PLACED, geocodeOnSave } from "@/admin/geocode";
import { getDb } from "@/db";

export type OrganizationFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; lastVerified?: string; lastVerifiedBy?: string | null; notice?: string; latitude?: number | null; longitude?: number | null }
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
  const admin = await requireStaffAdmin();
  const db = getDb();
  const idText = formData.get("id");
  const id = idText ? parseId(idText) : null;
  if (idText && id === null) return invalid(GONE);

  if (formData.get("intent") === "verify") {
    if (id === null) return invalid(GONE);
    const result = await markOrganizationVerified(db, id, admin.email);
    if (!result.ok) return invalid(result.error);
    directoryChanged();
    return { status: "saved", message: "Marked verified today.", lastVerified: result.value.lastVerified, lastVerifiedBy: admin.email };
  }

  // Both checks run, so one save shows every marked field.
  const parsed = parseOrganizationInput(Object.fromEntries(formData));
  const custom = await parseCustomForm(db, "organization", formData, id);
  if (!parsed.ok || !custom.ok) {
    return invalid(parsed.ok ? FIX_FIELDS : parsed.error, { ...(parsed.ok ? {} : parsed.fieldErrors), ...(custom.ok ? {} : custom.fieldErrors) });
  }
  const withCustom = custom.values === null ? parsed.value : { ...parsed.value, custom: custom.values };

  // geocodeOnSave passes every other field through, so the custom answers stay on the input.
  const old = id === null ? null : ((await getOrganizationForAdmin(db, id))?.organization ?? null);
  const { input, failed } = await geocodeOnSave(stampVerifiedBy(withCustom, old, admin.email), old);

  if (id === null) {
    const created = await createOrganization(db, input);
    if (!created.ok) return invalid(created.error);
    directoryChanged();
    redirect(`/admin/organizations/${created.value.id}`);
  }
  const lastVerifiedBy = verifiedByAfterSave(input, old);
  const updated = await updateOrganization(db, id, input);
  if (!updated.ok) return invalid(updated.error);
  directoryChanged();
  return { status: "saved", message: "Saved.", notice: failed ? NOT_PLACED : undefined, lastVerifiedBy, latitude: input.latitude, longitude: input.longitude };
}
