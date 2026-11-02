import { isAppError, type AppContainer, type Cradle } from "@devmentor/core";
import type { EntityManager } from "@devmentor/db";

const MAX_WEBHOOK_BYTES = 1024 * 1024;
class WebhookBodyTooLarge extends Error {}

async function readWebhookBody(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_WEBHOOK_BYTES) throw new WebhookBodyTooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      throw new WebhookBodyTooLarge();
    }
    text += decoder.decode(value, { stream: true });
  }
}

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
        event = options.parse(cradle, await readWebhookBody(request), request.headers.get("stripe-signature"));
      } catch (error) {
        if (error instanceof WebhookBodyTooLarge) return Response.json({ error: "Webhook body too large" }, { status: 413 });
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
