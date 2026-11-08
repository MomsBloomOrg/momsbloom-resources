"use server";

import { revalidatePath } from "next/cache";
import { addStaffAdmin, removeStaffAdmin, type StaffAdminResult } from "@/admin/staff-admins";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";

export type StaffAdminFormState = { result: "idle" } | { result: "ok"; message: string } | { result: "error"; message: string };

const PATH = "/admin/staff-admins";

/** The Directory does not show Staff admins, so only this page reloads. */
function toState(result: StaffAdminResult<{ email: string }>, message: (email: string) => string): StaffAdminFormState {
  if (!result.ok) return { result: "error", message: result.error };
  revalidatePath(PATH);
  return { result: "ok", message: message(result.value.email) };
}

export async function addStaffAdminAction(_prev: StaffAdminFormState, formData: FormData): Promise<StaffAdminFormState> {
  await requireAdmin();
  const result = await addStaffAdmin(getDb(), formData.get("email"));
  return toState(result, (email) => `Added ${email}. They can now log in at /login.`);
}

export async function removeStaffAdminAction(_prev: StaffAdminFormState, formData: FormData): Promise<StaffAdminFormState> {
  const admin = await requireAdmin();
  const result = await removeStaffAdmin(getDb(), admin.id, formData.get("id"));
  return toState(result, (email) => `Removed ${email}. They are logged out and can no longer log in.`);
}
