import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  type Access, asValue, authorize, ConfigError, createApiHandler, createAppContainer, createMakeCrudRoute,
  CSRF_HEADER, ForbiddenError, NotFoundError, type Principal, type PrincipalFor, type PrincipalResolver,
  ResponseCookies, UnauthorizedError,
} from "../index";

const mentee: Principal = { userId: "u-1", sessionId: "s-1", displayName: "Ada", roles: ["mentee"] };
const operator: Principal = { userId: "u-2", sessionId: "s-2", displayName: "Op", roles: ["mentee", "operator"] };
const ctx = { params: Promise.resolve({}) };
const SESSION = "devmentor_session";

/** A resolver that, like the real one, renews the presented session's cookie. */
function sessionResolver(principal: Principal | null): PrincipalResolver & { resolve: ReturnType<typeof vi.fn> } {
  return {
    resolve: vi.fn(async (_req: Request, cookies: ResponseCookies) => {
      if (principal) cookies.set(SESSION, "renewed", { secure: false, maxAge: 60 });
      return principal;
    }),
  };
}

function setup(resolver: PrincipalResolver = sessionResolver(null)) {
  const container = createAppContainer();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  container.register({ logger: asValue(logger), principalResolver: asValue(resolver) });
  return { logger, apiHandler: createApiHandler(container) };
}

function request(method = "GET", { csrf = true, url = "http://localhost/api/things" } = {}) {
  return new Request(url, { method, headers: csrf ? { [CSRF_HEADER]: "1" } : {} });
}

describe("authorize", () => {
  const operatorOnly: Access = { role: "operator" };
  it.each([
    ["public", null, null],
    ["public", mentee, null],
    ["optional", null, null],
    ["optional", mentee, mentee],
    ["user", mentee, mentee],
    [operatorOnly, operator, operator],
  ] as const)("%j with %j returns %j", (access, principal, expected) => {
    expect(authorize(access, principal)).toBe(expected);
  });

  it.each([
    ["user", null, UnauthorizedError],
    [operatorOnly, null, UnauthorizedError],
    [operatorOnly, mentee, ForbiddenError],
  ] as const)("%j with %j throws", (access, principal, Type) => {
    expect(() => authorize(access, principal)).toThrow(Type);
  });

  it("types the principal per access rule", () => {
    expectTypeOf<PrincipalFor<"public">>().toEqualTypeOf<null>();
    expectTypeOf<PrincipalFor<"optional">>().toEqualTypeOf<Principal | null>();
    expectTypeOf<PrincipalFor<"user">>().toEqualTypeOf<Principal>();
    expectTypeOf<PrincipalFor<{ role: "operator" }>>().toEqualTypeOf<Principal>();
  });
});

