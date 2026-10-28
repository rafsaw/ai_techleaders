import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  INTERNAL_REDIRECT_MAX_LENGTH, parseInternalRedirect, parseReturnTo, RETURN_TO_FALLBACK, RETURN_TO_MAX_LENGTH,
  returnToSchema,
} from "./return-to.schema";

const unsafe: Array<[label: string, value: unknown]> = [
  // Missing or wrong type
  ["undefined", undefined],
  ["null", null],
  ["a number", 42],
  ["an array of paths", ["/account"]],
  ["an object", { path: "/account" }],
  ["an empty string", ""],
  // Not a relative path
  ["a relative path without a leading slash", "account"],
  ["an absolute https URL", "https://evil.example/"],
  ["a javascript: URL", "javascript:alert(1)"],
  ["a data: URL", "data:text/html,<script>alert(1)</script>"],
  ["a mailto: URL", "mailto:a@evil.example"],
  ["a scheme after spaces", " https://evil.example"],
  // Cross-origin through protocol-relative forms
  ["a protocol-relative URL", "//evil.example"],
  ["a protocol-relative URL with a path", "//evil.example/account"],
  ["three leading slashes", "///evil.example"],
  ["many leading slashes", "////evil.example/"],
  // Backslashes (browsers treat them as slashes)
  ["a leading backslash after slash", "/\\evil.example"],
  ["only backslashes", "\\\\evil.example"],
  ["a backslash inside the path", "/account\\..\\api"],
  ["a backslash in the query", "/account?x=\\"],
  // Controls, whitespace and invisible characters
  ["a NUL byte", "/account\u0000"],
  ["a tab before a second slash", "/\t/evil.example"],
  ["a newline (header injection)", "/account\r\nSet-Cookie: x=1"],
  ["a DEL character", "/account\u007f"],
  ["a C1 control", "/account\u0085"],
  ["a space", "/my account"],
  ["a non-breaking space", "/my account"],
  ["a line separator", "/account "],
  ["a zero-width space", "/acc​ount"],
  ["a bidi override", "/account‮"],
  ["a lone surrogate", "/account\ud800"],
  // Malformed or ambiguous encodings
  ["a truncated escape", "/account%"],
  ["a non-hex escape", "/account%zz"],
  ["a malformed UTF-8 escape", "/account%c3"],
  ["an overlong UTF-8 slash", "/%c0%af"],
  ["a malformed escape in the query", "/account?x=%zz"],
  ["a malformed escape in the fragment", "/account#%e0%a4"],
  ["an encoded slash", "/%2F%2Fevil.example"],
  ["an encoded slash inside a segment", "/account%2fsettings"],
  ["an encoded backslash", "/%5Cevil.example"],
  ["a double-encoded dot segment", "/account/%252e%252e/api"],
  ["a double-encoded character", "/%2561pi"],
  ["an encoded literal percent", "/100%25"],
  ["an encoded NUL", "/account%00"],
  ["an encoded newline", "/account%0d%0a"],
  ["an encoded space", "/my%20account"],
  ["an encoded tab", "/%09/evil.example"],
  // Reserved roots, bare and descendants
  ["bare /api", "/api"],
  ["/api with a trailing slash", "/api/"],
  ["an /api descendant", "/api/users"],
  ["/api with a query", "/api?x=1"],
  ["/api with a fragment", "/api#x"],
  ["upper-case /API", "/API/users"],
  ["bare /_next", "/_next"],
  ["/_next with a trailing slash", "/_next/"],
  ["a /_next descendant", "/_next/static/chunk.js"],
  ["mixed-case /_NeXt", "/_NeXt/data"],
  // Encoded and normalized reserved roots
  ["/api via an encoded letter", "/%61pi"],
  ["/api via encoded letters, upper-case hex", "/%41%50%49/users"],
  ["/_next via an encoded underscore", "/%5Fnext/static"],
  ["/api via a dot segment", "/account/../api"],
  ["/api via a single-dot segment", "/./api"],
  ["/api via encoded dot segments", "/account/%2e%2e/api/users"],
  ["/api via upper-case encoded dots", "/account/%2E%2E/api"],
  ["/api via mixed dot encoding", "/x/.%2e/api"],
  ["/_next via dot segments past the root", "/../../_next/static"],
  ["/api via a double slash after dots", "/x/..//api"],
  ["a protocol-relative result after dot segments", "/x/..//evil.example/"],
];

const tooLong: Array<[label: string, value: string]> = [
  ["a path longer than 512 characters", `/${"a".repeat(RETURN_TO_MAX_LENGTH)}`],
  ["a path that grows past 512 characters once encoded", `/${"é".repeat(100)}`],
];

const hostile = [...unsafe, ...tooLong];

