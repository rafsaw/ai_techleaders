import { asValue, createAppContainer, fixedClock, type Cradle } from "@devmentor/core";
import type { EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { inviteCreateCommand } from "@/server/cli/commands/invite-create.command";
import { parseInviteFlags } from "@/server/cli/commands/invite-flags";
import { inviteResendCommand } from "@/server/cli/commands/invite-resend.command";
import { inviteRevokeCommand } from "@/server/cli/commands/invite-revoke.command";
import { EXIT, main, type CliDeps } from "@/server/cli/run-cli";
import { createAppConfig } from "@/server/config";
import { MentorInvitationService } from "@/server/services/auth/mentor-invitation.service";
import { MemoryEmailSender } from "@/server/services/notifications/adapters/memory-email-sender";
import { EmailSendError } from "@/server/services/notifications/email-sender.port";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const ENV = { DATABASE_URL: "postgres://devmentor:s3cret@db.internal:5432/devmentor" };

describe("invite create", () => {
  it("is named, documented and parses the shared invite flags", () => {
    expect(inviteCreateCommand.name).toBe("invite create");
    expect(inviteCreateCommand.summary).toMatch(/valid 14 days/);
    expect(inviteCreateCommand.parse).toBe(parseInviteFlags);
  });

  it("creates and prints id, email, expiry and delivery", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "inv-1", email: "ada@example.com", expiresAt: new Date("2026-11-11T12:00:00.000Z"), emailSent: true,
    });
    const out = { info: vi.fn(), error: vi.fn() };
    await inviteCreateCommand.run({ mentorInvitationService: { create } } as unknown as Cradle, { email: "ada@example.com" }, out);
    expect(create).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(out.info.mock.calls).toEqual([
      ["Invitation created: id inv-1, email ada@example.com, expires 2026-11-11T12:00:00.000Z."],
      ["Delivery: email accepted by the mail server."],
    ]);
  });
});

/**
 * The real runner, commands and `MentorInvitationService` over a minimal
 * in-memory `em` (one optional open row), so the test sees exactly what an
 * operator's terminal and the logs would show next to the email that was sent.
 */
