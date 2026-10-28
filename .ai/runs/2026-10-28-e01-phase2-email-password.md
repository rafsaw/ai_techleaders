# 2026-10-28 — E01 Phase 2: email and password with confirmation (#35)

## Asked

Phase 1 approved after manual testing and independent review. Continue with Phase 2 per
`track.md`: one subagent and at least one commit per task, full gate and run log at the end,
then a manual-test pause.

## Done

| Task | Outcome | Commits | Run log |
|---|---|---|---|
| 2.1 P9 single-use token records | `singleUseTokenProperties`, `inspectSingleUseToken`, `consumeSingleUseToken` (conditional update + re-read) | `7e32bc7` | `2026-10-28-e01-p9-single-use-tokens.md` |
| 2.2 P10 `EmailSender` | port, SMTP (nodemailer) + memory adapters, confirmation template, `config.email()`, Mailpit in compose and integration | `0e57410` | `2026-10-28-e01-p10-email-sender.md` |
| 2.3 P11 rate limiter | `RateLimiter` port, `PostgresRateLimiter`, `clientIp`, `TooManyRequestsError` + `Retry-After`, `TRUST_PROXY` | `9461674` | `2026-10-28-e01-p11-rate-limiter.md` |
| 2.4 Schema | `Migration20261028165323`: `users.password_hash`, `email_confirmation_tokens`, `rate_limit_buckets`; migration round trip and real-PostgreSQL limiter/P9 tests | `bff4668` | `2026-10-28-e01-phase2-schema.md` |
| 2.5 Password accounts | schemas, bcryptjs `PasswordHasher`, `PasswordAccountService`, four POST routes, four rate-limit rules, AD3 claim | `ad531e5`, `ba36d51`, `8c5ef47` | `2026-10-28-e01-phase2-password-accounts.md` |
| 2.6 F2/F3 + UI | form core (abort, in-flight guard, 429 copy), public kit, `/sign-in` email form + resend, `/sign-up`, `/sign-up/check-email`, `/confirm-email`; browser integration with Mailpit | `09be5f5`, `5579de4`, `4133abb` | `2026-10-28-e01-phase2-password-ui.md` |
| 2.7 Documentation | README, AGENTS.md, BACKWARD_COMPATIBILITY.md, engineering-standards corrections; platform F2/F3 catalog amended | `8f8b584`, `bf84634` | `2026-10-28-e01-phase2-docs.md` |

Spec step 2.7 (no credential race tests) is a non-task, as planned.

## Decisions surfaced to the user

Recorded in the accounts spec "Implementation notes (Phase 2)":
- Resend has only rule 4 (checked before the password, so it also caps guessing there).
- A sign-in/confirm while signed in replaces the cookie; the previous session row expires on its own.
- Signed-in visitors on `/sign-up` are redirected like on `/sign-in`; `/sign-up/check-email?sent=0` carries a failed send.
- Screen-map copy (SM-AC3/4/6) wins over older design-system mocks; "Back to sign-up" replaces P-SCR4's resend text.

## Gate (final tree)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass
- `npm run test:coverage`: 87 files, 1672 tests, 100% per file
- `npm run build`: pass
- `npm run test:integration`: 6 files, 54 tests
- `npm run test:storybook`: 56 files, 340 tests
- Local DB: all three migrations applied (`Migration20261028165323` up/down/up verified in 2.4)

## Outcome

Success. Phase 2 implemented and verified; paused for manual testing. Phase 3 not started.