const allowed: Array<[label: string, value: string, expected: string]> = [
  ["the root", "/", "/"],
  ["a page", "/account", "/account"],
  ["a nested page with a trailing slash", "/mentors/ada/", "/mentors/ada/"],
  ["the invitation path", "/invite/AbC-123_xyz", "/invite/AbC-123_xyz"],
  ["/apiary (prefix, not the /api root)", "/apiary", "/apiary"],
  ["/api-docs", "/api-docs", "/api-docs"],
  ["/_nextjs", "/_nextjs", "/_nextjs"],
  ["/api deeper in the path", "/docs/api", "/docs/api"],
  ["/api/ inside a query value", "/search?q=/api/users", "/search?q=/api/users"],
  ["an encoded /api/ inside a query value", "/sign-in?returnTo=%2Fapi%2Fx", "/sign-in?returnTo=%2Fapi%2Fx"],
  ["a nested encoded returnTo", "/sign-in?returnTo=%2Finvite%2Ftok", "/sign-in?returnTo=%2Finvite%2Ftok"],
  ["a fragment", "/account#name", "/account#name"],
  ["/_next inside a fragment", "/account#/_next", "/account#/_next"],
  ["a query and a fragment", "/a?x=1&y=2#z", "/a?x=1&y=2#z"],
  ["a dot segment, normalized", "/mentors/./ada", "/mentors/ada"],
  ["a parent segment, normalized", "/mentors/x/../ada", "/mentors/ada"],
  ["an encoded dot segment, normalized", "/mentors/x/%2e%2e/ada", "/mentors/ada"],
  ["parent segments past the root, clamped", "/../account", "/account"],
  ["a safe encoded letter", "/%61ccount", "/%61ccount"],
  ["non-ASCII characters, percent-encoded", "/mentors/zoë", "/mentors/zo%C3%AB"],
  ["an empty query", "/account?", "/account"],
  ["a double slash inside the path", "/mentors//ada", "/mentors//ada"],
  ["exactly 512 characters", `/${"a".repeat(RETURN_TO_MAX_LENGTH - 1)}`, `/${"a".repeat(RETURN_TO_MAX_LENGTH - 1)}`],
];

describe("parseReturnTo", () => {
  it.each(hostile)("rejects %s", (_label, value) => {
    expect(parseReturnTo(value)).toBeNull();
  });

  it.each(allowed)("accepts %s", (_label, value, expected) => {
    expect(parseReturnTo(value)).toBe(expected);
  });

  it("returns only same-origin relative paths", () => {
    for (const [, value] of allowed) {
      const path = parseReturnTo(value)!;
      expect(path.startsWith("/") && !path.startsWith("//")).toBe(true);
      expect(new URL(path, "https://app.example").origin).toBe("https://app.example");
    }
  });
});

// R6: server-built redirect targets (an added welcome flag, a re-encoded returnTo in an error
// page's query) may exceed 512 characters; every other rule stays the same.
describe("parseInternalRedirect", () => {
  it.each(unsafe)("rejects %s, like parseReturnTo", (_label, value) => {
    expect(parseInternalRedirect(value)).toBeNull();
  });

  it.each(allowed)("accepts %s, like parseReturnTo", (_label, value, expected) => {
    expect(parseInternalRedirect(value)).toBe(expected);
  });

  it.each(tooLong)("accepts %s, which parseReturnTo rejects", (_label, value) => {
    expect(parseReturnTo(value)).toBeNull();
    expect(parseInternalRedirect(value)).toBe(new URL(value, "https://x.invalid").pathname);
  });

  it("accepts a 512-character returnTo plus the welcome flag", () => {
    const path = `/${"a".repeat(RETURN_TO_MAX_LENGTH - 1)}?welcome=1`;
    expect(parseReturnTo(path)).toBeNull();
    expect(parseInternalRedirect(path)).toBe(path);
  });

  it("accepts exactly 2048 characters and rejects one more, also after encoding", () => {
    const longest = `/${"a".repeat(INTERNAL_REDIRECT_MAX_LENGTH - 1)}`;
    expect(parseInternalRedirect(longest)).toBe(longest);
    expect(parseInternalRedirect(`${longest}a`)).toBeNull();
    expect(parseInternalRedirect(`/${"é".repeat(400)}`)).toBeNull();
  });

  it("still rejects a long reserved or protocol-relative target", () => {
    expect(parseInternalRedirect(`/api/${"a".repeat(1000)}`)).toBeNull();
    expect(parseInternalRedirect(`//evil.example/${"a".repeat(1000)}`)).toBeNull();
  });
});

describe("returnToSchema", () => {
  it.each(hostile)("falls back to / for %s", (_label, value) => {
    expect(returnToSchema.parse(value)).toBe(RETURN_TO_FALLBACK);
  });

  it.each(allowed)("keeps %s", (_label, value, expected) => {
    expect(returnToSchema.parse(value)).toBe(expected);
  });

  it("falls back to / when the field is absent from an object", () => {
    const schema = z.object({ email: z.string(), returnTo: returnToSchema });
    expect(schema.parse({ email: "a@b.c" })).toEqual({ email: "a@b.c", returnTo: "/" });
    expect(schema.parse({ email: "a@b.c", returnTo: "/invite/tok" })).toEqual({
      email: "a@b.c",
      returnTo: "/invite/tok",
    });
  });

  it("never fails validation", () => {
    expect(returnToSchema.safeParse(Symbol("x")).success).toBe(true);
  });
});
