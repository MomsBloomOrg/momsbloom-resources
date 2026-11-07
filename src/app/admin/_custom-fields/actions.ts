"use server";

import { directoryChanged } from "@/admin/directory-changed";
import { requireStaffAdmin } from "@/auth/dal";
import { addField, archiveField, editField, moveField, restoreField, type ManageResult } from "@/custom-fields/manage";
import { getDb } from "@/db";

export type FieldFormState =
  | { result: "idle" }
  | { result: "ok"; message: string }
  | { result: "error"; message: string; errors: Record<string, string> };

const UNKNOWN: FieldFormState = { result: "error", message: "Unknown action. Reload the page.", errors: {} };

/** On success, the Directory snapshot reloads (tag "directory"): field names and order show there. */
function toState(result: ManageResult, message: (label: string) => string): FieldFormState {
  if (!result.ok) return { result: "error", message: result.error, errors: { ...result.fieldErrors } };
  directoryChanged();
  return { result: "ok", message: message(result.field.label) };
}

export async function addFieldAction(_prev: FieldFormState, formData: FormData): Promise<FieldFormState> {
  await requireStaffAdmin();
  return toState(await addField(getDb(), formData), (label) => `Added "${label}".`);
}

/**
 * One action for every control of a field row, so the row shows one message: the last one.
 * `intent` is `edit`, `up`, `down`, `archive`, or `restore`.
 */
export async function fieldRowAction(_prev: FieldFormState, formData: FormData): Promise<FieldFormState> {
  await requireStaffAdmin();
  const db = getDb();
  const id = formData.get("id");
  switch (formData.get("intent")) {
    case "edit":
      return toState(await editField(db, id, formData), (label) => `Saved "${label}".`);
    case "up":
    case "down": {
      const direction = formData.get("intent") as "up" | "down";
      return toState(await moveField(db, id, direction), (label) => `Moved "${label}" ${direction}.`);
    }
    case "archive":
      return toState(await archiveField(db, id), (label) => `Archived "${label}". Its answers are kept.`);
    case "restore":
      return toState(await restoreField(db, id), (label) => `Restored "${label}".`);
    default:
      return UNKNOWN;
  }
}
