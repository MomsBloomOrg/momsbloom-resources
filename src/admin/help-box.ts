/**
 * Admin: the text of the "Can't find what you need?" help box (/admin/content). Takes a `Db`, so PGlite
 * tests can run it. Server actions check the login; these functions check the rules.
 *
 * One `site_content` row per field. A blank field has no row, so the default shows.
 */
import { inArray, sql } from "drizzle-orm";
import { siteContent } from "@/db/schema";
import type { Db } from "@/db/types";

export type HelpBoxResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface HelpBoxContent {
  heading: string;
  /** Plain text. Each `{phone}` shows as the phone link. */
  body: string;
  /** As typed, for example "211" or "(616) 555-0100". */
  phone: string;
  buttonLabel: string;
  buttonUrl: string;
}

export type HelpBoxField = keyof HelpBoxContent;

/** The text before Staff admins could edit it. */
export const HELP_BOX_DEFAULTS: HelpBoxContent = {
  heading: "Can't find what you need?",
  body: "Call or text {phone} for free, confidential help finding local services, or contact the MomsBloom team and we'll help you look.",
  phone: "211",
  buttonLabel: "Contact MomsBloom",
  buttonUrl: "https://www.momsbloom.org/contact",
};

export const HELP_BOX_FIELDS = Object.keys(HELP_BOX_DEFAULTS) as HelpBoxField[];

const KEY_PREFIX = "help_box.";
const LABELS: Record<HelpBoxField, string> = {
  heading: "Heading",
  body: "Body",
  phone: "Phone",
  buttonLabel: "Button label",
  buttonUrl: "Button link",
};
const MAX_LENGTH: Record<HelpBoxField, number> = { heading: 100, body: 500, phone: 40, buttonLabel: 40, buttonUrl: 500 };
const MIN_PHONE_DIGITS = 3;
// 11 = a US number with the leading 1.
const MAX_PHONE_DIGITS = 11;

/** The `tel:` target: only the digits of what staff typed. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** The saved rows over the defaults. */
export async function getHelpBoxContent(db: Db): Promise<HelpBoxContent> {
  const rows = await db
    .select({ key: siteContent.key, value: siteContent.value })
    .from(siteContent)
    .where(inArray(siteContent.key, HELP_BOX_FIELDS.map((f) => KEY_PREFIX + f)));
  const content = { ...HELP_BOX_DEFAULTS };
  for (const row of rows) {
    const field = HELP_BOX_FIELDS.find((f) => KEY_PREFIX + f === row.key);
    if (field) content[field] = row.value;
  }
  return content;
}

/** The error for one field, or null. `value` is trimmed and not blank. */
function check(field: HelpBoxField, value: string): string | null {
  if (value.length > MAX_LENGTH[field]) return `${LABELS[field]} can have at most ${MAX_LENGTH[field]} characters.`;
  if (field === "phone") {
    const digits = phoneDigits(value).length;
    if (!/^[\d\s().+-]+$/.test(value) || digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
      return `Phone needs ${MIN_PHONE_DIGITS} to ${MAX_PHONE_DIGITS} digits, for example 211 or 616-555-0100.`;
    }
  }
  if (field === "buttonUrl") {
    let protocol = "";
    try {
      protocol = new URL(value).protocol;
    } catch {}
    if (protocol !== "https:") return "Button link must be a full address that starts with https://.";
  }
  return null;
}

/**
 * Saves the five fields from the form (`FormData`-like: `get(name)`). A blank field deletes its row.
 * Nothing is saved when any field is refused.
 */
export async function saveHelpBoxContent(db: Db, form: { get(name: string): unknown }): Promise<HelpBoxResult<HelpBoxContent>> {
  const set: [string, string][] = [];
  const clear: string[] = [];
  for (const field of HELP_BOX_FIELDS) {
    const raw = form.get(field);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      clear.push(KEY_PREFIX + field);
      continue;
    }
    const error = check(field, value);
    if (error) return { ok: false, error };
    set.push([KEY_PREFIX + field, value]);
  }
  await db.transaction(async (tx) => {
    if (clear.length) await tx.delete(siteContent).where(inArray(siteContent.key, clear));
    if (set.length) {
      await tx
        .insert(siteContent)
        .values(set.map(([key, value]) => ({ key, value })))
        .onConflictDoUpdate({ target: siteContent.key, set: { value: sql`excluded.value`, updatedAt: sql`now()` } });
    }
  });
  return { ok: true, value: await getHelpBoxContent(db) };
}
