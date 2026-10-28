import { ConfigError, fixedClock, hashToken, isAppError, type AppError } from "@devmentor/core";
import { LockMode, MentorInvitation, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { INVITATION_LIFETIME_DAYS } from "@/server/services/auth/mentor-invitation.policy";
import { MentorInvitationService } from "@/server/services/auth/mentor-invitation.service";
import { MemoryEmailSender } from "@/server/services/notifications/adapters/memory-email-sender";
import { EmailSendError } from "@/server/services/notifications/email-sender.port";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_LATER = new Date("2026-11-11T12:00:00.000Z");
const EMAIL = "ada@example.com";

type Row = {
  id: string; email: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null; revokedAt: Date | null;
  createdAt: Date;
};

function row(overrides: Partial<Row> & Pick<Row, "id">): Row {
  return {
    email: EMAIL, tokenHash: hashToken(`raw-${overrides.id}`), expiresAt: new Date(NOW.getTime() + DAY),
    consumedAt: null, revokedAt: null, createdAt: new Date("2026-10-01T00:00:00Z"), ...overrides,
  };
}

const isOpen = (candidate: Row) => candidate.consumedAt === null && candidate.revokedAt === null;

/**
 * In-memory `mentor_invitations` behind the `em` calls the service makes,
 * with the partial unique open-email index enforced on flush and one ordered
 * `events` log shared with the email sender, so tests can assert what
 * happens inside and after the transaction. A throwing transaction rolls back.
 */
function setup({ rows = [] as Row[], appUrl = "https://devmentor.test" as string | null } = {}) {
  const events: string[] = [];
  const table = rows.map((item) => ({ ...item }));
  const hooks: { beforeInsert?: () => void; flushError?: Error } = {};
  let pending: Row[] = [];
  let sequence = 0;

  const matches = (candidate: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => candidate[key as keyof Row] === value);

  const tx = {
    findOne: vi.fn(async (entity: unknown, where: Record<string, unknown>, options?: { lockMode?: LockMode; orderBy?: unknown }) => {
      expect(entity).toBe(MentorInvitation);
      if (options?.lockMode !== undefined) {
        expect(options.lockMode).toBe(LockMode.PESSIMISTIC_WRITE);
        events.push("lock");
      }
      const found = table.filter((candidate) => matches(candidate, where));
      if (options?.orderBy) {
        expect(options.orderBy).toEqual({ createdAt: "desc" });
        found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return found[0] ?? null;
    }),
    create: vi.fn((entity: unknown, data: Omit<Row, "id" | "createdAt">) => {
      expect(entity).toBe(MentorInvitation);
      return { id: "", createdAt: NOW, ...data } as Row;
    }),
    persist: vi.fn((item: Row) => { pending.push(item); }),
    flush: vi.fn(async () => {
      events.push("flush");
      if (hooks.flushError) throw hooks.flushError;
      for (const item of pending) {
        hooks.beforeInsert?.();
        if (table.some((candidate) => isOpen(candidate) && candidate.email === item.email)) {
          throw new UniqueConstraintViolationException(new Error("duplicate key value violates mentor_invitations_open_email_unique"));
        }
        sequence += 1;
        item.id = `inv-new-${sequence}`;
        table.push(item);
      }
      pending = [];
    }),
  };

  const em = {
    transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>, options: unknown) => {
      expect(options).toEqual({ clear: true });
      events.push("begin");
      const saved = table.map((item) => [item, { ...item }] as const);
      const committedBefore = new Set(table);
      pending = [];
      try {
        const result = await callback(tx);
        await tx.flush();
        events.push("commit");
        return result;
      } catch (error) {
        // Rows this transaction inserted go; rows committed by others stay.
        for (const [item, copy] of saved) Object.assign(item, copy);
        table.splice(0, table.length, ...table.filter((item) => committedBefore.has(item) || !item.id.startsWith("inv-new-")));
        pending = [];
        events.push("rollback");
        throw error;
      }
    }),
  };

  const emailSender = new MemoryEmailSender();
  vi.spyOn(emailSender, "send").mockImplementation(async (message) => {
    events.push("send");
    if (emailSender.failWith) throw emailSender.failWith;
    emailSender.sent.push(message);
  });
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const service = new MentorInvitationService({
    em: em as unknown as EntityManager,
    clock: fixedClock(NOW),
    config: createAppConfig(appUrl === null ? {} : { APP_URL: appUrl }),
    logger,
    emailSender,
  });
  return { service, events, table, hooks, emailSender, logger };
}

