import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { StripePayoutOnboarding, payoutStatus } from "@/server/services/payments/adapters/stripe-payout-onboarding";

const mocks = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), link: vi.fn(), retrieve: vi.fn(), verify: vi.fn() }));
vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  class FakeStripe {
    static errors = actual.default.errors;
    accounts = { create: mocks.create, list: mocks.list, retrieve: mocks.retrieve };
    accountLinks = { create: mocks.link };
    webhooks = { constructEvent: mocks.verify };
  }
  return { default: FakeStripe };
});

const config = createAppConfig({ STRIPE_SECRET_KEY: "key", STRIPE_CONNECT_WEBHOOK_SECRET: "secret", STRIPE_API_URL: "http://localhost:4020" });
const adapter = new StripePayoutOnboarding({ config });
const input = { country: "US" as const, idempotencyKey: "payout-account-p1", payoutAccountId: "p1", mentorProfileId: "m1" };
const base = { id: "acct_1", country: "US", metadata: { payout_account_id: "p1", mentor_profile_id: "m1" }, details_submitted: true, payouts_enabled: true, capabilities: { transfers: "active" }, requirements: { past_due: [], currently_due: [], pending_verification: [], disabled_reason: null } } as unknown as Stripe.Account;
const account = (overrides: Record<string, unknown> = {}): Stripe.Account => ({ ...base, ...overrides } as Stripe.Account);
const requirements = (overrides: object) => ({ ...base.requirements, ...overrides }) as Stripe.Account.Requirements;

beforeEach(() => vi.resetAllMocks());

describe("Stripe payout onboarding", () => {
  it("maps statuses in priority order", () => {
    expect(payoutStatus(account())).toBe("ready");
    expect(payoutStatus(account({ requirements: null }))).toBe("blocked");
    expect(payoutStatus(account({ requirements: requirements({ disabled_reason: "rejected.fraud" }) }))).toBe("blocked");
    expect(payoutStatus(account({ details_submitted: false, payouts_enabled: false }))).toBe("incomplete");
    expect(payoutStatus(account({ requirements: requirements({ past_due: ["x"] }) }))).toBe("incomplete");
    expect(payoutStatus(account({ payouts_enabled: false, requirements: requirements({ currently_due: ["x"] }) }))).toBe("incomplete");
    for (const disabled_reason of ["requirements.pending_verification", "under_review", "listed"]) expect(payoutStatus(account({ payouts_enabled: false, requirements: requirements({ disabled_reason }) }))).toBe("pending");
    expect(payoutStatus(account({ payouts_enabled: false, requirements: requirements({ pending_verification: ["x"] }) }))).toBe("pending");
    expect(payoutStatus(account({ payouts_enabled: false }))).toBe("blocked");
  });

  it("creates with only the specified payload and stable key", async () => {
    mocks.create.mockResolvedValue({ id: "acct_1" });
    await expect(adapter.createAccount(input)).resolves.toEqual({ outcome: "provisioned", accountId: "acct_1" });
    expect(mocks.create).toHaveBeenCalledWith({ country: "US", controller: { stripe_dashboard: { type: "express" }, losses: { payments: "application" }, fees: { payer: "application" }, requirement_collection: "stripe" }, capabilities: { transfers: { requested: true } }, metadata: { payout_account_id: "p1", mentor_profile_id: "m1" } }, { idempotencyKey: input.idempotencyKey });
  });

  it("classifies creation errors without leaking provider details", async () => {
    mocks.create.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: "sensitive", statusCode: 400 }));
    await expect(adapter.createAccount(input)).resolves.toEqual({ outcome: "failed" });
    for (const statusCode of [409, 429]) {
      mocks.create.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: "sensitive", statusCode }));
      await expect(adapter.createAccount(input)).resolves.toEqual({ outcome: "reconciliation_required" });
    }
    mocks.create.mockRejectedValue(new Error("timeout"));
    await expect(adapter.createAccount(input)).resolves.toEqual({ outcome: "reconciliation_required" });
    mocks.create.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: "busy", code: "idempotency_key_in_use", statusCode: 409 }));
    await expect(adapter.createAccount(input)).rejects.toMatchObject({ status: 409 });
  });

  it("exhausts account pages and fails closed on listing errors", async () => {
    mocks.list.mockReturnValue((async function* () { yield account({ id: "other", metadata: {} }); yield account(); yield account({ id: "acct_2" }); })());
    await expect(adapter.findAccounts(input)).resolves.toEqual([expect.objectContaining({ accountId: "acct_1", status: "ready" }), expect.objectContaining({ accountId: "acct_2" })]);
    mocks.list.mockReturnValue((async function* () { yield account(); throw new Error("partial"); })());
    await expect(adapter.findAccounts(input)).rejects.toMatchObject({ status: 502 });
  });

  it("fetches snapshots and creates hosted links, mapping provider failures", async () => {
    mocks.retrieve.mockResolvedValue(account());
    await expect(adapter.fetchAccount("acct_1")).resolves.toMatchObject({ accountId: "acct_1", metadata: { payoutAccountId: "p1", mentorProfileId: "m1" } });
    mocks.retrieve.mockRejectedValue(new Error("down"));
    await expect(adapter.fetchAccount("acct_1")).rejects.toMatchObject({ status: 502 });
    const urls = { returnUrl: new URL("https://devmentor.test/return"), refreshUrl: new URL("https://devmentor.test/refresh") };
    mocks.link.mockResolvedValue({ url: "https://connect.stripe.com/setup" });
    await expect(adapter.createOnboardingLink("acct_1", urls)).resolves.toEqual(new URL("https://connect.stripe.com/setup"));
    expect(mocks.link).toHaveBeenCalledWith({ account: "acct_1", type: "account_onboarding", return_url: urls.returnUrl.href, refresh_url: urls.refreshUrl.href, collection_options: { fields: "eventually_due" } });
    mocks.link.mockRejectedValue(new Error("down"));
    await expect(adapter.createOnboardingLink("acct_1", urls)).rejects.toMatchObject({ status: 502 });
  });

  it("requires signatures, validates events and preserves internal errors", () => {
    expect(() => adapter.parseWebhook("{}", null)).toThrowError(expect.objectContaining({ status: 400 }));
    mocks.verify.mockReturnValue({ id: "evt_1", type: "account.updated", data: { object: { id: "acct_1" } } });
    expect(adapter.parseWebhook("{}", "signature")).toEqual({ id: "evt_1", type: "account.updated", accountId: "acct_1" });
    mocks.verify.mockReturnValue({ id: "evt_2", type: "other", data: { object: {} } });
    expect(adapter.parseWebhook("{}", "signature").accountId).toBeNull();
    mocks.verify.mockImplementation(() => { throw new SyntaxError(); });
    expect(() => adapter.parseWebhook("bad", "signature")).toThrowError(expect.objectContaining({ status: 400 }));
    mocks.verify.mockImplementation(() => { throw new Error("internal"); });
    expect(() => adapter.parseWebhook("{}", "signature")).toThrow("internal");
    for (const object of [undefined, null, "primitive", {}, { id: 1 }, { id: "" }]) {
      mocks.verify.mockReturnValue({ id: "evt", type: "account.updated", data: { object } });
      expect(() => adapter.parseWebhook("{}", "signature")).toThrowError(expect.objectContaining({ status: 400 }));
    }
    mocks.verify.mockReturnValue({});
    expect(() => adapter.parseWebhook("{}", "signature")).toThrowError(expect.objectContaining({ status: 400 }));
  });
});

