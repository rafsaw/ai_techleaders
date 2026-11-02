import { ProviderUnavailableError, ValidationError } from "@devmentor/core";

import type { PayoutAccountSnapshot, PayoutOnboarding } from "@/server/services/payments/payout-onboarding.port";

/** Deterministic test double: one account per idempotency key, with explicit snapshots. */
export class MockPayoutOnboarding implements PayoutOnboarding {
  readonly accounts = new Map<string, PayoutAccountSnapshot>();
  private readonly keys = new Map<string, string>();

  async createAccount(input: Parameters<PayoutOnboarding["createAccount"]>[0]) {
    let accountId = this.keys.get(input.idempotencyKey);
    if (!accountId) {
      accountId = `acct_mock_${this.keys.size + 1}`;
      this.keys.set(input.idempotencyKey, accountId);
      this.accounts.set(accountId, { accountId, country: input.country, metadata: { payoutAccountId: input.payoutAccountId, mentorProfileId: input.mentorProfileId }, status: "incomplete" });
    }
    return { outcome: "provisioned" as const, accountId };
  }

  async findAccounts(input: Parameters<PayoutOnboarding["findAccounts"]>[0]) {
    return [...this.accounts.values()].filter(({ metadata }) => metadata.payoutAccountId === input.payoutAccountId && metadata.mentorProfileId === input.mentorProfileId);
  }

  async createOnboardingLink(accountId: string) {
    if (!this.accounts.has(accountId)) throw new ProviderUnavailableError();
    return new URL(`https://connect.stripe.com/mock/${encodeURIComponent(accountId)}`);
  }

  async fetchAccount(accountId: string) {
    const account = this.accounts.get(accountId);
    if (!account) throw new ProviderUnavailableError();
    return account;
  }

  parseWebhook(rawBody: string, signature: string | null) {
    if (signature !== "mock-signature") throw new ValidationError({ signature: ["Invalid mock signature"] });
    let event: unknown;
    try { event = JSON.parse(rawBody); } catch { throw new ValidationError({ body: ["Invalid mock event"] }); }
    if (!event || typeof event !== "object" || !("id" in event) || typeof event.id !== "string" || !("type" in event) || typeof event.type !== "string" || !("accountId" in event) || (event.accountId !== null && typeof event.accountId !== "string")) throw new ValidationError({ body: ["Invalid mock event"] });
    return { id: event.id, type: event.type, accountId: event.accountId };
  }
}
