import type { RenderedEmail } from "@/server/services/notifications/email-sender.port";
import { escapeHtml } from "@/server/services/notifications/templates/html";

/** The sign-in page the message links to. */
export const SIGN_IN_PATH = "/sign-in";

export interface AccountExistsData {
  /** `config.app().url`: every link is absolute on this origin. */
  appUrl: URL;
  /** The account's stored display name, never the name typed into the new registration. */
  displayName: string;
  /** A validated internal path, kept on the sign-in link. */
  returnTo?: string;
}

/** `<APP_URL>/sign-in[?returnTo=…]`. */
export function accountExistsSignInUrl({ appUrl, returnTo }: Pick<AccountExistsData, "appUrl" | "returnTo">): URL {
  const url = new URL(SIGN_IN_PATH, appUrl);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url;
}

/**
 * Sent when someone registers an address that already has a confirmed
 * account (accounts Flow 2). It offers sign-in only: there is no password
 * reset in 1.0 (N03).
 */
export function accountExistsEmail(data: AccountExistsData): RenderedEmail {
  const link = accountExistsSignInUrl(data).href;
  const subject = "You already have a DevMentor account";
  const lines = {
    intro: "Someone, probably you, tried to create a DevMentor account with this email address. You already have one.",
    action: "Sign in with GitHub or with your password:",
    reset:
      "Password reset is not available yet. If you did not try to create an account, you can ignore this email; nothing has changed.",
  };
  const text = [`Hi ${data.displayName},`, "", lines.intro, "", lines.action, "", link, "", lines.reset].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(data.displayName)},</p>`,
    `<p>${escapeHtml(lines.intro)}</p>`,
    `<p>${escapeHtml(lines.action)} <a href="${escapeHtml(link)}">Sign in to DevMentor</a></p>`,
    `<p>If the link does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>`,
    `<p>${escapeHtml(lines.reset)}</p>`,
  ].join("\n");
  return { subject, text, html };
}
