import type { OnboardingCountry } from "@devmentor/core/validators/payments/onboarding-start.schema";

export type PayoutStatus = "incomplete" | "pending" | "ready" | "blocked";

export type PayoutAccountSnapshot = {
  accountId: string;
  country: string;
  metadata: { payoutAccountId: string | null; mentorProfileId: string | null };
  status: PayoutStatus;
};

export type AccountCreationResult =
  | { outcome: "provisioned"; accountId: string }
  | { outcome: "reconciliation_required" }
  | { outcome: "failed" };

/** The app's boundary to the Connect provider; no vendor SDK types cross it. */
export interface PayoutOnboarding {
  createAccount(input: {
    idempotencyKey: string;
    country: OnboardingCountry;
    payoutAccountId: string;
    mentorProfileId: string;
  }): Promise<AccountCreationResult>;
  findAccounts(input: { payoutAccountId: string; mentorProfileId: string }): Promise<PayoutAccountSnapshot[]>;
  createOnboardingLink(accountId: string, urls: { returnUrl: URL; refreshUrl: URL }): Promise<URL>;
  fetchAccount(accountId: string): Promise<PayoutAccountSnapshot>;
  parseWebhook(rawBody: string, signature: string | null): { id: string; type: string; accountId: string | null };
}
