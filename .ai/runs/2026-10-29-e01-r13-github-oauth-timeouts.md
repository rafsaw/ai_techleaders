# 2026-10-29 — E01 R13: GitHub OAuth timeouts

**Asked:** fix review finding R13 (Codex final E01 review, Major). `adapters/arctic-github-oauth.ts` made GitHub requests with no timeout: `exchangeCode` through arctic's `OAuth2Client.validateAuthorizationCode` and `fetchIdentity` through global `fetch` for `/user` and `/user/emails` plus `response.json()`. A stalled provider left `/api/auth/github/callback` hanging instead of returning `github_failed` (to `/sign-in?error=github_failed`, keeping `returnTo=/invite/<token>`). Reproduce first, fix with bounded timeouts and cancellation, docs, full gate, tracker. No spec move, no push, no PR.

**Outcome:** success.

## Investigation

- arctic 3.7.0 (`dist/client.js`, `dist/request.js`): `validateAuthorizationCode` builds its own `Request` (no `signal`) and calls the module's `sendTokenRequest`, which calls global `fetch(request)`. Neither the request helpers nor a fetch/signal option are exported, so the token request cannot be bounded through arctic.
- Callback path: `GitHubSignInService.complete` maps any `GitHubOAuthError` to `GitHubSignInError("github_failed", returnTo)`, logs only `summarizeError(cause)` (name/code), and the route's `onError: signInErrorPath` redirects to `/sign-in?error=github_failed&returnTo=…`. So the adapter only has to throw `GitHubOAuthError` in time.
- Without a signal, undici waits up to its defaults (300 s headers, 300 s body).
- Verified with a local `node:http` server that answers headers then a partial body: `fetch(url, { signal: AbortSignal.timeout(300) })` resolves headers, and `response.json()` then rejects with `TimeoutError` at ~300 ms. So one signal covers the body read.

## Reproduction (before the fix)

- Unit (`arctic-github-oauth.test.ts`, new describe "timeouts (R13)", run with `--testTimeout 3000`): 8 failed / 15 passed. The two token-stall cases (no headers; headers then stalled body) and the four API cases (`/user`, `/user/emails` × no headers / stalled body) timed out at 3000 ms, the sibling-abort case failed (`init.signal` undefined), and the `GITHUB_REQUEST_TIMEOUT_MS` constant did not exist.
- Integration (`invitation-flow.test.ts` "a GitHub provider that stalls (R13)", only that describe, production build of the unfixed code): 5 failed. Each stall scenario ran ~62 s and failed on `agent-browser wait --text "GitHub sign-in failed."` (the callback never answered); the follow-up "once GitHub answers again" failed too, because the browser was still stuck on the hanging callback.

## Options and decision

1. Race arctic's promise against a timer: answers in time but never cancels the request (the socket and the stalled response stay open until undici's 300 s timeouts). Rejected: no cancellation.
2. A process-wide undici dispatcher with header/body timeouts: affects every `fetch` in the process (Next patches `fetch`), and is not per-call. Rejected.
3. Own token request with `fetch` + `AbortSignal`, keeping arctic for the authorization URL/PKCE. **Chosen**: small, real cancellation, same request shape (form body `grant_type`/`code`/`redirect_uri`/`code_verifier`, Basic client credentials, `Accept: application/json`).

Timeout: `GITHUB_REQUEST_TIMEOUT_MS = 10_000`, a module constant; the constructor takes `{ timeoutMs }` as a second argument for unit tests only (Awilix passes only the cradle). No env key: the integration test runs against the real 10 s value (≈13 s per stall scenario, four scenarios), which proves the production default rather than a test override, and avoids a new config/README/BC surface. Deadline: one per step — the token exchange, and `/user` + `/user/emails` together (`AbortSignal.any([timeout, failed])`; the first failure aborts the sibling). Worst case for the callback ≈ 20 s.

## Fix

- `packages/app/src/server/services/auth/adapters/arctic-github-oauth.ts`: `readJson(url, init, signal, name)` (fetch + status check + `json()` under one signal); `exchangeCode` posts the token request itself and requires a non-empty `access_token` (GitHub answers a rejected code with 200 and `{ error }`); `fetchIdentity` shares one deadline and aborts the sibling on failure. Error mapping unchanged: everything becomes `GitHubOAuthError` with a generic message (`GitHub token exchange failed`, `GitHub API answered <status>`, `GitHub API request failed`, `GitHub API returned an unexpected body`); the underlying error only as `cause` (logged as its name, e.g. `TimeoutError`). Nothing logs tokens or codes. Port and service unchanged.

## Tests

- Unit: request shape now asserted on `init` (method, headers, signal, form body); token failures (400, 502 without body, unreachable, non-JSON, 200 without token) map to `GitHubOAuthError("GitHub token exchange failed")` with the cause; R13 cases for both stalls on the token endpoint and on each API path (all signals aborted, cause `TimeoutError`, 50 ms override); a sibling-abort case with a 600 s bound, so only the first failure can end the stalled sibling. Adapter 100% covered.
- Integration: `tests/integration/github-stub.ts` gains `POST /__stub/stall` (`{ path, mode: "headers" | "body" }` or `null`) and `GET /__stub/stall` (stalled requests still open), with `setGitHubStubStall`/`openStalledGitHubRequests`. `invitation-flow.test.ts` adds invitee `inv-fay-<suffix>` (GitHub only, no rate-limit budget; in the `afterAll` cleanup; the stall is cleared in `afterAll`): from `/invite/<token>` signed out, for the token endpoint (headers, body), `/user/emails` (headers) and `/user` (body), the callback lands on `/sign-in?error=github_failed&returnTo=%2Finvite%2F<token>` 9.5–20 s after Authorize, the stub sees the stalled connection closed, and no session cookie is set; un-stalled, GitHub sign-in returns to the invitation. The token is in `seenTokens` for the evidence check.
- After the fix, the R13 describe alone: 5 passed (stall cases 13.3–14.5 s each).

## Docs

- Accounts spec: the `GitHubOAuth` row (timeout contract), a "GitHub stalls" row in the failure table, and the R13 note after R12.
- `AGENTS.md`: GitHub home bullet notes the 10 s `AbortSignal` bound.
- `.ai/lessons.md`: bound every outbound call with an `AbortSignal`, body included.
- No README, `.env.example` or `BACKWARD_COMPATIBILITY.md` change: no env key, port or route contract changed.

## Gate

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run test:coverage`: 99 files, 1885 tests, 100% statements/branches/functions/lines
- `npm run build`: pass
- `npm run test:integration`: 12 files, 145 tests passed
- `npm run test:storybook`: 56 files, 342 tests passed

## Commits

- `fix(auth): bound GitHub token exchange and API reads with a 10 s timeout (R13)` — code, tests, docs
- `chore(e01): R13 gate and run log` — `track.md`, this log
