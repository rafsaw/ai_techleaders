import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

async function headersFor(url: string) {
  const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
  return response.headers;
}

describe("next.config headers", () => {
  // Token pages (accounts Flow 2 / Flow 3, platform P8): the token is in the
  // address, so it must not leak as a referrer, be cached or be indexed. The
  // auth pages that keep a `returnTo` can carry an invitation's token in it,
  // so they are protected by route, whatever their query (review fix R9):
  // a header rule that re-parsed `returnTo` could disagree with the page.
  it.each([
    "https://devmentor.test/confirm-email",
    "https://devmentor.test/confirm-email?token=abc&returnTo=%2Faccount",
    "https://devmentor.test/confirm-email?token=abc&returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/invite/abcDEF123_-",
    "https://devmentor.test/invite/abcDEF123_-?welcome=1",
    "https://devmentor.test/sign-in",
    "https://devmentor.test/sign-in?error=session_expired",
    "https://devmentor.test/sign-in?returnTo=%2Faccount",
    "https://devmentor.test/sign-in?returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/sign-in?error=github_cancelled&returnTo=%2Finvite%2Fabc",
    // R9: the page reads the first value and normalizes it; a query matcher did neither.
    "https://devmentor.test/sign-in?returnTo=%2Finvite%2Fabc&returnTo=%2Faccount",
    "https://devmentor.test/sign-in?returnTo=%2Fx%2F..%2Finvite%2Fabc",
    "https://devmentor.test/sign-in?returnTo=%2Fx%2F%252E%252E%2Finvite%2Fabc",
    "https://devmentor.test/sign-in?returnTo=%2F%2569nvite%2Fabc",
    "https://devmentor.test/sign-up",
    "https://devmentor.test/sign-up?returnTo=/invite/abc",
    "https://devmentor.test/sign-up?returnTo=/invite/abc&returnTo=/account",
    "https://devmentor.test/sign-up?returnTo=/x/../invite/abc",
    "https://devmentor.test/sign-up/check-email?email=ada%40example.com",
    "https://devmentor.test/sign-up/check-email?email=ada%40example.com&returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/sign-up/check-email?email=ada%40example.com&returnTo=%2Finvite%2Fabc&returnTo=%2F",
    "https://devmentor.test/sign-up/check-email?email=ada%40example.com&returnTo=%2Fx%2F..%2Finvite%2Fabc",
  ])("marks %s no-referrer, no-store and noindex", async (url) => {
    const headers = await headersFor(url);
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  // Pages that never read a `returnTo` and carry no token keep Next's defaults.
  it.each([
    "https://devmentor.test/invite",
    "https://devmentor.test/",
    "https://devmentor.test/?invitation=accepted",
    "https://devmentor.test/account?welcome=1",
    "https://devmentor.test/error?code=internal_error",
    "https://devmentor.test/backend/users",
  ])("leaves other pages alone: %s", async (url) => {
    const headers = await headersFor(url);
    expect(headers.get("referrer-policy")).toBeNull();
    expect(headers.get("cache-control")).toBeNull();
    expect(headers.get("x-robots-tag")).toBeNull();
  });

  // Review fix R10: Next sends no headers() rule with its own trailing-slash
  // 308, so it is off and the Proxy (src/proxy.ts) issues it with the headers.
  it("leaves the trailing-slash redirect to the Proxy", () => {
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true);
  });
});
