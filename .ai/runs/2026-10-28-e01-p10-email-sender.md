# 2026-10-28 — E01 Phase 2 step 2.2: `EmailSender` port, SMTP adapter and Mailpit (P10)

## Asked

Implement only task 2.2 of `.ai/specs/2026-10-17-accounts-and-roles.md` Phase 2 (platform P10):
the `EmailSender` port, SMTP (nodemailer) and memory adapters, the confirmation template,
`config.email()` (`SMTP_URL`, `MAIL_FROM`, lazy), `emailSender` SINGLETON, Mailpit in
`docker-compose.yml` and in integration global setup with an inbox helper, unit tests at 100%
per file, docs (`.env.example`, README), spec notes, this log. One commit, no push, `track.md`
untouched.

## Done

- Port `packages/app/src/server/services/notifications/email-sender.port.ts`: `EmailSender.send({ to, subject, text, html? }): Promise<void>` (P10 contract), `EmailMessage`, `RenderedEmail`, `EmailSendError`.
- Adapters: `adapters/smtp-email-sender.ts` (`SmtpEmailSender`), `adapters/memory-email-sender.ts` (`MemoryEmailSender`).
- Templates: `templates/email-confirmation.ts` (`emailConfirmationEmail`, `emailConfirmationUrl`, `CONFIRM_EMAIL_PATH`), `templates/html.ts` (`escapeHtml`).
- `config.email()` in `packages/app/src/server/config.ts`; registration in `container.ts` (SINGLETON), type in `cradle.ts`.
- `nodemailer` dependency of `@devmentor/app` and in `serverExternalPackages`; `testcontainers` dev dependency (GenericContainer for Mailpit; it was only transitive before).
- `docker-compose.yml`: `mailpit` (`axllent/mailpit:v1.31.6`, 1025/8025).
- Integration: `tests/integration/mailpit.ts` (`startMailpit`, `MailpitInbox`, `linksIn`), wired into `global-setup.ts` (start after PostgreSQL, env `SMTP_URL`/`MAIL_FROM` for the app, provided `smtpURL`/`mailpitURL`, stop in the shared cleanup), `context.ts` types, `mailpit.test.ts`, `@` alias in `vitest.integration.config.ts`.
- Docs: `packages/app/.env.example`, README (setup, env table, tree, integration section). Spec "Implementation notes (Phase 2)" bullets. Lesson on nodemailer's `createTransport` arguments and bundled types.

## Decisions

- Transport failures become `EmailSendError` with the vendor error as `cause` only (same pattern as `GitHubOAuthError`); a refused single recipient also throws, since nodemailer resolves with `rejected` filled.
- Timeouts 10 s connect/greeting, 30 s socket, so a request that sends mail fails fast.
- `SmtpEmailSender` depends on `{ config: Pick<AppConfig, "email"> }`, so the integration test can drive it without the `server-only` config module.
- Template takes `appUrl` as data (pure function); the caller passes `config.app().url`. `expiresInHours` is data too (24 in Flow 2).
- `SMTP_URL` accepts only `smtp:`/`smtps:`; `MAIL_FROM` is a trimmed non-empty string (nodemailer parses names/addresses).
- Mailpit image pinned to v1.31.6 (released 2026-10-15) rather than the week-old v1.32.0.
- `npm run setup` unchanged: its first `docker compose up -d --wait` starts Mailpit too; an already healthy PostgreSQL skips the step, and the README says `docker compose up -d` starts both.

## Gate

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/…/prepare-share-bundle.mjs`).
- `npm run typecheck`: pass, all packages.
- `npm run test:coverage`: 71 files, 1117 tests passed; 100% lines/statements/functions/branches per file.
- `npm run build`: pass.
- `npm run test:integration`: 3 files, 31 tests passed (new `mailpit.test.ts`); no leftover containers.

## Outcome

Success. No schema change.
