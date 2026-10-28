import { ConfigError } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});

vi.mock("nodemailer", () => ({ createTransport }));

import { createAppConfig } from "@/server/config";
import { SmtpEmailSender } from "@/server/services/notifications/adapters/smtp-email-sender";
import { EmailSendError } from "@/server/services/notifications/email-sender.port";

const env = { SMTP_URL: "smtp://localhost:1025", MAIL_FROM: "DevMentor <no-reply@devmentor.test>" };
const message = { to: "ada@example.com", subject: "Confirm", text: "Open the link", html: "<p>Open the link</p>" };

beforeEach(() => {
  createTransport.mockClear();
  sendMail.mockReset();
});

describe("SmtpEmailSender", () => {
  it("resolves once the SMTP server accepts the message, from MAIL_FROM", async () => {
    sendMail.mockResolvedValue({ accepted: ["ada@example.com"], rejected: [] });
    const sender = new SmtpEmailSender({ config: createAppConfig(env) });
    await expect(sender.send(message)).resolves.toBeUndefined();
    expect(createTransport).toHaveBeenCalledWith({
      url: "smtp://localhost:1025",
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    expect(sendMail).toHaveBeenCalledWith({ from: "DevMentor <no-reply@devmentor.test>", ...message });
  });

  it("builds the transport once and reuses it", async () => {
    sendMail.mockResolvedValue({ accepted: ["ada@example.com"], rejected: [] });
    const sender = new SmtpEmailSender({ config: createAppConfig(env) });
    await sender.send(message);
    await sender.send({ to: "grace@example.com", subject: "Hi", text: "Plain only" });
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: "DevMentor <no-reply@devmentor.test>",
      to: "grace@example.com",
      subject: "Hi",
      text: "Plain only",
      html: undefined,
    });
  });

  it("propagates a transport failure as EmailSendError with the vendor error as cause", async () => {
    const vendor = new Error("connect ECONNREFUSED 127.0.0.1:1025");
    sendMail.mockRejectedValue(vendor);
    const sender = new SmtpEmailSender({ config: createAppConfig(env) });
    const error = await sender.send(message).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EmailSendError);
    expect(error).toMatchObject({ name: "EmailSendError", message: "SMTP server did not accept the message", cause: vendor });
  });

  it("fails when the server refuses the recipient", async () => {
    sendMail.mockResolvedValue({ accepted: [], rejected: ["ada@example.com"] });
    const sender = new SmtpEmailSender({ config: createAppConfig(env) });
    await expect(sender.send(message)).rejects.toThrow(new EmailSendError("SMTP server rejected the recipient"));
  });

  it("needs no SMTP config to construct; a missing SMTP_URL throws ConfigError on send", async () => {
    const sender = new SmtpEmailSender({ config: createAppConfig({ MAIL_FROM: env.MAIL_FROM }) });
    await expect(sender.send(message)).rejects.toThrow(new ConfigError(["SMTP_URL"], []));
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
