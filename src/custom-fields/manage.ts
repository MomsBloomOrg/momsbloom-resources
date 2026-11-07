/**
 * The Admin "Custom fields" page: add, edit, move, archive, and restore fields. Takes a `Db`, so
 * PGlite tests can run it. Every input is untrusted form data; results never throw for bad input.
 */
import {
  archiveDefinition,
  createDefinition,
  fieldsFor,
  restoreDefinition,
  updateDefinition,
  type DefinitionErrors,
  type OptionInput,
} from "./definitions";
import { isAdminEntity, type AdminEntity } from "./form";
import { insertDefinition, listDefinitions, saveDefinition } from "./store";
import { CUSTOM_FIELD_TYPES, type CustomFieldDefinition, type CustomFieldType } from "./types";
import { count } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db } from "@/db/types";

export type ManageResult =
  | { ok: true; field: CustomFieldDefinition }
  | { ok: false; error: string; fieldErrors?: DefinitionErrors };

const NOT_FOUND = { ok: false, error: "This field does not exist. Reload the page." } as const;
const FIX = (fieldErrors: DefinitionErrors): ManageResult => ({ ok: false, error: "Fix the marked fields and try again.", fieldErrors });

const text = (data: FormData, name: string) => {
  const v = data.get(name);
  return typeof v === "string" ? v : "";
};
const checked = (data: FormData, name: string) => data.get(name) === "on";

/** Option names typed one per line. Blank lines are skipped. */
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

async function findField(db: Db, id: unknown): Promise<{ all: CustomFieldDefinition[]; field: CustomFieldDefinition } | null> {
  const all = await listDefinitions(db);
  const field = typeof id === "string" ? all.find((f) => f.id === id) : undefined;
  return field ? { all, field } : null;
}

/**
 * "Add a field": `entity`, `type`, `label`, `helpText`, `options` (one per line), and the
 * `showOnWebsite` and `filterable` checkboxes.
 */
export async function addField(db: Db, data: FormData): Promise<ManageResult> {
  const entity = data.get("entity");
  const type = data.get("type");
  if (!isAdminEntity(entity)) return { ok: false, error: "Unknown record type. Reload the page." };
  if (!CUSTOM_FIELD_TYPES.includes(type as CustomFieldType)) return FIX({ type: "Pick a field type." });

  const result = createDefinition(
    {
      entity,
      type: type as CustomFieldType,
      label: text(data, "label"),
      helpText: text(data, "helpText"),
      options: lines(text(data, "options")),
      showOnWebsite: checked(data, "showOnWebsite"),
      filterable: checked(data, "filterable"),
    },
    await listDefinitions(db),
  );
  if (!result.ok) return FIX(result.errors);
  return { ok: true, field: await insertDefinition(db, result.value) };
}

/**
 * "Edit field": `label`, `helpText`, the checkboxes, and for a list: one `optionKey` + `optionLabel`
 * pair per saved option (in order), `optionHidden` (the keys checked as hidden), and `newOptions`
 * (one per line). Type and record type never change, so they are not read.
 */
export async function editField(db: Db, id: unknown, data: FormData): Promise<ManageResult> {
  const found = await findField(db, id);
  if (!found) return NOT_FOUND;
  const { all, field } = found;

  let options: OptionInput[] | undefined;
  if (field.type === "choice" || field.type === "multiChoice") {
    const keys = data.getAll("optionKey").map(String);
    const labels = data.getAll("optionLabel").map(String);
    const hidden = new Set(data.getAll("optionHidden").map(String));
    options = [
      ...keys.map((key, i) => ({ key, label: labels[i] ?? "", hidden: hidden.has(key) })),
      ...lines(text(data, "newOptions")).map((label) => ({ label })),
    ];
  }

  const result = updateDefinition(
    field,
    {
      label: text(data, "label"),
      helpText: text(data, "helpText"),
      options,
      showOnWebsite: checked(data, "showOnWebsite"),
      filterable: checked(data, "filterable"),
    },
    all,
  );
  if (!result.ok) return FIX(result.errors);
  return { ok: true, field: await saveDefinition(db, result.value) };
}

/** Hides the field everywhere. Its answers stay on the records. */
export async function archiveField(db: Db, id: unknown): Promise<ManageResult> {
  const found = await findField(db, id);
  if (!found) return NOT_FOUND;
  return { ok: true, field: await saveDefinition(db, archiveDefinition(found.field)) };
}

/** Brings an archived field back, with its answers, unless an active field now has its name. */
export async function restoreField(db: Db, id: unknown): Promise<ManageResult> {
  const found = await findField(db, id);
  if (!found) return NOT_FOUND;
  const result = restoreDefinition(found.field, found.all);
  if (!result.ok) return { ok: false, error: result.errors.label ?? "This field can't be restored." };
  return { ok: true, field: await saveDefinition(db, result.value) };
}

/** Moves a field one place up or down among the active fields of its record type. */
export async function moveField(db: Db, id: unknown, direction: "up" | "down"): Promise<ManageResult> {
  const found = await findField(db, id);
  if (!found) return NOT_FOUND;
  const list = fieldsFor(found.all, found.field.entity);
  const from = list.findIndex((f) => f.id === found.field.id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= list.length) return { ok: true, field: found.field };
  [list[from], list[to]] = [list[to], list[from]];
  await db.transaction(async (tx) => {
    for (const [index, field] of list.entries()) {
      if (field.sortOrder !== index + 1) await saveDefinition(tx as unknown as Db, { ...field, sortOrder: index + 1 });
    }
  });
  return { ok: true, field: found.field };
}

/** How many records of this type there are: every one of them gets each field. */
export async function countRecords(db: Db, entity: AdminEntity): Promise<number> {
  const table = entity === "program" ? t.programs : t.organizations;
  const [row] = await db.select({ n: count() }).from(table);
  return row?.n ?? 0;
}

/** The fields of one record type for the Admin page: active ones in order, then archived ones. */
export async function listFieldsForAdmin(db: Db, entity: AdminEntity): Promise<{ active: CustomFieldDefinition[]; archived: CustomFieldDefinition[] }> {
  const all = fieldsFor(await listDefinitions(db), entity, { includeArchived: true });
  return { active: all.filter((f) => !f.archived), archived: all.filter((f) => f.archived) };
}
