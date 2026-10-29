# E01 Phase 1: GitHub sign-in, accounts, sessions and operator role

- Request: implement Phase 1 (#34, steps 1.1–1.11) of `.ai/specs/2026-10-17-accounts-and-roles.md` task by task through subagents, one commit per task, on `feat/e01-accounts-and-roles`; then run the Phase 1 completion gate (small `isAppError` fix in the operator CLI, full gate, review against the Phase 1 "Done when" and the screen-map criteria Phase 1 owns, run log, spec update). No commit of the gate changes: the user reviews and commits.
- Started: 2026-10-27. Tracker: `track.md` (not edited by the gate run).

## What was done, per step (commits on `main..HEAD`)

| Step | Commit | Summary |
|---|---|---|
| — | `2843371` | Implementation tracker `track.md`. |
| 1.1 | `7175668` | Config sections (`defineConfigSection`, `ConfigError`), `Clock`/`fixedClock`, app config with `app` and `github` sections on the cradle (platform P1/P2). |
| 1.2 | `52c5691` | `generateToken`/`hashToken`, `ResponseCookies`/`readCookie` (`cookie@2`), `roleSchema`, `parseReturnTo` with hostile-payload table tests (P8/P6, P3 cookie types). |
| 1.3 | `589396c` | Required `access` on `apiHandler`/`makeCrudRoute`, `principal` and `cookies` args, `Set-Cookie` on success and error, typed `principalResolver`, sanitized 500 logs with route templates; `/api/users` explicitly public until 1.10 (P3/PD3). |
| 1.4 | `1fea2e3` | GET-only 303 `navigationHandler` resolved against `APP_URL`, external-origin allowlist, `onError` targets; identity-free `/error` (P7). |
| 1.5 | `605146c` | `UserRole`, `AuthSession` entities, `users.github_id`, `users.email_confirmed_at`; migration `Migration20261028002328` with mentee backfill and `down()`; seeder grants mentee idempotently. |
| 1.6 | `c8c5412` | `AuthSessionService` (principal resolver: hashed DB sessions, 30-day sliding expiry, hourly-throttled conditional touch, live roles), `RoleService`, `UserService.getAccount`/`updateDisplayName`, `create` grants mentee. |
| 1.7 | `d271092` | Page guards (`getPrincipal`/`requirePrincipal`/`requireRole`, per-render cache), cookie-only Proxy, `npm run operator` with `role grant|revoke` (P4/P12). |
| 1.8 | `02e3aad` | `GitHubOAuth` port + arctic adapter (PKCE), `GitHubSignInService` (create / reuse by `githubId` / link by verified email, `FOR UPDATE`, unique-violation retry), start and callback routes, GitHub stub, real-DB concurrent-callback race test. |
| 1.9 | `edcf04d` | `apiCall` moved to `ui/src/api`, `CrudForm.resetOnSuccess`, `(frontend)` header, `/sign-in` with GitHub banners, `(app)` area with `/account` and `api/account`, sign-out with full navigation, public-area ESLint rules, browser integration cases. |
| 1.10 | `2db1eb2` | `/api/users` requires operator; `/backend` pages `requireRole`, layout 404s non-operators; neutral not-found page; operator-only metadata; `isAppError` brand; integration admin scenarios sign in through the stub and grant/revoke via the real CLI. |
| 1.11 | `62c10ff` | AGENTS.md, BACKWARD_COMPATIBILITY.md, CODE_REVIEW.md, engineering-standards corrections (AD2), README (GitHub OAuth App, operator role, rollback). |
| Gate | uncommitted | See below. |

## Gate run (this session)

1. **`run-cli.ts` fix:** `instanceof ValidationError` / `instanceof AppError` replaced with `isAppError(error)` (plus `error.code === "validation_error"` for refused input), per the AGENTS.md rule. New unit test: a non-validation `AppError` thrown by `parse` is rethrown before any env/DB work.
2. **SM-AC2 implemented** (the spec ties each screen-map criterion to the phase that ships its feature; session expiry ships in Phase 1, so it was in scope):
   - `page-guards.ts`: one cached lookup returns the principal and whether a session cookie for this origin was presented; `requirePrincipal` redirects to `/sign-in?error=session_expired&returnTo=…` when a presented session was rejected. `getPrincipal()` API unchanged.
   - `SignInOptions`: `SIGN_IN_ERRORS` = `GITHUB_ERRORS` + `session_expired` ("Your session expired." / "Sign in again.", `info`, `role="status"`); story `SessionExpired`, mdx docs updated.
   - `account-name-form.tsx`: a 401 from `PATCH /api/account` fully navigates to `/sign-in?error=session_expired&returnTo=%2Faccount` (unsaved name discarded; form stays pending until unload).
   - Tests: page-guard unit cases (expired, unknown, other-scheme cookie), sign-in page RTL case, account form RTL 401 case, SignInOptions RTL, one integration case covering both the page path and the API path; an existing integration assertion (forged cookie → sign-in) now expects the banner.
3. **SM-AC1 integration coverage added** (it was unit-only): a signed-in `/sign-in?returnTo=/account` goes to `/account`, an unsafe `returnTo` goes to `/`.
4. AGENTS.md page-guard bullet documents `error=session_expired`.
5. Engineering-standards correction and spec step 1.11 now cite AD2 instead of D14 (D14 is the mentor-invitation decision).
6. Spec: Status line and "Implementation notes (Phase 1)" added.

## Key decisions and deviations

- `/error` in its own `(error)` route group with its own identity-free layout/header.
- `returnTo` normalized to the browser-requested path; `/sign-in` takes the first of repeated values.
- Session resolution is several queries (lookup by hash, conditional monotonic touch, roles), not one statement; expired rows are deleted on lookup.
- `(app)` and `/backend` layouts do not redirect, so each page keeps its own `returnTo`.
- Reused design-system components (`SiteHeader`, `SignInOptions`, `AccountSummary`, `Notice`) instead of colocated markup.
- `welcome=1` appended to a safe `returnTo` for new accounts (SM-AC7); only `/account` renders it in Phase 1.
- OAuth state checked before the denial is handled.
- `isAppError()` with a `Symbol.for` brand fixes cross-bundle `instanceof` failures.
- Operator-only metadata on guarded backend pages (metadata is sent with a 404).
- Integration readiness probe: `GET /` with a well-formed unknown session cookie.
- Operator CLI exit codes: 0 ok, 1 refused/failed, 2 usage error.
- SM-AC2 reuses the existing `error` query parameter (no new parameter). An unknown/forged cookie looks like a deleted session and also shows the banner.

## Checks (local, 2026-10-27, after the gate changes)

- `npm run lint`: pass, 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`, unrelated).
- `npm run typecheck`: pass.
- `npm run build`: pass (Next.js 16.4.1, 12 routes + Proxy).
- `npm run test:coverage`: 63 files, 922 tests pass; 100% statements (1297/1297), branches (761/761), functions (405/405), lines (1166/1166).
- `npm run test:integration`: 20/20 pass (~75 s). Fresh Testcontainers PostgreSQL: `migrations.log` shows `Migration20261013225312` and `Migration20261028002328` applied, "Successfully migrated up to the latest version".
- Local dev DB: `npm run db:migration:list` lists both migrations as executed; `npm run db:migrate` reports up to date.
- Extra: Storybook tests (light and dark) 325/325 pass; `npm run check:tokens` OK.

## Phase 1 "Done when" review

- #34 AC1 (sign in, create or reuse), AC2 (GitHub display name, editable), AC3 (no duplicate, including the real-DB race): covered by unit and integration tests.
- #34 AC4 (deny): signed out with the cancelled banner; the email option is Phase 2 by design.
- Session read-only activity: unit (fixed clock, throttle boundaries) and integration (page-only navigation advances DB expiry after the throttle window).
- Operator grant/revoke: unit and integration through the real CLI; same session, next request; sessions untouched.
- Screen map, Phase 1 parts: SM-AC1, 2, 7 (on `/account`), 9, 10, 11, 12 (duplicate part), 13, 16 are covered. Remaining gaps: SM-AC16 "also when the database is down" is unit-only (dependencies throw on import/call); SM-AC7 on a non-`/account` `returnTo` page waits for the invitation page (Phase 3); SM-AC3–6, 8, 14, 17 belong to Phases 2–3.

## Outcome

Success. Phase 1 is implemented and the full gate passes. The gate changes are uncommitted for the user to review; the next step is the manual-test pause.
