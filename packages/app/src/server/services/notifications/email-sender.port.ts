// The outbound email port (platform P10). Callers depend on this interface
// only; the SMTP adapter in `adapters/` implements it with nodemailer and the
// memory adapter records messages for unit tests.

/** One message to one recipient. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** What a template in `templates/` renders; every link inside is absolute. */
export type RenderedEmail = Required<Omit<EmailMessage, "to">>;

/**
 * The SMTP server did not accept a message, or the transport could not be
 * configured. The message is generic; the vendor error is only the `cause`,
 * because SMTP replies can echo addresses and server details.
 */
export class EmailSendError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmailSendError";
  }
}

export interface EmailSender {
  /**
   * Resolves once the SMTP server has accepted the message. That means it was
   * submitted, never that inbox delivery was confirmed. Throws on failure;
   * what to do then (keep state, offer resend) is the caller's policy.
   */
  send(message: EmailMessage): Promise<void>;
}
