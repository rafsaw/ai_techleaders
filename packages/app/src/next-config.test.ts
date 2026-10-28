import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

async function headersFor(url: string) {
  const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
  return response.headers;
}

describe("next.config headers", () => {
  // Token pages (accounts Flow 2 / Flow 3, platform P8): the token is in the
  // address, so it must not leak as a referrer, be cached or be indexed.
  it.each([
    "https://devmentor.test/confirm-email",
    "https://devmentor.test/confirm-email?token=abc&returnTo=%2Faccount",
    "https://devmentor.test/invite/abcDEF123_-",
    "https://devmentor.test/invite/abcDEF123_-?welcome=1",
    // A nested token: the auth pages keep an invitation's returnTo.
    "https://devmentor.test/sign-in?returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/sign-in?error=github_cancelled&returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/sign-up?returnTo=/invite/abc",
    "https://devmentor.test/sign-up/check-email?email=ada%40example.com&returnTo=%2Finvite%2Fabc",
    "https://devmentor.test/confirm-email?token=abc&returnTo=%2Finvite%2Fabc",
  ])(
    "marks %s no-referrer, no-store and noindex",
    async (url) => {
      const headers = await headersFor(url);
      expect(headers.get("referrer-policy")).toBe("no-referrer");
      expect(headers.get("cache-control")).toBe("private, no-store");
      expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
    },
  );

  it.each([
    "https://devmentor.test/sign-in",
    "https://devmentor.test/sign-in?returnTo=%2Faccount",
    "https://devmentor.test/sign-up?returnTo=%2Finvitations",
    "https://devmentor.test/invite",
    "https://devmentor.test/",
  ])("leaves other pages alone: %s", async (url) => {
    const headers = await headersFor(url);
    expect(headers.get("referrer-policy")).toBeNull();
    expect(headers.get("cache-control")).toBeNull();
    expect(headers.get("x-robots-tag")).toBeNull();
  });
});
