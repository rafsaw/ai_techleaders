import type { RenderedEmail } from "@/server/services/notifications/email-sender.port";
import { escapeHtml } from "@/server/services/notifications/templates/html";

/** The public page a confirmation link opens (accounts Flow 2, AD7). */
export const CONFIRM_EMAIL_PATH = "/confirm-email";

export interface EmailConfirmationData {
  /** `config.app().url`: every link is absolute on this origin. */
  appUrl: URL;
  displayName: string;
  /** The raw token; it travels only inside the link and is never stored. */
  token: string;
  /** A validated internal path, carried in the link so it is never stored. */
  returnTo?: string;
  /** How long the link stays valid, for the copy (24 hours in Flow 2). */
  expiresInHours: number;
}

/** The confirmation link: `<APP_URL>/confirm-email?token=…[&returnTo=…]`. */
export function emailConfirmationUrl({ appUrl, token, returnTo }: Pick<EmailConfirmationData, "appUrl" | "token" | "returnTo">): URL {
  const url = new URL(CONFIRM_EMAIL_PATH, appUrl);
  url.searchParams.set("token", token);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url;
}

/** The "confirm your email address" message sent on registration and resend. */
export function emailConfirmationEmail(data: EmailConfirmationData): RenderedEmail {
  const link = emailConfirmationUrl(data).href;
  const hours = `${data.expiresInHours} hours`;
  const subject = "Confirm your email address for DevMentor";
  const text = [
    `Hi ${data.displayName},`,
    "",
    "To finish creating your DevMentor account, open this link and enter the password you chose:",
    "",
    link,
    "",
    `The link expires in ${hours}. If you did not create a DevMentor account, you can ignore this email.`,
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(data.displayName)},</p>`,
    "<p>To finish creating your DevMentor account, open this link and enter the password you chose:</p>",
    `<p><a href="${escapeHtml(link)}">Confirm your email address</a></p>`,
    `<p>If the link does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>`,
    `<p>The link expires in ${escapeHtml(hours)}. If you did not create a DevMentor account, you can ignore this email.</p>`,
  ].join("\n");
  return { subject, text, html };
}
