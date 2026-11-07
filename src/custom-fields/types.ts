/**
 * Custom fields: fields that Staff admins add themselves, with no developer and no database change.
 *
 * How it is stored (planned, not in the database yet):
 * - One `custom_fields` table holds the definitions (this file's `CustomFieldDefinition`).
 * - Organizations, Programs, Contacts, and Documents each get one `custom` jsonb column that holds the
 *   values, keyed by the field's id: `{ "12": "Free lot", "15": true }` (`CustomValues`).
 *
 * The rules that keep this cheap and safe:
 * - A field's type and record type never change. To change them, make a new field.
 * - Fields are archived, never deleted. Their values stay on the records, hidden.
 * - Choice options are added, renamed, or hidden, never removed. Each option has a key that never
 *   changes, so renaming an option does not touch the records.
 * - Blank means "we don't know". A blank value is not stored, and never shows as "No".
 * - The database does not check these values. The functions in this folder do, on every save.
 */

/** The record types that can have custom fields. */
export const CUSTOM_FIELD_ENTITIES = ["organization", "program", "contact", "document"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

/** The kinds of field a Staff admin can pick. The order here is the order in the "Field type" menu. */
export const CUSTOM_FIELD_TYPES = [
  "text",
  "longText",
  "number",
  "yesNo",
  "date",
  "choice",
  "multiChoice",
  "link",
  "phone",
  "email",
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/** What Staff admins see in the "Field type" menu. */
export const CUSTOM_FIELD_TYPE_LABELS: Readonly<Record<CustomFieldType, string>> = {
  text: "Short text",
  longText: "Long text",
  number: "Number",
  yesNo: "Yes / No",
  date: "Date",
  choice: "Pick one from a list",
  multiChoice: "Pick any from a list",
  link: "Website link",
  phone: "Phone number",
  email: "Email address",
};

/** Types that have a list of options. */
export const CHOICE_TYPES: readonly CustomFieldType[] = ["choice", "multiChoice"];

/** Types that families can filter Programs by. Free text, numbers, and dates are not filters. */
export const FILTERABLE_TYPES: readonly CustomFieldType[] = ["yesNo", "choice", "multiChoice"];

export interface CustomFieldOption {
  /** Never changes, so a rename does not touch the records. "1", "2", ... in the order added. */
  key: string;
  label: string;
  /** Hidden options are not offered on forms or as filters. Records that already have one keep it. */
  hidden: boolean;
}

export interface CustomFieldDefinition {
  /** The database id, an integer as a string, for example "12". The values are stored under it. */
  id: string;
  entity: CustomFieldEntity;
  /** The name on forms and on the website, for example "Parking". */
  label: string;
  /** A hint under the input on the Admin form. */
  helpText: string | null;
  type: CustomFieldType;
  /** Choice types only. Empty for the others. */
  options: readonly CustomFieldOption[];
  /** The order on the form and on the page. */
  sortOrder: number;
  /** Shown to families. When false, only Staff admins see it, like Internal notes. */
  showOnWebsite: boolean;
  /** Programs only, and FILTERABLE_TYPES only: shown as a group of filter checkboxes. */
  filterable: boolean;
  archived: boolean;
}

/** A field before the database gives it an id. */
export type NewCustomFieldDefinition = Omit<CustomFieldDefinition, "id">;

/**
 * One stored value, by type:
 * text, longText, link, phone, email: string · number: number · yesNo: boolean ·
 * date: "YYYY-MM-DD" · choice: an option key · multiChoice: option keys, in option order.
 */
export type CustomValue = string | number | boolean | readonly string[];

/** The `custom` column of one record: field id → value. Blank fields are not in it. */
export type CustomValues = Readonly<Record<string, CustomValue>>;
