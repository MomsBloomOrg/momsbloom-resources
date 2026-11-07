/**
 * Custom field values on a record: reading them from the Admin form, and showing them to families.
 */
import { fieldsFor } from "./definitions";
import type { CustomFieldDefinition, CustomFieldEntity, CustomFieldType, CustomValue, CustomValues } from "./types";

export const MAX_TEXT_LENGTH = 500;
export const MAX_LONG_TEXT_LENGTH = 5000;

/** What the Admin form sends: field id → the input's text (or texts, for checkboxes). */
export type CustomFieldFormInput = Readonly<Record<string, string | readonly string[] | undefined>>;

export interface ParsedCustomValues {
  /** The whole `custom` column to save, including values of archived fields (kept, hidden). */
  values: CustomValues;
  /** Field id → the message to show under that input. Save only when this is empty. */
  errors: Readonly<Record<string, string>>;
}

/**
 * Checks the custom field inputs of one record's Admin form and builds the value to save.
 *
 * - A blank input removes the value ("we don't know").
 * - Values of archived fields, and of fields this form did not show, stay as they were.
 * - A hidden option is accepted only if the record already had it, so old records still save.
 * - Never trust what the browser sends: every value is checked here, on the server.
 *
 * `previous` is the record's current `custom` column ({} for a new record).
 */
export function parseCustomValues(
  definitions: readonly CustomFieldDefinition[],
  entity: CustomFieldEntity,
  input: CustomFieldFormInput,
  previous: CustomValues = {},
): ParsedCustomValues {
  const values: Record<string, CustomValue> = { ...previous };
  const errors: Record<string, string> = {};

  for (const field of fieldsFor(definitions, entity)) {
    delete values[field.id];
    const result = parseOne(field, input[field.id], previous[field.id]);
    if ("error" in result) errors[field.id] = result.error;
    else if (result.value !== undefined) values[field.id] = result.value;
  }
  return { values, errors };
}

type ParseOne = { value: CustomValue | undefined } | { error: string };

function parseOne(field: CustomFieldDefinition, raw: string | readonly string[] | undefined, before: CustomValue | undefined): ParseOne {
  if (field.type === "multiChoice") {
    const picked = new Set((Array.isArray(raw) ? raw : raw ? [raw] : []).map((k) => k.trim()).filter(Boolean));
    if (picked.size === 0) return { value: undefined };
    const had = Array.isArray(before) ? before : [];
    for (const key of picked) {
      const option = field.options.find((o) => o.key === key);
      if (!option || (option.hidden && !had.includes(key))) return { error: "Pick from the list." };
    }
    // Store in the list's order, so the same picks always save the same way.
    return { value: field.options.filter((o) => picked.has(o.key)).map((o) => o.key) };
  }

  const text = (Array.isArray(raw) ? raw.at(-1) : raw)?.replace(/\r\n/g, "\n").trim() ?? "";
  if (!text) return { value: undefined };

  switch (field.type) {
    case "text":
      return text.length > MAX_TEXT_LENGTH ? { error: `Keep it under ${MAX_TEXT_LENGTH} characters.` } : { value: text };
    case "longText":
      return text.length > MAX_LONG_TEXT_LENGTH ? { error: `Keep it under ${MAX_LONG_TEXT_LENGTH} characters.` } : { value: text };
    case "number": {
      const number = Number(text.replace(/,/g, ""));
      return Number.isFinite(number) ? { value: number } : { error: "Enter a number, for example 12 or 4.5." };
    }
    case "yesNo":
      if (text === "yes") return { value: true };
      if (text === "no") return { value: false };
      return { error: "Pick Yes, No, or leave it blank." };
    case "date":
      return isIsoDate(text) ? { value: text } : { error: "Enter a date." };
    case "choice": {
      const option = field.options.find((o) => o.key === text);
      if (!option || (option.hidden && before !== text)) return { error: "Pick from the list." };
      return { value: text };
    }
    case "link": {
      const url = toWebsiteUrl(text);
      return url ? { value: url } : { error: "Enter a website address, for example https://example.org." };
    }
    case "phone": {
      const digits = text.replace(/\D/g, "");
      const ok = digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
      return ok ? { value: text } : { error: "Enter a 10-digit phone number." };
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? { value: text } : { error: "Enter an email address." };
  }
}

/** "example.org" → "https://example.org/". Only http and https; anything else is null. */
function toWebsiteUrl(text: string): string | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * The value as families (and the Admin table) read it, for example "Yes", "Oct 1, 2026", or
 * "Free lot, Street". Null when there is nothing to show, including a stored value of the wrong
 * shape (the database does not check the values, so this never trusts them).
 */
export function formatCustomValue(field: CustomFieldDefinition, value: CustomValue | undefined): string | null {
  if (value === undefined) return null;
  switch (field.type) {
    case "yesNo":
      return typeof value === "boolean" ? (value ? "Yes" : "No") : null;
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-US") : null;
    case "date":
      return typeof value === "string" && isIsoDate(value) ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : null;
    case "choice":
      return typeof value === "string" ? (field.options.find((o) => o.key === value)?.label ?? null) : null;
    case "multiChoice": {
      if (!Array.isArray(value)) return null;
      const labels = field.options.filter((o) => value.includes(o.key)).map((o) => o.label);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    default:
      return typeof value === "string" && value ? value : null;
  }
}

export interface ShownCustomValue {
  fieldId: string;
  label: string;
  type: CustomFieldType;
  /** Formatted for reading. For link, phone, and email it is the address itself, to build the link. */
  text: string;
}

/**
 * The custom fields to show on a public page (Program detail, ...): only fields shown on the website,
 * not archived, with a value. Never send the others to the browser.
 */
export function publicCustomValues(
  definitions: readonly CustomFieldDefinition[],
  entity: CustomFieldEntity,
  values: CustomValues,
): ShownCustomValue[] {
  return fieldsFor(definitions, entity)
    .filter((field) => field.showOnWebsite)
    .flatMap((field) => {
      const text = formatCustomValue(field, values[field.id]);
      return text === null ? [] : [{ fieldId: field.id, label: field.label, type: field.type, text }];
    });
}

/** Removes the values of fields that are not shown on the website, before the data leaves the server. */
export function onlyPublicValues(
  definitions: readonly CustomFieldDefinition[],
  entity: CustomFieldEntity,
  values: CustomValues,
): CustomValues {
  const shown = new Set(fieldsFor(definitions, entity).filter((f) => f.showOnWebsite).map((f) => f.id));
  return Object.fromEntries(Object.entries(values).filter(([id]) => shown.has(id)));
}
