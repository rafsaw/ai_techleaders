import { fixedClock, ProviderUnavailableError, type Logger, type Principal } from "@devmentor/core";
import { MentorProfile, PayoutAccount, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import type { PayoutAccountSnapshot, PayoutOnboarding } from "@/server/services/payments/payout-onboarding.port";
import { PayoutOnboardingService } from "@/server/services/payments/payout-onboarding.service";

const principal: Principal = { userId: "u1", sessionId: "s1", displayName: "Mentor", roles: ["mentor"] };
const config = createAppConfig({ APP_URL: "https://app.example", STRIPE_SECRET_KEY: "key", STRIPE_CONNECT_WEBHOOK_SECRET: "secret" });
const snapshot = (overrides: Partial<PayoutAccountSnapshot> = {}): PayoutAccountSnapshot => ({ accountId: "acct_1", country: "US", metadata: { payoutAccountId: "p1", mentorProfileId: "m1" }, status: "ready", ...overrides });

function setup() {
  const profile = Object.assign(new MentorProfile(), { id: "m1" });
  let hasProfile = true;
  let row: PayoutAccount | null = null;
  const makeRow = (overrides: Partial<PayoutAccount> = {}) => Object.assign(new PayoutAccount(), { id: "p1", mentorProfile: profile, country: "US", stripeAccountId: null, provisioningState: "pending" as const, status: "incomplete" as const, lastReconciledAt: null }, overrides);
  const findOne = vi.fn(async (entity: unknown, where: Record<string, string>) => {
    if (entity === MentorProfile) return hasProfile ? profile : null;
    if (!row) return null;
    if (where.id && where.id !== row.id) return null;
    if (where.stripeAccountId && where.stripeAccountId !== row.stripeAccountId) return null;
    if (where.mentorProfile && where.mentorProfile !== row.mentorProfile.id) return null;
    return row;
  });
  const em = {
    findOne,
    findOneOrFail: vi.fn(async (entity: unknown, where: Record<string, string>) => { const result = await findOne(entity, where); if (!result) throw new Error("missing"); return result; }),
    execute: vi.fn(async () => { if (row) return []; row = makeRow(); return [{ id: "p1" }]; }),
    flush: vi.fn(async () => {}),
    transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>) => callback(em)),
  };
  const port = {
    createAccount: vi.fn(async () => ({ outcome: "provisioned" as const, accountId: "acct_1" })),
    findAccounts: vi.fn(async (): Promise<PayoutAccountSnapshot[]> => []),
    fetchAccount: vi.fn(async () => snapshot()),
    createOnboardingLink: vi.fn(async () => new URL("https://connect.stripe.com/onboarding")),
    parseWebhook: vi.fn(),
  };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  const service = new PayoutOnboardingService({ em: em as unknown as EntityManager, clock: fixedClock("2026-10-31T00:00:00Z"), logger: logger as Logger, config, payoutOnboarding: port as PayoutOnboarding });
  return { service, em, port, logger, profile, makeRow, get row() { return row; }, set row(value) { row = value; }, noProfile: () => { hasProfile = false; } };
}

