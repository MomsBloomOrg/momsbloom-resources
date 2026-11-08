"use server";

import { directoryChanged } from "@/admin/directory-changed";
import { DIRECTORY_HEADING_FIELDS, saveDirectoryHeadingContent, type DirectoryHeadingField } from "@/admin/directory-heading";
import { HELP_BOX_FIELDS, saveHelpBoxContent, type HelpBoxField } from "@/admin/help-box";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";

/** `values` is what the form sent, so the fields keep it: React resets a form after its action, even on an error. */
export type HelpBoxFormState =
  | { result: "idle" }
  | { result: "ok"; message: string; values: Record<HelpBoxField, string> }
  | { result: "error"; message: string; values: Record<HelpBoxField, string> };

/** On success, the Directory reloads (tag "directory"), so families see the new text at once. */
export async function saveHelpBoxAction(_prev: HelpBoxFormState, formData: FormData): Promise<HelpBoxFormState> {
  await requireAdmin();
  const values = Object.fromEntries(
    HELP_BOX_FIELDS.map((f) => [f, typeof formData.get(f) === "string" ? (formData.get(f) as string) : ""]),
  ) as Record<HelpBoxField, string>;
  const result = await saveHelpBoxContent(getDb(), formData);
  if (!result.ok) return { result: "error", message: result.error, values };
  directoryChanged();
  return { result: "ok", message: "Saved. The Directory shows the new help box now.", values };
}

export type DirectoryHeadingFormState =
  | { result: "idle" }
  | { result: "ok"; message: string; values: Record<DirectoryHeadingField, string> }
  | { result: "error"; message: string; values: Record<DirectoryHeadingField, string> };

/** On success, the Directory reloads (tag "directory"), so families see the new heading at once. */
export async function saveDirectoryHeadingAction(_prev: DirectoryHeadingFormState, formData: FormData): Promise<DirectoryHeadingFormState> {
  await requireAdmin();
  const values = Object.fromEntries(
    DIRECTORY_HEADING_FIELDS.map((f) => [f, typeof formData.get(f) === "string" ? (formData.get(f) as string) : ""]),
  ) as Record<DirectoryHeadingField, string>;
  const result = await saveDirectoryHeadingContent(getDb(), formData);
  if (!result.ok) return { result: "error", message: result.error, values };
  directoryChanged();
  return { result: "ok", message: "Saved. The Directory shows the new heading now.", values };
}
