import { asValue, createAppContainer, registerCore, type Principal, type ResponseCookies } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";

import { POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const principal: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada", roles: ["mentee"] };
const end = vi.fn<(sessionId: string, cookies: ResponseCookies) => Promise<void>>();

function signIn(who: Principal | null) {
  container.register({
    principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(who) }),
    authSessionService: asValue({ end }),
  } as never);
}

function signOut(headers: Record<string, string> = { "x-devmentor-csrf": "1" }) {
  return POST(new Request("http://localhost/api/auth/sign-out", { method: "POST", headers }), ctx);
}

beforeEach(() => {
  end.mockReset().mockImplementation(async (_sessionId, cookies) => {
    cookies.delete("devmentor_session", { secure: false });
  });
});

describe("POST /api/auth/sign-out", () => {
  it("ends the caller's session, clears the cookie and answers the home page", async () => {
    signIn(principal);
    const response = await signOut();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(end).toHaveBeenCalledWith("session-1", expect.anything());
    expect(response.headers.getSetCookie().some((value) => value.startsWith("devmentor_session=;"))).toBe(true);
  });

  it("answers the same destination when already signed out", async () => {
    signIn(null);
    const response = await signOut();
    expect(await response.json()).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(end).not.toHaveBeenCalled();
  });

  it("refuses a request without the CSRF header and keeps the session", async () => {
    signIn(principal);
    const response = await signOut({});
    expect(response.status).toBe(403);
    expect(end).not.toHaveBeenCalled();
  });
});
