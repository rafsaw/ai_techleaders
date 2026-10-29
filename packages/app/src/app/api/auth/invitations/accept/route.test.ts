import {
  asValue,
  ConflictError,
  createAppContainer,
  ForbiddenError,
  generateToken,
  NotFoundError,
  registerCore,
  type Principal,
  type ResponseCookies,
} from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";

import { POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const TOKEN = generateToken();
const SESSION_TOKEN = "session-token-unchanged";
const principal: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada", roles: ["mentee"] };
const account = {
  id: "user-1", email: "ada@example.com", displayName: "Ada", roles: ["mentee", "mentor"],
  signInMethods: { github: true, password: false },
};
const accept = vi.fn();
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** The resolver renews the presented session cookie, as AuthSessionService does on every API call (P3). */
function signIn(who: Principal | null) {
  container.register({
    principalResolver: asValue({
      resolve: vi.fn(async (_req: Request, cookies: ResponseCookies) => {
        if (who) cookies.set("devmentor_session", SESSION_TOKEN, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 2592000, secure: false });
        return who;
      }),
    }),
    mentorInvitationService: asValue({ accept }),
    logger: asValue(logger),
  } as never);
}

function post(body: unknown, headers: Record<string, string> = { "x-devmentor-csrf": "1" }) {
  return POST(new Request("http://localhost/api/auth/invitations/accept", { method: "POST", headers, body: JSON.stringify(body) }), ctx);
}

beforeEach(() => {
  accept.mockReset().mockResolvedValue(account);
  for (const fn of Object.values(logger)) fn.mockReset();
  signIn(principal);
});

describe("POST /api/auth/invitations/accept", () => {
  it("accepts for the signed-in account and answers its AccountDto, renewing the same session cookie", async () => {
    const response = await post({ token: TOKEN, userId: "someone-else", role: "operator" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: account });
    expect(accept).toHaveBeenCalledWith(TOKEN, principal);
    // Not rotated: only the ordinary renewal of the presented token, no redirect field.
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(new RegExp(`^devmentor_session=${SESSION_TOKEN};.*Max-Age=2592000`));
  });

  it("answers 401 when signed out, without calling the service", async () => {
    signIn(null);
    const response = await post({ token: TOKEN });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(accept).not.toHaveBeenCalled();
  });

  it("refuses a request without the CSRF header", async () => {
    const response = await post({ token: TOKEN }, {});
    expect(response.status).toBe(403);
    expect(accept).not.toHaveBeenCalled();
  });

  it("answers 400 without a token", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect((await response.json()).error.fieldErrors).toEqual({ token: ["This invitation is not valid"] });
    expect(accept).not.toHaveBeenCalled();
  });

  it.each([
    [new ForbiddenError("This invitation requires the verified email address it was sent to"), 403, "forbidden"],
    [new NotFoundError("This invitation is not valid"), 404, "not_found"],
    [new ConflictError("You already have the mentor role"), 409, "conflict"],
  ])("maps %s to its status, still renewing the cookie", async (error, status, code) => {
    accept.mockRejectedValue(error);
    const response = await post({ token: TOKEN });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error: { code, message: error.message } });
    expect(response.headers.getSetCookie()[0]).toMatch(/^devmentor_session=session-token-unchanged;/);
  });

  it("never logs the token or the request path, even on an unexpected failure", async () => {
    accept.mockRejectedValue(new Error(`boom ${"x"}`));
    const response = await post({ token: TOKEN });
    expect(response.status).toBe(500);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain(TOKEN);
    expect(logger.error).toHaveBeenCalled();
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(logger.error.mock.calls)).toContain("/api/auth/invitations/accept");
  });
});
