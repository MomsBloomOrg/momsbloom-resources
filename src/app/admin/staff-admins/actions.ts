"use server";

import { revalidatePath } from "next/cache";
import { addStaffAdmin, removeStaffAdmin, setStaffAdminRole, type StaffAdminResult } from "@/admin/staff-admins";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";

export type StaffAdminFormState = { result: "idle" } | { result: "ok"; message: string } | { result: "error"; message: string };

const PATH = "/admin/staff-admins";
const ROLE_NAME = { admin: "Admin", editor: "Editor" } as const;

/** The Directory does not show Staff admins, so only this page reloads. */
function toState<T extends { email: string }>(result: StaffAdminResult<T>, message: (value: T) => string): StaffAdminFormState {
  if (!result.ok) return { result: "error", message: result.error };
  revalidatePath(PATH);
  return { result: "ok", message: message(result.value) };
}

export async function addStaffAdminAction(_prev: StaffAdminFormState, formData: FormData): Promise<StaffAdminFormState> {
  await requireAdmin();
  const result = await addStaffAdmin(getDb(), formData.get("email"), formData.get("role"));
  return toState(result, ({ email }) => `Added ${email}. They can now log in at /login.`);
}

export async function removeStaffAdminAction(_prev: StaffAdminFormState, formData: FormData): Promise<StaffAdminFormState> {
  const admin = await requireAdmin();
  const result = await removeStaffAdmin(getDb(), admin.id, formData.get("id"));
  return toState(result, ({ email }) => `Removed ${email}. They are logged out and can no longer log in.`);
}

export async function setStaffAdminRoleAction(_prev: StaffAdminFormState, formData: FormData): Promise<StaffAdminFormState> {
  const admin = await requireAdmin();
  const result = await setStaffAdminRole(getDb(), admin.id, formData.get("id"), formData.get("role"));
  return toState(result, ({ email, role }) => `${email} is now an ${ROLE_NAME[role]}. The new role applies on their next page.`);
}
