import { container } from "@/server/container";
import { createWebhookHandler } from "@/server/webhooks/webhook-handler";

export const POST = createWebhookHandler(container)({
  provider: "stripe-connect",
  parse: (cradle, body, signature) => cradle.payoutOnboarding.parseWebhook(body, signature),
  prepare: async (cradle, event) => {
    if (event.type !== "account.updated") return null;
    if (!event.accountId) throw new Error("Missing Stripe account ID");
    const snapshot = await cradle.payoutOnboardingService.fetchAccount(event.accountId);
    if (snapshot.accountId !== event.accountId) throw new Error("Stripe account ID mismatch");
    return snapshot;
  },
  apply: async (em, cradle, event, snapshot) => {
    if (event.type === "account.updated" && snapshot) await cradle.payoutOnboardingService.attachAndStore(em, snapshot);
  },
});
