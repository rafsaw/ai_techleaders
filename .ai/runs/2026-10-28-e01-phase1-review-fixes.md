# 2026-10-28 — E01 Phase 1 review fixes (Codex REQUEST CHANGES)

## Asked

An independent Codex review of Phase 1 (`.ai/specs/2026-10-17-accounts-and-roles.md`) returned
REQUEST CHANGES with one blocker and three major issues. Fix confirmed issues 1–3 with subagents,
add tests and run the full gate; for issue 4 analyse the spec contradiction and recommend, without
changing behaviour or the spec until the user approves. Stay in Phase 1.

## Done (one subagent and one commit per issue)

| Task | Issue | Outcome | Commit |
|---|---|---|---|
| R1 | `apiCall` did not handle a rejected `response.text()`; sign-out could stay on "Signing out…" | Confirmed with a failing unit test and an RTL test. Body-read failures now return the same `network_error` result as a rejected `fetch`. Lesson added. | `861dd01` |
| R2 | `/backend/users` list and create form showed "Authentication required" on 401 | Confirmed. Shared `unlessSessionExpired`/`signInPath` (`packages/app/src/app/session-expiry.ts`), used by `/account` and `UsersPanel`; 401 → full navigation to `/sign-in?error=session_expired&returnTo=%2Fbackend%2Fusers`. 403 keeps showing the error (role-revoke edge case keeps the person signed in). Run log: `2026-10-28-e01-r2-backend-users-session-expiry.md`. | `d0de6cc` |
| R3 (blocker) | No integration test ran migrations up/down against PostgreSQL | Confirmed. `packages/app/tests/integration/migrations.test.ts` runs baseline → Phase 1 → down → up on an isolated database through `npm run db:migrate`/`db:migrate:down`, checking schema, constraints, mentee backfill and preserved user rows. No migration defect found; migration not edited. Run log: `2026-10-28-e01-r3-migration-round-trip-test.md`. | `4284496` |
| R4 | Explicit `returnTo=/` treated as "no returnTo"; welcome notice only rendered on `/account` | The Phase 1 implementation note contradicted Flow 1 step 5 and SM-AC7. User approved option A: every safe `returnTo` honoured (incl. `/`); `welcome=1` still added only for a newly created account; shared Tailwind-only `WelcomeNotice` rendered by the `(frontend)`/`(app)` layouts when signed in (not on `/account`, which keeps its own); flag dropped with `replaceState`, show decision latched; header Sign-in on `/` still omits `returnTo`; spec note fixed. Run log: `2026-10-28-e01-r4-welcome-notice-destinations.md`. | `9f5c6c5` |

## Gate (after R3)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass
- `npm run test:coverage`: 64 files, 933 tests, 100% per file
- `npm run build`: pass
- `npm run test:integration`: 27/27 (21 app + 6 migrations), ~81 s
- `npm run test:storybook`: 325/325 (run with R1, the only ui change)

## Gate (final tree after R4)

- `npm run lint`: 0 errors (same pre-existing warning)
- `npm run typecheck`: pass
- `npm run test:coverage`: 65 files, 966 tests, 100% per file
- `npm run build`: pass
- `npm run test:integration`: 29/29 (23 app + 6 migrations)
- `npm run test:storybook`: 327/327

## Outcome

Success: R1–R4 fixed and verified. Phase 2 not started.
