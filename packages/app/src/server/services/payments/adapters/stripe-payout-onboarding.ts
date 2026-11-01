import Stripe from "stripe";
import { ConflictError, ProviderUnavailableError, ValidationError } from "@devmentor/core";

import type { AppConfig } from "@/server/config";
import type { AccountCreationResult, PayoutAccountSnapshot, PayoutOnboarding, PayoutStatus } from "@/server/services/payments/payout-onboarding.port";

export function payoutStatus(account: Stripe.Account): PayoutStatus {
  const requirements = account.requirements;
  const disabled = requirements?.disabled_reason;
  if (disabled?.startsWith("rejected")) return "blocked";
  if (account.capabilities?.transfers === "active" && account.payouts_enabled && Array.isArray(requirements?.past_due) && requirements.past_due.length === 0) return "ready";
  if (!account.details_submitted || requirements?.past_due?.length || requirements?.currently_due?.length) return "incomplete";
  if (disabled === "requirements.pending_verification" || disabled === "under_review" || disabled === "listed" || requirements?.pending_verification?.length) return "pending";
  return "blocked";
}

function snapshot(account: Stripe.Account): PayoutAccountSnapshot {
  return {
    accountId: account.id,
    country: account.country ?? "",
    metadata: { payoutAccountId: account.metadata?.payout_account_id ?? null, mentorProfileId: account.metadata?.mentor_profile_id ?? null },
    status: payoutStatus(account),
  };
}

export class StripePayoutOnboarding implements PayoutOnboarding {
  constructor(private readonly deps: { config: AppConfig }) {}

  private client(): Stripe {
    const config = this.deps.config.stripe();
    const url = config.apiUrl ? new URL(config.apiUrl) : null;
    return new Stripe(config.secretKey, {
      apiVersion: "2026-09-30.endive",
      ...(url ? { host: url.hostname, port: url.port ? Number(url.port) : undefined, protocol: url.protocol === "http:" ? "http" : "https" } : {}),
    });
  }

  async createAccount(input: Parameters<PayoutOnboarding["createAccount"]>[0]): Promise<AccountCreationResult> {
    const stripe = this.client();
    try {
      const account = await stripe.accounts.create({
        country: input.country,
        controller: { stripe_dashboard: { type: "express" }, losses: { payments: "application" }, fees: { payer: "application" }, requirement_collection: "stripe" },
        capabilities: { transfers: { requested: true } },
        metadata: { payout_account_id: input.payoutAccountId, mentor_profile_id: input.mentorProfileId },
      }, { idempotencyKey: input.idempotencyKey });
      return { outcome: "provisioned", accountId: account.id };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === "idempotency_key_in_use") throw new ConflictError("Stripe onboarding is already starting. Try again in a moment");
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 409 && error.statusCode !== 429) return { outcome: "failed" };
      return { outcome: "reconciliation_required" };
    }
  }

  async findAccounts(input: Parameters<PayoutOnboarding["findAccounts"]>[0]): Promise<PayoutAccountSnapshot[]> {
    const stripe = this.client();
    const matches: PayoutAccountSnapshot[] = [];
    let mismatchedMetadata = false;
    try {
      for await (const account of stripe.accounts.list({ limit: 100 })) {
        const payoutMatches = account.metadata?.payout_account_id === input.payoutAccountId;
        const mentorMatches = account.metadata?.mentor_profile_id === input.mentorProfileId;
        if (payoutMatches && mentorMatches) matches.push(snapshot(account));
        else if (payoutMatches || mentorMatches) mismatchedMetadata = true;
      }
    } catch {
      throw new ProviderUnavailableError();
    }
    if (mismatchedMetadata) throw new ConflictError("Contact the DevMentor team about Stripe setup");
    return matches;
  }

  async createOnboardingLink(accountId: string, urls: { returnUrl: URL; refreshUrl: URL }): Promise<URL> {
    const stripe = this.client();
    try {
      const link = await stripe.accountLinks.create({ account: accountId, type: "account_onboarding", return_url: urls.returnUrl.href, refresh_url: urls.refreshUrl.href, collection_options: { fields: "eventually_due" } });
      return new URL(link.url);
    } catch {
      throw new ProviderUnavailableError();
    }
  }

  async fetchAccount(accountId: string): Promise<PayoutAccountSnapshot> {
    const stripe = this.client();
    try {
      return snapshot(await stripe.accounts.retrieve(accountId));
    } catch {
      throw new ProviderUnavailableError();
    }
  }

  parseWebhook(rawBody: string, signature: string | null): { id: string; type: string; accountId: string | null } {
    const stripe = this.client();
    const secret = this.deps.config.stripe().connectWebhookSecret;
    if (!signature) throw new ValidationError({ signature: ["Invalid Stripe signature"] });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError || error instanceof SyntaxError) throw new ValidationError({ signature: ["Invalid Stripe webhook"] });
      throw error;
    }
    if (!event || typeof event.id !== "string" || typeof event.type !== "string") throw new ValidationError({ body: ["Invalid Stripe webhook"] });
    const object = event.data?.object;
    if (event.type === "account.updated") {
      if (!object || typeof object !== "object" || !("id" in object) || typeof object.id !== "string" || !object.id) throw new ValidationError({ body: ["Invalid Stripe webhook"] });
      return { id: event.id, type: event.type, accountId: object.id };
    }
    return { id: event.id, type: event.type, accountId: null };
  }
}
