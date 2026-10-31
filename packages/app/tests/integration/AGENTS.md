# Integration tests

Use **Testcontainers PostgreSQL + agent-browser**. Apply committed migrations
to a fresh container, run the production build, use isolated browser sessions,
and clean up resources on success and failure. Never use a developer/shared
database, depend on demo data, or silently skip when Docker is unavailable.

- Before integration tests: `npm run build` and
  `npm run test:integration:install` (Linux may need `-- --with-deps`).
  Docker must be running. Run `npm run test:integration`; evidence is written
  to `test-results/integration/`, coverage to `coverage/`.
- Admin scenarios sign in through the GitHub stub (`github-stub.ts`) and grant
  `operator` with the real CLI (`npm run operator -- role grant …`), never by
  writing the role row.
- The readiness probe is `GET /` with a well-formed but unknown session
  cookie, so a DB or migration failure fails it.
- Read email through `MailpitInbox` (`mailpit.ts`: `waitForMessageTo`,
  `linksIn`); take links from the message, since the DB holds only token hashes.
- Keep a browser session's suffix short (`-dbl`, `-password`): the session name
  goes into agent-browser's socket path, which may not exceed 103 bytes.
- `IntegrationBrowser.click` scrolls the target into view first: agent-browser
  clicks at coordinates, and below the fold it hits `<html>`. Keep that when
  adding browser helpers.
- Rate limits are shared across scenarios in one app. Plan each address's
  attempt budget. `password-ui.test.ts` spends exactly 5 of rule 2 for its main
  address, so don't add sign-in/confirm attempts for it.
- A scenario that creates users or limiter buckets deletes them in `afterAll`
  (`users` rows, `rate_limit_buckets`), because other scenarios count users and
  Vitest reruns failed files first.
- Invitation scenarios use `invitations.ts`: `operator()` runs the real CLI with
  the app's `APP_URL`/`SMTP_URL`/`MAIL_FROM` and returns the exit code and output
  (`runNpmResult`), `expectSecretFree` checks CLI output, and races force their
  order with a separate lock-holding `pg` client plus `waitForLockWaiters` (no
  sleeps).
- Evidence never holds a raw link token: `IntegrationBrowser` redacts
  `/invite/<token>` and `token=` in what it writes, and
  `expectEvidenceFreeOf(tokens)` checks the run's text artifacts. Several
  same-named controls: `click(role, name, { nth })` (snapshot order;
  agent-browser ref ids are not in document order).
- Tests that need their own schema or table-wide cleanup use
  `scratch-database.ts` (`useScratchDatabase`, `dbContainer`), not the app's
  database.
