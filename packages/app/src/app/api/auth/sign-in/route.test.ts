import { asValue, createAppContainer, registerCore, type ResponseCookies } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";
import { createAppConfig } from "@/server/config";
import { PASSWORD_RATE_LIMITS, rateLimitKey } from "@/server/services/auth/password-account.service";

import { POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const service = { register: vi.fn(), signIn: vi.fn(), resendConfirmation: vi.fn(), confirmEmail: vi.fn() };

function post(body: unknown, headers: Record<string, string> = { "x-devmentor-csrf": "1" }) {
  return POST(new Request("http://localhost/api/auth/sign-in", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }), ctx);
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

describe("POST /api/auth/sign-in", () => {
  it("signs in with the parsed input and the response cookies", async () => {
    service.signIn.mockImplementation(async (_input: unknown, _ip: unknown, cookies: ResponseCookies) => {
      cookies.set("devmentor_session", "tok", { secure: false });
      return { redirectTo: "/mentors" };
    });
    const response = await post({ email: " Ada@Example.com", password: "pw", returnTo: "/mentors" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { redirectTo: "/mentors" } });
    expect(response.headers.get("set-cookie")).toContain("devmentor_session=tok");
    expect(service.signIn).toHaveBeenCalledWith({ email: "ada@example.com", password: "pw", returnTo: "/mentors" }, null, expect.anything());
  });

  it("passes the validated client IP when TRUST_PROXY is on", async () => {
    configure(true);
    service.signIn.mockResolvedValue({ redirectTo: "/" });
    await post({ email: "a@example.com", password: "pw" }, { "x-devmentor-csrf": "1", "x-forwarded-for": "2001:DB8::1" });
    expect(service.signIn).toHaveBeenCalledWith(expect.anything(), "2001:db8::1", expect.anything());
  });

  it("passes one canonical IP for every spelling, so they share one rate-limit key", async () => {
    configure(true);
    service.signIn.mockResolvedValue({ redirectTo: "/" });
    const spellings = ["2001:db8::1", "2001:0DB8:0000:0000:0000:0000:0000:0001", "::ffff:192.0.2.1", "::ffff:c000:201", "192.0.2.1"];
    for (const ip of spellings) await post({ email: "a@example.com", password: "pw" }, { "x-devmentor-csrf": "1", "x-forwarded-for": ip });
    const keys = service.signIn.mock.calls.map(([, ip]) => rateLimitKey(PASSWORD_RATE_LIMITS.signInPerIp, ip as string));
    expect(keys).toEqual(["sign-in:ip:2001:db8::1", "sign-in:ip:2001:db8::1", "sign-in:ip:192.0.2.1", "sign-in:ip:192.0.2.1", "sign-in:ip:192.0.2.1"]);
  });

  it("answers 400 for a missing password", async () => {
    expect((await post({ email: "a@example.com" })).status).toBe(400);
    expect(service.signIn).not.toHaveBeenCalled();
  });
});
