# 2026-10-28 — E01 Phase 3 step 3.4: invitation integration scenarios and races

- **Asked:** implement task 3.4 of `.ai/specs/2026-10-17-accounts-and-roles.md` (Phase 3 step 4): first hide the header's **Mentor setup** link until E02 (separate commit), then the Flow 3 integration scenarios on PostgreSQL + Mailpit + agent-browser and exactly four real-DB race tests, with evidence free of raw tokens. Runbook and moving the spec are 3.5.
- **Branch:** `feat/e01-accounts-and-roles`. Outcome: **success**. Nothing pushed.

## What was done

### Step A — `fix(ui): show Mentor setup only when the app provides it (E01 3.4)`

- `SiteHeader` rendered **Mentor setup** → `/mentor` for every mentor; `/mentor` ships in E02 Phase 1. It now takes an optional `mentorSetupHref` and renders the link only for mentors when given. `AppSiteHeader` (used by both `(frontend)` and `(app)` layouts, the only consumers in the app) passes none. `/error` has its own header.
- Stories: *Mentor and operator* and *Long content, narrow* pass `/mentor`; new *Mentor without mentor area* story with a play test; the Storybook `Screen` frame takes `mentorSetupHref`, and the three E02 screens that show a mentor pass `/mentor`. MDX anatomy/states/API/do-don't updated. Unit tests in `auth.test.tsx` and `site-header.test.tsx`. Spec Phase 3 notes record the decision.

### Step B — integration

- `tests/integration/npm.ts`: `runNpmResult` (exit code + stdout + stderr for any exit, extra env, timeout); `runNpm` now wraps it (unchanged behaviour for existing callers).
- `tests/integration/browser.ts`: `redactTokens` on every `browser.log` write, snapshot capture and thrown snapshot; `click(role, name, { nth })` ordered by position in the snapshot.
- `tests/integration/invitations.ts`: shared helpers (`operator`, `expectSecretFree`, `invitationTokens`/`newestInvitationToken`, `invitationPage`, `postAccept`, `githubSession` over HTTP, `rolesOf`, `invitationRows`, `connect`, `waitForLockWaiters`, `expectEvidenceFreeOf`).
- `tests/integration/invitation-flow.test.ts` (14 cases): matching GitHub account (existing operator) → accept → `/` with notice, same session cookie, `/account` roles, no Mentor setup, DB links; reopen 404; already-mentor page + 409, nothing consumed; mismatching GitHub account (no Accept, no invited address, 403, still open) → panel Sign out back to `/invite/<token>` signed out → sign-up/confirm (returnTo in the confirmation link) → accept; GitHub cancel → email sign-up → confirm → accept; revoke/idempotent revoke; resend rotation in place; failed resend with a closed SMTP port; no open mentor registration (sign-up form fields, sign-up API ignoring role keys, `role grant --role mentor` refused); evidence check.
- `tests/integration/invitation-races.test.ts` (exactly 4): two sessions accepting one invitation; accept vs revoke (both orders); accept vs resend (both orders); two concurrent `invite create`. Orders are forced with a lock-holding `pg` client and `pg_stat_activity` lock-wait polling; see the spec note for each design.
- `invitation-page.test.ts`: comment points at the new files.
- Docs: spec Phase 3 implementation notes (header decision, Step 4 entry), `track.md` 3.4 ticked, lesson (lock-holder race pattern; agent-browser ref ids not in document order; agent-browser echoes URLs), AGENTS.md integration notes (helpers, redaction, `nth`).

## Key decisions

- **No application bug found.** All four races passed on the first run with the service as written in 3.2/3.3.
- **Redaction lives in the helper**, not per scenario: agent-browser prints the opened URL and the page `origin` in its JSON, and snapshots can show link targets, so `browser.log` had raw `/invite/<token>` paths. Redacting every write is simpler and also covers the password scenarios' `token=` links. Failure messages from Vitest assertions (junit.xml) may still contain a compared URL on a failing run only; that file is outside the artifacts directory and is not evidence of a passing run.
- **Failed SMTP:** a just-released local port (connection refused) rather than stopping Mailpit, so no shared resource is disturbed.
- **Rate limits:** each invitee address signs up once and confirms once; the throwaway sign-up address sends one email. All addresses are unique per run. `afterAll` deletes invitations, users and `rate_limit_buckets`.
- `/error`'s identity-free behaviour is already asserted by `app.test.ts`; not duplicated.

## Problems met

- `screen.queryByRole("link", { name: /mentor/i })` matched the **DevMentor** brand link; replaced by an href check.
- The mismatch panel's **Sign out** click hit the header's button: agent-browser ref ids are not in document order (the panel's button was `e5`, the header's `e7`). `nth` now sorts by position in the snapshot text.

## Validation

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`).
- `npm run typecheck`: clean.
- `npm run test:coverage`: 99 files, 1853 tests, 100% per file ("No files with missing coverage").
- `npm run test:storybook` (after Step A): 56 files, 342 tests passed.
- `npm run build`: success.
- `npm run test:integration`, run twice in a row: 10 files, 82 tests passed both times. The latest artifacts contain 42 redacted invite paths in `browser.log` and no unredacted `/invite/<token>` or `token=` value in any `.log`/`.txt`.

## Notes for 3.5

- Runbook: document `invite create|revoke|resend` with the outputs the scenarios assert (`Invitation created|resent: id …, email …, expires …`, `Delivery: email accepted by the mail server.`, the failed-delivery stderr, `has no open invitation; nothing changed.`, the already-accepted note, resend's "no open invitation to resend. Use invite create." exit 1), confirming the engineer's sign-in address first, fixed 14 days, verified-email matching, accepted invitations not being revocable for the role, code rollback, secret-free output; record the PO supersession of issue #46.
- E02 Phase 1 must pass `mentorSetupHref="/mentor"` from `AppSiteHeader` and change `INVITATION_ACCEPTED_DESTINATION` to `/mentor`; the flow test's "no Mentor setup" assertion and the home-notice destination then change with it.
- Move only the accounts spec to `.ai/specs/implemented/` after Phase 3's full gate.
