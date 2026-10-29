# 2026-10-28 — E01 Phase 3 review fixes (R9)

**Asked:** fix the Blocker from the independent Phase 3 code review (Codex, REQUEST CHANGES): token-page protective headers on the auth pages that carry a nested invitation `returnTo` could be bypassed. Stay in Phase 3 (spec not moved, no push, no PR). Reproduce first with failing unit and production-build integration tests, fix by route (no regex mirror of the parser), audit every page, run the full Phase 3 gate.

**Outcome:** success; full gate green. Commits: see "Commits" below.

## Finding (R9)

`packages/app/next.config.ts` added `TOKEN_PAGE_HEADERS` to `/sign-in`, `/sign-up` and `/sign-up/check-email` only through `has: [{ type: "query", key: "returnTo", value: "/invite/.*" }]` (raw query value), while the pages decided their metadata with `returnToPageMetadata(…, parseReturnTo(first(params.returnTo)))`: the first value, normalized. The two parsers disagreed:

- duplicate `?returnTo=/invite/<t>&returnTo=/account`: no headers, page forwards `/invite/<t>`;
- dot segments `?returnTo=/x/../invite/<t>` (also `%2E%2E`): no headers, page forwards the normalized `/invite/<t>`;
- percent-encoded segment `?returnTo=/%69nvite/<t>`: no headers **and** no meta tags (`parseReturnTo` keeps `/%69nvite/<t>`, so `isInvitation` was false too), while the page still put the token in its links and forms.

## Reproduction (before the fix, on fda8e4a code)

- `packages/app/src/next-config.test.ts` (rewritten matrix): **13 failed | 15 passed (28)**. 8 failures were bypass variants (duplicate, `/x/../`, `%252E%252E`, `%2569` on the three pages); 5 were the target design's new cases (plain `/sign-in`, `?error=session_expired`, `?returnTo=/account`, plain `/sign-up`, `/sign-up/check-email` without `returnTo`).
- `packages/app/src/app/(frontend)/password-pages.test.tsx` (metadata for each page over duplicate, dot-segment, `/%69nvite/…`, safe and unsafe values): **3 failed | 30 passed (33)** — `AssertionError: expected { title: 'Sign in' } to deeply equal { title: 'Sign in', …(2) }` (same for the other two pages).
- `packages/app/tests/integration/invitation-page.test.ts` against a fresh `npm run build` of the old code: **21 failed | 9 passed (30)** — `AssertionError: expected null to be 'no-referrer'`. Per page 7 failures: plain, `session_expired`, `/account`, duplicate, `/x/../`, `%252E%252E`, `%2569`; only the exact `/invite/…` and `github_cancelled&returnTo=/invite/…` variants passed.

## Root cause

A security header depended on a second, simpler parser of the same input (`next.config` `has` regex on the raw query) than the one the page uses (`first()` + `parseReturnTo`), and the page's own conditional (`isInvitation` on the normalized path) missed encoded segments. Any conditional on the query can drift from page parsing.

## Fix (orchestrator-preferred design)

No conditional at all:

- `src/app/token-page.ts`: `TOKEN_PAGES = ["/confirm-email", "/invite/:token", "/sign-in", "/sign-up", "/sign-up/check-email"]`; `next.config.ts` `headers()` maps each to `TOKEN_PAGE_HEADERS` by `source` only.
- The three auth pages export static `metadata = { title, ...TOKEN_PAGE_METADATA }` instead of `generateMetadata`.
- Removed dead `INVITATION_RETURN_TO_PATTERN`, `RETURN_TO_PAGES`, `returnToPageMetadata`; kept `isInvitation` (sign-up copy).
- Only adds protections: every visit to an auth page is now no-referrer / `private, no-store` / noindex. Nothing in P8 is weakened.

Tests now: `next-config.test.ts` 28 cases (22 protected URLs incl. all bypasses, 6 untouched pages: `/invite`, `/`, `/?invitation=accepted`, `/account?welcome=1`, `/error?code=…`, `/backend/users`); static-metadata assertions in `password-pages.test.tsx` / `frontend.test.tsx`; `invitation-page.test.ts` requests 27 auth-page URLs (3 pages × 9 query variants) on the production build asserting the three headers exactly and both meta tags, plus a home page negative check.

