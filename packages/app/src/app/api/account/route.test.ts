import { asValue, createAppContainer, registerCore, type Principal } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";

import { GET, PATCH } from "./route";

const ctx = { params: Promise.resolve({}) };
const principal: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada", roles: ["mentee"] };
const account = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
  roles: ["mentee"],
  signInMethods: { github: true, password: false },
};

function signIn(who: Principal | null) {
  container.register({ principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(who) }) });
}

function patch(body: unknown, headers: Record<string, string> = { "x-devmentor-csrf": "1" }) {
  return PATCH(new Request("http://localhost/api/account", { method: "PATCH", headers, body: JSON.stringify(body) }), ctx);
}

const userService = { getAccount: vi.fn(), updateDisplayName: vi.fn() };

beforeEach(() => {
  userService.getAccount.mockReset().mockResolvedValue(account);
  userService.updateDisplayName.mockReset().mockResolvedValue({ ...account, displayName: "Ada Lovelace" });
  container.register({ userService: asValue(userService) } as never);
  signIn(principal);
});

describe("GET /api/account", () => {
  it("returns the caller's own account", async () => {
    const response = await GET(new Request("http://localhost/api/account?id=someone-else"), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: account });
    expect(userService.getAccount).toHaveBeenCalledWith("user-1");
  });

  it("answers 401 when signed out", async () => {
    signIn(null);
    const response = await GET(new Request("http://localhost/api/account"), ctx);
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(userService.getAccount).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/account", () => {
  it("updates the caller's display name with the trimmed value", async () => {
    const response = await patch({ displayName: "  Ada Lovelace ", id: "someone-else" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { ...account, displayName: "Ada Lovelace" } });
    expect(userService.updateDisplayName).toHaveBeenCalledWith("user-1", "Ada Lovelace");
  });

  it("returns field errors for an invalid name", async () => {
    const response = await patch({ displayName: " " });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "validation_error", message: expect.any(String), fieldErrors: { displayName: ["Display name is required"] } },
    });
    expect(userService.updateDisplayName).not.toHaveBeenCalled();
  });

  it("answers 401 when signed out and 403 without the CSRF header", async () => {
    signIn(null);
    expect((await patch({ displayName: "Ada" })).status).toBe(401);
    signIn(principal);
    expect((await patch({ displayName: "Ada" }, {})).status).toBe(403);
    expect(userService.updateDisplayName).not.toHaveBeenCalled();
  });
});
