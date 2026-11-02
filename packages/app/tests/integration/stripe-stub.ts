import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import Stripe from "stripe";
import pg from "pg";

interface Account {
  id: string;
  object: "account";
  country: string;
  metadata: Record<string, string>;
  details_submitted: boolean;
  payouts_enabled: boolean;
  capabilities: { transfers: string };
  requirements: { past_due: string[]; currently_due: string[]; pending_verification: string[]; disabled_reason: string | null };
}
interface Link { account: string; returnUrl: string; refreshUrl: string }

function send(res: ServerResponse, status: number, body: unknown, type = "application/json"): void {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : String(body));
}
async function body(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
function redirect(res: ServerResponse, location: string): void { res.writeHead(303, { location }); res.end(); }

/** Local Stripe Connect API and hosted onboarding stand-in for the integration server. */
export async function startStripeStub({ webhookSecret, appURL, databaseURL }: { webhookSecret: string; appURL: string; databaseURL: string }) {
  const accounts = new Map<string, Account>();
  const keys = new Map<string, string>();
  const links = new Map<string, Link>();
  const inFlight = new Set<string>();
  const timedOutKeys = new Set<string>();
  const events = new Map<string, { payload: string; signature: string }>();
  let failRetrieve = false;
  let fault: "none" | "timeout-after-create" | "webhook-before-create" | "hold-create" = "none";
  let releaseCreate: (() => void) | undefined;
  let stubURL = "";
  const stripe = new Stripe("sk_test_integration");

  async function deliver(accountId: string): Promise<number> {
    let event = events.get(accountId);
    if (!event) {
      const payload = JSON.stringify({ id: `evt_${randomUUID()}`, type: "account.updated", data: { object: { id: accountId } } });
      event = { payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }) };
      events.set(accountId, event);
    }
    const { payload, signature } = event;
    const response = await fetch(`${appURL}/api/webhooks/stripe/connect`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload });
    return response.status;
  }

  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", stubURL);
      const route = `${req.method} ${url.pathname}`;
      if (route === "POST /__stub/fault") {
        const control = JSON.parse(await body(req)) as { mode?: typeof fault; failRetrieve?: boolean };
        fault = control.mode ?? "none";
        failRetrieve = control.failRetrieve ?? false;
        return send(res, 200, { ok: true });
      }
      if (route === "GET /__stub/state") return send(res, 200, { createHeld: !!releaseCreate });
      if (route === "POST /__stub/release") { releaseCreate?.(); releaseCreate = undefined; return send(res, 200, { ok: true }); }
      if (route === "GET /__stub/accounts") return send(res, 200, [...accounts.values()]);
      if (route === "POST /__stub/metadata") {
        const control = JSON.parse(await body(req)) as { accountId: string; metadata: Record<string, string> };
        const account = accounts.get(control.accountId);
        if (!account) return send(res, 404, {});
        account.metadata = control.metadata;
        return send(res, 200, { ok: true });
      }
      if (route === "POST /__stub/event") {
        const control = JSON.parse(await body(req)) as { accountId: string; ready?: boolean };
        const account = accounts.get(control.accountId);
        if (!account) return send(res, 404, {});
        if (control.ready) Object.assign(account, { details_submitted: true, payouts_enabled: true, capabilities: { transfers: "active" }, requirements: { past_due: [], currently_due: [], pending_verification: [], disabled_reason: null } });
        return send(res, 200, { status: await deliver(account.id) });
      }
      if (route === "POST /v1/accounts") {
        const key = String(req.headers["idempotency-key"] ?? "");
        if (inFlight.has(key)) return send(res, 409, { error: { type: "invalid_request_error", code: "idempotency_key_in_use", message: "key in use" } });
        const params = new URLSearchParams(await body(req));
        let account = accounts.get(keys.get(key) ?? "");
        if (!account) {
          account = { id: `acct_${randomUUID().replaceAll("-", "")}`, object: "account", country: params.get("country") ?? "", metadata: { payout_account_id: params.get("metadata[payout_account_id]") ?? "", mentor_profile_id: params.get("metadata[mentor_profile_id]") ?? "" }, details_submitted: false, payouts_enabled: false, capabilities: { transfers: "inactive" }, requirements: { past_due: [], currently_due: ["details"], pending_verification: [], disabled_reason: null } };
          accounts.set(account.id, account); keys.set(key, account.id);
        }
        if (fault === "timeout-after-create") {
          // Leave the first response open until the Stripe SDK's real request timeout.
          // Subsequent SDK retries fail promptly but remain ambiguous to the caller.
          if (!timedOutKeys.has(key)) { timedOutKeys.add(key); return; }
          return send(res, 500, { error: { type: "api_error", message: "ambiguous failure" } });
        }
        if (fault === "hold-create") {
          inFlight.add(key);
          try { await new Promise<void>((resolve) => { releaseCreate = resolve; }); } finally { inFlight.delete(key); }
        }
        if (fault === "webhook-before-create") {
          inFlight.add(key);
          try {
            if (await deliver(account.id) !== 200) throw new Error("webhook rejected");
            const client = new pg.Client({ connectionString: databaseURL });
            await client.connect();
            try {
              const result = await client.query<{ stripe_account_id: string }>("select stripe_account_id from payout_accounts where id = $1", [account.metadata.payout_account_id]);
              if (result.rows[0]?.stripe_account_id !== account.id) throw new Error("webhook did not bind before create response");
            } finally { await client.end(); }
          } finally { inFlight.delete(key); }
        }
        return send(res, 200, account);
      }
      if (route === "GET /v1/accounts") {
        const all = [...accounts.values()];
        const start = url.searchParams.get("starting_after");
        const offset = start ? all.findIndex((a) => a.id === start) + 1 : 0;
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 2);
        const data = all.slice(offset, offset + limit);
        return send(res, 200, { object: "list", data, has_more: offset + data.length < all.length, url: "/v1/accounts" });
      }
      if (req.method === "GET" && url.pathname.startsWith("/v1/accounts/")) {
        if (failRetrieve) return send(res, 503, { error: { type: "api_error", message: "unavailable" } });
        const account = accounts.get(url.pathname.slice("/v1/accounts/".length));
        return account ? send(res, 200, account) : send(res, 404, { error: { type: "invalid_request_error", message: "unknown account" } });
      }
      if (route === "POST /v1/account_links") {
        const params = new URLSearchParams(await body(req));
        const id = randomUUID();
        links.set(id, { account: params.get("account") ?? "", returnUrl: params.get("return_url") ?? "", refreshUrl: params.get("refresh_url") ?? "" });
        return send(res, 200, { object: "account_link", url: `${stubURL}/hosted/${id}`, created: 1, expires_at: 2 });
      }
      const hosted = /^\/hosted\/([^/]+)$/.exec(url.pathname);
      if (hosted) {
        const link = links.get(hosted[1]!);
        if (!link) return send(res, 404, "Unknown link", "text/plain");
        if (req.method === "GET") return send(res, 200, `<title>Stripe test onboarding</title><main><h1>Stripe test onboarding</h1><form method="post"><button name="action" value="complete">Complete</button><button name="action" value="pending">Submit pending</button><button name="action" value="abandon">Abandon</button><button name="action" value="expire">Expire link</button></form></main>`, "text/html");
        const action = new URLSearchParams(await body(req)).get("action");
        const account = accounts.get(link.account)!;
        if (action === "complete") Object.assign(account, { details_submitted: true, payouts_enabled: true, capabilities: { transfers: "active" }, requirements: { past_due: [], currently_due: [], pending_verification: [], disabled_reason: null } });
        if (action === "pending") Object.assign(account, { details_submitted: true, requirements: { past_due: [], currently_due: [], pending_verification: ["identity"], disabled_reason: "requirements.pending_verification" } });
        links.delete(hosted[1]!);
        return redirect(res, action === "expire" ? link.refreshUrl : link.returnUrl);
      }
      return send(res, 404, { error: { type: "invalid_request_error", message: "not found" } });
    })().catch(() => send(res, 500, { error: { type: "api_error", message: "stub failure" } }));
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start Stripe stub");
  stubURL = `http://127.0.0.1:${address.port}`;
  return { url: stubURL, close: () => new Promise<void>((resolve, reject) => { releaseCreate?.(); server.closeAllConnections(); server.close((error) => error ? reject(error) : resolve()); }) };
}
