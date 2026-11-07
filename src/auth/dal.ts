/**
 * Data Access Layer for auth. Every Admin page and every server action calls `requireStaffAdmin()`;
 * the proxy's cookie check and a hidden form are not checks.
 */
import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db";
import { findStaffAdmin } from "./config";
import { LOGIN_PATH, auth } from "./index";

export interface CurrentStaffAdmin {
  id: string;
  email: string;
}

/**
 * The logged-in Staff admin, or null. Reads the session and the row on every request, and checks the
 * allow-list again (Owners on `ADMIN_EMAILS`, plus Staff admins added in the Admin), so a removed
 * address is locked out on its next request.
 *
 * `connection()` first: `auth()` makes a CSRF token with `crypto.getRandomValues()` on every call,
 * which is an unstable value in a prerender, so the session read must wait for the request.
 */
export const getCurrentStaffAdmin = cache(async (): Promise<CurrentStaffAdmin | null> => {
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  return id ? findStaffAdmin(getDb(), id) : null;
});

/** The logged-in Staff admin; else a redirect to the login page. */
export async function requireStaffAdmin(): Promise<CurrentStaffAdmin> {
  const admin = await getCurrentStaffAdmin();
  if (!admin) redirect(LOGIN_PATH);
  return admin;
}
