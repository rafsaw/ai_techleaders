# 2026-10-28 — E01 review R2: SM-AC2 on /backend/users

**Asked:** confirm and fix review issue R2 — `/backend/users` ignored HTTP 401 from `/api/users`, so an operator whose session expired saw an error instead of being sent to sign-in (SM-AC2). Spec: `.ai/specs/2026-10-17-accounts-and-roles.md`.

**Confirmed:** new RTL tests for a 401 list load and a 401 create failed (no navigation; the error message was rendered). The 403 test passed.

**Spec on 401 vs 403:** SM-AC2 — a request rejected because the DB session expired goes to sign-in with the "Your session expired. Sign in again." banner and the safe `returnTo`. The role-revoke edge case — revoke makes the next protected request fail (404 page, 403 API) while the person stays signed in. So 403 keeps the current behaviour (error shown, no navigation).

**Done:**
- `packages/app/src/app/session-expiry.ts`: `signInPath()` (moved from `server/auth/page-guards.ts`, now imported there) and `unlessSessionExpired(result, returnTo)` — on `unauthorized` it calls `navigateFully(signInPath(returnTo, true))` and returns a never-settling promise; other results pass through.
- `/account` (`account-name-form.tsx`) and `/backend/users` (`users-panel.tsx`, list load and create) use the helper; the `SESSION_EXPIRED_SIGN_IN` constant is gone.
- Tests: `session-expiry.test.ts`; `pages.test.tsx` (401 load, 401 create, 403 load/create without navigation); integration case in `tests/integration/app.test.ts` (expire the operator's session via `pg`, submit the create form → `/sign-in?error=session_expired&returnTo=%2Fbackend%2Fusers` with the banner, nothing created, then sign in again back to `/backend/users`; placed before the revoke case, which needs one live session).
- Spec implementation note added.

**Outcome:** success. lint, typecheck, test:coverage (100%), build, test:integration (21/21) pass. Not committed.