describe("Stripe adapter edge cases", () => {
  it("handles absent optional provider fields and default API configuration", async () => {
    const defaultAdapter = new StripePayoutOnboarding({ config: createAppConfig({ STRIPE_SECRET_KEY: "key", STRIPE_CONNECT_WEBHOOK_SECRET: "secret" }) });
    mocks.retrieve.mockResolvedValue(account({ country: null, metadata: null, requirements: null, capabilities: null, payouts_enabled: false, details_submitted: true }));
    await expect(defaultAdapter.fetchAccount("acct_1")).resolves.toEqual({ accountId: "acct_1", country: "", metadata: { payoutAccountId: null, mentorProfileId: null }, status: "blocked" });
    mocks.list.mockReturnValue((async function* () { yield account({ metadata: null }); })());
    await expect(defaultAdapter.findAccounts(input)).resolves.toEqual([]);
    const noPortAdapter = new StripePayoutOnboarding({ config: createAppConfig({ STRIPE_SECRET_KEY: "key", STRIPE_CONNECT_WEBHOOK_SECRET: "secret", STRIPE_API_URL: "https://example.test" }) });
    mocks.retrieve.mockResolvedValue(account());
    await expect(noPortAdapter.fetchAccount("acct_1")).resolves.toMatchObject({ status: "ready" });
  });

  it("uses the Stripe SDK to verify a signed event", async () => {
    const actual = await vi.importActual<typeof import("stripe")>("stripe");
    const client = new actual.default("key");
    const payload = JSON.stringify({ id: "evt_signed", type: "account.updated", data: { object: { id: "acct_signed" } } });
    const signature = client.webhooks.generateTestHeaderString({ payload, secret: "secret" });
    mocks.verify.mockImplementation((...args) => client.webhooks.constructEvent(args[0], args[1], args[2]));
    expect(adapter.parseWebhook(payload, signature)).toEqual({ id: "evt_signed", type: "account.updated", accountId: "acct_signed" });
    expect(() => adapter.parseWebhook(payload, "bad signature")).toThrowError(expect.objectContaining({ status: 400 }));
    const invalid = "not-json";
    const invalidSignature = client.webhooks.generateTestHeaderString({ payload: invalid, secret: "secret" });
    expect(() => adapter.parseWebhook(invalid, invalidSignature)).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
