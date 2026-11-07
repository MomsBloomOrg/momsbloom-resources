/**
 * Integration test of the Auth.js wiring: the real `Auth()` handler, the Drizzle adapter on PGlite
 * (real migrations), and a mock mailer. No email is sent.
 */
import { Auth } from "@auth/core";
import { AdapterError } from "@auth/core/errors";
import { DrizzleQueryError, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authSessions, authVerificationTokens, rateLimits, staffAdmins } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { clientIp } from "@/rate-limit";
import { buildAuthConfig, findStaffAdmin } from "./config";
import type { Mailer, MagicLinkMessage } from "./mailer";

const ORIGIN = "http://localhost:3000";
const STAFF = "staff@example.org";
const ENV = { ADMIN_EMAILS: `${STAFF}, second@example.org` };

describe("Auth.js wiring", () => {
  let db: Db;
  let close: () => Promise<void>;
  let lines: string[];
  const sent: MagicLinkMessage[] = [];
  const mailer: Mailer = {
    transport: "console",
    sendMagicLink: vi.fn(async (message: MagicLinkMessage) => {
      sent.push(message);
    }),
  };

  /** As src/auth/index.ts does for the route handler: the IP comes from the request headers. */
  function handle(request: Request, { database = db, env = ENV }: { database?: Db; env?: typeof ENV } = {}) {
    return Auth(request, {
      ...buildAuthConfig({ db: database, mailer, getClientIp: async () => clientIp(request.headers), env }),
      secret: "test-secret-for-auth-wiring-tests",
      trustHost: true,
      basePath: "/api/auth",
    });
  }

  /** Posts the email form to the Auth.js route with a CSRF token, as `/api/auth/signin/resend` receives it. */
  async function requestLink(email: string, { ip, database = db }: { ip?: string; database?: Db } = {}) {
    const res = await handle(new Request(`${ORIGIN}/api/auth/csrf`), { database });
    const { csrfToken } = (await res.json()) as { csrfToken: string };
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", cookie };
    if (ip) headers["x-forwarded-for"] = ip;
    return handle(
      new Request(`${ORIGIN}/api/auth/signin/resend`, {
        method: "POST",
        headers,
        body: new URLSearchParams({ email, csrfToken, callbackUrl: `${ORIGIN}/admin` }),
      }),
      { database },
    );
  }

  async function count(table: typeof authVerificationTokens | typeof authSessions | typeof staffAdmins) {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
    return row.n;
  }

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(async () => close());
  beforeEach(async () => {
    sent.length = 0;
    vi.mocked(mailer.sendMagicLink).mockClear();
    await db.delete(authVerificationTokens);
    await db.delete(authSessions);
    await db.delete(rateLimits);
    await db.delete(staffAdmins);
    lines = [];
    for (const level of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
  });
  afterEach(() => vi.restoreAllMocks());

  it("an allowed email gets one token and one email", async () => {
    const res = await requestLink("Staff@Example.org");
    expect(res.status).toBe(302);
    expect(await count(authVerificationTokens)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: STAFF, loginUrl: `${ORIGIN}/login` });
  });

  it("a stranger gets the same redirect, no token, no email, and no rate-limit row", async () => {
    const refused = await requestLink("stranger@example.org", { ip: "203.0.113.7" });
    const accepted = await requestLink(STAFF);
    expect(refused.status).toBe(accepted.status);
    expect(refused.headers.get("location")).toBe(accepted.headers.get("location"));
    expect(refused.headers.get("location")).not.toContain("error");
    expect(await count(authVerificationTokens)).toBe(1);
    expect(sent.map((m) => m.to)).toEqual([STAFF]);
    expect(await db.select().from(rateLimits).where(eq(rateLimits.bucket, "magic-link:ip"))).toEqual([]);
    for (const line of lines) expect(line).not.toContain("stranger");
  });

  it("the link logs in, makes the staff_admins row, and redirects to /admin", async () => {
    await requestLink(STAFF);
    const res = await handle(new Request(sent[0].url));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/admin`);
    expect(res.headers.getSetCookie().some((c) => c.startsWith("authjs.session-token="))).toBe(true);
    expect(await count(authSessions)).toBe(1);
    const [admin] = await db.select().from(staffAdmins);
    expect(admin).toMatchObject({ email: STAFF });
    expect(admin.emailVerified).toBeInstanceOf(Date);
  });

  it("a link used after the address left ADMIN_EMAILS is refused and makes no row and no session", async () => {
    await requestLink("second@example.org");
    const res = await handle(new Request(sent[0].url), { env: { ADMIN_EMAILS: STAFF } });
    expect(res.headers.get("location")).toContain("error=AccessDenied");
    expect(await count(authSessions)).toBe(0);
    expect(await count(staffAdmins)).toBe(0);
  });

  it("an address removed from ADMIN_EMAILS fails the DAL check and loses its sessions", async () => {
    await requestLink(STAFF);
    const login = await handle(new Request(sent[0].url));
    const [admin] = await db.select().from(staffAdmins);
    expect(await findStaffAdmin(db, admin.id, ENV)).toEqual({ id: admin.id, email: STAFF });
    expect(await count(authSessions)).toBe(1);

    expect(await findStaffAdmin(db, admin.id, { ADMIN_EMAILS: "second@example.org" })).toBeNull();
    expect(await count(authSessions)).toBe(0);
    // Back on the list: the old session does not come back.
    expect(await findStaffAdmin(db, admin.id, ENV)).not.toBeNull();
    const cookie = login.headers.getSetCookie().find((c) => c.startsWith("authjs.session-token="))!.split(";")[0];
    const session = await handle(new Request(`${ORIGIN}/api/auth/session`, { headers: { cookie } }));
    expect(await session.json()).toBeNull();
  });

  it("sessions last 7 days", async () => {
    await requestLink(STAFF);
    await handle(new Request(sent[0].url));
    const [row] = await db.select().from(authSessions);
    const days = (row.expires.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("the email goes through `defer`, and a failed send logs no address and does not change the answer", async () => {
    const deferred: (() => Promise<void>)[] = [];
    const failing: Mailer = { transport: "console", sendMagicLink: vi.fn().mockRejectedValue(new Error(`bad ${STAFF}`)) };
    const config = buildAuthConfig({ db, mailer: failing, getClientIp: async () => null, env: ENV, defer: (t) => void deferred.push(t) });
    const run = (request: Request) =>
      Auth(request, { ...config, secret: "test-secret-for-auth-wiring-tests", trustHost: true, basePath: "/api/auth" });

    const csrfRes = await run(new Request(`${ORIGIN}/api/auth/csrf`));
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const cookie = csrfRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const post = (email: string) =>
      run(
        new Request(`${ORIGIN}/api/auth/signin/resend`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", cookie },
          body: new URLSearchParams({ email, csrfToken, callbackUrl: `${ORIGIN}/admin` }),
        }),
      );
    const staff = await post(STAFF);
    const stranger = await post("stranger@example.org");
    expect(staff.headers.get("location")).toBe(stranger.headers.get("location"));
    expect(failing.sendMagicLink).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);

    lines.length = 0;
    await deferred[0]();
    expect(failing.sendMagicLink).toHaveBeenCalledOnce();
    expect(lines).toEqual(["[auth] Login link email failed: Error"]);
  });

  it("an invalid email gets one warn line, no query, and no email", async () => {
    const select = vi.spyOn(db, "select");
    await requestLink("staff\0@example.org");
    expect(select).not.toHaveBeenCalled();
    expect(mailer.sendMagicLink).not.toHaveBeenCalled();
    expect(lines).toEqual(["[auth] Refused link request: not a valid email address."]);
  });

  it("an AdapterError logs its classes and code only: no SQL, no params, no message text", () => {
    const driverError = Object.assign(new Error('invalid byte sequence for encoding "UTF8": 0x00'), { code: "22021" });
    const queryError = new DrizzleQueryError('select "id" from "staff_admins" where "email" = $1', [STAFF], driverError);
    const config = buildAuthConfig({ db, mailer, getClientIp: async () => null, env: ENV });
    // As Auth.js does it (`lib/init.js`: `new AdapterError(e)`). The public type allows only a string.
    config.logger!.error!(new AdapterError(queryError as unknown as string));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[auth\] Auth\.js error: AdapterError cause DrizzleQueryError cause DatabaseError code=22021\n/);
    for (const secret of ["staff@", "select", "invalid byte"]) expect(lines[0]).not.toContain(secret);
  });

  describe("Login link rate limit", () => {
    const IP = "203.0.113.7";

    beforeEach(() => {
      // Mid-hour, so the requests of one test never cross a window boundary.
      // In the past: the rate limit compares with the database clock, which is not faked.
      vi.useFakeTimers({ toFake: ["Date"], now: new Date("2025-01-01T12:20:00Z") });
    });
    afterEach(() => vi.useRealTimers());

    it("the 11th request for one address in an hour gets the same answer, no email, and no token", async () => {
      const first = await requestLink(STAFF);
      for (let i = 0; i < 9; i++) await requestLink(STAFF);
      expect(mailer.sendMagicLink).toHaveBeenCalledTimes(10);
      lines.length = 0;

      const limited = await requestLink("STAFF@example.org");
      expect(mailer.sendMagicLink).toHaveBeenCalledTimes(10);
      expect(await count(authVerificationTokens)).toBe(10);
      expect(limited.status).toBe(first.status);
      expect(limited.headers.get("location")).toBe(first.headers.get("location"));
      expect(lines).toEqual(["[auth] Magic link not sent: rate limit (email)."]);
    });

    it("the 21st request from one IP is refused; another IP still works", async () => {
      // 11 for staff@ (the 11th hits its email limit) + 9 for second@ = 20 IP hits.
      for (let i = 0; i < 11; i++) await requestLink(STAFF, { ip: IP });
      for (let i = 0; i < 9; i++) await requestLink("second@example.org", { ip: IP });
      expect(mailer.sendMagicLink).toHaveBeenCalledTimes(19);
      await requestLink("second@example.org", { ip: IP });
      expect(mailer.sendMagicLink).toHaveBeenCalledTimes(19);
      expect(lines.at(-1)).toBe("[auth] Magic link not sent: rate limit (ip).");
      await requestLink("second@example.org", { ip: "198.51.100.2" });
      expect(mailer.sendMagicLink).toHaveBeenCalledTimes(20);
    });

    it("a link click is not counted", async () => {
      await requestLink(STAFF, { ip: IP });
      const before = await db.select().from(rateLimits);
      await handle(new Request(sent[0].url, { headers: { "x-forwarded-for": IP } }));
      expect(await count(authSessions)).toBe(1);
      expect(await db.select().from(rateLimits)).toEqual(before);
    });

    it("with no rate_limits table, a Staff admin still gets the link (fail open), and the log has no email or IP", async () => {
      const fresh = await createTestDb();
      try {
        await fresh.db.execute(sql`DROP TABLE rate_limits`);
        const res = await requestLink(STAFF, { ip: IP, database: fresh.db });
        expect(res.status).toBe(302);
        expect(mailer.sendMagicLink).toHaveBeenCalledOnce();
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatch(/^\[auth\] Magic-link rate limit failed; request allowed: \S/);
        expect(lines[0]).toContain("42P01"); // undefined_table
        for (const secret of ["staff@", "203.0.113", "rate_limits"]) expect(lines[0]).not.toContain(secret);
      } finally {
        await fresh.close();
      }
    });
  });
});
