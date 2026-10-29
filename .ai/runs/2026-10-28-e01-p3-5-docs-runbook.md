# 2026-10-28 — E01 Phase 3, step 3.5: documentation and operator runbook

**Asked:** accounts spec Phase 3 Step 5. Write the operator runbook for mentor invitations, extend `AGENTS.md` for Phase 3, record the Phase 3 contract changes in `BACKWARD_COMPATIBILITY.md`, add a Step 5 implementation note to the spec and write this log. Docs only. **Scope change from the caller:** do not move the spec to `.ai/specs/implemented/`; the user manually tests and reviews Phase 3 first, and the move is a separate later step.

**Done:**
- `README.md`: "Mentor invitations" became "Mentor invitations (operator runbook)". The repo keeps operator procedures in the README (next to "Operator role"), and there is no `docs/` folder, so no new file was added. The runbook covers:
  - the shared CLI behavior: `Database:` line, `--yes`, exit codes 0/1/2, normalized `--email`, refused `--note`/`--expires-in-days`, fixed 14 days
  - confirming the sign-in address before create (the `/account` email, the GitHub primary email, or the address they will confirm)
  - create/resend/revoke with the exact output lines from `invite-flags.ts`, `invite-revoke.command.ts` and the service (the lines the 3.4 scenarios assert)
  - delivery failure: saved invitation, the stderr line, the rotated link after a failed resend, `invite resend` as the remedy
  - every page state the invitee can see, including the re-invite path
  - what happens after acceptance (revoke keeps mentor; `role revoke --role mentor` is refused; removing the role is a manual operator action)
  - secret-free output and the access-log redaction check before production links
  - code-only rollback
  - the PO supersession of issue #46

  The Rollback section now lists `mentor_invitations` and `user_roles.invitation_id`. The Scripts-table link points to the renamed anchor.
- `AGENTS.md`: the heading is now "accounts Phases 1–3". The one-line invitation bullet from 3.2 was folded into a new "Mentor invitations (Phase 3)" subsection: homes, the only mentor path, AD5 binding, secret-free rules and token-page headers, and the E02-staged `INVITATION_ACCEPTED_DESTINATION` / `mentorSetupHref`. The 3.4 integration notes stay in the testing section.
- `BACKWARD_COMPATIBILITY.md`: a Phase 3 entry under recorded changes. The server surface is additive. Two in-repo component prop changes are recorded: `InvitationPanel` now uses `InvitationAction`, and `SiteHeader` has the opt-in `mentorSetupHref`. `RoleService.grant` is noted as unchanged (`GrantableRole` since Phase 1). Also: §1 accept route and `/invite/<token>` link format, §3 `MentorInvitation`, `invitation-accept.schema` and `mentorInvitationService`, §4 schema, §6 `invite` commands.
- Spec: the status line says "Phase 3 implemented, pending approval", and a Step 5 implementation note records what went where and the deferred move.
- `track.md`: 3.5 is ticked with the deferral note.
- Platform spec: unchanged. Phase 3 changed no P9/P10/P12/F2/F3 contract it documents.

**Doc/code checks (no code changed):**
- Every documented command, output line and exit code was checked against `run-cli.ts`, `invite-flags.ts`, `invite-*.command.ts`, `role-flags.ts` and `mentor-invitation.service.ts`.
- `RoleService.grant`'s `GrantableRole` narrowing dates from Phase 1 (c8c5412), not Phase 3, so BC records it as unchanged.
- `Migration20261028212643.down()` drops `mentor_invitations` and `user_roles.invitation_id` but keeps the mentor role rows. The runbook still forbids `db:migrate:down` as a rollback.
- Pre-existing drift, not changed: the platform spec's P12 `OperatorCommand` contract omits `usage` and `parse`, which have existed since Phase 1.
- Wording quirk, not changed: `role revoke --role mentor` is refused with "The mentor role is granted only by accepting an invitation." The message comes from the shared `role-flags.ts`.

**Outcome:** success. `npm run lint` passes (0 errors, 1 pre-existing warning in `.agents/`). `npm run typecheck` passes. `npm run test:coverage` passes (99 files, 1853 tests, 100% per file). Build and integration were not rerun because this step is docs only. The 3.G full gate is next.
