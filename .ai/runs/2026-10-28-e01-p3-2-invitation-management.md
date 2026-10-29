# 2026-10-28 — E01 Phase 3, task 3.2: mentor invitation create/revoke/resend

**Asked:** implement accounts spec Phase 3 step 2: `MentorInvitationService` create/revoke/resend (plain DTOs, never the raw token), the invitation email template, and the operator CLI commands `invite create|revoke|resend --email` (`--note` / `--expires-in-days` refused, safe output, nonzero exit on conflict or send failure asking for resend). No HTTP endpoint or admin page; no inspect/accept (3.3).

**Done:**
- `packages/app/src/server/services/auth/mentor-invitation.service.ts` (+ test), registered in `container.ts` (transient) and `cradle.ts`; `mentor-invitation.policy.ts` holds `INVITATION_LIFETIME_DAYS = 14` (db-free).
- `services/notifications/templates/mentor-invitation.ts` (+ test): absolute `/invite/<token>` link on `APP_URL`, bound address in the copy, HTML escaped.
- `cli/commands/invite-flags.ts`, `invite-create.command.ts`, `invite-revoke.command.ts`, `invite-resend.command.ts` (+ tests, including CLI-through-`main()` tests with the real service); `run-cli.ts` lists them; `run-cli.test.ts` now mocks `@devmentor/db` to throw on import.
- README "Mentor invitations" section and command table; AGENTS.md operator CLI import rule and invitation line; spec "Implementation notes (Phase 3)" Step 2 bullet; lesson on import-time env reads; `track.md` 3.2 ticked.

**Key decisions:** recorded in the spec's Step 2 implementation note: DTO shapes, CLI-boundary normalization, expired-row closure with an explicit flush before insert, unique violation → same conflict (no retry), resend refusal message for accepted/revoked/never, revoke reports `already-accepted` only for the latest row, every post-commit delivery error (SMTP or config) → `emailSent: false`, `--note`/`--expires-in-days` declared only to refuse them with a reason, exact CLI output lines.

**Bug found by the smoke test:** every real invite command failed with "unexpected error" ("No database specified") although all unit tests passed: `invite-flags.ts` value-imported the service, which loads `@devmentor/db` before the runner loads env. Fixed with the db-free policy module and a type-only import; regression guarded in `run-cli.test.ts` (verified it fails with the old import). Lesson added.

**Smoke test (dev DB + Mailpit):** create → sent; second create → conflict exit 1; resend → same id, new expiry; revoke → revoked; revoke again → no-op; resend → "Use invite create" exit 1; create with mixed-case address → normalized; `--expires-in-days` refused; expired open row → create closed it and inserted a new one; resend with `SMTP_URL=smtp://127.0.0.1:1` → hash rotated, exit 1 with the resend hint. Three emails in Mailpit, all to the bound address. All smoke rows and messages deleted afterwards.

**Gate:** lint 0 errors (1 pre-existing warning in `.agents/skills/…`), typecheck clean, test:coverage 95 files / 1758 tests at 100% statements/branches/functions/lines per file, build ok, test:integration 7 files / 61 tests passed (no new integration scenario in 3.2; the Mailpit/race scenarios are 3.4).

**Outcome:** success.
