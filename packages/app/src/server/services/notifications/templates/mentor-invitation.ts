import type { RenderedEmail } from "@/server/services/notifications/email-sender.port";
import { escapeHtml } from "@/server/services/notifications/templates/html";

/** The public page an invitation link opens (accounts Flow 3 step 2): `/invite/<token>`. */
export const INVITE_PATH_PREFIX = "/invite/";

export interface MentorInvitationData {
  /** `config.app().url`: every link is absolute on this origin. */
  appUrl: URL;
  /** The bound address the invitation was sent to; only a verified account with it can accept. */
  email: string;
  /** The raw token; it travels only inside the link and is never stored. */
  token: string;
  /** How long the link stays valid, for the copy (14 days in AD5). */
  expiresInDays: number;
}

/** The invitation link: `<APP_URL>/invite/<token>`; any path on `APP_URL` is ignored. */
export function mentorInvitationUrl({ appUrl, token }: Pick<MentorInvitationData, "appUrl" | "token">): URL {
  return new URL(`${INVITE_PATH_PREFIX}${encodeURIComponent(token)}`, appUrl);
}

/** The "you are invited to mentor" message sent by `invite create` and `invite resend`. */
export function mentorInvitationEmail(data: MentorInvitationData): RenderedEmail {
  const link = mentorInvitationUrl(data).href;
  const subject = "You're invited to mentor on DevMentor";
  const lines = {
    intro: "The DevMentor team invites you to join DevMentor as a mentor.",
    action: `Open the link below, then sign in or create an account with this email address (${data.email}). Only an account with this verified address can accept the invitation.`,
    expiry: `The invitation expires in ${data.expiresInDays} days and works once. If you did not expect it, you can ignore this email.`,
  };
  const text = ["Hello,", "", lines.intro, "", lines.action, "", link, "", lines.expiry].join("\n");
  const html = [
    "<p>Hello,</p>",
    `<p>${escapeHtml(lines.intro)}</p>`,
    `<p>${escapeHtml(lines.action)}</p>`,
    `<p><a href="${escapeHtml(link)}">Open your invitation</a></p>`,
    `<p>If the link does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>`,
    `<p>${escapeHtml(lines.expiry)}</p>`,
  ].join("\n");
  return { subject, text, html };
}
