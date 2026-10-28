import { describe, expect, it, vi } from "vitest";

import {
  asValue, ConfigError, createAppContainer, createNavigationHandler, errorPath, ForbiddenError,
  INTERNAL_ERROR_PATH, NotFoundError, type NavigationResult, type Principal, type PrincipalResolver,
  type ResponseCookies,
} from "../index";

const APP_URL = new URL("https://devmentor.example");
const COOKIE = { secure: true, maxAge: 60 };
const principal: Principal = { userId: "u1", sessionId: "s1", displayName: "Ada", roles: ["mentee"] };

// A resolver that renews the session cookie like the real one, then returns `result`.
function renewingResolver(result: Principal | null | Error = principal): PrincipalResolver {
  return {
    resolve: vi.fn(async (_req: Request, cookies: ResponseCookies) => {
      cookies.set("session", "renewed", COOKIE);
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

function setup(resolver: PrincipalResolver = { resolve: async () => null },
  appUrl: () => URL = () => APP_URL) {
  const container = createAppContainer();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  container.register({ logger: asValue(logger), principalResolver: asValue(resolver) });
  return { container, logger, navigationHandler: createNavigationHandler(container, { appUrl }) };
}

const TOKEN_URL = "http://attacker.example/invite/s3cret-token?returnTo=%2Faccount%3Ftoken%3Ds3cret-token";

function request(method = "GET", url = TOKEN_URL) {
  return new Request(url, { method, headers: { host: "attacker.example", cookie: "session=old" } });
}

const ctx = { params: Promise.resolve({ token: "s3cret-token" }) };
const redirect = (result: NavigationResult) => async () => result;

describe("navigationHandler: internal redirects", () => {
  it("answers 303 resolved against APP_URL, never the Host header or request origin", async () => {
    const { navigationHandler } = setup();
    const response = await navigationHandler(redirect({ redirectTo: "/account/../sign-in?x=1#top" }),
      { access: "public" })(request(), ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://devmentor.example/sign-in?x=1#top");
    expect(await response.text()).toBe("");
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example", "/api/auth/github", "/_next/static",
    "javascript:alert(1)", ""])("rejects the off-site or reserved destination %j with /", async (redirectTo) => {
    const { navigationHandler } = setup();
    const response = await navigationHandler(redirect({ redirectTo }), { access: "public" })(request(), ctx);
    expect(response.headers.get("location")).toBe("https://devmentor.example/");
  });

  it("passes a fresh scope, awaited params, the request URL and cookies to the handler", async () => {
    const { navigationHandler, container } = setup();
    const scopes = vi.spyOn(container, "createScope");
    const handler = vi.fn(async ({ params, url, cradle, cookies, principal: received }) => {
      expect(params).toEqual({ token: "s3cret-token" });
      expect(url).toEqual(new URL(TOKEN_URL));
      expect(cradle).toBe(scopes.mock.results.at(-1)?.value.cradle);
      expect(received).toBeNull();
      cookies.set("oauth_state", "state", COOKIE);
      return { redirectTo: "/" };
    });
    const wrapped = navigationHandler(handler, { access: "public" });
    const response = await wrapped(request(), ctx);
    await wrapped(request(), ctx);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(scopes.mock.results[0]?.value).not.toBe(scopes.mock.results[1]?.value);
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^oauth_state=state;/)]);
  });
});

describe("navigationHandler: external redirects", () => {
  it("allows an externalUrl whose origin is allowlisted, given as URL or string", async () => {
    const { navigationHandler } = setup();
    const target = new URL("https://github.com/login/oauth/authorize?state=abc");
    for (const origin of [new URL("https://github.com/some/path"), "https://github.com"]) {
      const response = await navigationHandler(redirect({ externalUrl: target }),
        { access: "public", externalOrigins: () => [origin] })(request(), ctx);
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(target.href);
    }
  });

  it.each([
    ["a different origin", ["https://github.com"], "https://github.com.evil.example/authorize"],
    ["another scheme", ["https://github.com"], "http://github.com/authorize"],
    ["an empty allowlist", [], "https://github.com/authorize"],
    ["no allowlist", undefined, "https://github.com/authorize"],
  ])("rejects %s and logs without the URL", async (_case, origins, target) => {
    const { navigationHandler, logger } = setup();
    const response = await navigationHandler(redirect({ externalUrl: new URL(target) }), {
      access: "public", logRoute: "/api/auth/github",
      ...(origins === undefined ? {} : { externalOrigins: () => origins }),
    })(request(), ctx);
    expect(response.headers.get("location")).toBe(`https://devmentor.example${INTERNAL_ERROR_PATH}`);
    expect(logger.error).toHaveBeenCalledWith("Navigation to an origin outside the allowlist",
      { method: "GET", route: "/api/auth/github" });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("authorize");
  });

  it("treats an unreadable allowlist (missing config) as an internal error", async () => {
    const { navigationHandler, logger } = setup();
    const response = await navigationHandler(redirect({ externalUrl: new URL("https://github.com/") }), {
      access: "public", externalOrigins: () => { throw new ConfigError(["GITHUB_CLIENT_ID"], []); },
    })(request(), ctx);
    expect(response.headers.get("location")).toBe(`https://devmentor.example${INTERNAL_ERROR_PATH}`);
    expect(logger.error).toHaveBeenCalledWith("Unhandled navigation error", { method: "GET", route: "navigation",
      error: { name: "ConfigError", message: "Invalid configuration: missing GITHUB_CLIENT_ID" } });
  });
});

describe("navigationHandler: errors", () => {
  it("redirects an AppError to /error?code=<code> by default without logging it", async () => {
    const { navigationHandler, logger } = setup();
    const response = await navigationHandler(async () => { throw new NotFoundError(); },
      { access: "public" })(request(), ctx);
    expect(response.headers.get("location")).toBe("https://devmentor.example/error?code=not_found");
    expect(logger.error).not.toHaveBeenCalled();
    expect(errorPath("a b&c")).toBe("/error?code=a%20b%26c");
  });

  it("sends an AppError to the onError target through the internal validator", async () => {
    const { navigationHandler } = setup();
    const onError = vi.fn(() => "/sign-in?error=github_failed&returnTo=%2Faccount");
    const response = await navigationHandler(async () => { throw new ForbiddenError(); },
      { access: "public", onError })(request(), ctx);
    expect(onError).toHaveBeenCalledWith(expect.any(ForbiddenError));
    expect(response.headers.get("location"))
      .toBe("https://devmentor.example/sign-in?error=github_failed&returnTo=%2Faccount");
  });

  it.each(["https://evil.example/error", "//evil.example", "/api/auth/github", "/_next/data", "/%2e%2e/api"])(
    "falls back to / for the unsafe or reserved error target %j", async (target) => {
      const { navigationHandler } = setup();
      const response = await navigationHandler(async () => { throw new NotFoundError(); },
        { access: "public", onError: () => target })(request(), ctx);
      expect(response.headers.get("location")).toBe("https://devmentor.example/");
    });

  it("redirects an unknown error to internal_error and logs a safe route-template entry", async () => {
    const { navigationHandler, logger } = setup();
    const failure = Object.assign(new Error(`fetch ${TOKEN_URL} failed`, { cause: new Error("s3cret-token") }),
      { code: "ECONNREFUSED" });
    const response = await navigationHandler(async () => { throw failure; },
      { access: "public", logRoute: "/invite/[token]" })(request(), ctx);
    expect(response.headers.get("location")).toBe(`https://devmentor.example${INTERNAL_ERROR_PATH}`);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith("Unhandled navigation error",
      { method: "GET", route: "/invite/[token]", error: { name: "Error", code: "ECONNREFUSED" } });
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).not.toContain("s3cret-token");
    expect(logged).not.toContain("attacker.example");
  });

  it("uses the constant navigation label when no route template is given", async () => {
    const { navigationHandler, logger } = setup();
    await navigationHandler(async () => { throw "not an error"; }, { access: "public" })(request(), ctx);
    expect(logger.error).toHaveBeenCalledWith("Unhandled navigation error",
      { method: "GET", route: "navigation", error: { name: "string" } });
  });

  it("treats a throwing onError as an internal failure", async () => {
    const { navigationHandler, logger } = setup();
    const response = await navigationHandler(async () => { throw new NotFoundError(); },
      { access: "public", onError: () => { throw new TypeError("bug"); } })(request(), ctx);
    expect(response.headers.get("location")).toBe(INTERNAL_ERROR_PATH);
    expect(logger.error).toHaveBeenCalledWith("Navigation error fallback failed",
      { method: "GET", route: "navigation", error: { name: "TypeError" } });
  });

  it("lands on a relative /error?code=internal_error when APP_URL cannot be read", async () => {
    const { navigationHandler, logger } = setup(renewingResolver(null),
      () => { throw new ConfigError(["APP_URL"], []); });
    const response = await navigationHandler(redirect({ redirectTo: "/account" }),
      { access: "public" })(request(), ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(INTERNAL_ERROR_PATH);
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=renewed;/)]);
    const configError = { name: "ConfigError", message: "Invalid configuration: missing APP_URL" };
    expect(logger.error.mock.calls).toEqual([
      ["Unhandled navigation error", { method: "GET", route: "navigation", error: configError }],
      ["Navigation error fallback failed", { method: "GET", route: "navigation", error: configError }],
    ]);
  });
});

