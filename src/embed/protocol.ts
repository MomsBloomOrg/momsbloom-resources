/**
 * The messages that the embed iframe sends to the parent page (momsbloom.org). One way only:
 * iframe → parent. The iframe listens to no messages.
 *
 * `public/embed.js` is plain JavaScript with no build step, so it cannot import this file. It has its
 * own copy of these names and checks. If you change one side, change the other. The Playwright test
 * (e2e/embed.spec.ts) checks that both sides agree.
 *
 * - `resize`: the height of the embed root element, in CSS pixels.
 * - `scroll`: scroll the parent page so that the iframe top + `top` (CSS pixels) is at the top of the
 *   window, but only when that point is out of view. The detail page sends `top: 0` when it opens;
 *   the results page sends the offset of a card when you come back to it.
 *
 * - `location`: the filter part of the iframe URL (`search`), and the open Program (`program`, or null
 *   on the results page). `embed.js` writes them into the parent page URL (ADR 0005). `search` never
 *   holds `near` or `n`: the family's location must not reach the parent page.
 *
 * - `event`: one analytics event (ADR 0006). `embed.js` calls the host page's own `gtag("event", ...)`
 *   for it. Only the names and parameter keys in `ANALYTICS_EVENTS` pass.
 *
 * Copied from ggrbc/bikegr-calendar.
 */

export const RESIZE_MESSAGE = "momsbloom-resources:resize";
export const SCROLL_MESSAGE = "momsbloom-resources:scroll";
export const LOCATION_MESSAGE = "momsbloom-resources:location";
export const EVENT_MESSAGE = "momsbloom-resources:event";
/** GA4 cuts a parameter value at 100 characters. */
export const MAX_PARAM_LENGTH = 100;
/** Each analytics event, and the parameter keys that it may carry. `embed.js` has a copy. Never a ZIP or a location. */
export const ANALYTICS_EVENTS: Readonly<Record<string, readonly string[]>> = {
  directory_search: ["search_term", "result_count"],
  directory_zero_results: ["search_term", "filters"],
  directory_filter: ["filter_group", "filter_value"],
  program_view: ["program_id"],
  program_call: ["program_id"],
  program_directions: ["program_id"],
  program_website: ["program_id"],
  document_download: ["document_id"],
};
/** What a keyword may become before it goes to analytics: cut to 100, or "(redacted)" for an email, phone number, or ZIP code. */
export function safeKeyword(keyword: string): string {
  const text = keyword.trim().slice(0, MAX_PARAM_LENGTH);
  // Spaces and dashes are removed first, so "616-555-1234" counts as 10 digits in a row.
  return text.includes("@") || /\d{5}/.test(text.replace(/[\s().-]/g, "")) ? "(redacted)" : text;
}
/** A longer `search` is surely a bug or an attack; the parent ignores it. */
export const MAX_SEARCH_LENGTH = 2_000;
/** In the parent page URL, our keys start with this, so they never clash with Squarespace keys (`?q=`). */
export const HOST_KEY_PREFIX = "mbr-";
/** The keys that `embed.js` may copy between the iframe URL and the parent page URL. Never `near`, never `n`. */
export const HOST_QUERY_KEYS = ["q", "cat", "sub", "ins", "cost", "lang", "who", "fmt", "org", "sort", "view"] as const;
/** What a Program ID may look like. IDs may become integers, so this does not require "P-". */
export const PROGRAM_ID_PATTERN = /^[A-Za-z0-9-]{1,40}$/;
/** A larger height is surely a bug or an attack; the parent ignores it. */
export const MAX_HEIGHT = 50_000;
/** The id of the element that the iframe measures. */
export const EMBED_ROOT_ID = "momsbloom-embed-root";

export type EmbedMessage =
  | { type: typeof RESIZE_MESSAGE; height: number }
  | { type: typeof SCROLL_MESSAGE; top: number }
  | { type: typeof LOCATION_MESSAGE; search: string; program: string | null }
  | { type: typeof EVENT_MESSAGE; name: string; params: Record<string, string | number> };

/** The message, or null if it is not a valid embed message. Never trust message data. */
export function readEmbedMessage(data: unknown): EmbedMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.type === RESIZE_MESSAGE) {
    const { height } = message;
    return validSize(height) ? { type: RESIZE_MESSAGE, height } : null;
  }
  if (message.type === SCROLL_MESSAGE) {
    const { top } = message;
    return validSize(top) ? { type: SCROLL_MESSAGE, top } : null;
  }
  if (message.type === LOCATION_MESSAGE) {
    const { search, program } = message;
    if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) return null;
    if (program !== null && !(typeof program === "string" && PROGRAM_ID_PATTERN.test(program))) return null;
    return { type: LOCATION_MESSAGE, search, program };
  }
  if (message.type === EVENT_MESSAGE) {
    const { name, params } = message;
    if (typeof name !== "string" || !Object.hasOwn(ANALYTICS_EVENTS, name)) return null;
    if (typeof params !== "object" || params === null || Array.isArray(params)) return null;
    const allowed = ANALYTICS_EVENTS[name];
    const entries = Object.entries(params);
    for (const [key, value] of entries) {
      if (!allowed.includes(key)) return null;
      const ok =
        typeof value === "string" ? value.length <= MAX_PARAM_LENGTH : typeof value === "number" && Number.isFinite(value) && value >= 0;
      if (!ok) return null;
    }
    return { type: EVENT_MESSAGE, name, params: Object.fromEntries(entries) };
  }
  return null;
}

function validSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_HEIGHT;
}
