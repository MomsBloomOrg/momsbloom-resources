import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/auth/rules";

/**
 * Optimistic check only: no session cookie means no login, so send the person to /login at once.
 * The real check (session row, ADMIN_EMAILS) is in src/auth/dal.ts, on each page and action.
 */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

// `:path*` is zero or more segments, so this also matches `/admin` (e2e/admin-login.spec.ts checks it).
export const config = { matcher: ["/admin/:path*"] };
