# Auth services (accounts Phases 1–3)

## Homes

- GitHub: the port `github-oauth.port.ts` and the arctic adapter
  `adapters/arctic-github-oauth.ts`. Every GitHub call is bounded by
  `GITHUB_REQUEST_TIMEOUT_MS` (10 s, body included) through an `AbortSignal`;
  arctic only builds the authorization URL, since its token request takes no
  signal (R13).

## Passwords and credentials

- **Passwords:** `PasswordHasher` port (`password-hasher.port.ts`), bcryptjs
  adapter `adapters/bcrypt-password-hasher.ts`, cradle `passwordHasher`
  (SINGLETON). It refuses or never matches input over 72 bytes, and
  `dummyCompare` keeps timing equal for unknown accounts. Rules live in
  `packages/core/src/validators/auth/password.schema.ts`; sign-in, resend and
  confirm use `currentPasswordSchema`, so they never reveal the registration
  rules. DTOs never carry `passwordHash`.
- **Credential transactions (`PasswordAccountService`,
  `GitHubSignInService`):** lock the user row `FOR UPDATE` **first**, then
  touch its token rows, and re-read confirmation state under the lock. No
  SMTP call and no cookie inside an uncommitted transaction: write the
  session row through the transaction's `em`
  (`authSessionService.create(userId, em)`), set the cookie after commit.
  Unit tests assert this order with one shared event log.
  Responses never reveal whether an email has an account.

## Mentor invitations (Phase 3)

- **Homes:** `MentorInvitation` (`packages/db/src/entities/auth/`, table
  `mentor_invitations`, P9 token columns plus `email`, `revoked_at`,
  `accepted_by_user_id`; one open row per email by a partial unique index);
  `MentorInvitationService` (`mentor-invitation.service.ts`, cradle
  `mentorInvitationService`: `create`/`revoke`/`resend`/`inspect`/`accept`);
  the db-free `mentor-invitation.policy.ts` (`INVITATION_LIFETIME_DAYS = 14`,
  safe for CLI modules to import); the template
  `packages/app/src/server/services/notifications/templates/mentor-invitation.ts`;
  the commands `packages/app/src/server/cli/commands/invite-{create,revoke,resend}.command.ts`
  with `invite-flags.ts`; the page `packages/app/src/app/(frontend)/invite/[token]/`
  and `POST /api/auth/invitations/accept` (`access: "user"`,
  `invitationAcceptSchema`). The operator runbook is the `README.md` section
  "Mentor invitations (operator runbook)".
- Resend rotates the hash in place, revoke closes the row; neither touches a
  role already granted.
- A failed send keeps the invitation and exits 1 asking for `invite resend`.
