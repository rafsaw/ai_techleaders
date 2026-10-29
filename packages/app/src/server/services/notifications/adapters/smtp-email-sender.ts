import { createTransport, type SMTPSentMessageInfo } from "nodemailer";

import type { AppConfig } from "@/server/config";
import {
  EmailSendError,
  type EmailMessage,
  type EmailSender,
} from "@/server/services/notifications/email-sender.port";

/**
 * Bounded waits, so a request that sends mail (sign-up, resend) fails in
 * seconds instead of nodemailer's default minutes when SMTP is unreachable.
 */
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000 };

function createSmtpTransport(url: string) {
  return createTransport({ url, ...TIMEOUTS });
}

/**
 * The `EmailSender` port over SMTP with nodemailer. `config.email()` is read
 * on the first `send`, not on construction, so resolving a service that
 * depends on `emailSender` never requires `SMTP_URL`/`MAIL_FROM`. Registered
 * as a SINGLETON: the transport is built once and reused.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly config: Pick<AppConfig, "email">;
  #transport: ReturnType<typeof createSmtpTransport> | undefined;

  constructor({ config }: { config: Pick<AppConfig, "email"> }) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<void> {
    const { smtpUrl, from } = this.config.email();
    this.#transport ??= createSmtpTransport(smtpUrl);
    let info: SMTPSentMessageInfo;
    try {
      info = await this.#transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      throw new EmailSendError("SMTP server did not accept the message", { cause: error });
    }
    // nodemailer resolves when some recipients were refused; one `to` means all were.
    if (info.rejected.length > 0) throw new EmailSendError("SMTP server rejected the recipient");
  }
}
