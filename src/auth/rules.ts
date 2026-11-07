/** Pure auth rules. No database, no Next.js, so they are easy to test. */

type Env = Record<string, string | undefined>;

/**
 * NFKC first, so a look-alike character (for example a fullwidth `＠`) becomes plain ASCII before
 * the lookup and the format check. Then trim and lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

// Characters that are refused inside the parts:
// - spaces, `@`, `"`, `,`, `<`, `>`: they can turn one address into several (or into a display
//   name) in a mail parser;
// - the other RFC 5322 specials `( ) [ ] : ; \`: they are allowed only inside quotes, and quotes
//   are refused;
// - control characters (`\p{Cc}`, for example NUL, which Postgres refuses in text) and invisible
//   format characters (`\p{Cf}`, for example a zero-width space or an RTL override).
const PART = String.raw`[^\s@",<>()[\]:;\\\p{Cc}\p{Cf}]+`;
const EMAIL = new RegExp(`^${PART}@${PART}\\.${PART}$`, "u");

/** A simple shape check. The Login link proves that the address works. */
export function isValidEmail(email: string): boolean {
  return EMAIL.test(email);
}

/**
 * The Staff admin allow-list: `ADMIN_EMAILS`, separated by commas or whitespace. Each entry is
 * normalized; an entry that is not a valid email is dropped.
 */
export function staffAllowList(env: Env = process.env): Set<string> {
  const entries = (env.ADMIN_EMAILS ?? "").split(/[\s,]+/).map(normalizeEmail);
  return new Set(entries.filter(isValidEmail));
}

/** True when the email is on `ADMIN_EMAILS`. Only these people get or use a Login link. */
export function isStaffEmail(email: string | null | undefined, env: Env = process.env): boolean {
  return email != null && staffAllowList(env).has(normalizeEmail(email));
}
