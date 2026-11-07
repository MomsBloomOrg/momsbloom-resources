"use server";

import { updateTag } from "next/cache";
import {
  addFacetValue,
  deleteFacetValue,
  isFacetKey,
  moveFacetValue,
  renameFacetValue,
  setFacetValueHidden,
  type FacetResult,
} from "@/admin/facets";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";

export type FacetFormState = { result: "idle" } | { result: "ok"; message: string } | { result: "error"; message: string };

const UNKNOWN: FacetFormState = { result: "error", message: "Unknown action. Reload the page." };

/** On success, the Directory snapshot reloads (tag "directory"), so families see the change at once. */
function toState<T>(result: FacetResult<T>, message: (value: T) => string): FacetFormState {
  if (!result.ok) return { result: "error", message: result.error };
  updateTag("directory");
  return { result: "ok", message: message(result.value) };
}

export async function addFacetValueAction(_prev: FacetFormState, formData: FormData): Promise<FacetFormState> {
  await requireStaffAdmin();
  const key = formData.get("facet");
  if (!isFacetKey(key)) return UNKNOWN;
  const result = await addFacetValue(getDb(), { key, name: formData.get("name"), categoryId: formData.get("categoryId") });
  return toState(result, (value) => `Added "${value.name}".`);
}

/**
 * One action for every control of a value row, so the row shows one message: the last one.
 * `intent` is `rename`, `up`, `down`, `hide`, `show`, or `delete`.
 */
export async function facetValueRowAction(_prev: FacetFormState, formData: FormData): Promise<FacetFormState> {
  await requireStaffAdmin();
  const key = formData.get("facet");
  if (!isFacetKey(key)) return UNKNOWN;
  const db = getDb();
  const id = formData.get("id");

  switch (formData.get("intent")) {
    case "rename":
      return toState(await renameFacetValue(db, { key, id, name: formData.get("name") }), (v) => `Renamed to "${v.name}".`);
    case "up":
    case "down": {
      const direction = formData.get("intent") as "up" | "down";
      return toState(await moveFacetValue(db, { key, id, direction }), (v) => `Moved "${v.name}" ${direction}.`);
    }
    case "hide":
      return toState(await setFacetValueHidden(db, { key, id, hidden: true }), (v) => `"${v.name}" is hidden from families.`);
    case "show":
      return toState(await setFacetValueHidden(db, { key, id, hidden: false }), (v) => `"${v.name}" shows to families again.`);
    case "delete":
      return toState(await deleteFacetValue(db, { key, id }), (v) => `Deleted "${v.name}".`);
    default:
      return UNKNOWN;
  }
}
