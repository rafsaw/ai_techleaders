import { setTimeout as delay } from "node:timers/promises";

import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

/** Keep in sync with the `mailpit` service in docker-compose.yml. */
export const MAILPIT_IMAGE = "axllent/mailpit:v1.31.6";

/** The sender the app under test uses (`MAIL_FROM`). */
export const INTEGRATION_MAIL_FROM = "DevMentor <no-reply@devmentor.test>";

const SMTP_PORT = 1025;
const API_PORT = 8025;

export interface StartedMailpit {
  container: StartedTestContainer;
  /** `SMTP_URL` for the app under test. */
  smtpURL: string;
  /** Base URL of the HTTP API (and web UI). */
  apiURL: string;
}

/** Starts an ephemeral Mailpit: SMTP on 1025, HTTP API on 8025. */
export async function startMailpit(): Promise<StartedMailpit> {
  const container = await new GenericContainer(MAILPIT_IMAGE)
    .withExposedPorts(SMTP_PORT, API_PORT)
    .withWaitStrategy(Wait.forHttp("/readyz", API_PORT))
    .withStartupTimeout(60_000)
    .start();
  const host = container.getHost();
  return {
    container,
    smtpURL: `smtp://${host}:${container.getMappedPort(SMTP_PORT)}`,
    apiURL: `http://${host}:${container.getMappedPort(API_PORT)}`,
  };
}

interface Address {
  Name: string;
  Address: string;
}

/** One entry of `GET /api/v1/messages`. */
export interface MailpitSummary {
  ID: string;
  From: Address;
  To: Address[];
  Subject: string;
  Created: string;
}

/** `GET /api/v1/message/{ID}`, reduced to what the tests read. */
export interface MailpitMessage extends MailpitSummary {
  Text: string;
  HTML: string;
}

/**
 * The integration inbox, read over Mailpit's HTTP API. Messages are returned
 * newest first, as Mailpit lists them.
 */
export class MailpitInbox {
  constructor(private readonly apiURL: string) {}

  async messages(): Promise<MailpitSummary[]> {
    const body = await this.#request<{ messages: MailpitSummary[] }>("GET", "/api/v1/messages?limit=500");
    return body.messages;
  }

  /** Messages addressed to `recipient` (case-insensitive), newest first. */
  async messagesTo(recipient: string): Promise<MailpitSummary[]> {
    const wanted = recipient.toLowerCase();
    return (await this.messages()).filter((message) =>
      message.To.some((to) => to.Address.toLowerCase() === wanted));
  }

  /** The full message with its text and HTML bodies. */
  async message(id: string): Promise<MailpitMessage> {
    return this.#request<MailpitMessage>("GET", `/api/v1/message/${encodeURIComponent(id)}`);
  }

  /** Polls until at least `count` messages reached `recipient`; returns the newest in full. */
  async waitForMessageTo(recipient: string, { count = 1, timeoutMs = 10_000 } = {}): Promise<MailpitMessage> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = await this.messagesTo(recipient);
      if (found.length >= count) return this.message(found[0]!.ID);
      if (Date.now() > deadline) throw new Error(`Expected ${count} message(s) to ${recipient} within ${timeoutMs} ms, found ${found.length}`);
      await delay(100);
    }
  }

  /** Deletes every message. */
  async clear(): Promise<void> {
    await this.#request("DELETE", "/api/v1/messages");
  }

  async #request<T>(method: "GET" | "DELETE", path: string): Promise<T> {
    const response = await fetch(new URL(path, this.apiURL), { method, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`Mailpit ${method} ${path} answered ${response.status}: ${await response.text()}`);
    return (method === "GET" ? await response.json() : undefined) as T;
  }
}

/** Absolute http(s) links in a plain-text body, in order. */
export function linksIn(text: string): URL[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"]+/g)].map(([link]) => new URL(link));
}
