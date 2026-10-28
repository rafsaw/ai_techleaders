import type { EmailMessage, EmailSender } from "@/server/services/notifications/email-sender.port";

/**
 * An in-memory `EmailSender` for unit tests: it records every accepted
 * message in `sent`, and rejects with `failWith` while that is set, recording
 * nothing, so callers' send-failure paths can be exercised.
 */
export class MemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  failWith: Error | undefined;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push({ ...message });
  }
}
