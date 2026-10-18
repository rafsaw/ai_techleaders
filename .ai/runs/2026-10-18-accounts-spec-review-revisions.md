# Accounts and platform spec review revisions

- Started: 2026-10-18.
- Request: revise the two companion specs using the PO's eight decisions; do not commit, edit the product brief, mutate issues, or put the task-hour estimate in files.
- Scope: documentation only. Updated `.ai/specs/2026-10-17-accounts-and-roles.md`, `.ai/specs/2026-10-17-platform-primitives.md` and the linked accounts data-model HTML; this log records the work.

## Changes and decisions

- Required user-row serialization for registration/confirmation/GitHub claiming, coherent session/role resolution, and token-safe logging including hosting access logs.
- Kept N03 and added explicit sign-in/registration copy plus the forgotten-password edge case; the PO owns follow-up recording in issue #49.
- Required production provider, configured sender and a successful delivery test before release.
- Kept Phase 1 as one PR and deferred public forms/shared-hook extraction to Phase 2.
- Replaced issue #46's prior create-only bearer interpretation with email-bound invitations: fixed validity, one open invitation per normalized email, email delivery, create/revoke/resend, token rotation, verified-email acceptance, existing roles preserved, and no token/link output or note field.
- Specified inactivity expiry on every authenticated page/API request. A cookie-only Next Proxy renews page cookies; every public leaf records DB activity rather than relying on reused layouts. Proxy never authorizes or queries the database. Operator grants require fresh sign-in; revokes invalidate existing sessions.
- Specified code rollback with additive schema retained and a separate destructive reversal procedure.
- Qualified identifiers, corrected research comparisons and component boundaries, completed throttle rules, kept E02–E05 primitives provisional, and prevented premature catalog completion.
- Fresh-context spec review caught missing public-leaf activity, invitation return paths on OAuth fallback/sign-out, and resolver/operator-grant races; all were addressed in the specifications.

## Verification and outcome

- `git diff --check`: passed.
- Checked companion-spec links and code fences, parsed the HTML graph JSON and verified email/revocation fields replace the old note field.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:coverage`: passed; existing suite retains full per-file coverage.
- `npm run test:integration:install`: passed.
- `npm run test:integration`: passed against ephemeral PostgreSQL with the production application and browser. Docker access required execution outside the filesystem sandbox.
- These runtime checks cover the existing application baseline, not implementation of the revised specifications. No application code, database schema or tests were changed.
- Outcome: specifications revised and left uncommitted for PO review. Product brief and tracker unchanged. Whole-MVP task-hour estimate is supplied only in the reply.
