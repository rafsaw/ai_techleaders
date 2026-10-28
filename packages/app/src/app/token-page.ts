import type { Metadata } from "next";

/**
 * Pages whose address carries a raw single-use token (`/confirm-email`,
 * `/invite/[token]`; platform P8). The token must not
 * leave as a referrer, be stored by a browser or shared cache, or be indexed.
 *
 * Both halves are needed: the metadata renders `<meta name="referrer">` and
 * `<meta name="robots">` into the HTML, and `next.config.ts` sends the same
 * rules as response headers for each token route. Next keeps a
 * `Cache-Control` set there for dynamic pages (it only adds its own when the
 * response has none); `next dev` replaces it with `no-store`.
 */
export const TOKEN_PAGE_METADATA = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} satisfies Metadata;

export const TOKEN_PAGE_HEADERS = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/** The auth pages that keep a `returnTo`, which is a token page's address after an invitation. */
export const RETURN_TO_PAGES = ["/sign-in", "/sign-up", "/sign-up/check-email"] as const;

/**
 * `returnTo` values that carry an invitation token (`/invite/<token>`), as
 * `next.config.ts` matches the decoded query value. Pages with such a
 * `returnTo` get the token-page headers too, so a nested token is not leaked
 * as a referrer, cached or indexed either.
 */
export const INVITATION_RETURN_TO_PATTERN = "/invite/.*";
