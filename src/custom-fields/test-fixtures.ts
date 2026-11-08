/**
 * Made-up custom fields for tests. Never put real people or real contact details here: this repo is
 * public.
 */
import type { CustomFieldDefinition } from "./types";

function field(fields: Partial<CustomFieldDefinition> & Pick<CustomFieldDefinition, "id" | "label" | "type">): CustomFieldDefinition {
  return {
    entity: "program",
    helpText: null,
    options: [],
    sortOrder: Number(fields.id),
    showOnWebsite: true,
    filterable: false,
    archived: false,
    ...fields,
  };
}

/** A Yes / No Program filter. */
export const DOULA = field({ id: "1", label: "Doula on staff", type: "yesNo", filterable: true });

/** A pick-one Program filter. "Paid garage" was hidden after some records used it. */
export const PARKING = field({
  id: "2",
  label: "Parking",
  type: "choice",
  filterable: true,
  options: [
    { key: "1", label: "Free lot", hidden: false },
    { key: "2", label: "Street", hidden: false },
    { key: "3", label: "Paid garage", hidden: true },
  ],
});

/** A pick-any Program field that is shown but is not a filter. */
export const AGES = field({
  id: "3",
  label: "Ages served",
  type: "multiChoice",
  options: [
    { key: "1", label: "Pregnancy", hidden: false },
    { key: "2", label: "Newborn", hidden: false },
    { key: "3", label: "Toddler", hidden: false },
  ],
});

/** Staff only. */
export const INTAKE_NOTES = field({ id: "4", label: "Intake notes", type: "longText", showOnWebsite: false });

export const WAITLIST = field({ id: "5", label: "Waitlist (weeks)", type: "number" });
export const STARTED = field({ id: "6", label: "Program started", type: "date" });
export const SIGN_UP = field({ id: "7", label: "Sign-up form", type: "link" });

/** Archived: its values stay on the records, hidden. */
export const OLD_FIELD = field({ id: "8", label: "Old field", type: "text", archived: true });

/** An Organization field. */
export const BILLING_EMAIL = field({
  id: "9",
  entity: "organization",
  label: "Billing email",
  type: "email",
  showOnWebsite: false,
});

/** A Yes / No Document filter. Not in TEST_FIELDS: add it where a test needs it. */
export const WORKSHEET = field({ id: "10", entity: "document", label: "Printable worksheet", type: "yesNo", filterable: true });

export const TEST_FIELDS: readonly CustomFieldDefinition[] = [
  DOULA,
  PARKING,
  AGES,
  INTAKE_NOTES,
  WAITLIST,
  STARTED,
  SIGN_UP,
  OLD_FIELD,
  BILLING_EMAIL,
];