## Audit

Pages (not API routes) and whether their address can carry `/invite/<token>` or `token=` that the page forwards:

| Page | Reads/forwards returnTo or token? | Protection |
| --- | --- | --- |
| `/sign-in` (incl. `?error=github_*`, `?error=session_expired`) | yes, `returnTo` | by route (new: always) |
| `/sign-up` | yes, `returnTo` | by route (new: always) |
| `/sign-up/check-email` | yes, `returnTo` | by route (new: always) |
| `/confirm-email` | yes, `token` and `returnTo` | by route (unchanged) |
| `/invite/[token]` | yes, path token | by route (unchanged) |
| `/error` | no: reads only `code`; `navigationHandler` sends `/error?code=…`, the GitHub callback's `onError` (`signInErrorPath`) targets `/sign-in?error=…&returnTo=…` (protected) | none needed |
| `/` | reads only `invitation=accepted` (no token) | none needed |
| `/account` | reads only `welcome`; guard uses static `returnTo: "/account"` | none needed |
| `/backend`, `/backend/users` | no query; guards use static `returnTo` | none needed |

Path variants, probed with `next start` on the fixed build:

- Trailing slash (`/sign-in/?returnTo=…`, `/sign-up/check-email/?…`, `/invite/<t>/`, `/confirm-email/?token=…`): Next's 308 to the slashless route, which is protected. The redirect has no document, so it renders no links and is never a referring page (a redirect keeps the initiating document's referrer); the crawler/browser lands on the protected target. Residual (pre-existing for `/invite` and `/confirm-email` too, not introduced here): the 308 carries no `Cache-Control`, and a 308 is heuristically cacheable; it stores only a redirect whose cache key already contains the URL, the same exposure as access logs, which P8 assigns to hosting configuration.
- Case variant `/Sign-In?…`: 404 (it even got the config headers; Next's error `Cache-Control` wins on errors). Encoded path `/sign%2Din`, `/%73ign-in`, `/sign-in;x`: 404. `/%69nvite/<t>` (the encoded `returnTo` destination): 404, Next does not decode it to `/invite/[token]`. 404s render no forms or links carrying the value.
- `GET /api/auth/github?returnTo=/invite/<t>`: 303 to GitHub whose `Location` has no token (`returnTo` travels in the OAuth cookie). Its request comes from a no-referrer page, so no Referer, and a 303 is not heuristically cacheable. No headers needed. The callback's 303s go to protected pages or to the validated destination.

`Cache-Control` reaches the client: all five token pages are `ƒ (Dynamic)` in the build output (search params / cookies), and `next start` answered `Cache-Control: private, no-store` (the config value; Next adds its own only when none is set), asserted by the integration tests.

## Docs

Spec Phase 3 implementation notes (old conditional entry struck through, new R9 entry), platform P8 (token page = any route that can carry a token, by route), `AGENTS.md` (Mentor invitations secret-free bullet), `BACKWARD_COMPATIBILITY.md` (Phase 3: auth pages always send the headers), `.ai/lessons.md` (never re-implement request parsing in `has` matchers), `track.md` (R9, R4.G).

## Gate

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`, unrelated).
- `npm run typecheck`: pass.
- `npm run test:coverage`: 99 files, 1866 tests passed, 100% per-file thresholds met.
- `npm run build`: pass.
- `npm run test:integration`: 10 files, 109 tests passed. (A first run, started while `test:storybook` ran in parallel, failed in global setup: Mailpit `/readyz` not reachable within 60 s, no test executed; rerun alone passed.)
- `npm run test:storybook`: 56 files, 342 tests passed.

## Commits

- `d1fd554` fix(auth): token-page headers on auth pages by route, whatever the returnTo (R9) — code, tests, spec/platform/AGENTS/BC/lessons docs.
- chore(e01): Phase 3 review fixes gate and run log (R9) — `track.md` and this log.
