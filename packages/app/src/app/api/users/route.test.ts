import { asValue, createAppContainer, registerCore } from "@devmentor/core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";
import { GET, POST } from "@/app/api/users/route";

afterEach(() => vi.restoreAllMocks());

describe("users API route", () => {
  it("wires scoped GET and POST to userService and shared validation", async () => {
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
  });
});
