import { asValue, createAppContainer, registerCore } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";
import { createAppConfig } from "@/server/config";

import { POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const service = { register: vi.fn(), signIn: vi.fn(), resendConfirmation: vi.fn(), confirmEmail: vi.fn() };

function post(body: unknown, headers: Record<string, string> = { "x-devmentor-csrf": "1" }) {
  return POST(new Request("http://localhost/api/auth/confirm-email/resend", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }), ctx);
}

function configure(trustProxy: boolean) {
  container.register({
    principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(null) }),
    config: asValue(createAppConfig({ APP_URL: "http://localhost:3000", TRUST_PROXY: String(trustProxy) })),
    passwordAccountService: asValue(service),
  } as never);
}

beforeEach(() => {
  for (const fn of Object.values(service)) fn.mockReset();
  configure(false);
});

describe("POST /api/auth/confirm-email/resend", () => {
  it("resends with the parsed sign-in fields", async () => {
    service.resendConfirmation.mockResolvedValue({ emailSent: true, alreadyConfirmed: false });
    const response = await post({ email: "ADA@example.com", password: "pw", returnTo: "/invite/x" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { emailSent: true, alreadyConfirmed: false } });
    expect(service.resendConfirmation).toHaveBeenCalledWith({ email: "ada@example.com", password: "pw", returnTo: "/invite/x" });
  });

  it("answers 400 for an invalid body and 403 without the CSRF header", async () => {
    expect((await post({ email: "nope", password: "pw" })).status).toBe(400);
    expect((await post({ email: "a@example.com", password: "pw" }, {})).status).toBe(403);
    expect(service.resendConfirmation).not.toHaveBeenCalled();
  });
});
