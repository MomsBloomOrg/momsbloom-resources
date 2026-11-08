/**
 * Custom fields as Program and Document filters. They work like Facets: inside one field, values combine with
 * OR; between fields (and with the Facets), with AND.
 *
 * Filter value keys: a list field uses its option keys; a Yes / No field uses "yes" and "no".
 */
import { fieldsFor } from "./definitions";
import { FILTERABLE_TYPES, type CustomFieldDefinition, type CustomFieldEntity, type CustomValues } from "./types";

/** The record types that can have filters. A filter only touches its own record type. */
type FilterEntity = Extract<CustomFieldEntity, "program" | "document">;

/** Field id → the checked value keys. */
export type CustomFilters = Readonly<Record<string, readonly string[]>>;

export interface CustomFilterGroup {
  fieldId: string;
  entity: FilterEntity;
  /** The group title on screen: the field's label. */
  label: string;
  values: readonly { key: string; label: string }[];
}

/** The custom filter groups to show after the Facets, in the order staff set. Without `entity`: both record types. */
export function customFilterGroups(definitions: readonly CustomFieldDefinition[], entity?: FilterEntity): CustomFilterGroup[] {
  return filterFields(definitions, entity).map((field) => ({
    fieldId: field.id,
    entity: field.entity as FilterEntity,
    label: field.label,
    values:
      field.type === "yesNo"
        ? [
            { key: "yes", label: "Yes" },
            { key: "no", label: "No" },
          ]
        : field.options.filter((o) => !o.hidden).map((o) => ({ key: o.key, label: o.label })),
  }));
}

/**
 * Drops filters for fields that are not (or no longer) filters, and values that don't exist. Use it
 * on the filters from the URL, like the Facets: an old shared link must not hide every result.
 */
export function cleanCustomFilters(definitions: readonly CustomFieldDefinition[], filters: CustomFilters): CustomFilters {
  const groups = customFilterGroups(definitions);
  const clean: Record<string, string[]> = {};
  for (const group of groups) {
    const picked = (filters[group.fieldId] ?? []).filter((key) => group.values.some((v) => v.key === key));
    if (picked.length > 0) clean[group.fieldId] = [...new Set(picked)];
  }
  return clean;
}

/** True when the record passes every active custom filter. `skip` leaves one field out; the counts use it. */
export function matchesCustomFilters(
  definitions: readonly CustomFieldDefinition[],
  entity: FilterEntity,
  values: CustomValues,
  filters: CustomFilters,
  { skip }: { skip?: string } = {},
): boolean {
  return filterFields(definitions, entity).every((field) => {
    const selected = filters[field.id] ?? [];
    if (field.id === skip || selected.length === 0) return true;
    const has = valueKeys(field, values);
    return selected.some((key) => has.includes(key));
  });
}

/**
 * For each custom filter value: how many records the family would see with it checked, given all the
 * OTHER active custom filters. Same rule as the Facet counts in src/directory/filter.ts.
 */
export function countCustomFilterValues<T extends { custom: CustomValues }>(
  definitions: readonly CustomFieldDefinition[],
  entity: FilterEntity,
  records: readonly T[],
  filters: CustomFilters,
): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};
  for (const field of filterFields(definitions, entity)) {
    counts[field.id] = {};
    for (const record of records) {
      if (!matchesCustomFilters(definitions, entity, record.custom, filters, { skip: field.id })) continue;
      for (const key of valueKeys(field, record.custom)) {
        counts[field.id][key] = (counts[field.id][key] ?? 0) + 1;
      }
    }
  }
  return counts;
}

function filterFields(definitions: readonly CustomFieldDefinition[], entity?: FilterEntity): CustomFieldDefinition[] {
  return (entity ? fieldsFor(definitions, entity) : [...fieldsFor(definitions, "program"), ...fieldsFor(definitions, "document")]).filter(
    (f) => f.filterable && f.showOnWebsite && FILTERABLE_TYPES.includes(f.type),
  );
}

/** The filter keys a record has for one field. A blank Yes / No has none: unknown is never "No". */
function valueKeys(field: CustomFieldDefinition, values: CustomValues): readonly string[] {
  const value = values[field.id];
  if (field.type === "yesNo") return typeof value === "boolean" ? [value ? "yes" : "no"] : [];
  if (field.type === "choice") return typeof value === "string" ? [value] : [];
  if (field.type === "multiChoice") return Array.isArray(value) ? value : [];
  return [];
}
