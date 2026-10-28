import { asValue, createAppContainer, registerCore, TooManyRequestsError } from "@devmentor/core";
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
  return POST(new Request("http://localhost/api/auth/sign-up", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }), ctx);
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

describe("POST /api/auth/sign-up", () => {
  const body = { displayName: " Ada ", email: " Ada@Example.com ", password: "a short phrase of mine", returnTo: "/invite/x" };

  it("registers the parsed input with an unknown IP and answers 201", async () => {
    service.register.mockResolvedValue({ email: "ada@example.com", emailSent: true });
    const response = await post(body);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: { email: "ada@example.com", emailSent: true } });
    expect(service.register).toHaveBeenCalledWith(
      { displayName: "Ada", email: "ada@example.com", password: "a short phrase of mine", returnTo: "/invite/x" }, null);
  });

  it("passes the validated client IP when TRUST_PROXY is on", async () => {
    configure(true);
    service.register.mockResolvedValue({ email: "ada@example.com", emailSent: false });
    await post(body, { "x-devmentor-csrf": "1", "x-forwarded-for": "203.0.113.7" });
    expect(service.register).toHaveBeenCalledWith(expect.anything(), "203.0.113.7");
  });

  it("answers 400 with field errors and calls nothing for an invalid body", async () => {
    const response = await post({ displayName: "", email: "x", password: "short" });
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.fieldErrors)).toEqual(["displayName", "email", "password"]);
    expect((await post("{not json")).status).toBe(400);
    expect(service.register).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After from the per-IP rule, and 403 without the CSRF header", async () => {
    service.register.mockRejectedValue(new TooManyRequestsError(1500));
    const limited = await post(body);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("2");
    expect((await limited.json()).error).toEqual({ code: "rate_limited", message: "Too many attempts. Try again later" });
    expect((await post(body, {})).status).toBe(403);
  });
});
