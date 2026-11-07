/**
 * The Auth.js config: Staff admin login by Login link (ADR 0003), with database sessions. Only
 * addresses on `ADMIN_EMAILS` get through. No Next.js imports, so the integration test can run it
 * with the plain `Auth()` handler on PGlite.
 */
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { AuthConfig } from "@auth/core";
import { AuthError } from "@auth/core/errors";
import { eq } from "drizzle-orm";
import Resend from "@auth/core/providers/resend";
import { authAccounts, authSessions, authVerificationTokens, staffAdmins } from "@/db/schema";
import type { Db } from "@/db/types";
import { authErrorLog } from "./error-log";
import type { Mailer } from "./mailer";
import { magicLinkLimiter } from "./magic-link-limits";
import { isStaffEmail, isValidEmail, normalizeEmail } from "./rules";

export const LOGIN_PATH = "/login";

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
}

/**
 * The Staff admin for a session's user id, or null when the row is gone or its address is no longer
 * on `ADMIN_EMAILS`. The DAL calls it on every request.
 */
export async function findStaffAdmin(
  db: Db,
  id: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ id: string; email: string } | null> {
  const [row] = await db
    .select({ id: staffAdmins.id, email: staffAdmins.email })
    .from(staffAdmins)
    .where(eq(staffAdmins.id, id));
  return row && isStaffEmail(row.email, env) ? row : null;
}

export function buildAuthConfig({ db, mailer, getClientIp, env = process.env }: AuthDeps): AuthConfig {
  // `createUser` stays on: the first login of an allowed address makes its `staff_admins` row. The
  // `signIn` callback has already refused every other address.
  const adapter = DrizzleAdapter(db, {
    usersTable: staffAdmins,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  });

  return {
    adapter,
    session: { strategy: "database" },
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
          if (!isStaffEmail(identifier, env)) {
            throw new Error("Refused to send a Login link to an address not on ADMIN_EMAILS.");
          }
          await mailer.sendMagicLink({ to: identifier, url, loginUrl: new URL(LOGIN_PATH, url).toString() });
        },
      }),
      // Microsoft 365 comes later (ADR 0003): `MicrosoftEntraID` from `@auth/core/providers/microsoft-entra-id`, env AUTH_MICROSOFT_ENTRA_ID_ID / _SECRET / _ISSUER, matched by verified email.
    ],
    callbacks: {
      /**
       * Runs before Auth.js makes a token and sends the email, and again when the link is used.
       *
       * (1) An address not on `ADMIN_EMAILS` is refused. At the link request, the refusal returns the
       * same redirect as a sent link (no token, no email, no rate-limit write), so the response does
       * not show who is a Staff admin. At the link click, the person has proved the address, so a
       * refusal is a plain `false` (AccessDenied).
       *
       * (2) At the link request only, the rate limits run: per IP, then per email. A limited request
       * gets the same redirect as a sent link, with no token and no email.
       */
      async signIn({ user, email }) {
        const linkRequest = email?.verificationRequest === true;
        if (!isStaffEmail(user.email, env)) {
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
