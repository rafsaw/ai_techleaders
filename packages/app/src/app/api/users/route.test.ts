import { asValue, createAppContainer, registerCore, type Principal } from "@devmentor/core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  container.register({ principalResolver: asValue({ resolve: async () => null }) });
  return { container };
});

import { container } from "@/server/container";
import { GET, POST } from "@/app/api/users/route";

afterEach(() => vi.restoreAllMocks());

describe("users API route", () => {
  it("wires scoped GET and POST to userService and shared validation for an operator", async () => {
    const operator: Principal = { userId: "u", sessionId: "s", displayName: "Ada", roles: ["mentee", "operator"] };
    container.register({ principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(operator) }) });
    const service = { list: vi.fn().mockResolvedValue([{ id: "existing" }]),
      create: vi.fn().mockResolvedValue({ id: "created" }) };
    container.register({ userService: asValue(service) });
    const ctx = { params: Promise.resolve({}) };
    expect(await (await GET(new Request("http://localhost/api/users"), ctx)).json())
      .toEqual({ ok: true, data: [{ id: "existing" }] });
    const response = await POST(new Request("http://localhost/api/users", { method: "POST",
      headers: { "x-devmentor-csrf": "1" }, body: JSON.stringify({ name: " Ada ", email: "ADA@EXAMPLE.COM" }),
    }), ctx);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: { id: "created" } });
    expect(service.create).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com" });
    const invalid = await POST(new Request("http://localhost/api/users", { method: "POST",
      headers: { "x-devmentor-csrf": "1" }, body: JSON.stringify({ name: "", email: "bad" }),
    }), ctx);
    expect(invalid.status).toBe(400);
    expect(service.create).toHaveBeenCalledOnce();
    container.register({ principalResolver: asValue({ resolve: async () => null }) });
  });

  it("requires the operator role: 401 signed out, 403 without the role (AD4)", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const create = vi.fn();
    const mentee: Principal = { userId: "u", sessionId: "s", displayName: "Ada", roles: ["mentee"] };
    const ctx = { params: Promise.resolve({}) };
    const post = () => POST(new Request("http://localhost/api/users", { method: "POST",
      headers: { "x-devmentor-csrf": "1" }, body: JSON.stringify({ name: "Ada", email: "ada@example.com" }) }), ctx);
    container.register({ userService: asValue({ list, create }) });

    const signedOut = await GET(new Request("http://localhost/api/users"), ctx);
    expect(signedOut.status).toBe(401);
    expect(await signedOut.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect((await post()).status).toBe(401);

    container.register({ principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(mentee) }) });
    const forbidden = await GET(new Request("http://localhost/api/users"), ctx);
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect((await post()).status).toBe(403);
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
