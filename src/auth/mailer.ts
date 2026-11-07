/**
 * Sends Login link emails. Resend when `RESEND_API_KEY` is set; else the console transport prints
 * the link (local development only — it is refused on every Vercel deployment).
 */
import { Resend } from "resend";

export const DEFAULT_EMAIL_FROM = '"MomsBloom Resources" <no-reply@momsbloom.org>';

export interface MagicLinkMessage {
  to: string;
  url: string;
  /** The login page, where the person can get a new link. */
  loginUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function composeMagicLinkEmail(message: Omit<MagicLinkMessage, "to">) {
  const subject = "Log in to the MomsBloom Resource Directory Admin";
  const intro = "Use this Login link to log in to the MomsBloom Resource Directory Admin:";
  const outro =
    `The link works once and expires in 24 hours. To get a new link, go to ${message.loginUrl}. ` +
    "If you did not ask for this email, you can ignore it.";

  const text = `${intro}\n\n${message.url}\n\n${outro}\n`;
  const html =
    `<p>${escapeHtml(intro)}</p>` +
    `<p><a href="${escapeHtml(message.url)}">Log in to the Admin</a></p>` +
    `<p>${escapeHtml(outro)}</p>`;
  return { subject, text, html };
}

interface ResendLike {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
    }): Promise<{ error: { message: string } | null }>;
  };
}

export interface Mailer {
  transport: "resend" | "console";
  sendMagicLink(message: MagicLinkMessage): Promise<void>;
}

export interface MailerOptions {
  env?: Record<string, string | undefined>;
  log?: (line: string) => void;
  resendFactory?: (apiKey: string) => ResendLike;
}

export function createMailer(options: MailerOptions = {}): Mailer {
  const env = options.env ?? process.env;
  const apiKey = env.RESEND_API_KEY;

  if (apiKey) {
    const resend = (options.resendFactory ?? ((key) => new Resend(key)))(apiKey);
    const from = env.EMAIL_FROM || DEFAULT_EMAIL_FROM;
    return {
      transport: "resend",
      async sendMagicLink(message) {
        const { error } = await resend.emails.send({
          from,
          to: message.to,
          ...composeMagicLinkEmail(message),
        });
        if (error) throw new Error(`Resend could not send the Login link: ${error.message}`);
      },
    };
  }

  // Vercel sets VERCEL=1 on every deployment (Production and Preview). Its logs must never hold
  // Login links.
  if (env.VERCEL) {
    throw new Error("RESEND_API_KEY is not set. The console transport is not allowed on Vercel.");
  }
  const log = options.log ?? ((line: string) => console.info(line));
  return {
    transport: "console",
    async sendMagicLink(message) {
      log(`[login-link] for ${message.to}: ${message.url}`);
    },
  };
}