describe("navigationHandler: identity and session activity", () => {
  it("resolves a presented session on public routes, renews it, and still passes null", async () => {
    const resolver = renewingResolver();
    const { navigationHandler } = setup(resolver);
    const handler = vi.fn(async ({ principal: received }) => {
      expect(received).toBeNull();
      return { redirectTo: "/" };
    });
    const response = await navigationHandler(handler, { access: "public" })(request(), ctx);
    expect(resolver.resolve).toHaveBeenCalledWith(expect.any(Request), expect.anything());
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=renewed;/)]);
  });

  it("passes the principal on optional and protected routes", async () => {
    const { navigationHandler } = setup(renewingResolver());
    for (const access of ["optional", "user", { role: "mentee" }] as const) {
      const handler = vi.fn(async ({ principal: received }) => {
        expect(received).toBe(principal);
        return { redirectTo: "/account" };
      });
      const response = await navigationHandler(handler, { access })(request(), ctx);
      expect(response.headers.get("location")).toBe("https://devmentor.example/account");
    }
  });

  it.each([
    ["an AppError from the handler", principal, "public", "/error?code=not_found"],
    ["a missing session on a user route", null, "user", "/error?code=unauthorized"],
    ["a missing role", principal, { role: "operator" }, "/error?code=forbidden"],
    ["an unknown handler error", principal, "public", INTERNAL_ERROR_PATH],
    ["a resolver failure (database down)", new Error("db down"), "public", INTERNAL_ERROR_PATH],
  ] as const)("renews cookies on the failure outcome of %s", async (_case, resolved, access, location) => {
    const { navigationHandler } = setup(renewingResolver(resolved));
    const handler = vi.fn(async () => {
      if (location === INTERNAL_ERROR_PATH) throw new Error("boom");
      throw new NotFoundError();
    });
    const response = await navigationHandler(handler, { access })(request(), ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://devmentor.example${location}`);
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=renewed;/)]);
  });

  it("lets a handler's session start or end override the renewal", async () => {
    const { navigationHandler } = setup(renewingResolver());
    const response = await navigationHandler(async ({ cookies }) => {
      cookies.set("session", "started", COOKIE);
      return { redirectTo: "/" };
    }, { access: "public" })(request(), ctx);
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=started;/)]);
  });
});

describe("navigationHandler: GET only", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "answers %s with 405 before resolving a session or running the handler", async (method) => {
      const resolver = renewingResolver();
      const { navigationHandler, container } = setup(resolver);
      const scopes = vi.spyOn(container, "createScope");
      const handler = vi.fn(redirect({ redirectTo: "/" }));
      const response = await navigationHandler(handler, { access: "public" })(request(method), ctx);
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, HEAD");
      expect(response.headers.get("location")).toBeNull();
      expect(scopes).not.toHaveBeenCalled();
      expect(resolver.resolve).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

  it("serves HEAD, which Next answers with the GET handler", async () => {
    const { navigationHandler } = setup();
    const response = await navigationHandler(redirect({ redirectTo: "/" }), { access: "public" })(request("HEAD"), ctx);
    expect(response.status).toBe(303);
  });
});