describe("apiHandler identity context", () => {
  it("requires an explicit access rule", () => {
    const { apiHandler } = setup();
    // Compile-time only: the type checker rejects both calls (PD3).
    const misuse = () => [
      // @ts-expect-error -- there is no default access rule
      apiHandler(async () => null, {}),
      // @ts-expect-error -- options are required
      apiHandler(async () => null),
    ];
    expect(typeof misuse).toBe("function");
  });

  it.each([
    ["public", null, 200, null],
    ["public", mentee, 200, null],
    ["optional", null, 200, null],
    ["optional", mentee, 200, mentee],
    ["user", null, 401, undefined],
    ["user", mentee, 200, mentee],
    [{ role: "operator" }, null, 401, undefined],
    [{ role: "operator" }, mentee, 403, undefined],
    [{ role: "operator" }, operator, 200, operator],
  ] as const)("access %j with principal %j → %i", async (access, principal, status, received) => {
    const resolver = sessionResolver(principal);
    const { apiHandler, logger } = setup(resolver);
    const handler = vi.fn(async ({ principal: given }) => ({ given }));
    const req = request("POST");
    const response = await apiHandler(handler, { access })(req, ctx);
    expect(response.status).toBe(status);
    expect(resolver.resolve).toHaveBeenCalledOnce();
    expect(resolver.resolve).toHaveBeenCalledWith(req, expect.any(ResponseCookies));
    if (received === undefined) {
      expect(handler).not.toHaveBeenCalled();
      expect((await response.json()).error.code).toBe(status === 401 ? "unauthorized" : "forbidden");
    } else {
      expect(await response.json()).toEqual({ ok: true, data: { given: received } });
    }
    // Every authenticated request renews the session, allowed or denied.
    expect(response.headers.getSetCookie()).toEqual(principal ? [`${SESSION}=renewed; Max-Age=60; Path=/; HttpOnly; SameSite=Lax`] : []);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("records activity on a public route while its handler receives null", async () => {
    const resolver = sessionResolver(mentee);
    const { apiHandler } = setup(resolver);
    const handler = vi.fn(async ({ principal, cookies }) => {
      expect(principal).toBeNull();
      expect(cookies.has(SESSION)).toBe(true);
      return "ok";
    });
    const response = await apiHandler(handler, { access: "public" })(request(), ctx);
    expect(handler).toHaveBeenCalledOnce();
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });

  it("resolves the session before the CSRF check, so a rejected request still renews", async () => {
    const resolver = sessionResolver(mentee);
    const { apiHandler } = setup(resolver);
    const handler = vi.fn();
    const response = await apiHandler(handler, { access: "user" })(request("POST", { csrf: false }), ctx);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: { code: "forbidden", message: "Missing CSRF header" } });
    expect(handler).not.toHaveBeenCalled();
    expect(resolver.resolve).toHaveBeenCalledOnce();
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });

  it("lets a handler's session start or end override the renewal", async () => {
    const { apiHandler } = setup(sessionResolver(mentee));
    const response = await apiHandler(async ({ cookies }) => {
      cookies.delete(SESSION, { secure: false });
      cookies.set("other", "1", { secure: false });
    }, { access: "optional" })(request("POST"), ctx);
    const written = response.headers.getSetCookie();
    expect(written).toHaveLength(2);
    expect(written[0]).toMatch(new RegExp(`^${SESSION}=; Max-Age=0;`));
    expect(written[1]).toMatch(/^other=1;/);
  });

  it("writes cookies on domain-error responses", async () => {
    const { apiHandler } = setup(sessionResolver(mentee));
    const response = await apiHandler(async ({ cookies }) => {
      cookies.set(SESSION, "started", { secure: false });
      throw new NotFoundError("gone");
    }, { access: "user" })(request("POST"), ctx);
    expect(response.status).toBe(404);
    expect(response.headers.getSetCookie()).toEqual([`${SESSION}=started; Path=/; HttpOnly; SameSite=Lax`]);
  });

  it("writes cookies on unexpected-error responses", async () => {
    const { apiHandler, logger } = setup(sessionResolver(mentee));
    const response = await apiHandler(async () => { throw new TypeError("boom"); }, { access: "user" })(request(), ctx);
    expect(response.status).toBe(500);
    expect(response.headers.getSetCookie()).toHaveLength(1);
    expect(logger.error).toHaveBeenCalledWith("Unhandled API error", { method: "GET", route: "api", error: { name: "TypeError" } });
  });

  it.each(["public", "optional", "user"] as const)("fails closed with 500 when the resolver throws (%s)", async (access) => {
    const failure = Object.assign(new Error("connect ECONNREFUSED postgres://user:pw@db/devmentor"), { code: "ECONNREFUSED" });
    const { apiHandler, logger } = setup({ resolve: vi.fn().mockRejectedValue(failure) });
    const handler = vi.fn();
    const response = await apiHandler(handler, { access, logRoute: "/api/things" })(request(), ctx);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: { code: "internal_error", message: "Something went wrong" } });
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("Unhandled API error", {
      method: "GET", route: "/api/things", error: { name: "Error", code: "ECONNREFUSED" },
    });
  });

  it("keeps token-bearing paths, queries, nested returnTo and error causes out of logs", async () => {
    const secret = "tok_SECRET123";
    const url = `http://localhost/api/invite/${secret}?token=${secret}&returnTo=${encodeURIComponent(`/invite/${secret}?returnTo=/x`)}`;
    const { apiHandler, logger } = setup(sessionResolver(mentee));
    const error = new Error(`fetch https://provider/${secret} failed`, { cause: new Error(`Authorization: Bearer ${secret}`) });
    const response = await apiHandler(async () => { throw error; }, { access: "public", logRoute: "/invite/[token]" })(
      new Request(url, { headers: { cookie: `${SESSION}=${secret}`, authorization: `Bearer ${secret}` } }), ctx);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(secret);
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain("/invite/[token]");
    expect(logged).not.toContain(secret);
    expect(logged).not.toContain("returnTo");
    expect(logged).not.toContain("provider");
  });

  it("logs the ConfigError message, which names keys and never values", async () => {
    const { apiHandler, logger } = setup();
    await apiHandler(async () => { throw new ConfigError(["GITHUB_CLIENT_ID"], []); }, { access: "public" })(request(), ctx);
    expect(logger.error).toHaveBeenCalledWith("Unhandled API error", {
      method: "GET", route: "api", error: { name: "ConfigError", message: "Invalid configuration: missing GITHUB_CLIENT_ID" },
    });
  });
});

describe("makeCrudRoute identity context", () => {
  it("requires access and applies it to every method", async () => {
    const { apiHandler } = setup(sessionResolver(mentee));
    const makeCrudRoute = createMakeCrudRoute(apiHandler);
    const service = { list: vi.fn().mockResolvedValue([]) };
    // @ts-expect-error -- access is required (PD3)
    expect(Object.keys(makeCrudRoute({ methods: ["GET"], service: () => service }))).toEqual(["GET"]);
    const forOperators = makeCrudRoute({ methods: ["GET"], access: { role: "operator" }, service: () => service });
    const denied = await forOperators.GET(request(), ctx);
    expect(denied.status).toBe(403);
    expect(denied.headers.getSetCookie()).toHaveLength(1);
    expect(service.list).not.toHaveBeenCalled();
    const forUsers = makeCrudRoute({ methods: ["GET"], access: "user", service: () => service });
    expect((await forUsers.GET(request(), ctx)).status).toBe(200);
  });

  it("forwards the static log template", async () => {
    const { apiHandler, logger } = setup();
    const routes = createMakeCrudRoute(apiHandler)({ methods: ["GET"], access: "public", logRoute: "/api/things",
      service: () => ({ list: async () => { throw new RangeError("secret detail"); } }) });
    expect((await routes.GET(request("GET", { url: "http://localhost/api/things?token=abc" }), ctx)).status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("Unhandled API error", { method: "GET", route: "/api/things", error: { name: "RangeError" } });
  });
});