function cli({ open = false } = {}) {
  const rows: Array<Record<string, unknown>> = open
    ? [{ id: "inv-open", email: "ada@example.com", expiresAt: new Date(NOW.getTime() + 1000), consumedAt: null, revokedAt: null }]
    : [];
  const tx = {
    findOne: vi.fn(async (_entity: unknown, where: { email: string }) => rows.find((row) => row.email === where.email) ?? null),
    create: vi.fn((_entity: unknown, data: Record<string, unknown>) => ({ ...data })),
    persist: vi.fn((row: Record<string, unknown>) => { row.id = "inv-new"; rows.push(row); }),
    flush: vi.fn(async () => {}),
  };
  const em = { transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>) => callback(tx)) };
  const emailSender = new MemoryEmailSender();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const container = createAppContainer();
  container.register({
    logger: asValue(logger),
    mentorInvitationService: asValue(new MentorInvitationService({
      em: em as unknown as EntityManager,
      clock: fixedClock(NOW),
      config: createAppConfig({ APP_URL: "https://devmentor.test" }),
      logger,
      emailSender,
    })),
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  const deps: CliDeps = {
    commands: [inviteCreateCommand, inviteRevokeCommand, inviteResendCommand],
    output: { info: (line) => { stdout.push(line); }, error: (line) => { stderr.push(line); } },
    loadEnv: vi.fn(),
    loadContainer: async () => ({ container, createRequestScope: () => container.createScope() }),
  };
  /** Everything an operator or log reader could see. */
  const visible = () => [...stdout, ...stderr, JSON.stringify(logger.warn.mock.calls), JSON.stringify(logger.error.mock.calls)].join("\n");
  return { deps, stdout, stderr, emailSender, visible, rows };
}

describe("invite commands through the operator CLI", () => {
  it("create: prints safe status only; the token, link and body appear only in the email", async () => {
    const t = cli();
    await expect(main(["invite", "create", "--email", " Ada@Example.com "], ENV, t.deps)).resolves.toBe(EXIT.ok);
    expect(t.stdout).toEqual([
      "Database: db.internal:5432",
      "Invitation created: id inv-new, email ada@example.com, expires 2026-11-11T12:00:00.000Z.",
      "Delivery: email accepted by the mail server.",
    ]);
    expect(t.stderr).toEqual([]);
    const [message] = t.emailSender.sent;
    expect(message!.to).toBe("ada@example.com");
    const link = /https:\/\/devmentor\.test\/invite\/([A-Za-z0-9_-]{43})/.exec(message!.text)!;
    const visible = t.visible();
    expect(visible).not.toContain(link[1]);
    expect(visible).not.toContain("/invite/");
    expect(visible).not.toContain("http");
    expect(visible).not.toContain("invites you");
  });

  it("create: a refused send exits nonzero with a safe message that asks for resend", async () => {
    const t = cli();
    t.emailSender.failWith = new EmailSendError("SMTP send failed", { cause: new Error("550 5.1.1 <ada@example.com> rejected") });
    await expect(main(["invite", "create", "--email", "ada@example.com"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.stdout.at(-1)).toBe("Invitation created: id inv-new, email ada@example.com, expires 2026-11-11T12:00:00.000Z.");
    expect(t.stderr).toEqual([
      "Delivery: failed, the invitation email was not sent. The invitation is saved. " +
        "Send a new link with: npm run operator -- invite resend --email ada@example.com",
    ]);
    // The invitation stays committed for resend.
    expect(t.rows).toHaveLength(1);
    expect(t.visible()).not.toContain("550");
    expect(t.visible()).not.toContain("/invite/");
  });

  it("create: an active invitation is a nonzero conflict", async () => {
    const t = cli({ open: true });
    await expect(main(["invite", "create", "--email", "ada@example.com"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.stderr).toEqual(["ada@example.com already has an open invitation. Use invite resend or revoke."]);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("resend: a refused send exits nonzero and says the previous link no longer works", async () => {
    const t = cli({ open: true });
    t.emailSender.failWith = new EmailSendError("SMTP send failed");
    await expect(main(["invite", "resend", "--email", "ada@example.com"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.stdout.at(-1)).toBe("Invitation resent: id inv-open, email ada@example.com, expires 2026-11-11T12:00:00.000Z.");
    expect(t.stderr[0]).toMatch(/Its previous link no longer works\. Send a new link with: npm run operator -- invite resend --email ada@example.com$/);
  });

  it("resend: no open invitation is a nonzero refusal pointing at create", async () => {
    const t = cli();
    await expect(main(["invite", "resend", "--email", "ada@example.com"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.stderr).toEqual(["ada@example.com has no open invitation to resend. Use invite create."]);
  });

  it("refuses --note and --expires-in-days before any database work, and unknown flags as usage errors", async () => {
    const t = cli();
    await expect(main(["invite", "create", "--email", "ada@example.com", "--note", "hi"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    await expect(main(["invite", "create", "--email", "ada@example.com", "--expires-in-days", "30"], ENV, t.deps)).resolves.toBe(EXIT.failed);
    await expect(main(["invite", "create", "--email", "ada@example.com", "--role", "mentor"], ENV, t.deps)).resolves.toBe(EXIT.usage);
    expect(t.stderr[0]).toBe("--note is not supported: invitations carry no note.");
    expect(t.stderr[1]).toBe("--expires-in-days is not supported: invitations always expire after 14 days.");
    expect(t.stderr[2]).toMatch(/Unknown option '--role'[\s\S]*Usage: npm run operator -- invite create --email <email>/);
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
    expect(t.rows).toEqual([]);
  });
});
