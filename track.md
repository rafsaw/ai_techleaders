# E01 — Accounts and roles: implementation tracker

Spec: [`.ai/specs/2026-10-17-accounts-and-roles.md`](.ai/specs/2026-10-17-accounts-and-roles.md)
(companion: `.ai/specs/2026-10-17-platform-primitives.md`)
Branch: `feat/e01-accounts-and-roles`

Each task = one subagent run = one commit. After each phase: full gate, run log, then a
manual-test pause for the user.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Phase 1 — #34 GitHub sign-in (plus the foundation)

- [x] 1.1 Config and clock (P1, P2): `core/src/config/env.ts`, `core/src/time/clock.ts`, `app/src/server/config.ts`, registrations, `.env.example`, README
- [x] 1.2 Tokens, cookies, `returnTo` and role schemas in core (P8, P3 types, P6)
- [x] 1.3 Identity context on `apiHandler` / `makeCrudRoute` (required `access`, principal, cookies, `PrincipalResolver`)
- [x] 1.4 Navigation handler (P7) + minimal identity-free `/error` page
- [x] 1.5 Schema: `user_roles`, `auth_sessions`, new `users` columns, migration, seeder grants `mentee`
- [x] 1.6 `RoleService`, `AuthSessionService` (principalResolver), `UserService.getAccount`/`updateDisplayName`, `create` grants mentee
- [x] 1.7 Page guards, cookie-only Proxy (P4), operator CLI runner (P12) with role grant/revoke
- [x] 1.8 GitHub sign-in backend: port + arctic adapter, `GitHubSignInService`, navigation routes, integration GitHub stub, race test
- [x] 1.9 UI: shared API client move, `CrudForm.resetOnSuccess`, `(frontend)` header, `/sign-in`, `(app)` layout + `/account`, sign-out
- [x] 1.10 Operator gate (AD4): `/api/users` and `/backend` require operator; integration scenarios updated
- [x] 1.11 Documentation (AGENTS.md, BACKWARD_COMPATIBILITY.md, engineering-standards corrections, README)
- [x] 1.G Phase 1 full gate + run log → **manual test pause**

### Phase 1 — review fixes (Codex review, REQUEST CHANGES, 2026-10-28)

- [x] R1 `apiCall`: unhandled `response.text()` read failure (sign-out can stay "Signing out…")
- [x] R2 `/backend/users` (UsersPanel + form): 401 → full navigation to `/sign-in?error=session_expired&returnTo=/backend/users`
- [x] R3 Integration test running PostgreSQL migrations up and down, checking schema and data preservation
- [x] R4 Explicit `returnTo=/` honoured; welcome notice on any `returnTo` destination (option A, approved 2026-10-28)
- [x] R.G Full gate + run log (final after R4)

### Phase 1 — re-review fixes (Codex re-review of R4, 2026-10-28)

- [x] R5 `/account` ForgetWelcome drops only `welcome`, keeping other query params and the hash
- [x] R6 `returnTo` near the 512-char limit keeps its safe destination after `welcome=1` is appended
- [x] R2.G Full gate + run log

## Phase 2 — #35 email and password with confirmation

- [x] 2.1 Single-use token records (P9)
- [x] 2.2 `EmailSender` (P10): port, SMTP + memory adapters, templates, Mailpit in compose + integration setup
- [x] 2.3 Rate limiter (P11, Postgres adapter), `TooManyRequestsError`, `clientIp`, `TRUST_PROXY`
- [x] 2.4 Schema: `users.password_hash`, `email_confirmation_tokens`, `rate_limit_buckets`, migration
- [x] 2.5 `PasswordHasher`, `PasswordAccountService`, schemas, four POST routes, AD3 claim rule in GitHub sign-in
- [x] 2.6 Public-form infrastructure (F2/F3) and UI: `/sign-in` email form, `/sign-up`, `/sign-up/check-email`, `/confirm-email`
- [x] 2.7 Documentation (README, AGENTS.md, BACKWARD_COMPATIBILITY.md) — spec step 2.7 (no credential race tests) is a non-task
- [~] 2.G Phase 2 full gate + run log → **manual test pause**

## Phase 3 — #46 invitation management, then #36 acceptance

- [ ] 3.1 Schema: `mentor_invitations` (email-bound, hashed token, expiry, revoke), `user_roles.invitation_id`, migration
- [ ] 3.2 Invitation create/revoke/resend service + CLI + email template
- [ ] 3.3 Inspect/accept, invitation page, `RoleService.grantMentorFromInvitation`, API route
- [ ] 3.4 Integration on PostgreSQL + Mailpit, including the four race tests
- [ ] 3.5 Documentation (operator runbook), move spec to `implemented/`
- [ ] 3.G Phase 3 full gate + run log → **manual test pause**
