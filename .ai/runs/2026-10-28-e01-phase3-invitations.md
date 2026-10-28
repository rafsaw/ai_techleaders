# 2026-10-28 — E01 Phase 3 gate (3.G): mentor invitations (#46, #36)

## Ask

Continue with Phase 3 per `track.md` after Phase 2 approval: one subagent per
task, validation and a commit per task, full phase gate, then stop for the
user's manual testing and independent code review. No push, no PR.

## Tasks and commits

| Task | Commit(s) | Run log |
|---|---|---|
| 3.1 Schema: `mentor_invitations`, `user_roles.invitation_id` (`Migration20261028212643`) | `06d411b` | `2026-10-28-e01-p3-1-invitation-schema.md` |
| 3.2 `MentorInvitationService` create/revoke/resend, `invite` CLI, email template | `75b3bba` | `2026-10-28-e01-p3-2-invitation-management.md` |
| 3.3 inspect/accept, `/invite/[token]`, `POST /api/auth/invitations/accept`, `grantMentorFromInvitation` | `fa25b18` | `2026-10-28-e01-p3-3-invitation-accept.md` |
| 3.4 Mentor setup opt-in (`mentorSetupHref`) | `7ef0c40` | `2026-10-28-e01-p3-4-invitation-integration.md` |
| 3.4 integration scenarios + four real-DB race tests | `5f4202e` | (same) |
| 3.5 operator runbook (README), AGENTS.md, BACKWARD_COMPATIBILITY.md | `bce6cab` | `2026-10-28-e01-p3-5-docs-runbook.md` |

## Key decisions (details in the spec's "Implementation notes (Phase 3)")

- Accept checks token (404) → email/verification (403) → already mentor (409) → consume; lock user, then invitation.
- Accept lands on `/?invitation=accepted`; home shows "Invitation accepted. You're now a mentor." once and drops the flag. E02 switches the destination to `/mentor`.
- The mismatch state offers only Sign out, which fully navigates back to `/invite/<token>`.
- `SiteHeader` shows Mentor setup only when the app passes `mentorSetupHref`; E01 passes nothing (`/mentor` ships in E02). Found by the orchestrator while reviewing 3.3: a pre-existing design-system link would have led accepted mentors to a 404.
- DB check `user_roles_invitation_mentor_check`: `invitation_id` only on mentor rows.
- Any post-commit send failure (incl. missing mail config) counts as "not sent"; the CLI exits 1 and points to `invite resend`.
- Token pages: `/invite/:token` always, and `/sign-in`, `/sign-up`, `/sign-up/check-email` when `returnTo` is an invitation, get the no-referrer / no-store / noindex headers and meta.
- Integration evidence redacts `/invite/<token>` and `token=` values.
- **Deferred:** moving the accounts spec to `.ai/specs/implemented/` waits for the user's Phase 3 approval (the spec status reads "Phase 3 implemented, pending approval").

## Bugs caught during the phase (each fixed with a regression test)

- 3.2: `invite` commands failed with "No database specified": a CLI module imported a value from the service, loading `@devmentor/db` before env. Fixed with a db-free policy module; `run-cli.test.ts` fails if the CLI imports `@devmentor/db`.
- 3.3: the home accepted-notice never rendered under `next start`: a server page imported a string constant from a `"use client"` module (it became a client reference). Constants moved to `auth-links.ts`; integration smoke added.

## Gate (final tree, `bce6cab`)

- `npm run db:migrate`: OK (local DB up to date)
- `npm run lint`: 0 errors, 1 pre-existing warning (`.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass
- `npm run test:coverage`: 99 files, 1853 tests, 100% statements (1931), branches (1064), functions (555), lines (1722)
- `npm run build`: pass
- `npm run test:integration`: 10 files, 82 tests (also two consecutive green runs during 3.4)
- `npm run test:storybook`: 56 files, 342 tests

## Notes for review (non-blocking, not changed)

- The platform spec's P12 `OperatorCommand` contract omits `usage`/`parse` (stale since Phase 1).
- `role revoke --role mentor` is refused with the grant-oriented message "The mentor role is granted only by accepting an invitation." (shared flag parser).
- `Migration20261028212643.down()` keeps mentor role rows; the runbook's rollback is code-only and never runs `down()`.
- On a failing integration run, Vitest's `junit.xml` could include a compared URL (outside the redacted artifacts folder).

## Outcome

Success. Phase 3 is complete pending manual testing and independent code review. Nothing pushed.
