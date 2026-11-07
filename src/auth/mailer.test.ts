import { describe, expect, it, vi } from "vitest";
import { composeMagicLinkEmail, createMailer, DEFAULT_EMAIL_FROM } from "./mailer";

const url = "http://localhost:3000/api/auth/callback/resend?token=abc&email=a%40b.org";

describe("composeMagicLinkEmail", () => {
  it("has the link, the login page, and an HTML-escaped href", () => {
    const email = composeMagicLinkEmail({ url, loginUrl: "http://localhost:3000/login" });
    expect(email.subject).toBe("Log in to the MomsBloom Resource Directory Admin");
    expect(email.text).toContain(url);
    expect(email.text).toContain("http://localhost:3000/login");
    expect(email.html).toContain("token=abc&amp;email");
    expect(email.html).not.toContain("token=abc&email");
  });

  it("escapes HTML in the login page URL", () => {
    const email = composeMagicLinkEmail({ url, loginUrl: 'http://x/login"><script>' });
    expect(email.html).toContain("&quot;&gt;&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });
});

describe("createMailer", () => {
  it("console transport prints the link", async () => {
    const log = vi.fn();
    const resendFactory = vi.fn();
    const mailer = createMailer({ env: {}, log, resendFactory });
    expect(mailer.transport).toBe("console");

    await mailer.sendMagicLink({ to: "a@b.org", url, loginUrl: "http://x/login" });

    expect(resendFactory).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toContain(url);
  });

  it("console transport is refused on every Vercel deployment, Preview included", () => {
    expect(() => createMailer({ env: { VERCEL: "1", VERCEL_ENV: "production" } })).toThrow(/RESEND_API_KEY/);
    expect(() => createMailer({ env: { VERCEL: "1", VERCEL_ENV: "preview" } })).toThrow(/RESEND_API_KEY/);
  });

  it("resend transport sends the link from EMAIL_FROM", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "1" }, error: null });
    const resendFactory = vi.fn().mockReturnValue({ emails: { send } });
    const mailer = createMailer({
      env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "Test <test@example.org>" },
      resendFactory,
    });
    expect(mailer.transport).toBe("resend");

    await mailer.sendMagicLink({ to: "a@b.org", url, loginUrl: "http://x/login" });

    expect(resendFactory).toHaveBeenCalledWith("re_test");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Test <test@example.org>", to: "a@b.org", text: expect.stringContaining(url) }),
    );
  });

  it("without EMAIL_FROM, the From is the MomsBloom no-reply address", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "1" }, error: null });
    const mailer = createMailer({ env: { RESEND_API_KEY: "re_test" }, resendFactory: () => ({ emails: { send } }) });
    await mailer.sendMagicLink({ to: "a@b.org", url, loginUrl: "http://x/login" });
    expect(DEFAULT_EMAIL_FROM).toBe('"MomsBloom Resources" <no-reply@momsbloom.org>');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: DEFAULT_EMAIL_FROM }));
  });

  it("resend transport throws when Resend returns an error", async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const mailer = createMailer({
      env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "x@y.org" },
      resendFactory: () => ({ emails: { send } }),
    });
    await expect(mailer.sendMagicLink({ to: "a@b.org", url, loginUrl: "http://x/login" })).rejects.toThrow(
      /domain not verified/,
    );
  });
});
