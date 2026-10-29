import { ResponseCookies } from "@devmentor/core";
import { describe, expect, it } from "vitest";

import { presentsSessionCookie, SESSION_LIFETIME_SECONDS, sessionCookie } from "@/server/auth/session-cookie";

function request(cookie?: string) {
  return new Request("http://localhost/", cookie ? { headers: { cookie } } : {});
}

describe("session cookie", () => {
  it("lives 30 days", () => {
    expect(SESSION_LIFETIME_SECONDS).toBe(2_592_000);
  });

  it("uses the __Host- name with Secure on an https APP_URL", () => {
    const cookie = sessionCookie(new URL("https://devmentor.example"));
    expect(cookie).toEqual({
      name: "__Host-devmentor_session",
      options: { secure: true, maxAge: SESSION_LIFETIME_SECONDS },
      deleteOptions: { secure: true },
    });
    expect(new ResponseCookies().set(cookie.name, "t", cookie.options).toHeaderValues()).toEqual([
      "__Host-devmentor_session=t; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]);
  });

  it("uses the plain name without Secure on http", () => {
    const cookie = sessionCookie(new URL("http://localhost:3000"));
    expect(cookie.name).toBe("devmentor_session");
    expect(new ResponseCookies().set(cookie.name, "t", cookie.options).toHeaderValues()).toEqual([
      "devmentor_session=t; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax",
    ]);
    expect(new ResponseCookies().delete(cookie.name, cookie.deleteOptions).toHeaderValues()[0]).toContain("Max-Age=0");
  });

  it("detects a presented session cookie under either name only", () => {
    expect(presentsSessionCookie(request())).toBe(false);
    expect(presentsSessionCookie(request("other=1"))).toBe(false);
    expect(presentsSessionCookie(request("devmentor_session="))).toBe(false);
    expect(presentsSessionCookie(request("devmentor_session=abc"))).toBe(true);
    expect(presentsSessionCookie(request("__Host-devmentor_session=abc"))).toBe(true);
    expect(presentsSessionCookie(new Headers({ cookie: "devmentor_session=abc" }))).toBe(true);
    expect(presentsSessionCookie(new Headers())).toBe(false);
  });
});
