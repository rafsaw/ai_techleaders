import type { Metadata } from "next";

/**
 * Pages whose address carries a raw single-use token (`/confirm-email`,
 * `/invite/[token]`; platform P8), or can carry one nested in a `returnTo`
 * (`/sign-in`, `/sign-up`, `/sign-up/check-email` keep an invitation's
 * `/invite/<token>`). The token must not leave as a referrer, be stored by a
 * browser or shared cache, or be indexed.
 *
 * Both halves are needed: the metadata renders `<meta name="referrer">` and
 * `<meta name="robots">` into the HTML, and `next.config.ts` sends the same
 * rules as response headers for each route in `TOKEN_PAGES`. Next keeps a
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

/**
 * The routes that get `TOKEN_PAGE_HEADERS` (`next.config.ts`), whatever their
 * query; each page spreads `TOKEN_PAGE_METADATA` into its static metadata.
 * Protected by route, never by matching `returnTo` (review fix R9): a header
 * rule that re-parsed the query could disagree with the page, which reads the
 * first value and normalizes its path.
 */
export const TOKEN_PAGES = ["/confirm-email", "/invite/:token", "/sign-in", "/sign-up", "/sign-up/check-email"] as const;
