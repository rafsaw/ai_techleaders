# 2026-10-28 — E01 Phase 2, step 2.5: password accounts

**Asked:** `PasswordHasher`, `PasswordAccountService` (register, sign-in, resend, inspect, confirm), the shared Zod schemas, the four POST routes, the four rate-limit rules, and the AD3 claim rule in `GitHubSignInService`. No UI (2.6) or docs beyond spec notes (2.7).

**Done:**
- Schemas in `packages/core/src/validators/auth/`: `email`, `password` (15 code points / 72 UTF-8 bytes via `TextEncoder` / blocklist), `sign-up`, `sign-in`, `email-confirm`; `displayNameSchema` and `optionalReturnToSchema` exported from the existing files.
- `PasswordHasher` port + `BcryptPasswordHasher` (`bcryptjs` 3, cost 12, cached same-cost dummy hash, refuses > 72 bytes); `passwordHasher` SINGLETON.
- `PasswordAccountService` with the four rules (keys `sign-in:ip|email`, `sign-up:ip`, `confirmation-email:email`), user `FOR UPDATE` before token rows, re-read under the lock, unique-email retry, mail and cookies after commit; `templates/account-exists.ts`; `AuthSessionService.create`/`setCookie` so confirm writes the session inside its transaction.
- Routes `POST /api/auth/sign-up` (201), `/sign-in`, `/confirm-email/resend`, `/confirm-email`.
- `AccountDto.signInMethods.password` = hash set and email confirmed.
- AD3 claim in `GitHubSignInService`: clear the unconfirmed password and delete its links after the user lock.
- Unit tests for every Phase 2 Step 5 bullet (ordered event log across limiter/hasher/locks/consume/session/send); integration API scenario `password-api.test.ts` (sign-up → Mailpit → confirm → session → shared rule-2 429).

**Decisions:** recorded in the accounts spec, "Implementation notes (Phase 2)", Step 5 bullets (resend has only rule 4; confirm keys rule 2 on the link's account and spends no email bucket for unknown tokens; signed-in callers are not special-cased; only `EmailSendError` maps to `emailSent: false`). Lesson added on integration file ordering.

**Outcome:** success. lint (0 errors; 1 pre-existing warning in `.agents/`), typecheck, test:coverage (86 files, 1416 tests, 100% per file), build, test:integration (5 files, 44 tests) all pass.
