import { afterEach, describe, expect, it, vi } from "vitest";
import { apiCall, apiCallOrThrow, readJsonSafe } from "./apiCall";
import { ApiError, CSRF_HEADER } from "./types";

afterEach(() => vi.unstubAllGlobals());

describe("JSON API transport", () => {
  it("reads JSON and tolerates empty or malformed bodies", async () => {
    await expect(readJsonSafe(new Response('{"answer":42}'))).resolves.toEqual({ answer: 42 });
    await expect(readJsonSafe(new Response(""))).resolves.toBeUndefined();
    await expect(readJsonSafe(new Response("not JSON"))).resolves.toBeUndefined();
  });

  it("sends credentials, CSRF and accepted content type without a body by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, data: [1] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiCall("/api/users")).resolves.toEqual({ ok: true, data: [1] });
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/users");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBeUndefined();
    expect(init.headers.get(CSRF_HEADER)).toBe("1");
    expect(init.headers.get("accept")).toBe("application/json");
    expect(init.headers.has("content-type")).toBe(false);
  });

  it("serializes even null bodies and preserves custom headers and request options", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, data: null }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiCallOrThrow("/api/users", {
      method: "POST", body: null, headers: { "x-custom": "yes", [CSRF_HEADER]: "wrong" },
      credentials: "include",
    })).resolves.toBeNull();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe("null");
    expect(init.headers.get("content-type")).toBe("application/json");
    expect(init.headers.get("x-custom")).toBe("yes");
    expect(init.headers.get(CSRF_HEADER)).toBe("1");
  });

  it("turns network failures into a result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(apiCall("/api/users")).resolves.toEqual({ ok: false, error: {
      code: "network_error", message: "Could not reach the server. Check your connection and try again.",
    } });
  });

  it("turns a failure while reading the body into the same network failure", async () => {
    const broken = new Response("{}", { status: 200 });
    vi.spyOn(broken, "text").mockRejectedValue(new TypeError("connection reset"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(broken));
    const expected = { ok: false, error: {
      code: "network_error", message: "Could not reach the server. Check your connection and try again.",
    } };
    await expect(apiCall("/api/users")).resolves.toEqual(expected);
    const caught = await apiCallOrThrow("/api/users").catch((value: unknown) => value);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ code: "network_error", message: expected.error.message });
  });

  it.each([
    null, [], "text", 42, {}, { ok: true }, { ok: "true", data: [] },
    { ok: false }, { ok: false, error: null }, { ok: false, error: [] },
    { ok: false, error: { code: 1, message: "bad" } },
    { ok: false, error: { code: "bad", message: 1 } },
    { ok: false, error: { code: "bad", message: "bad", fieldErrors: null } },
    { ok: false, error: { code: "bad", message: "bad", fieldErrors: [] } },
    { ok: false, error: { code: "bad", message: "bad", fieldErrors: { name: "bad" } } },
    { ok: false, error: { code: "bad", message: "bad", fieldErrors: { name: [1] } } },
  ])("rejects malformed envelopes: %j", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 502 })));
    await expect(apiCall("/api/users")).resolves.toEqual({ ok: false, error: {
      code: "invalid_response", message: "Unexpected response from the server (HTTP 502).",
    } });
  });

  it.each([undefined, {}, { name: ["Required", "Too short"] }])(
    "preserves server failures with field errors %j", async (fieldErrors) => {
      const error = { code: "validation_error", message: "Invalid", fieldErrors };
      vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Response.json({ ok: false, error })));
      await expect(apiCall("/api/users")).resolves.toEqual({ ok: false, error: JSON.parse(JSON.stringify(error)) });
      const caught = await apiCallOrThrow("/api/users").catch((value: unknown) => value);
      expect(caught).toBeInstanceOf(ApiError);
      expect(caught).toMatchObject({ name: "ApiError", message: "Invalid", code: "validation_error" });
      expect((caught as ApiError).fieldErrors).toEqual(fieldErrors);
    },
  );
});
