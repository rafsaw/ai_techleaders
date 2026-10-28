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
  it.each(["https://devmentor.test/confirm-email", "https://devmentor.test/confirm-email?token=abc&returnTo=%2Faccount"])(
    "marks %s no-referrer, no-store and noindex",
    async (url) => {
      const headers = await headersFor(url);
      expect(headers.get("referrer-policy")).toBe("no-referrer");
      expect(headers.get("cache-control")).toBe("private, no-store");
      expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
    },
  );

  it("leaves other pages alone", async () => {
    const headers = await headersFor("https://devmentor.test/sign-in");
    expect(headers.get("referrer-policy")).toBeNull();
    expect(headers.get("cache-control")).toBeNull();
    expect(headers.get("x-robots-tag")).toBeNull();
  });
});
