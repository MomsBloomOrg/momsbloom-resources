"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { isValidEmail, normalizeEmail } from "@/auth/rules";

export type LoginState =
  | { result: "idle" }
  | { result: "sent"; email: string }
  | { result: "error"; message: string };

/**
 * Asks Auth.js for a Login link. Every valid address gets the same answer, also when Auth.js fails
 * (for example the database is down), so the page never shows who is a Staff admin. The email
 * itself goes out after the response (src/auth/index.ts).
 */
export async function requestMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) return { result: "error", message: "Enter a valid email address." };

  try {
    await signIn("resend", { email, redirect: false, redirectTo: "/admin" });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (error.type !== "AccessDenied") console.error("[auth] Login link request failed:", error.type);
  }
  return { result: "sent", email };
}
