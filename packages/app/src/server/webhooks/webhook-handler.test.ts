import { ValidationError, type AppContainer, type Cradle } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { createWebhookHandler } from "./webhook-handler";

function setup() {
  const calls: string[] = [];
  const tx = {};
  const cradle = { logger: { error: vi.fn() }, em: { transactional: vi.fn(async (fn: (em: object) => Promise<void>) => { calls.push("transaction"); await fn(tx); }) } } as unknown as Cradle;
  const container = { createScope: () => ({ cradle }) } as unknown as AppContainer;
  const parse = vi.fn((_cradle: Cradle, _body: string, _signature: string | null) => { calls.push("parse"); return { id: "evt", type: "account.updated" }; });
  const prepare = vi.fn(async () => { calls.push("prepare"); return "snapshot"; });
  const apply = vi.fn(async () => { calls.push("apply"); });
  const handler = createWebhookHandler(container);
  return { calls, cradle, tx, parse, prepare, apply, handler };
}
const request = () => new Request("http://localhost/hook", { method: "POST", body: "raw-body", headers: { "stripe-signature": "sig" } });

describe("webhook handler", () => {
  it("passes the raw body and signature, prepares outside and applies inside a transaction", async () => {
    const s = setup();
    const response = await s.handler({ provider: "stripe", parse: s.parse, prepare: s.prepare, apply: s.apply })(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(s.parse).toHaveBeenCalledWith(s.cradle, "raw-body", "sig");
    expect(s.apply).toHaveBeenCalledWith(s.tx, s.cradle, { id: "evt", type: "account.updated" }, "snapshot");
    expect(s.calls).toEqual(["parse", "prepare", "transaction", "apply"]);
  });

  it("allows no preparation", async () => {
    const s = setup();
    const response = await s.handler({ provider: "stripe", parse: s.parse, apply: s.apply })(request());
    expect(response.status).toBe(200);
    expect(s.apply).toHaveBeenCalledWith(s.tx, s.cradle, expect.any(Object), undefined);
  });

  it("answers invalid signatures with 400 and never starts a transaction", async () => {
    const s = setup();
    s.parse.mockImplementation(() => { throw new ValidationError({ signature: ["bad"] }); });
    const response = await s.handler({ provider: "stripe", parse: s.parse, prepare: s.prepare, apply: s.apply })(request());
    expect(response.status).toBe(400);
    expect(s.cradle.em.transactional).not.toHaveBeenCalled();
    expect(s.cradle.logger.error).not.toHaveBeenCalled();
  });

  it.each(["parse", "prepare", "apply"] as const)("fails closed and logs no sensitive data on %s failure", async (stage) => {
    const s = setup();
    const error = new Error("secret raw-body");
    if (stage === "parse") s.parse.mockImplementation(() => { throw error; });
    if (stage === "prepare") s.prepare.mockRejectedValue(error);
    if (stage === "apply") s.apply.mockRejectedValue(error);
    const response = await s.handler({ provider: "stripe", parse: s.parse, prepare: s.prepare, apply: s.apply })(request());
    expect(response.status).toBe(500);
    expect(JSON.stringify(vi.mocked(s.cradle.logger.error).mock.calls)).not.toContain("secret");
    if (stage !== "apply") expect(s.cradle.em.transactional).not.toHaveBeenCalled();
  });
});
