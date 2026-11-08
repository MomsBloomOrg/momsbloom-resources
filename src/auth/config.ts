/**
 * The Auth.js config: Staff admin login by Login link (ADR 0003), with database sessions. Only
 * Owners (addresses on `ADMIN_EMAILS`) and Staff admins added in the Admin get through. No Next.js
 * imports, so the integration test can run it with the plain `Auth()` handler on PGlite.
 */
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { AuthConfig } from "@auth/core";
import { AuthError } from "@auth/core/errors";
import { and, eq, isNotNull } from "drizzle-orm";
import Resend from "@auth/core/providers/resend";
import { authSessions, authVerificationTokens, staffAdmins } from "@/db/schema";
import type { Db } from "@/db/types";
import { authErrorLog } from "./error-log";
import type { Mailer } from "./mailer";
import { describeError } from "@/rate-limit";
import { magicLinkLimiter } from "./magic-link-limits";
import { isStaffEmail, isValidEmail, normalizeEmail } from "./rules";

export const LOGIN_PATH = "/login";

/** `admin`: all of the Admin. `editor`: Resources only (Organizations, Programs, Documents). */
export type StaffRole = "admin" | "editor";

/** Where Auth.js sends the browser after it sends a Login link. */
const VERIFY_REQUEST_PATH = "/api/auth/verify-request?provider=resend&type=email";

/**
 * Normal events, not errors: one warn line, no stack. `AccessDenied` is a refused address;
 * `Verification` is a used or expired link.
 */
const EXPECTED_ERRORS = new Set<string>(["AccessDenied", "Verification"]);

/** `normalizeIdentifier` throws it for a bad email. Expected: one warn line, no stack. */
class InvalidEmailError extends Error {
  constructor() {
    super("Not a valid email address.");
    this.name = "InvalidEmailError";
  }
}

export interface AuthDeps {
  db: Db;
  mailer: Mailer;
  /**
   * The client's IP for the Login link rate limit (`clientIp` from `@/rate-limit`), or null. The
   * `signIn` callback gets no request, so the caller gives it. Called only at a link request.
   */
  getClientIp: () => Promise<string | null>;
  /** Where `ADMIN_EMAILS` is read. Read on each check, so a removed address is refused at once. */
  env?: Record<string, string | undefined>;
  /**
   * Runs the email send after the response (`after` from next/server in the app), so a staff
   * request and a stranger's request take the same time. The default awaits it (tests).
   */
  defer?: (task: () => Promise<void>) => void | Promise<void>;
}

/** Database sessions last 7 days. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * True when the address is on the allow-list: an Owner (on `ADMIN_EMAILS`) or a Staff admin added in
 * the Admin (a `staff_admins` row with `added_at` set). The lookup runs for every address, so a
 * stranger's request takes the same path as a Staff admin's.
 */
export async function isAllowedEmail(
  db: Db,
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const normalized = normalizeEmail(email ?? "");
  const [added] = await db
    .select({ id: staffAdmins.id })
    .from(staffAdmins)
    .where(and(eq(staffAdmins.email, normalized), isNotNull(staffAdmins.addedAt)));
  return added !== undefined || isStaffEmail(normalized, env);
}

/**
 * The Staff admin for a session's user id, or null when the row is gone or it is no longer allowed:
 * not an Owner and not added in the Admin (a first-login Owner row whose address left `ADMIN_EMAILS`).
 * The DAL calls it on every request. A refused row also loses all its sessions, so adding it back
 * later does not bring an old session back. A removed Staff admin has no row (sessions cascade).
 *
 * The role comes from the row, but an Owner is always `admin`: `ADMIN_EMAILS` is the way back in if
 * roles go wrong.
 */
export async function findStaffAdmin(
  db: Db,
  id: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ id: string; email: string; role: StaffRole } | null> {
  const [row] = await db
    .select({ id: staffAdmins.id, email: staffAdmins.email, addedAt: staffAdmins.addedAt, role: staffAdmins.role })
    .from(staffAdmins)
    .where(eq(staffAdmins.id, id));
  if (!row) return null;
  const owner = isStaffEmail(row.email, env);
  if (row.addedAt !== null || owner) {
    return { id: row.id, email: row.email, role: owner || row.role === "admin" ? "admin" : "editor" };
  }
  await db.delete(authSessions).where(eq(authSessions.userId, row.id));
  return null;
}

