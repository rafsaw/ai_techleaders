import { describe, expect, it } from "vitest";

import { readCookie, ResponseCookies } from "./cookies";

describe("ResponseCookies", () => {
  it("serializes with secure defaults: HttpOnly, SameSite=Lax, Path=/", () => {
    const cookies = new ResponseCookies().set("devmentor_session", "abc", { secure: false });
    expect(cookies.toHeaderValues()).toEqual(["devmentor_session=abc; Path=/; HttpOnly; SameSite=Lax"]);
  });

  it("serializes the session cookie attributes", () => {
    const cookies = new ResponseCookies().set("__Host-devmentor_session", "tok_en-1", {
      secure: true,
      maxAge: 30 * 24 * 60 * 60,
    });
    expect(cookies.toHeaderValues()).toEqual([
      "__Host-devmentor_session=tok_en-1; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]);
  });

  it("serializes the OAuth cookie attributes with a scoped path", () => {
    const cookies = new ResponseCookies().set("devmentor_oauth", "v", {
      secure: true,
      maxAge: 600,
      path: "/api/auth/github",
    });
    expect(cookies.toHeaderValues()).toEqual([
      "devmentor_oauth=v; Max-Age=600; Path=/api/auth/github; HttpOnly; Secure; SameSite=Lax",
    ]);
  });

  it("honours explicit httpOnly and sameSite choices", () => {
    const cookies = new ResponseCookies()
      .set("a", "1", { secure: false, httpOnly: false, sameSite: "strict" })
      .set("b", "2", { secure: true, sameSite: "none" });
    expect(cookies.toHeaderValues()).toEqual([
      "a=1; Path=/; SameSite=Strict",
      "b=2; Path=/; HttpOnly; Secure; SameSite=None",
    ]);
  });

  it("encodes values that are not cookie-safe", () => {
    const cookies = new ResponseCookies().set("s", '{"returnTo":"/a b;c"}', { secure: false });
    const [header] = cookies.toHeaderValues();
    expect(header).toMatch(/^s=[^ ;]+; Path=\//);
    expect(readCookie(new Headers({ cookie: header!.split(";")[0]! }), "s")).toBe('{"returnTo":"/a b;c"}');
  });

  it("deletes with Max-Age=0, an epoch Expires and the original path", () => {
    const cookies = new ResponseCookies().delete("devmentor_oauth", {
      secure: true,
      path: "/api/auth/github",
    });
    expect(cookies.toHeaderValues()).toEqual([
      "devmentor_oauth=; Max-Age=0; Path=/api/auth/github; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    ]);
  });

  it("lets a later write of the same name replace the earlier one", () => {
    const cookies = new ResponseCookies()
      .set("devmentor_session", "old", { secure: false })
      .set("other", "x", { secure: false })
      .delete("devmentor_session", { secure: false });
    expect(cookies.has("devmentor_session")).toBe(true);
    expect(cookies.has("missing")).toBe(false);
    expect(cookies.toHeaderValues()).toEqual([
      "devmentor_session=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
      "other=x; Path=/; HttpOnly; SameSite=Lax",
    ]);
  });

  it("appends every cookie as its own Set-Cookie header", () => {
    const headers = new Headers({ "content-type": "application/json" });
    new ResponseCookies().set("a", "1", { secure: false }).set("b", "2", { secure: false }).applyTo(headers);
    expect(headers.getSetCookie()).toEqual([
      "a=1; Path=/; HttpOnly; SameSite=Lax",
      "b=2; Path=/; HttpOnly; SameSite=Lax",
    ]);
  });

  it("applies nothing when no cookie was written", () => {
    const headers = new Headers();
    new ResponseCookies().applyTo(headers);
    expect(headers.getSetCookie()).toEqual([]);
  });

  it.each([
    ["SameSite=None without Secure", "a", { secure: false, sameSite: "none" as const }, /SameSite=None/],
    ["__Secure- without Secure", "__Secure-a", { secure: false }, /__Secure-/],
    ["__Host- without Secure", "__Host-a", { secure: false }, /__Host-/],
    ["__Host- with a narrower path", "__Host-a", { secure: true, path: "/api" }, /__Host-/],
  ])("rejects %s", (_label, name, options, message) => {
    expect(() => new ResponseCookies().set(name, "v", options)).toThrow(message);
  });

  it("accepts a Secure __Secure- cookie", () => {
    expect(new ResponseCookies().set("__Secure-a", "v", { secure: true }).toHeaderValues()).toEqual([
      "__Secure-a=v; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]);
  });

  it("rejects names that are not valid cookie names", () => {
    expect(() => new ResponseCookies().set("bad name", "v", { secure: false })).toThrow(TypeError);
  });
});

describe("readCookie", () => {
  it("reads a cookie from a Request", () => {
    const req = new Request("http://localhost/", { headers: { cookie: "a=1; devmentor_session=tok" } });
    expect(readCookie(req, "devmentor_session")).toBe("tok");
  });

  it("reads a cookie from Headers", () => {
    expect(readCookie(new Headers({ cookie: "a=1" }), "a")).toBe("1");
  });

  it("returns undefined without a Cookie header, for a missing name or an empty value", () => {
    expect(readCookie(new Request("http://localhost/"), "a")).toBeUndefined();
    expect(readCookie(new Headers({ cookie: "b=2" }), "a")).toBeUndefined();
    expect(readCookie(new Headers({ cookie: "a=" }), "a")).toBeUndefined();
  });

  it("uses the first value when a name repeats", () => {
    expect(readCookie(new Headers({ cookie: "a=first; a=second" }), "a")).toBe("first");
  });
});
