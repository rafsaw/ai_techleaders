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
  return POST(new Request("http://localhost/api/auth/confirm-email", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }), ctx);
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

describe("POST /api/auth/confirm-email", () => {
  it("confirms with the parsed input, the IP and the response cookies", async () => {
    configure(true);
    service.confirmEmail.mockResolvedValue({ redirectTo: "/" });
    const response = await post({ token: "tok", password: "pw" }, { "x-devmentor-csrf": "1", "x-forwarded-for": "198.51.100.2" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(service.confirmEmail).toHaveBeenCalledWith({ token: "tok", password: "pw", returnTo: undefined }, "198.51.100.2", expect.anything());
  });

  it("answers 400 without a token", async () => {
    expect((await post({ password: "pw" })).status).toBe(400);
    expect(service.confirmEmail).not.toHaveBeenCalled();
  });
});
