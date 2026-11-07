/**
 * Which websites may show our pages inside an iframe. Browsers read this from the
 * `Content-Security-Policy: frame-ancestors ...` header, which next.config.ts sets.
 *
 * - Embed pages (`/embed/*`): our own site, momsbloom.org, and the Squarespace editor and preview
 *   (`*.squarespace.com`, so staff can see the embed while they edit the page). Plus any origins in
 *   the `EMBED_EXTRA_FRAME_ANCESTORS` environment variable (for example the local Playwright test
 *   host page; empty in production).
 * - Every other page: nobody. This protects the admin from "clickjacking": a bad site could
 *   otherwise show our admin in an invisible iframe and trick a staff member into clicking in it.
 *
 * next.config.ts reads this at build time, so a change to `EMBED_EXTRA_FRAME_ANCESTORS` needs a new build.
 */

export const EMBED_FRAME_ANCESTORS = [
  "'self'",
  "https://www.momsbloom.org",
  "https://momsbloom.org",
  "https://*.squarespace.com",
];

/** Keeps only `http(s)://host[:port]` values (a host may start with `*.`). Drops anything else. */
export function extraFrameAncestors(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .filter((source) => /^https?:\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i.test(source));
}

export function embedFrameAncestors(extra: string | undefined): string {
  return `frame-ancestors ${[...EMBED_FRAME_ANCESTORS, ...extraFrameAncestors(extra)].join(" ")}`;
}

export const NO_FRAME_ANCESTORS = "frame-ancestors 'none'";
