/**
 * Custom field answers on a record's Admin form (Program, Organization). The inputs are named
 * `custom.<field id>`, and the form also sends `customFieldIds`: the fields it showed. Only those
 * fields change on save, so a form opened before a field was added (or restored) cannot blank it.
 */
import type { Db } from "@/db/types";
import { fieldsFor } from "./definitions";
import { getCustomValues, listDefinitions } from "./store";
import type { CustomFieldDefinition, CustomFieldEntity, CustomValues } from "./types";
import { parseCustomValues, type CustomFieldFormInput } from "./values";

/** The record types that have an Admin form today. Contacts and Documents get theirs later. */
export const ADMIN_ENTITIES = ["program", "organization"] as const satisfies readonly CustomFieldEntity[];
export type AdminEntity = (typeof ADMIN_ENTITIES)[number];

export const isAdminEntity = (value: unknown): value is AdminEntity => ADMIN_ENTITIES.includes(value as AdminEntity);

/** The form input name of one field. */
export const customInputName = (fieldId: string) => `custom.${fieldId}`;

/** The hidden input that lists the fields the form showed, separated by commas. */
export const CUSTOM_FIELD_IDS = "customFieldIds";

/** The active fields of one record type, in form order: what a record's form shows. */
export async function listActiveFields(db: Db, entity: AdminEntity): Promise<CustomFieldDefinition[]> {
  return fieldsFor(await listDefinitions(db), entity);
}

/** The custom field inputs of a submitted form, for the fields it showed. */
export function readCustomInput(data: FormData, fields: readonly CustomFieldDefinition[]): CustomFieldFormInput {
  return Object.fromEntries(
    fields.map((field) => {
      const name = customInputName(field.id);
      const value =
        field.type === "multiChoice"
          ? data.getAll(name).filter((v): v is string => typeof v === "string")
          : typeof data.get(name) === "string"
            ? (data.get(name) as string)
            : "";
      return [field.id, value];
    }),
  );
}

export type CustomFormResult =
  | { ok: true; /** The whole `custom` column to save; null: leave it as it is. */ values: CustomValues | null }
  | { ok: false; /** Keyed by input name (`custom.<id>`), like the other form errors. */ fieldErrors: Record<string, string> };

/**
 * Checks the custom field answers of a record's form and builds the `custom` column to save. Answers
 * of fields the form did not show (archived, added later, other record types) stay as they were.
 * `recordId` is null for a new record.
 */
export async function parseCustomForm(db: Db, entity: AdminEntity, data: FormData, recordId: number | null): Promise<CustomFormResult> {
  const shown = new Set(
    String(data.get(CUSTOM_FIELD_IDS) ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (shown.size === 0) return { ok: true, values: null };

  const definitions = await listDefinitions(db);
  // Only the shown fields that are still active: parseCustomValues leaves every other answer alone.
  const onForm = fieldsFor(definitions, entity).filter((field) => shown.has(field.id));
  if (onForm.length === 0) return { ok: true, values: null };

  const previous = recordId === null ? {} : ((await getCustomValues(db, entity, String(recordId))) ?? {});
  const result = parseCustomValues(onForm, entity, readCustomInput(data, onForm), previous);
  const errors = Object.entries(result.errors);
  if (errors.length > 0) {
    return { ok: false, fieldErrors: Object.fromEntries(errors.map(([id, message]) => [customInputName(id), message])) };
  }
  return { ok: true, values: result.values };
}
