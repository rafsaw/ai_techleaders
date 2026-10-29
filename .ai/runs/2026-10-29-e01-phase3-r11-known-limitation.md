# 2026-10-29 — E01 Phase 3 R11: repeated-slash/backslash 308 as a known limitation

**Asked:** implement the approved R11 outcome (Codex review, Major). Next's unconditional repeated-slash/backslash 308 echoes a token page's token in `Location` without the platform P8 headers. Product-owner decision, verbatim: "R11 remains a documented known limitation and a production release blocker, not a resolved security defect." Document it (accounts spec entry + release condition, platform P8, README hosting checklist, AGENTS.md, lessons), add a canary integration test that pins today's behaviour, make the Proxy unit tests honest, run the full gate, update the tracker. No runtime change (no custom server, no Next patch, no change to `proxy.ts`, `next.config.ts` or `token-page.ts`). Stay in Phase 3 (spec not moved, no push, no PR).

**Outcome:** partial. Docs and tests done; lint, typecheck, unit coverage, build and Storybook green. `npm run test:integration` could not run: Docker Desktop was not running in this session (`docker` missing in WSL, `docker.exe ps`: no `dockerDesktopLinuxEngine` pipe; Testcontainers: "Could not find a working container runtime strategy"). The R6.G tracker item stays unticked until the integration suite is rerun with Docker.

## Investigation (done before this run, re-checked here)

- `node_modules/next/dist/server/lib/router-utils/resolve-routes.js:102-114` (Next 16.4.1): if the path before `?` matches `/(\\|\/\/)/`, it returns `{ parsedUrl: parseUrl(normalizeRepeatedSlashes(req.url)), resHeaders, finished: true, statusCode: 308 }` before any route (headers, redirects, Proxy, rewrites, pages) is examined. `router-server.js` then writes `location`, `Refresh: 0;url=<dest>` and the destination as the body. Twin: `server/base-server.js:536-545` (`res.redirect(cleanUrl, 308).body(cleanUrl)`).
- `shared/lib/utils.js` `normalizeRepeatedSlashes`: raw `\` → `/`, then `//+` → `/` on the path; the query is kept verbatim.
- No config option disables it (`skipTrailingSlashRedirect` covers only the trailing-slash rule).
- Probed on `next start` (current build) with `curl -si --path-as-is`: `/sign-in//?returnTo=%2Finvite%2Fabc`, `//sign-in?returnTo=x`, `/invite//abc`, `/invite/abc//`, `/confirm-email//?token=abc`, `/sign-in\?returnTo=x` each answered `308` with only `location`, `Refresh`, `Date`, `Connection`, `Keep-Alive`, `Transfer-Encoding`; the next hop (`/sign-in/?returnTo=x`, R10's Proxy 308) carried all three headers.

## Options considered

1. Custom Node server in front of Next to normalize first: new runtime surface and deployment shape for a low risk. Rejected by the product owner.
2. Patch Next (`patch-package`): a fork to carry across upgrades. Rejected.
3. Fix in the Proxy / `headers()`: impossible, both run after this redirect.
4. **Chosen (approved):** documented known limitation and production release blocker; the hosting edge must normalize such paths before the app, or add `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` to the app's 3xx responses, verified against the canary inputs.

Risk recap: the token goes back only to the client that sent it; without `Cache-Control` the 308 is heuristically cacheable in the browser's private cache (or a shared cache, if a caching edge existed); missing `Referrer-Policy`/`X-Robots-Tag` on a redirect has negligible effect; the app's links never produce these URLs; no hosting edge exists yet.

## What changed

- `packages/app/tests/integration/token-page-repeated-slash.test.ts` (new, 12 tests): R11 canary. Six raw inputs (`/sign-in//?returnTo=<t>`, `//sign-in?returnTo=<t>`, `/invite//<t>`, `/invite/<t>//`, `/confirm-email//?token=<t>`, `/sign-in\?returnTo=<t>`; random well-formed token, test names use templates). Each: 308, `Location` equal to Next's normalization (relative), `Refresh: 0;url=<location>`, body equal to the location, and `cache-control`, `referrer-policy`, `x-robots-tag` absent. Then the chain: every further hop (R10's Proxy 308 where a trailing slash remains) is 308 with the three headers, and the final page is 200 with the headers and both meta tags. Requests go through `node:http` with the raw path, because `fetch` (WHATWG URL) turns `\` into `/` before sending; the 308s themselves prove the raw path reached the server (a normalized path would be a page or a protected Proxy 308). Verified locally against `next start` without a database: all six bare-308 tests passed and the hop logic passed; the three chains ending on `/invite/<t>` and `/confirm-email` returned 500 at the final page only because no DB was running (the same pages are 200 in the harness, per `token-page-redirect.test.ts`). Not yet run in the real harness (see Outcome).
- `packages/app/src/proxy.test.ts`: removed `/a//` from the matcher case and the `["/a//", "/a"]`, `["//", "/"]` rows from the redirect table (those paths never reach the Proxy in production); added one labelled defensive test for `//` → `/` that covers the `|| "/"` fallback, with a comment that Next answers such paths first (R11). `proxy.ts` unchanged, still 100% statements/branches/functions/lines.
- `.ai/specs/2026-10-17-accounts-and-roles.md`: R11 entry after R10 (known limitation and production release blocker, not resolved; Next source refs; options; verbatim decision; canary) and a new release condition for the hosting edge.
- `.ai/specs/2026-10-17-platform-primitives.md` P8: the redirect sentence now says the app-issued trailing-slash 308 carries the headers (R10) and Next's repeated-slash/backslash 308 cannot, which is a hosting responsibility and release condition (R11).
- `README.md`: "Repeated slashes and backslashes" paragraph after the access-log redaction item in the operator runbook, with the `curl -sI --path-as-is` verification.
- `AGENTS.md`: Proxy bullet: don't try to fix it in the Proxy; hosting release condition (R11).
- `.ai/lessons.md`: new lesson.
- `BACKWARD_COMPATIBILITY.md`: unchanged on purpose. No URL, header, status or contract changed; the limitation is recorded in the specs and README.

## Gate (sequential)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`, unrelated).
- `npm run typecheck`: pass.
- `npm run test:coverage`: 99 files, 1875 tests passed (1876 before: two Proxy redirect rows removed, one defensive test added); 100% statements (1941), branches (1070), functions (552), lines (1729), per-file thresholds met.
- `npm run build`: pass.
- `npm run test:integration`: **not run** — Docker Desktop not running. Expected after rerun: 12 files, 138 tests (126 + 12).
- `npm run test:storybook`: 56 files, 342 tests passed.

No schema change.

## Commits

- test/docs commit: canary integration test, Proxy test cleanup, spec/platform/README/AGENTS/lessons docs.
- chore(e01): Phase 3 R11 known limitation, gate and run log — `track.md` and this log.