describe("PayoutOnboardingService", () => {
  it("commits a new row before creating, binds, synchronizes and returns a hosted link", async () => {
    const s = setup();
    s.port.createAccount.mockImplementation(async () => { expect(s.row).toMatchObject({ provisioningState: "pending", stripeAccountId: null }); return { outcome: "provisioned", accountId: "acct_1" }; });
    expect(await s.service.start(principal, "US")).toEqual({ url: "https://connect.stripe.com/onboarding" });
    expect(s.port.createAccount).toHaveBeenCalledWith({ idempotencyKey: "payout-account-p1", country: "US", payoutAccountId: "p1", mentorProfileId: "m1" });
    expect(s.row).toMatchObject({ provisioningState: "provisioned", status: "ready", lastReconciledAt: new Date("2026-10-31T00:00:00Z") });
    expect(s.port.createOnboardingLink).toHaveBeenCalledWith("acct_1", { returnUrl: new URL("https://app.example/api/payments/onboarding/return"), refreshUrl: new URL("https://app.example/api/payments/onboarding/refresh") });
  });

  it("requires a profile and immutable country, and refuses failed accounts", async () => {
    const s = setup(); s.noProfile();
    await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    const x = setup(); x.row = x.makeRow({ country: "PL" });
    await expect(x.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    x.row = x.makeRow({ provisioningState: "failed" });
    await expect(x.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
  });

  it.each(["failed", "reconciliation_required"] as const)("persists %s creation outcomes", async (outcome) => {
    const s = setup();
    s.port.createAccount.mockResolvedValue({ outcome } as never);
    await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: outcome === "failed" ? 409 : 502 });
    expect(s.row?.provisioningState).toBe(outcome);
  });

  it("never downgrades a webhook-bound account after a late creation error", async () => {
    const s = setup();
    s.port.createAccount.mockImplementation(async () => { Object.assign(s.row!, { stripeAccountId: "acct_1", provisioningState: "provisioned", status: "ready" }); return { outcome: "reconciliation_required" } as never; });
    await s.service.start(principal, "US");
    expect(s.row).toMatchObject({ stripeAccountId: "acct_1", provisioningState: "provisioned", status: "ready" });
  });

  it("retries only after listing all matches; zero creates, one binds, multiple fail closed", async () => {
    const zero = setup(); zero.row = zero.makeRow({ provisioningState: "reconciliation_required" });
    await zero.service.start(principal, "US");
    expect(zero.port.findAccounts).toHaveBeenCalledBefore(zero.port.createAccount);
    const one = setup(); one.row = one.makeRow(); one.port.findAccounts.mockResolvedValue([snapshot()]);
    await one.service.start(principal, "US");
    expect(one.port.createAccount).not.toHaveBeenCalled();
    const many = setup(); many.row = many.makeRow(); many.port.findAccounts.mockResolvedValue([snapshot(), snapshot({ accountId: "acct_2" })]);
    await expect(many.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    expect(many.row?.provisioningState).toBe("reconciliation_required");
    const mismatch = setup(); mismatch.row = mismatch.makeRow(); mismatch.port.findAccounts.mockResolvedValue([snapshot({ country: "PL" })]);
    await expect(mismatch.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    const partial = setup(); partial.row = partial.makeRow(); partial.port.findAccounts.mockRejectedValue(new ProviderUnavailableError());
    await expect(partial.service.start(principal, "US")).rejects.toMatchObject({ status: 502 });
    expect(partial.port.createAccount).not.toHaveBeenCalled();
  });

  it("preserves a bound account when the post-bind fetch fails", async () => {
    const s = setup(); s.port.fetchAccount.mockRejectedValue(new ProviderUnavailableError());
    await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 502 });
    expect(s.row).toMatchObject({ stripeAccountId: "acct_1", provisioningState: "provisioned", status: "incomplete" });
  });

  it("only creates links for eligible accounts and checks the origin", async () => {
    const s = setup(); s.row = s.makeRow({ stripeAccountId: "acct_1", provisioningState: "provisioned", status: "blocked" });
    await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    expect(await s.service.refreshLink(principal)).toBeNull();
    s.row.status = "pending";
    expect(await s.service.refreshLink(principal)).toEqual(new URL("https://connect.stripe.com/onboarding"));
    s.port.createOnboardingLink.mockResolvedValue(new URL("https://evil.example/"));
    await expect(s.service.refreshLink(principal)).rejects.toThrow("origin mismatch");
    s.row = null;
    expect(await s.service.refreshLink(principal)).toBeNull();
    s.noProfile();
    expect(await s.service.refreshLink(principal)).toBeNull();
  });

  it("syncs only provisioned accounts, and resolves webhook metadata under a lock", async () => {
    const s = setup();
    expect(await s.service.syncFromReturn(principal)).toBeNull();
    s.row = s.makeRow();
    await expect(s.service.syncAccount("m1")).rejects.toMatchObject({ status: 409 });
    await s.service.attachAndStore(s.em as unknown as EntityManager, snapshot());
    expect(s.row).toMatchObject({ stripeAccountId: "acct_1", status: "ready", provisioningState: "provisioned" });
    expect(await s.service.syncFromReturn(principal)).toEqual(snapshot());
    s.noProfile();
    expect(await s.service.syncFromReturn(principal)).toBeNull();
  });

  it("rejects unknown, mismatched and conflicting webhook bindings without writing", async () => {
    for (const change of [snapshot({ metadata: { payoutAccountId: null, mentorProfileId: null } }), snapshot({ country: "PL" }), snapshot({ metadata: { payoutAccountId: "p1", mentorProfileId: "other" } }), snapshot({ accountId: "acct_other" })]) {
      const s = setup(); s.row = s.makeRow({ stripeAccountId: "acct_1", provisioningState: "provisioned" });
      await expect(s.service.attachAndStore(s.em as unknown as EntityManager, change)).rejects.toThrow("reconciliation conflict");
      expect(s.em.flush).not.toHaveBeenCalled();
    }
  });
});