/** The raw token carried by the only link in an email's text. */
function tokenIn(text: string): string {
  const match = /https:\/\/devmentor\.test\/invite\/([A-Za-z0-9_-]{43})\n/.exec(text);
  if (!match) throw new Error("no invitation link in the email");
  return match[1]!;
}

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (isAppError(error)) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("MentorInvitationService.create", () => {
  it("commits one open invitation expiring exactly 14 days ahead, then emails the link to that address only", async () => {
    const t = setup();
    const result = await t.service.create({ email: EMAIL });

    expect(INVITATION_LIFETIME_DAYS).toBe(14);
    expect(result).toEqual({ id: "inv-new-1", email: EMAIL, expiresAt: FOURTEEN_DAYS_LATER, emailSent: true });
    expect(t.events).toEqual(["begin", "lock", "flush", "flush", "commit", "send"]);
    expect(t.table).toHaveLength(1);
    expect(t.table[0]).toMatchObject({ email: EMAIL, expiresAt: FOURTEEN_DAYS_LATER, consumedAt: null, revokedAt: null });

    expect(t.emailSender.sent).toHaveLength(1);
    const [message] = t.emailSender.sent;
    expect(message!.to).toBe(EMAIL);
    expect(message!.subject).toBe("You're invited to mentor on DevMentor");
    const token = tokenIn(message!.text);
    // Only the hash is stored; the raw token is only in the email.
    expect(t.table[0]!.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(t.table)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain(token);
    expect(message!.html).toContain(`href="https://devmentor.test/invite/${token}"`);
  });

  it("builds the link on APP_URL's origin", async () => {
    const t = setup({ appUrl: "http://localhost:3000/ignored/path" });
    await t.service.create({ email: EMAIL });
    expect(t.emailSender.sent[0]!.text).toMatch(/\nhttp:\/\/localhost:3000\/invite\/[A-Za-z0-9_-]{43}\n/);
  });

  it("refuses a still-valid open invitation: no new row, nothing sent", async () => {
    const t = setup({ rows: [row({ id: "inv-1", expiresAt: new Date(NOW.getTime() + 1) })] });
    const error = await failure(t.service.create({ email: EMAIL }));
    expect(error.code).toBe("conflict");
    expect(error.status).toBe(409);
    expect(error.message).toBe("ada@example.com already has an open invitation. Use invite resend or revoke.");
    expect(t.events).toEqual(["begin", "lock", "rollback"]);
    expect(t.table).toEqual([row({ id: "inv-1", expiresAt: new Date(NOW.getTime() + 1) })]);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("closes an expired open invitation in the same transaction before inserting the new one", async () => {
    // Expiry exactly at now is expired, as in the single-use token helpers.
    const t = setup({ rows: [row({ id: "inv-1", expiresAt: NOW })] });
    const result = await t.service.create({ email: EMAIL });
    expect(result.emailSent).toBe(true);
    expect(t.events).toEqual(["begin", "lock", "flush", "flush", "flush", "commit", "send"]);
    expect(t.table[0]).toMatchObject({ id: "inv-1", revokedAt: NOW, consumedAt: null });
    expect(t.table.filter(isOpen).map((item) => item.id)).toEqual(["inv-new-1"]);
  });

  it("is not blocked by revoked or accepted invitations of the address", async () => {
    const t = setup({
      rows: [row({ id: "inv-1", revokedAt: NOW }), row({ id: "inv-2", consumedAt: NOW })],
    });
    await expect(t.service.create({ email: EMAIL })).resolves.toMatchObject({ id: "inv-new-1", emailSent: true });
    expect(t.table.filter(isOpen)).toHaveLength(1);
  });

  it("maps a concurrent create that committed first (partial unique index) to the same conflict", async () => {
    const t = setup();
    t.hooks.beforeInsert = () => {
      t.hooks.beforeInsert = undefined;
      t.table.push(row({ id: "inv-concurrent" }));
    };
    const error = await failure(t.service.create({ email: EMAIL }));
    expect(error.code).toBe("conflict");
    expect(error.message).toMatch(/Use invite resend or revoke\.$/);
    expect(t.events.at(-1)).toBe("rollback");
    expect(t.table.map((item) => item.id)).toEqual(["inv-concurrent"]);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("rethrows any other transaction failure and sends nothing", async () => {
    const t = setup();
    t.hooks.flushError = new Error("connection lost");
    await expect(t.service.create({ email: EMAIL })).rejects.toThrow("connection lost");
    expect(t.table).toEqual([]);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("keeps the committed invitation when SMTP refuses, and logs only a safe summary", async () => {
    const t = setup();
    t.emailSender.failWith = new EmailSendError("SMTP send failed", { cause: new Error("550 ada@example.com unknown") });
    const result = await t.service.create({ email: EMAIL });
    expect(result).toEqual({ id: "inv-new-1", email: EMAIL, expiresAt: FOURTEEN_DAYS_LATER, emailSent: false });
    expect(t.events).toEqual(["begin", "lock", "flush", "flush", "commit", "send"]);
    expect(t.table).toHaveLength(1);
    expect(t.logger.warn).toHaveBeenCalledWith("Mentor invitation email was not sent", {
      invitationId: "inv-new-1",
      cause: { name: "EmailSendError" },
    });
    const logged = JSON.stringify(t.logger.warn.mock.calls);
    expect(logged).not.toContain("550");
    expect(logged).not.toContain("/invite/");
  });

  it("reports not sent, after commit, when the app or mail configuration is missing", async () => {
    const t = setup({ appUrl: null });
    const result = await t.service.create({ email: EMAIL });
    expect(result.emailSent).toBe(false);
    expect(t.events).toEqual(["begin", "lock", "flush", "flush", "commit"]);
    expect(t.logger.warn.mock.calls[0]![1]).toMatchObject({ cause: { name: "ConfigError" } });

    const mail = setup();
    mail.emailSender.failWith = new ConfigError(["SMTP_URL"], []);
    await expect(mail.service.create({ email: EMAIL })).resolves.toMatchObject({ emailSent: false });
  });
});

describe("MentorInvitationService.resend", () => {
  it("locks the open row, rotates its hash and sets a new 14-day expiry, then emails the new link", async () => {
    const original = row({ id: "inv-1", expiresAt: new Date(NOW.getTime() + DAY) });
    const t = setup({ rows: [original] });
    const result = await t.service.resend({ email: EMAIL });
    expect(result).toEqual({ id: "inv-1", email: EMAIL, expiresAt: FOURTEEN_DAYS_LATER, emailSent: true });
    expect(t.events).toEqual(["begin", "lock", "flush", "commit", "send"]);
    const token = tokenIn(t.emailSender.sent[0]!.text);
    expect(t.emailSender.sent[0]!.to).toBe(EMAIL);
    expect(t.table).toHaveLength(1);
    expect(t.table[0]!.tokenHash).toBe(hashToken(token));
    // The old link's hash is gone: it can no longer match any row.
    expect(t.table.some((item) => item.tokenHash === original.tokenHash)).toBe(false);
    expect(token).not.toBe("raw-inv-1");
  });

  it("resends an expired but unrevoked invitation", async () => {
    const t = setup({ rows: [row({ id: "inv-1", expiresAt: new Date(NOW.getTime() - DAY) })] });
    await expect(t.service.resend({ email: EMAIL })).resolves.toMatchObject({ id: "inv-1", expiresAt: FOURTEEN_DAYS_LATER });
    expect(t.table[0]!.revokedAt).toBeNull();
  });

  it.each([
    ["accepted", { consumedAt: NOW }],
    ["revoked", { revokedAt: NOW }],
  ])("refuses to reopen an %s invitation (use create)", async (_label, closed) => {
    const t = setup({ rows: [row({ id: "inv-1", ...closed })] });
    const before = JSON.stringify(t.table);
    const error = await failure(t.service.resend({ email: EMAIL }));
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("ada@example.com has no open invitation to resend. Use invite create.");
    expect(t.events).toEqual(["begin", "lock", "rollback"]);
    expect(JSON.stringify(t.table)).toBe(before);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("refuses an address without any invitation", async () => {
    const t = setup();
    expect((await failure(t.service.resend({ email: EMAIL }))).code).toBe("not_found");
  });

  it("keeps the rotated hash when SMTP refuses: the old link stays invalid", async () => {
    const original = row({ id: "inv-1" });
    const t = setup({ rows: [original] });
    t.emailSender.failWith = new EmailSendError("SMTP send failed");
    const result = await t.service.resend({ email: EMAIL });
    expect(result).toMatchObject({ id: "inv-1", emailSent: false, expiresAt: FOURTEEN_DAYS_LATER });
    expect(t.table[0]!.tokenHash).not.toBe(original.tokenHash);
    expect(t.events).toEqual(["begin", "lock", "flush", "commit", "send"]);
  });
});

describe("MentorInvitationService.revoke", () => {
  it("closes the open invitation under a lock", async () => {
    const t = setup({ rows: [row({ id: "inv-1" })] });
    await expect(t.service.revoke({ email: EMAIL })).resolves.toEqual({ outcome: "revoked", id: "inv-1", email: EMAIL });
    expect(t.events).toEqual(["begin", "lock", "flush", "commit"]);
    expect(t.table[0]!.revokedAt).toEqual(NOW);
    expect(t.emailSender.sent).toEqual([]);
  });

  it("closes an expired open invitation too", async () => {
    const t = setup({ rows: [row({ id: "inv-1", expiresAt: new Date(NOW.getTime() - DAY) })] });
    await expect(t.service.revoke({ email: EMAIL })).resolves.toMatchObject({ outcome: "revoked" });
  });

  it("is an idempotent no-op without an open invitation", async () => {
    const t = setup({ rows: [row({ id: "inv-1" })] });
    await t.service.revoke({ email: EMAIL });
    const after = JSON.stringify(t.table);
    await expect(t.service.revoke({ email: EMAIL })).resolves.toEqual({ outcome: "none", email: EMAIL });
    expect(JSON.stringify(t.table)).toBe(after);
    await expect(setup().service.revoke({ email: EMAIL })).resolves.toEqual({ outcome: "none", email: EMAIL });
  });

  it("reports when the latest invitation was already accepted, changing nothing", async () => {
    const acceptedAt = new Date("2026-10-20T09:00:00Z");
    const t = setup({
      rows: [
        row({ id: "inv-old", revokedAt: NOW, createdAt: new Date("2026-10-01T00:00:00Z") }),
        row({ id: "inv-accepted", consumedAt: acceptedAt, createdAt: new Date("2026-10-10T00:00:00Z") }),
        row({ id: "inv-other", email: "bob@example.com", createdAt: new Date("2026-10-15T00:00:00Z") }),
      ],
    });
    const before = JSON.stringify(t.table);
    await expect(t.service.revoke({ email: EMAIL })).resolves.toEqual({
      outcome: "already-accepted", id: "inv-accepted", email: EMAIL, acceptedAt,
    });
    expect(JSON.stringify(t.table)).toBe(before);
  });

  it("does not report acceptance when a later invitation was revoked", async () => {
    const t = setup({
      rows: [
        row({ id: "inv-accepted", consumedAt: NOW, createdAt: new Date("2026-10-01T00:00:00Z") }),
        row({ id: "inv-revoked", revokedAt: NOW, createdAt: new Date("2026-10-10T00:00:00Z") }),
      ],
    });
    await expect(t.service.revoke({ email: EMAIL })).resolves.toEqual({ outcome: "none", email: EMAIL });
  });
});
