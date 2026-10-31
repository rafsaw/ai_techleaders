import { asValue, createAppContainer, registerCore, type Principal } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";

import { PUT } from "./route";

const ctx = { params: Promise.resolve({}) };
const mentor: Principal = { userId: "mentor-id", sessionId: "session-id", displayName: "Ada", roles: ["mentee", "mentor"] };
const mentee: Principal = { userId: "mentee-id", sessionId: "session-id", displayName: "Lin", roles: ["mentee"] };
const valid = {
  area: "typescript",
  description: " TypeScript systems ",
  publicWorkLinks: "https://github.com/ada/project",
  price25Dollars: "40",
  price50Dollars: "70",
};
const saved = { id: "profile-id", area: "typescript", prices: { 25: { amountMinor: 4_000, currency: "USD" } } };
const save = vi.fn();

function signIn(principal: Principal | null) {
  container.register({ principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(principal) }) });
}

function put(body: unknown) {
  return PUT(new Request("http://localhost/api/mentors/profile", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
    body: JSON.stringify(body),
  }), ctx);
}

beforeEach(() => {
  save.mockReset().mockResolvedValue(saved);
  container.register({ mentorProfileService: asValue({ save }) } as never);
  signIn(mentor);
});

describe("PUT /api/mentors/profile", () => {
  it("normalizes and saves a mentor profile", async () => {
    const response = await put(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: saved });
    expect(save).toHaveBeenCalledWith(mentor, {
      area: "typescript",
      description: "TypeScript systems",
      publicWorkLinks: ["https://github.com/ada/project"],
      price25Dollars: 40,
      price50Dollars: 70,
    });
  });

  it("returns per-field messages for invalid profile input", async () => {
    const response = await put({ ...valid, area: "go", publicWorkLinks: "http://example.com", price25Dollars: -1 });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "validation_error",
        message: expect.any(String),
        fieldErrors: {
          area: ["Choose TypeScript, React or Python"],
          publicWorkLinks: ["Line 1: use a full https:// link"],
          price25Dollars: ["Price must be at least $5"],
        },
      },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("enforces the signed-out and non-mentor access matrix", async () => {
    signIn(null);
    const signedOut = await put(valid);
    expect(signedOut.status).toBe(401);
    expect((await signedOut.json()).error.code).toBe("unauthorized");

    signIn(mentee);
    const forbidden = await put(valid);
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("forbidden");
    expect(save).not.toHaveBeenCalled();
  });
});
