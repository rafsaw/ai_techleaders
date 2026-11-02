# AUTH-001: links GitHub to a confirmed password account with the same verified email, keeping one account and its password

| Field | Value |
| ----- | ----- |
| Area | AUTH |
| Priority | High |
| Type | UI |
| Requirement | [Accounts and roles spec, AD3 and Flow 1 step 4.2](../../specs/implemented/2026-10-17-accounts-and-roles.md): GitHub links to an existing account only through GitHub's verified primary email (normalized lowercase); linking sets `githubId` and `emailConfirmedAt ??= now`; only an *unconfirmed* password is discarded; an existing account's display name is not overwritten; one person, one account. |
| Implementation | [`github-link-password-account-ui.test.ts`](../../../packages/app/tests/integration/github-link-password-account-ui.test.ts), test: `GitHub linking to a password account (browser) > links GitHub to a confirmed password account with the same verified email, keeping one account and its password` |
| Review | AI draft, awaiting human review |

## Scenario

```gherkin
Given a person registered "Ada Lovelace" with an email and password and confirmed the address
And GitHub reports that same address, in upper case, as its verified primary email, under the name "Octo Ada"
When the person signs in with GitHub from /sign-in?returnTo=/account and authorizes DevMentor
Then they land on /account of the existing account, with no new-account notice
And the display name is still "Ada Lovelace" and the sign-in methods read "GitHub, Email and password"
And there is still exactly one account for that address, now holding the GitHub id
And its password hash, name, confirmation time and roles (mentee) are unchanged
And the original password still signs in to that same account
```

## Observed

- Setup goes through the real API: `POST /api/auth/sign-up` (201), the confirmation email in Mailpit, `POST /api/auth/confirm-email` with the password (200). The `users` row has a password hash, a confirmation time and no `github_id`.
- In the browser, `/sign-in?returnTo=%2Faccount` → link **Sign in with GitHub** → the stub's "Authorize DevMentor" screen → link **Authorize** → `/account`.
- `/account` shows the header link "Ada Lovelace" and **Sign out**, the **Display name** textbox holding "Ada Lovelace", Email (the lowercase address), Roles "mentee" and Sign-in methods "GitHub, Email and password". The "This is the name others see" welcome notice is absent.
- The DB has one row for `lower(email)` or the GitHub id, identical to the row before except `github_id`; `user_roles` holds only `mentee`.
- `POST /api/auth/sign-in` with the original password answers 200; `GET /api/account` with that session returns the same `id` with `signInMethods: { github: true, password: true }`.
- Rate limit budget for the address: one sign-up (rule 4), one confirmation and one sign-in (rule 2: 2 of 5).

## Related cases

- `app.test.ts` › "signs in again with the same GitHub account without creating a duplicate" covers a GitHub-only account reusing its `github_id`, not linking to a password account.
- `app.test.ts` › "creates exactly one account when concurrent callbacks for one GitHub identity race (#34 AC 3)" covers new-account races.
- Not covered by integration tests yet:
  - AD3 claim of an **unconfirmed** password account: the password is discarded and its confirmation links stop working (unit-tested in `github-sign-in.service.test.ts`).
  - A second GitHub identity with an address already linked to another GitHub id: `github_email_taken`, no link, no session (unit-tested there too).
  - A password account whose address is only a **secondary** GitHub email: a separate account is created (spec edge case), no link. Only covered indirectly: the unit fixture picks the primary over a verified secondary address.
