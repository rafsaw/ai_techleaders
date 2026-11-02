import { randomUUID } from "node:crypto";

import { ConflictError, isAppError, ProviderUnavailableError, type Clock, type Logger, type Principal } from "@devmentor/core";
import type { OnboardingCountry } from "@devmentor/core/validators/payments/onboarding-start.schema";
import { LockMode, MentorProfile, PayoutAccount, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";

import type { AppConfig } from "@/server/config";
import type { PayoutAccountSnapshot, PayoutOnboarding } from "@/server/services/payments/payout-onboarding.port";

const INSERT = `insert into payout_accounts (id, created_at, updated_at, mentor_profile_id, country, provisioning_state, status)
values (?, ?, ?, ?, ?, 'pending', 'incomplete') on conflict (mentor_profile_id) do nothing returning id`;
const contact = () => new ConflictError("Contact the DevMentor team about Stripe setup");

export class PayoutOnboardingService {
  constructor(private readonly deps: { em: EntityManager; clock: Clock; logger: Logger; config: AppConfig; payoutOnboarding: PayoutOnboarding }) {}

  async start(principal: Principal, country: OnboardingCountry): Promise<{ url: string }> {
    const { em, clock } = this.deps;
    const profile = await em.findOne(MentorProfile, { user: principal.userId });
    if (!profile) throw new ConflictError("Save your profile first");
    const now = clock.now();
    const inserted = await em.execute<{ id: string }[]>(INSERT, [randomUUID(), now, now, profile.id, country], "all");
    let row = await em.findOneOrFail(PayoutAccount, { mentorProfile: profile.id }, { refresh: true });
    if (row.country !== country) throw new ConflictError("The Stripe account country cannot be changed");
    if (row.provisioningState === "failed") throw contact();
    if (!row.stripeAccountId) {
      if (inserted.length) {
        await this.create(row.id, profile.id, country);
      } else {
        await this.recover(row.id, profile.id, country);
      }
      row = await em.findOneOrFail(PayoutAccount, { id: row.id }, { refresh: true });
    }
    return { url: (await this.link(row)).href };
  }

  async refreshLink(principal: Principal): Promise<URL | null> {
    const profile = await this.deps.em.findOne(MentorProfile, { user: principal.userId });
    if (!profile) return null;
    const row = await this.deps.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    if (!row || !row.stripeAccountId || row.provisioningState !== "provisioned" || row.status === "blocked") return null;
    return this.link(row);
  }

  async syncFromReturn(principal: Principal): Promise<PayoutAccountSnapshot | null> {
    const profile = await this.deps.em.findOne(MentorProfile, { user: principal.userId });
    if (!profile) return null;
    const row = await this.deps.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    if (!row || row.provisioningState !== "provisioned" || !row.stripeAccountId) return null;
    return this.syncAccount(profile.id);
  }

  async syncAccount(mentorProfileId: string): Promise<PayoutAccountSnapshot> {
    const row = await this.deps.em.findOneOrFail(PayoutAccount, { mentorProfile: mentorProfileId }, { refresh: true });
    if (!row.stripeAccountId || row.provisioningState !== "provisioned") throw contact();
    const snapshot = await this.fetchAccount(row.stripeAccountId);
    if (snapshot.accountId !== row.stripeAccountId) throw new Error("Stripe account reconciliation conflict");
    await this.deps.em.transactional((em) => this.attachAndStore(em, snapshot), { clear: true });
    return snapshot;
  }

  fetchAccount(accountId: string): Promise<PayoutAccountSnapshot> {
    return this.deps.payoutOnboarding.fetchAccount(accountId);
  }

  async attachAndStore(em: EntityManager, snapshot: PayoutAccountSnapshot): Promise<void> {
    let row = await em.findOne(PayoutAccount, { stripeAccountId: snapshot.accountId }, { lockMode: LockMode.PESSIMISTIC_WRITE, populate: ["mentorProfile"] });
    if (!row && snapshot.metadata.payoutAccountId) row = await em.findOne(PayoutAccount, { id: snapshot.metadata.payoutAccountId }, { lockMode: LockMode.PESSIMISTIC_WRITE, populate: ["mentorProfile"] });
    if (!row || !this.matches(row, snapshot) || (row.stripeAccountId && row.stripeAccountId !== snapshot.accountId)) {
      this.deps.logger.error("Stripe account reconciliation conflict", row ? { payoutAccountId: row.id } : undefined);
      throw new Error("Stripe account reconciliation conflict");
    }
    row.stripeAccountId = snapshot.accountId;
    row.provisioningState = "provisioned";
    row.status = snapshot.status;
    row.lastReconciledAt = this.deps.clock.now();
    await em.flush();
  }

  private matches(row: PayoutAccount, snapshot: PayoutAccountSnapshot): boolean {
    return snapshot.metadata.payoutAccountId === row.id && snapshot.metadata.mentorProfileId === row.mentorProfile.id && snapshot.country === row.country;
  }

  private async link(row: PayoutAccount): Promise<URL> {
    if (!row.stripeAccountId || row.provisioningState !== "provisioned" || row.status === "blocked") throw contact();
    const base = this.deps.config.app().url;
    const url = await this.deps.payoutOnboarding.createOnboardingLink(row.stripeAccountId, { returnUrl: new URL("/api/payments/onboarding/return", base), refreshUrl: new URL("/api/payments/onboarding/refresh", base) });
    if (url.origin !== this.deps.config.stripe().onboardingOrigin) throw new Error("Stripe onboarding origin mismatch");
    return url;
  }

  private async locked<T>(id: string, action: (row: PayoutAccount, em: EntityManager) => Promise<T>): Promise<T> {
    return this.deps.em.transactional(async (em) => {
      const row = await em.findOneOrFail(PayoutAccount, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE, populate: ["mentorProfile"] });
      return action(row, em);
    }, { clear: true });
  }

  private async bind(id: string, accountId: string, recovery?: { country: string; mentorProfileId: string }): Promise<void> {
    try {
      await this.locked(id, async (row, em) => {
        if (recovery && (row.country !== recovery.country || row.mentorProfile.id !== recovery.mentorProfileId || (!row.stripeAccountId && row.provisioningState === "failed"))) throw contact();
        if (row.stripeAccountId && row.stripeAccountId !== accountId) {
          this.deps.logger.error("Stripe account reconciliation conflict", { payoutAccountId: id });
          throw contact();
        }
        if (!row.stripeAccountId) {
          row.stripeAccountId = accountId;
          row.provisioningState = "provisioned";
          await em.flush();
        }
      });
    } catch (error) {
      if (!(error instanceof UniqueConstraintViolationException)) throw error;
      await this.markUnresolved(id, "reconciliation_required");
      this.deps.logger.error("Stripe account reconciliation conflict", { payoutAccountId: id });
      throw contact();
    }
  }

  private async markUnresolved(id: string, state: "failed" | "reconciliation_required"): Promise<boolean> {
    return this.locked(id, async (row, em) => {
      if (row.stripeAccountId) return false;
      row.provisioningState = state;
      await em.flush();
      return true;
    });
  }

  private async create(id: string, mentorProfileId: string, country: OnboardingCountry): Promise<void> {
    const result = await this.deps.payoutOnboarding.createAccount({ idempotencyKey: `payout-account-${id}`, country, payoutAccountId: id, mentorProfileId });
    if (result.outcome !== "provisioned") {
      const changed = await this.markUnresolved(id, result.outcome);
      if (!changed) return;
      if (result.outcome === "failed") throw contact();
      throw new ProviderUnavailableError();
    }
    await this.bind(id, result.accountId);
    await this.syncAccount(mentorProfileId);
  }

  private async recover(id: string, mentorProfileId: string, country: OnboardingCountry): Promise<void> {
    let accounts: PayoutAccountSnapshot[];
    try {
      accounts = await this.deps.payoutOnboarding.findAccounts({ payoutAccountId: id, mentorProfileId });
    } catch (error) {
      if (!isAppError(error) || error.code !== "conflict") throw error;
      await this.markUnresolved(id, "reconciliation_required");
      this.deps.logger.error("Stripe account reconciliation conflict", { payoutAccountId: id });
      throw contact();
    }
    const match = accounts[0];
    if (accounts.length > 1 || (match && (match.country !== country || match.metadata.payoutAccountId !== id || match.metadata.mentorProfileId !== mentorProfileId))) {
      await this.markUnresolved(id, "reconciliation_required");
      this.deps.logger.error("Stripe account reconciliation conflict", { payoutAccountId: id });
      throw contact();
    }
    if (match) {
      await this.bind(id, match.accountId, { country, mentorProfileId });
      await this.syncAccount(mentorProfileId);
      return;
    }
    const needsCreate = await this.locked(id, async (row, em) => {
      if (row.country !== country) throw contact();
      if (row.stripeAccountId) return false;
      if (row.provisioningState === "failed") throw contact();
      row.provisioningState = "pending";
      await em.flush();
      return true;
    });
    if (needsCreate) await this.create(id, mentorProfileId, country);
  }
}
