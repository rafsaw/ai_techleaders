import { asValue, createAppContainer, ProviderUnavailableError, registerCore, type Principal } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => { const container = createAppContainer(); registerCore(container); return { container }; });
import { container } from "@/server/container";
import { POST as start } from "./route";
import { GET as returned } from "./return/route";
import { GET as refresh } from "./refresh/route";
import { POST as webhook } from "../../webhooks/stripe/connect/route";

const mentor: Principal = { userId: "u1", sessionId: "s1", displayName: "Ada", roles: ["mentor"] };
const mentee: Principal = { ...mentor, roles: ["mentee"] };
const ctx = { params: Promise.resolve({}) };
const startService = vi.fn();
const sync = vi.fn();
const link = vi.fn();
const fetchAccount = vi.fn();
const attach = vi.fn();
const parse = vi.fn();
const resolve = vi.fn();
const transaction = vi.fn(async (fn: (tx: object) => Promise<void>) => fn({ tx: true }));
const snapshot = { accountId: "acct_1", country: "US", metadata: { payoutAccountId: "p1", mentorProfileId: "m1" }, status: "ready" };
const post = (body: unknown, csrf = true) => start(new Request("https://app.test/api/payments/onboarding", { method: "POST", headers: { "content-type": "application/json", ...(csrf ? { "x-devmentor-csrf": "1" } : {}) }, body: JSON.stringify(body) }), ctx);
const nav = (handler: typeof returned) => handler(new Request("https://app.test/navigation"), ctx);
const hook = () => webhook(new Request("https://app.test/hook", { method: "POST", headers: { "stripe-signature": "sig" }, body: "raw" }));

beforeEach(() => {
  vi.resetAllMocks();
  resolve.mockResolvedValue(mentor);
  startService.mockResolvedValue({ url: "https://connect.stripe.com/a" });
  sync.mockResolvedValue(snapshot);
  link.mockResolvedValue(new URL("https://connect.stripe.com/a"));
  parse.mockReturnValue({ id: "evt", type: "account.updated", accountId: "acct_1" });
  fetchAccount.mockResolvedValue(snapshot);
  container.register({
    principalResolver: asValue({ resolve }),
    config: asValue({ app: () => ({ url: new URL("https://app.test") }), stripe: () => ({ onboardingOrigin: "https://connect.stripe.com" }) }),
    payoutOnboarding: asValue({ parseWebhook: parse }),
    payoutOnboardingService: asValue({ start: startService, syncFromReturn: sync, refreshLink: link, fetchAccount, attachAndStore: attach }),
    em: asValue({ transactional: transaction }),
  } as never);
});

describe("payout onboarding routes", () => {
  it("starts only for a valid mentor request with CSRF", async () => {
    expect((await post({ country: "US" })).status).toBe(200);
    expect(startService).toHaveBeenCalledWith(mentor, "US");
    expect((await post({ country: "ZZ" })).status).toBe(400);
    expect((await post({ country: "US" }, false)).status).toBe(403);
    resolve.mockResolvedValueOnce(null);
    expect((await post({ country: "US" })).status).toBe(401);
    resolve.mockResolvedValueOnce(mentee);
    expect((await post({ country: "US" })).status).toBe(403);
  });

  it("returns to the setup page based on a fresh check, with safe failure and access redirects", async () => {
    expect((await nav(returned)).headers.get("location")).toBe("https://app.test/mentor?stripe=returned");
    sync.mockResolvedValueOnce(null);
    expect((await nav(returned)).headers.get("location")).toBe("https://app.test/mentor");
    sync.mockRejectedValueOnce(new ProviderUnavailableError());
    expect((await nav(returned)).headers.get("location")).toBe("https://app.test/mentor?stripe=check_failed");
    resolve.mockResolvedValueOnce(null);
    expect((await nav(returned)).headers.get("location")).toBe("https://app.test/sign-in?returnTo=%2Fmentor");
    resolve.mockResolvedValueOnce(mentee);
    expect((await nav(returned)).headers.get("location")).toBe("https://app.test/error?code=forbidden");
  });

  it("refreshes only existing links and enforces the allowed origin", async () => {
    expect((await nav(refresh)).headers.get("location")).toBe("https://connect.stripe.com/a");
    link.mockResolvedValueOnce(null);
    expect((await nav(refresh)).headers.get("location")).toBe("https://app.test/mentor");
    link.mockResolvedValueOnce(new URL("https://evil.test"));
    expect((await nav(refresh)).headers.get("location")).toBe("https://app.test/error?code=internal_error");
    link.mockRejectedValueOnce(new ProviderUnavailableError());
    expect((await nav(refresh)).headers.get("location")).toBe("https://app.test/mentor?stripe=check_failed");
    resolve.mockResolvedValueOnce(null);
    expect((await nav(refresh)).headers.get("location")).toBe("https://app.test/sign-in?returnTo=%2Fmentor");
    resolve.mockResolvedValueOnce(mentee);
    expect((await nav(refresh)).headers.get("location")).toBe("https://app.test/error?code=forbidden");
  });

  it("verifies and refetches account events without session or CSRF", async () => {
    expect((await hook()).status).toBe(200);
    expect(parse).toHaveBeenCalledWith("raw", "sig");
    expect(fetchAccount).toHaveBeenCalledWith("acct_1");
    expect(attach).toHaveBeenCalledWith({ tx: true }, snapshot);
    expect(resolve).not.toHaveBeenCalled();
    parse.mockReturnValueOnce({ id: "evt", type: "other", accountId: null });
    expect((await hook()).status).toBe(200);
    expect(attach).toHaveBeenCalledTimes(1);
  });

  it("retries malformed account events, mismatched provider responses and processing failures", async () => {
    parse.mockReturnValueOnce({ id: "evt", type: "account.updated", accountId: null });
    expect((await hook()).status).toBe(500);
    fetchAccount.mockResolvedValueOnce({ ...snapshot, accountId: "other" });
    expect((await hook()).status).toBe(500);
    attach.mockRejectedValueOnce(new Error("conflict"));
    expect((await hook()).status).toBe(500);
  });
});
