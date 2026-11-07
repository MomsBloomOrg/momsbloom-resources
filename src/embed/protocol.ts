/**
 * The messages that the embed iframe sends to the parent page (momsbloom.org). One way only:
 * iframe → parent. The iframe listens to no messages.
 *
 * `public/embed.js` is plain JavaScript with no build step, so it cannot import this file. It has its
 * own copy of these names and checks. If you change one side, change the other. The Playwright test
 * (e2e/embed.spec.ts) checks that both sides agree.
 *
 * - `resize`: the height of the embed root element, in CSS pixels.
 *
 * Copied from ggrbc/bikegr-calendar. bikegr also sends a `location` message, so that filters show in
 * the parent page URL. We can add that when we decide how directory URLs work.
 */

export const RESIZE_MESSAGE = "momsbloom-resources:resize";
/** A larger height is surely a bug or an attack; the parent ignores it. */
export const MAX_HEIGHT = 50_000;
/** The id of the element that the iframe measures. */
export const EMBED_ROOT_ID = "momsbloom-embed-root";

export type EmbedMessage = { type: typeof RESIZE_MESSAGE; height: number };

/** The message, or null if it is not a valid embed message. Never trust message data. */
export function readEmbedMessage(data: unknown): EmbedMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== RESIZE_MESSAGE) return null;
  const { height } = message;
  if (typeof height !== "number" || !Number.isFinite(height) || height < 0 || height > MAX_HEIGHT) {
    return null;
  }
  return { type: RESIZE_MESSAGE, height };
}
