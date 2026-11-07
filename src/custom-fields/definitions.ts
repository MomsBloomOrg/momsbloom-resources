/**
 * Managing custom fields on the Admin "Custom fields" screen: add, edit, reorder, archive, restore.
 * Every function returns a new definition (or errors to show on the form); none of them saves.
 */
import {
  CHOICE_TYPES,
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
  FILTERABLE_TYPES,
  type CustomFieldDefinition,
  type CustomFieldEntity,
  type CustomFieldOption,
  type CustomFieldType,
  type NewCustomFieldDefinition,
} from "./types";

export const MAX_LABEL_LENGTH = 80;
export const MAX_HELP_TEXT_LENGTH = 300;
export const MAX_OPTIONS = 50;

/** Errors to show next to the form inputs, by input name. */
export type DefinitionErrors = Partial<
  Record<"entity" | "type" | "label" | "helpText" | "options" | "filterable" | "showOnWebsite", string>
>;

export type Result<T> = { ok: true; value: T } | { ok: false; errors: DefinitionErrors };

/** The "Add a field" form. */
export interface NewFieldInput {
  entity: CustomFieldEntity;
  type: CustomFieldType;
  label: string;
  helpText?: string | null;
  /** Choice types only: the option labels, in order. */
  options?: readonly string[];
  showOnWebsite?: boolean;
  filterable?: boolean;
}

/**
 * One row of the options list on the "Edit field" form. Rows with a key are existing options; rows
 * without one are new. An existing option left out of the list is hidden, never removed.
 */
export interface OptionInput {
  key?: string;
  label: string;
  hidden?: boolean;
}

/**
 * The "Edit field" form. `entity` and `type` are here only so that a request that tries to change
 * them gets a clear error. The form never offers them.
 */
export interface FieldChanges {
  entity?: CustomFieldEntity;
  type?: CustomFieldType;
  label?: string;
  helpText?: string | null;
  options?: readonly OptionInput[];
  showOnWebsite?: boolean;
  filterable?: boolean;
}

