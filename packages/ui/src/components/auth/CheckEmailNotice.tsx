import { Notice } from "@devmentor/ui/frontend/feedback/Notice";

// The outcome of sending a confirmation email (E01 Flow 2): after sign-up on /sign-up/check-email
// and after Resend confirmation on /sign-in. One sentence, no cause and no countdown (SM-AC3,
// SM-AC4). Public kit only (F3). Docs: check-email-notice.mdx.

export const CHECK_EMAIL_EXPIRY = "The link expires in 24 hours.";
export const EMAIL_NOT_SENT = "We couldn't send the email. Please try again later.";

export interface CheckEmailNoticeProps {
  /** The address the link went to, as the API answered it. */
  email: string;
  /** `false` when SMTP failed or the per-address allowance is used up; the page never says which. */
  emailSent: boolean;
  className?: string;
}

export function CheckEmailNotice({ email, emailSent, className }: CheckEmailNoticeProps) {
  return emailSent ? (
    <Notice variant="success" title={<span className="wrap-anywhere">Check your inbox at {email}</span>} className={className}>
      {CHECK_EMAIL_EXPIRY}
    </Notice>
  ) : (
    <Notice variant="error" title={EMAIL_NOT_SENT} className={className} />
  );
}
