# 2026-10-28 — E01 Phase 3 re-review fixes (R10)

**Asked:** fix the Blocker from the Codex re-review of R9: Next's automatic HTTP 308 trailing-slash redirect bypasses the platform P8 token-page headers (`/invite/<token>/` → `/invite/<token>`, `/sign-in/?returnTo=…` → `/sign-in?returnTo=…`; the 308 carries the token in `Location` without `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`). Reproduce first with failing production-build tests, investigate what Next actually does, pick the smallest reliable fix consistent with P8 and the Proxy's P4 constraints, run the full Phase 3 gate. Stay in Phase 3 (spec not moved, no push, no PR).

**Outcome:** success; full gate green. Commits: see "Commits" below.

## Reproduction (before the fix, on e803973 code, fresh `npm run build`)

New `packages/app/tests/integration/token-page-redirect.test.ts` (fetch with `redirect: "manual"` against the harness's production app; random well-formed token; test names use the route template so no token reaches the report): **6 failed | 11 passed (17)**.

- Failed (`AssertionError: expected null to be 'private, no-store'`): the slash form of each of the five `TOKEN_PAGES` routes (`/confirm-email/?token=<t>`, `/invite/<t>/`, `/sign-in/?returnTo=/invite/<t>`, `/sign-up/?returnTo=…`, `/sign-up/check-email/?email=…&returnTo=…`) — status 308 and `Location` were right, all three headers missing — and the same redirect for an RSC request (`RSC: 1`).
- Passed: the five slashless pages (200, headers, meta tags), the non-token slash redirects (`/account/`, `/sign-in/x/`, `/api/users/`, `/api/auth/github/?returnTo=%2F`, `/favicon.ico/` → 308 slashless), and `/`, `/account` not redirected.

`curl -I` on `next start` showed the same for `/api/health/` and `/account/`: a bare 308 with only `location` and `Refresh`.

## Root cause

`node_modules/next/dist/server/lib/router-utils/resolve-routes.js` (Next 16.4.1) walks `[...headers, ...redirects, middleware, ...]`. Header rules accumulate into `resHeaders`; a config redirect route then returns `{ finished: true, resHeaders: null, statusCode }`, so every matched header rule is discarded. The trailing-slash redirect is such a route (`routes-manifest.json`: `source "/:path+/"`, `internal: true`, `priority: true`, 308). User `redirects()` take the same branch. A Proxy redirect, by contrast, returns its own response headers in `resHeaders`.

## Options evaluated

1. **Header sources for the slash form** (`/sign-in/`, `/invite/:token/`) next to `TOKEN_PAGES`: built and probed with `next start`; the sources were in `routes-manifest.json` but the 308 was still bare (`resHeaders: null`). Rejected: cannot work.
2. **Own `redirects()` rule / `beforeFiles` rewrite**: redirects hit the same `resHeaders: null`; rewrites run after the internal redirect (`priority: true`). Rejected from the source; no config-only option exists.
3. **`skipTrailingSlashRedirect: true` with no replacement redirect** (serve both forms, headers on `/:path{/}?`): every page answers at two URLs, `/api/x/` changes behaviour, and the header list doubles. Rejected.
4. **`skipTrailingSlashRedirect: true` + the Proxy issues the same 308 with `TOKEN_PAGE_HEADERS`** (the documented use of the flag): chosen. Sub-choice: headers on every trailing-slash redirect vs only `TOKEN_PAGES`. Every redirect: it echoes the query on any path, a no-store 308 only costs a re-request, and matching `/invite/:token` in the Proxy would be a second copy of the route list (the R9 lesson against second parsers). The matcher gains `/:path+/` (exactly Next's redirect source), so `/api/…/`, file and `_next` slash paths still redirect where they did; cookie renewal stays on canonical page requests only, the Proxy still never authorizes or touches the DB (P4).

Detail: the Location is built from `new URL(request.url)`, because a cloned `NextURL` remembers the parsed trailing slash and re-adds it on format.

## What changed

- `packages/app/next.config.ts`: `skipTrailingSlashRedirect: true` with the reason.
- `packages/app/src/proxy.ts`: `trailingSlashRedirect()` (strip trailing slashes, keep query, `/` and `//` → `/`, 308, `TOKEN_PAGE_HEADERS`) runs before renewal; matcher `["…pages…", "/:path+/"]`; imports `TOKEN_PAGE_HEADERS` from `@/app/token-page`.
- `packages/app/src/app/token-page.ts`: comment.
- Tests: `src/proxy.test.ts` (+9: matcher for slash paths, eight redirect cases incl. query, API, `/a//`, `//`, no cookie renewal on a redirect; import list), `src/next-config.test.ts` (+1: the flag), `tests/integration/token-page-redirect.test.ts` (17 production-build requests).
- Docs: accounts spec Phase 3 notes (R10 entry; R9 entry marked "the 308 itself was not, see R10"), platform P8 (redirects echoing a token page carry the headers), `AGENTS.md` (Proxy bullet and Mentor invitations secret-free bullet), `BACKWARD_COMPATIBILITY.md` (Phase 3: Proxy sends the 308 with headers), `.ai/lessons.md` (Next's redirects drop `headers()` rules). This corrects the R9 run log's audit note that left the bare 308's missing `Cache-Control` to hosting configuration (that log is left unchanged, per the run-log rule).

After the fix, on a fresh build: `token-page-redirect.test.ts` + `invitation-page.test.ts` **47 passed (47)**.

## Gate (sequential)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`, unrelated).
- `npm run typecheck`: pass.
- `npm run test:coverage`: 99 files, 1876 tests passed; 100% statements (1941), branches (1070), functions (552), lines (1729), per-file thresholds met.
- `npm run build`: pass.
- `npm run test:integration`: 11 files, 126 tests passed.
- `npm run test:storybook`: 56 files, 342 tests passed.

No schema change.

## Commits

- `4fd41fc` fix(auth): token-page headers on trailing-slash redirects (R10) — code, tests, spec/platform/AGENTS/BC/lessons docs.
- chore(e01): Phase 3 re-review fix gate and run log (R10) — `track.md` and this log.