/** The active (or, with `includeArchived`, all) fields of one record type, in form order. */
export function fieldsFor(
  definitions: readonly CustomFieldDefinition[],
  entity: CustomFieldEntity,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): CustomFieldDefinition[] {
  return definitions
    .filter((field) => field.entity === entity && (includeArchived || !field.archived))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

/** Checks the "Add a field" form. `existing` is every definition, so the label can be checked. */
export function createDefinition(
  input: NewFieldInput,
  existing: readonly CustomFieldDefinition[],
): Result<NewCustomFieldDefinition> {
  const errors: DefinitionErrors = {};
  if (!CUSTOM_FIELD_ENTITIES.includes(input.entity)) errors.entity = "Pick what the field is for.";
  if (!CUSTOM_FIELD_TYPES.includes(input.type)) errors.type = "Pick a field type.";
  if (errors.entity || errors.type) return { ok: false, errors };

  const options = CHOICE_TYPES.includes(input.type)
    ? (input.options ?? []).map((label, i) => ({ key: String(i + 1), label: label.trim(), hidden: false }))
    : [];

  const draft: NewCustomFieldDefinition = {
    entity: input.entity,
    type: input.type,
    label: input.label.trim(),
    helpText: input.helpText?.trim() || null,
    options,
    sortOrder: Math.max(0, ...existing.filter((f) => f.entity === input.entity).map((f) => f.sortOrder)) + 1,
    showOnWebsite: input.showOnWebsite ?? false,
    filterable: input.filterable ?? false,
    archived: false,
  };
  return check(draft, existing, null);
}

/** Checks the "Edit field" form and returns the changed definition. */
export function updateDefinition(
  current: CustomFieldDefinition,
  changes: FieldChanges,
  existing: readonly CustomFieldDefinition[],
): Result<CustomFieldDefinition> {
  const errors: DefinitionErrors = {};
  if (changes.type !== undefined && changes.type !== current.type) {
    errors.type = "A field's type can't change. Archive this field and add a new one.";
  }
  if (changes.entity !== undefined && changes.entity !== current.entity) {
    errors.entity = "A field can't move to another record type. Archive this field and add a new one.";
  }
  if (errors.type || errors.entity) return { ok: false, errors };

  const draft: CustomFieldDefinition = {
    ...current,
    label: changes.label !== undefined ? changes.label.trim() : current.label,
    helpText: changes.helpText !== undefined ? changes.helpText?.trim() || null : current.helpText,
    options: changes.options !== undefined ? mergeOptions(current.options, changes.options) : current.options,
    showOnWebsite: changes.showOnWebsite ?? current.showOnWebsite,
    filterable: changes.filterable ?? current.filterable,
  };
  return check(draft, existing, current.id);
}

/** Hides the field everywhere. Its values stay on the records, so Restore brings them back. */
export function archiveDefinition(current: CustomFieldDefinition): CustomFieldDefinition {
  return { ...current, archived: true };
}

/** Brings an archived field back, unless an active field now has its label. */
export function restoreDefinition(
  current: CustomFieldDefinition,
  existing: readonly CustomFieldDefinition[],
): Result<CustomFieldDefinition> {
  return check({ ...current, archived: false }, existing, current.id);
}

/**
 * New sort orders after a drag-and-drop on the Admin screen. `orderedIds` is the new order of one
 * record type's fields; fields not in it keep their order, after the listed ones.
 */
export function reorderDefinitions(
  definitions: readonly CustomFieldDefinition[],
  entity: CustomFieldEntity,
  orderedIds: readonly string[],
): CustomFieldDefinition[] {
  const fields = fieldsFor(definitions, entity, { includeArchived: true });
  const listed = orderedIds.map((id) => fields.find((f) => f.id === id)).filter((f) => f !== undefined);
  const rest = fields.filter((f) => !orderedIds.includes(f.id));
  const order = new Map([...listed, ...rest].map((f, i) => [f.id, i + 1]));
  return definitions.map((f) => (order.has(f.id) ? { ...f, sortOrder: order.get(f.id)! } : f));
}

/** Applies the options list from the form. Keys never change; left-out options are hidden. */
function mergeOptions(current: readonly CustomFieldOption[], rows: readonly OptionInput[]): CustomFieldOption[] {
  let nextKey = Math.max(0, ...current.map((o) => Number(o.key))) + 1;
  const merged: CustomFieldOption[] = [];
  for (const row of rows) {
    const existing = row.key !== undefined ? current.find((o) => o.key === row.key) : undefined;
    if (existing) merged.push({ ...existing, label: row.label.trim(), hidden: row.hidden ?? false });
    else merged.push({ key: String(nextKey++), label: row.label.trim(), hidden: row.hidden ?? false });
  }
  for (const option of current) {
    if (!merged.some((o) => o.key === option.key)) merged.push({ ...option, hidden: true });
  }
  return merged;
}

/** The rules every definition must pass. `selfId` is the field being edited (null when new). */
function check<T extends NewCustomFieldDefinition>(
  draft: T,
  existing: readonly CustomFieldDefinition[],
  selfId: string | null,
): Result<T> {
  const errors: DefinitionErrors = {};

  if (!draft.label) errors.label = "Give the field a name.";
  else if (draft.label.length > MAX_LABEL_LENGTH) errors.label = `Keep the name under ${MAX_LABEL_LENGTH} characters.`;
  else if (
    !draft.archived &&
    existing.some(
      (f) =>
        f.id !== selfId &&
        !f.archived &&
        f.entity === draft.entity &&
        f.label.toLowerCase() === draft.label.toLowerCase(),
    )
  ) {
    errors.label = "Another field already has this name.";
  }

  if (draft.helpText && draft.helpText.length > MAX_HELP_TEXT_LENGTH) {
    errors.helpText = `Keep the hint under ${MAX_HELP_TEXT_LENGTH} characters.`;
  }

  if (CHOICE_TYPES.includes(draft.type)) {
    const visible = draft.options.filter((o) => !o.hidden);
    const labels = draft.options.map((o) => o.label.toLowerCase());
    if (draft.options.some((o) => !o.label)) errors.options = "Every option needs a name.";
    else if (visible.length === 0) errors.options = "Add at least one option.";
    else if (draft.options.length > MAX_OPTIONS) errors.options = `A list can have up to ${MAX_OPTIONS} options.`;
    else if (new Set(labels).size !== labels.length) errors.options = "Two options have the same name.";
  }

  if (draft.filterable) {
    if (draft.entity !== "program") errors.filterable = "Only Program fields can be filters.";
    else if (!FILTERABLE_TYPES.includes(draft.type)) {
      errors.filterable = "Only Yes / No and list fields can be filters.";
    } else if (!draft.showOnWebsite) errors.filterable = "A filter must also be shown on the website.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: draft };
}
