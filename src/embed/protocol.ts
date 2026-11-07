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
 * Copied from ggrbc/bikegr-calendar.
 */

export const RESIZE_MESSAGE = "momsbloom-resources:resize";
export const SCROLL_MESSAGE = "momsbloom-resources:scroll";
export const LOCATION_MESSAGE = "momsbloom-resources:location";
/** A longer `search` is surely a bug or an attack; the parent ignores it. */
export const MAX_SEARCH_LENGTH = 2_000;
/** In the parent page URL, our keys start with this, so they never clash with Squarespace keys (`?q=`). */
export const HOST_KEY_PREFIX = "mbr-";
/** The keys that `embed.js` may copy between the iframe URL and the parent page URL. Never `near`, never `n`. */
export const HOST_QUERY_KEYS = ["q", "r", "cat", "sub", "ins", "cost", "lang", "who", "fmt", "org", "sort", "view"] as const;
/** What a Program ID may look like. IDs may become integers, so this does not require "P-". */
export const PROGRAM_ID_PATTERN = /^[A-Za-z0-9-]{1,40}$/;
/** A larger height is surely a bug or an attack; the parent ignores it. */
export const MAX_HEIGHT = 50_000;
/** The id of the element that the iframe measures. */
export const EMBED_ROOT_ID = "momsbloom-embed-root";

export type EmbedMessage =
  | { type: typeof RESIZE_MESSAGE; height: number }
  | { type: typeof SCROLL_MESSAGE; top: number }
  | { type: typeof LOCATION_MESSAGE; search: string; program: string | null };

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
  return null;
}

function validSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_HEIGHT;
}
