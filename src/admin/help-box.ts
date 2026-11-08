/**
 * Admin: the text of the "Can't find what you need?" help box (/admin/content). Takes a `Db`, so PGlite
 * tests can run it. Server actions check the login; these functions check the rules.
 *
 * One `site_content` row per field. A blank field has no row, so the default shows.
 */
import type { Db } from "@/db/types";
import { getSiteContent, saveSiteContent, type SiteContentResult } from "./site-content";

export type HelpBoxResult<T> = SiteContentResult<T>;

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
  heading: "Not sure where to start?",
  body: "Let us help carry the mental load. Our MomsBloom Navigators are here to help you find the resources and support you need.",
  phone: "211",
  buttonLabel: "Connect with a Navigator",
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
export function getHelpBoxContent(db: Db): Promise<HelpBoxContent> {
  return getSiteContent(db, KEY_PREFIX, HELP_BOX_DEFAULTS);
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
export function saveHelpBoxContent(db: Db, form: { get(name: string): unknown }): Promise<HelpBoxResult<HelpBoxContent>> {
  return saveSiteContent(db, KEY_PREFIX, HELP_BOX_DEFAULTS, form, check);
}
