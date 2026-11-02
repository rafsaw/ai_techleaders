import { asValue, ConflictError, createAppContainer, NotFoundError, registerCore, ValidationError, type Principal } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  return { container };
});

import { container } from "@/server/container";
import { DELETE, POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const mentor: Principal = { userId: "mentor", sessionId: "session", displayName: "Ada", roles: ["mentor"] };
const mentee: Principal = { userId: "mentee", sessionId: "session", displayName: "Lin", roles: ["mentee"] };
const id = "2e3437e5-bb15-49bd-96d0-d461621f4dbb";
const startsAt = "2030-01-01T10:00:00Z";
const slot = { id, startsAt, booked: false };
const publish = vi.fn();
const withdraw = vi.fn();

function signIn(principal: Principal | null) {
  container.register({ principalResolver: asValue({ resolve: vi.fn().mockResolvedValue(principal) }) });
}
function post(body: string, csrf = true) {
  return POST(new Request("http://localhost/api/availability/slots", {
    method: "POST", headers: csrf ? { "x-devmentor-csrf": "1" } : {}, body,
  }), ctx);
}
function remove(query = `?id=${id}`, csrf = true) {
  return DELETE(new Request(`http://localhost/api/availability/slots${query}`, {
    method: "DELETE", headers: csrf ? { "x-devmentor-csrf": "1" } : {},
  }), ctx);
}

beforeEach(() => {
  publish.mockReset().mockResolvedValue(slot);
  withdraw.mockReset().mockResolvedValue(undefined);
  container.register({ slotService: asValue({ publish, withdraw }) } as never);
  signIn(mentor);
});

describe("/api/availability/slots", () => {
  it("publishes a normalized instant and returns 201", async () => {
    const response = await post(JSON.stringify({ startsAt: "2030-01-01T11:00:00+01:00" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: slot });
    expect(publish).toHaveBeenCalledWith(mentor, "2030-01-01T10:00:00.000Z");
  });

  it("withdraws a valid id and returns it", async () => {
    const response = await remove();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id } });
    expect(withdraw).toHaveBeenCalledWith(mentor, id);
  });

  it.each([null, mentee])("requires a mentor for both methods: %s", async (principal) => {
    signIn(principal);
    for (const response of [await post(JSON.stringify({ startsAt })), await remove()]) {
      expect(response.status).toBe(principal ? 403 : 401);
      expect((await response.json()).error.code).toBe(principal ? "forbidden" : "unauthorized");
    }
    expect(publish).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("requires CSRF headers for both methods", async () => {
    for (const response of [await post(JSON.stringify({ startsAt }), false), await remove(`?id=${id}`, false)]) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.message).toBe("Missing CSRF header");
    }
    expect(publish).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and invalid starts", async () => {
    const malformed = await post("{");
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.message).toBe("Request body must be valid JSON");
    for (const value of ["2030-01-01T10:00:01Z", "2030-01-01T10:00:00"]) {
      const response = await post(JSON.stringify({ startsAt: value }));
      expect(response.status).toBe(400);
      expect((await response.json()).error.fieldErrors.startsAt).toHaveLength(1);
    }
    expect(publish).not.toHaveBeenCalled();
  });

  it.each(["", "?id=invalid"])("rejects an invalid id: %s", async (query) => {
    const response = await remove(query);
    expect(response.status).toBe(400);
    expect((await response.json()).error.fieldErrors.id).toHaveLength(1);
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("preserves publish validation and overlap errors", async () => {
    publish.mockRejectedValueOnce(new ValidationError({ startsAt: ["Too soon"] })).mockRejectedValueOnce(new ConflictError("Overlap"));
    const validation = await post(JSON.stringify({ startsAt }));
    expect(validation.status).toBe(400);
    expect((await validation.json()).error.fieldErrors).toEqual({ startsAt: ["Too soon"] });
    const conflict = await post(JSON.stringify({ startsAt }));
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error).toEqual({ code: "conflict", message: "Overlap" });
  });

  it("preserves concealed missing and booked withdrawal errors", async () => {
    withdraw.mockRejectedValueOnce(new NotFoundError()).mockRejectedValueOnce(new ConflictError("Booked"));
    const missing = await remove();
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("not_found");
    const booked = await remove();
    expect(booked.status).toBe(409);
    expect((await booked.json()).error).toEqual({ code: "conflict", message: "Booked" });
  });
});