describe("provisioning race and invalid state handling", () => {
  it("accepts an identical webhook binding and rejects a different one during create", async () => {
    for (const id of ["acct_1", "acct_other"]) {
      const s = setup();
      s.port.createAccount.mockImplementation(async () => { Object.assign(s.row!, { stripeAccountId: id, provisioningState: "provisioned", status: "ready" }); return { outcome: "provisioned", accountId: "acct_1" }; });
      if (id === "acct_1") await expect(s.service.start(principal, "US")).resolves.toBeDefined();
      else await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    }
  });

  it("rechecks the locked row after listing for binding, country and failed state", async () => {
    for (const mode of ["bound", "country", "failed"]) {
      const s = setup(); s.row = s.makeRow();
      s.port.findAccounts.mockImplementation(async () => {
        if (mode === "bound") Object.assign(s.row!, { stripeAccountId: "acct_1", provisioningState: "provisioned" });
        if (mode === "country") s.row!.country = "PL";
        if (mode === "failed") s.row!.provisioningState = "failed";
        return [];
      });
      if (mode === "bound") await expect(s.service.start(principal, "US")).resolves.toBeDefined();
      else await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
      expect(s.port.createAccount).not.toHaveBeenCalled();
    }
  });

  it("refuses provider mismatches, invalid bindings and inconsistent states", async () => {
    for (const metadata of [{ payoutAccountId: "other", mentorProfileId: "m1" }, { payoutAccountId: "p1", mentorProfileId: "other" }]) {
      const s = setup(); s.row = s.makeRow(); s.port.findAccounts.mockResolvedValue([snapshot({ metadata })]);
      await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
    }
    const s = setup(); s.row = s.makeRow({ stripeAccountId: "acct_1", provisioningState: "provisioned" });
    s.port.fetchAccount.mockResolvedValue(snapshot({ accountId: "acct_wrong" }));
    await expect(s.service.syncAccount("m1")).rejects.toThrow("reconciliation conflict");
    s.row.provisioningState = "pending";
    expect(await s.service.refreshLink(principal)).toBeNull();
    expect(await s.service.syncFromReturn(principal)).toBeNull();
    await expect(s.service.syncAccount("m1")).rejects.toMatchObject({ status: 409 });
    await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
  });
});

it("handles an account ID already bound elsewhere as a reconciliation conflict", async () => {
  const s = setup();
  s.em.flush.mockImplementationOnce(async () => {
    Object.assign(s.row!, { stripeAccountId: null, provisioningState: "pending" });
    throw new UniqueConstraintViolationException(new Error("unique"));
  });
  await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
  expect(s.row?.provisioningState).toBe("reconciliation_required");
});

 it.each(["country", "failed", "profile"])("rechecks %s under the lock before binding a recovery match", async (mode) => {
  const s = setup(); s.row = s.makeRow();
  s.port.findAccounts.mockImplementation(async () => {
    if (mode === "country") s.row!.country = "PL";
    if (mode === "failed") s.row!.provisioningState = "failed";
    if (mode === "profile") s.row!.mentorProfile = Object.assign(new MentorProfile(), { id: "other" });
    return [snapshot()];
  });
  await expect(s.service.start(principal, "US")).rejects.toMatchObject({ status: 409 });
  expect(s.row?.stripeAccountId).toBeNull();
});
