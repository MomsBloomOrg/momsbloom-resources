"use server";

import { directoryChanged } from "@/admin/directory-changed";
import { saveHelpBoxContent } from "@/admin/help-box";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";

export type HelpBoxFormState = { result: "idle" } | { result: "ok"; message: string } | { result: "error"; message: string };

/** On success, the Directory reloads (tag "directory"), so families see the new text at once. */
export async function saveHelpBoxAction(_prev: HelpBoxFormState, formData: FormData): Promise<HelpBoxFormState> {
  await requireStaffAdmin();
  const result = await saveHelpBoxContent(getDb(), formData);
  if (!result.ok) return { result: "error", message: result.error };
  directoryChanged();
  return { result: "ok", message: "Saved. The Directory shows the new help box now." };
}
