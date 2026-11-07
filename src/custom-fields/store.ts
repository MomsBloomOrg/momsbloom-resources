/**
 * Reading and writing custom fields in the database. The only code in this folder that knows the
 * tables. It does not check anything: callers run the rules in definitions.ts and values.ts first.
 *
 * Every function takes the database handle, so tests (and scripts) can pass their own, or a
 * transaction.
 */
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/types";
import * as t from "@/db/schema";
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldEntity,
  type CustomFieldType,
  type CustomValues,
  type NewCustomFieldDefinition,
} from "./types";

type Row = typeof t.customFields.$inferSelect;

/** The record table for each record type. Each has an integer `id` and a `custom` column. */
const RECORD_TABLES = {
  organization: t.organizations,
  program: t.programs,
  contact: t.contacts,
  document: t.documents,
} as const;

function toDefinition(row: Row): CustomFieldDefinition {
  // The database checks entity and type too; this keeps a bad row from crashing a page.
  if (!CUSTOM_FIELD_ENTITIES.includes(row.entity as CustomFieldEntity)) throw new Error(`custom_fields ${row.id}: bad entity`);
  if (!CUSTOM_FIELD_TYPES.includes(row.type as CustomFieldType)) throw new Error(`custom_fields ${row.id}: bad type`);
  return {
    id: String(row.id),
    entity: row.entity as CustomFieldEntity,
    label: row.label,
    helpText: row.helpText,
    type: row.type as CustomFieldType,
    options: row.options,
    sortOrder: row.sortOrder,
    showOnWebsite: row.showOnWebsite,
    filterable: row.filterable,
    archived: row.archivedAt !== null,
  };
}

/** Every definition, archived ones too (the rules need them), in form order. */
export async function listDefinitions(db: Db): Promise<CustomFieldDefinition[]> {
  const rows = await db.select().from(t.customFields).orderBy(asc(t.customFields.sortOrder), asc(t.customFields.id));
  return rows.map(toDefinition);
}

export async function insertDefinition(db: Db, field: NewCustomFieldDefinition): Promise<CustomFieldDefinition> {
  const [row] = await db
    .insert(t.customFields)
    .values({
      entity: field.entity,
      type: field.type,
      label: field.label,
      helpText: field.helpText,
      options: [...field.options],
      sortOrder: field.sortOrder,
      showOnWebsite: field.showOnWebsite,
      filterable: field.filterable,
      archivedAt: field.archived ? new Date().toISOString() : null,
    })
    .returning();
  return toDefinition(row);
}

/**
 * Saves an edited definition. Never writes entity or type: they don't change (definitions.ts). Keeps
 * the first archived_at when a field is archived again.
 */
export async function saveDefinition(db: Db, field: CustomFieldDefinition): Promise<CustomFieldDefinition> {
  const [current] = await db.select().from(t.customFields).where(eq(t.customFields.id, Number(field.id)));
  if (!current) throw new Error(`custom_fields ${field.id} not found`);
  const [row] = await db
    .update(t.customFields)
    .set({
      label: field.label,
      helpText: field.helpText,
      options: [...field.options],
      sortOrder: field.sortOrder,
      showOnWebsite: field.showOnWebsite,
      filterable: field.filterable,
      archivedAt: field.archived ? (current.archivedAt ?? new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(t.customFields.id, Number(field.id)))
    .returning();
  return toDefinition(row);
}

/** One record's `custom` column. Null when the record doesn't exist. */
export async function getCustomValues(db: Db, entity: CustomFieldEntity, id: string): Promise<CustomValues | null> {
  const table = RECORD_TABLES[entity];
  const [row] = await db.select({ custom: table.custom }).from(table).where(eq(table.id, Number(id)));
  return row ? row.custom : null;
}

/** Replaces one record's `custom` column. Pass the `values` from parseCustomValues. */
export async function setCustomValues(db: Db, entity: CustomFieldEntity, id: string, values: CustomValues): Promise<void> {
  const table = RECORD_TABLES[entity];
  const updated = await db
    .update(table)
    .set({ custom: { ...values }, updatedAt: new Date().toISOString() })
    .where(eq(table.id, Number(id)))
    .returning({ id: table.id });
  if (updated.length === 0) throw new Error(`${entity} ${id} not found`);
}
