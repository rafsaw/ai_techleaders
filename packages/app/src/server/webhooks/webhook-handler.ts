import { isAppError, type AppContainer, type Cradle } from "@devmentor/core";
import type { EntityManager } from "@devmentor/db";

/** Signature-authenticated webhook: external preparation precedes the transaction. */
export function createWebhookHandler(container: AppContainer) {
  return function webhookHandler<E extends { id: string; type: string }, D>(options: {
    provider: string;
    parse: (cradle: Cradle, rawBody: string, signature: string | null) => E;
    prepare?: (cradle: Cradle, event: E) => Promise<D>;
    apply: (em: EntityManager, cradle: Cradle, event: E, prepared: D | undefined) => Promise<void>;
  }) {
    return async (request: Request): Promise<Response> => {
      const { cradle } = container.createScope();
      let event: E;
      try {
        event = options.parse(cradle, await request.text(), request.headers.get("stripe-signature"));
      } catch (error) {
        if (isAppError(error) && error.code === "validation_error") return Response.json({ error: "Invalid webhook" }, { status: 400 });
        cradle.logger.error("Webhook processing failed", { provider: options.provider, stage: "parse" });
        return Response.json({ error: "Webhook processing failed" }, { status: 500 });
      }
      try {
        const prepared = await options.prepare?.(cradle, event);
        await cradle.em.transactional((em) => options.apply(em, cradle, event, prepared));
        return Response.json({ received: true });
      } catch {
        cradle.logger.error("Webhook processing failed", { provider: options.provider, stage: "apply" });
        return Response.json({ error: "Webhook processing failed" }, { status: 500 });
      }
    };
  };
}