export function buildAuthConfig({
  db,
  mailer,
  getClientIp,
  env = process.env,
  defer = (task) => task(),
}: AuthDeps): AuthConfig {
  // `createUser` stays on: the first login of an allowed address makes its `staff_admins` row. The
  // `signIn` callback has already refused every other address. No accounts table: the email flow
  // never reads or writes accounts (ADR 0003: the email link is the only login).
  // The adapter's type marks `accountsTable` as required, but at runtime it falls back to its own
  // table object (`@auth/drizzle-adapter/lib/pg.js` `defineTables`), which nothing here queries.
  const adapter = DrizzleAdapter(db, {
    usersTable: staffAdmins,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  } as unknown as Parameters<typeof DrizzleAdapter<Db>>[1]);

  return {
    adapter,
    session: { strategy: "database", maxAge: SESSION_MAX_AGE_SECONDS },
    logger: {
      // A refused email and a used or expired link are normal events, not errors: one line, no stack.
      error(error) {
        if (error instanceof InvalidEmailError) {
          console.warn("[auth] Refused link request: not a valid email address.");
          return;
        }
        if (error instanceof AuthError && EXPECTED_ERRORS.has(error.type)) {
          console.warn(`[auth] ${error.type}`);
          return;
        }
        // Never the error itself: an AdapterError's message and cause hold the SQL and its params.
        console.error(authErrorLog(error));
      },
    },
    pages: { signIn: LOGIN_PATH, verifyRequest: LOGIN_PATH, error: LOGIN_PATH },
    providers: [
      Resend({
        // The key is read by our mailer, not by the provider. The provider needs a value.
        apiKey: env.RESEND_API_KEY || "console",
        from: env.EMAIL_FROM,
        normalizeIdentifier(raw) {
          const email = normalizeEmail(raw);
          if (!isValidEmail(email)) throw new InvalidEmailError();
          return email;
        },
        async sendVerificationRequest({ identifier, url }) {
          // The signIn callback already refused other addresses; this is a second guard.
          if (!(await isAllowedEmail(db, identifier, env))) {
            throw new Error("Refused to send a Login link to an address not on the Staff admin list.");
          }
          const loginUrl = new URL(LOGIN_PATH, url).toString();
          // The token insert before this call is awaited; the send is not, so the answer is the same
          // for everyone. A failed send logs only the error name and code (no address, no link).
          await defer(async () => {
            try {
              await mailer.sendMagicLink({ to: identifier, url, loginUrl });
            } catch (error) {
              console.error(`[auth] Login link email failed: ${describeError(error)}`);
            }
          });
        },
      }),
    ],
    callbacks: {
      /**
       * Runs before Auth.js makes a token and sends the email, and again when the link is used.
       *
       * (1) An address not on the allow-list (`isAllowedEmail`) is refused. At the link request, the refusal returns the
       * same redirect as a sent link (no token, no email, no rate-limit write), so the response does
       * not show who is a Staff admin. At the link click, the person has proved the address, so a
       * refusal is a plain `false` (AccessDenied).
       *
       * (2) At the link request only, the rate limits run: per IP, then per email. A limited request
       * gets the same redirect as a sent link, with no token and no email.
       */
      async signIn({ user, email }) {
        const linkRequest = email?.verificationRequest === true;
        if (!(await isAllowedEmail(db, user.email, env))) {
          console.warn("[auth] Refused sign-in: not on the Staff admin list.");
          return linkRequest ? VERIFY_REQUEST_PATH : false;
        }
        if (!linkRequest) return true;

        const limiter = magicLinkLimiter(db);
        const ip = await getClientIp();
        if (ip && !(await limiter.allows("ip", ip))) return VERIFY_REQUEST_PATH;
        if (!(await limiter.allows("email", normalizeEmail(user.email!)))) return VERIFY_REQUEST_PATH;
        return true;
      },
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
}
