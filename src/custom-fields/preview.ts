/**
 * "How families see it": a draft field from the Admin form inputs, run through the same rules the
 * public site uses, so the preview cannot drift from the Directory. Client-safe: no database.
 */
import type { AdminEntity } from "./form";
import { customFilterGroups, type CustomFilterGroup } from "./filter";
import type { CustomFieldDefinition, CustomFieldOption, CustomFieldType, CustomValue } from "./types";
import { publicCustomValues, type ShownCustomValue } from "./values";

export interface FieldPreview {
  /** The detail page line; null when families would not see the field (or a list has no options yet). */
  shown: ShownCustomValue | null;
  /** The filter group; null when the field is not a public filter. */
  filter: CustomFilterGroup | null;
  /** Families would see the field, but a list has no options yet. */
  needsOptions: boolean;
}

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Options from the Add form (`options`) or the Edit form (`optionKey`/`optionLabel` pairs, minus `optionHidden`, plus `newOptions`). Keys are for the preview only. */
function optionsFrom(data: FormData): CustomFieldOption[] {
  const keys = data.getAll("optionKey").map(String);
  const labels = data.getAll("optionLabel").map(String);
  const hidden = new Set(data.getAll("optionHidden").map(String));
  const labelList = [
    ...keys.flatMap((key, i) => (hidden.has(key) || !labels[i]?.trim() ? [] : [labels[i].trim()])),
    ...lines(data.get("options")),
    ...lines(data.get("newOptions")),
  ];
  return labelList.map((label, i) => ({ key: String(i + 1), label, hidden: false }));
}

function sampleFor(type: CustomFieldType, options: readonly CustomFieldOption[]): CustomValue | undefined {
  switch (type) {
    case "text":
    case "longText":
      return "Sample answer";
    case "number":
      return 3;
    case "yesNo":
      return true;
    case "date":
      return "2026-01-15"; // fixed, so the preview never depends on the time zone
    case "choice":
      return options[0]?.key;
    case "multiChoice":
      return options.length ? options.slice(0, 2).map((o) => o.key) : undefined;
    case "link":
      return "https://example.org";
    case "phone":
      return "(616) 555-0100";
    case "email":
      return "name@example.org";
  }
}

export function previewFromForm(entity: AdminEntity, type: CustomFieldType, data: FormData): FieldPreview {
  const options = optionsFrom(data);
  const draft: CustomFieldDefinition = {
    id: "preview",
    entity,
    label: String(data.get("label") ?? "").trim() || "Field name",
    helpText: null,
    type,
    options,
    sortOrder: 0,
    // No choice yet counts as Staff only.
    showOnWebsite: data.get("visibility") === "public",
    filterable: data.has("filterable"),
    archived: false,
  };
  const sample = sampleFor(type, options);
  const [shown = null] = publicCustomValues([draft], entity, sample === undefined ? {} : { [draft.id]: sample });
  const filter = customFilterGroups([draft]).find((group) => group.values.length > 0) ?? null;
  return { shown, filter, needsOptions: draft.showOnWebsite && sample === undefined };
}

/** The Edit form's starting data, so the preview shows the saved field before anything changes. */
export function savedFieldData(field: CustomFieldDefinition): FormData {
  const data = new FormData();
  data.set("label", field.label);
  data.set("visibility", field.showOnWebsite ? "public" : "staff");
  if (field.filterable) data.set("filterable", "on");
  for (const o of field.options) {
    data.append("optionKey", o.key);
    data.append("optionLabel", o.label);
    if (o.hidden) data.append("optionHidden", o.key);
  }
  return data;
}
