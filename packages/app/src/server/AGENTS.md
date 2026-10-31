# Server zone: concepts, services, DI, email, rate limits

## Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, …)
is a same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/app/src/server/services/<concept>/<name>.service.ts`. Services
  need entities and `em`, so they can't live in `core` (`db → core`).
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`: the
  shared Zod schemas, imported as `@devmentor/core/validators/<concept>/<file>`.
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx`.

Create a concept folder only when its first file is added. Never scaffold
empty ones. This is a directory convention, not a module runtime: there is
no per-concept setup, ACL or auto-discovery. Full naming table and rules:
`.ai/specs/implemented/2026-09-01-engineering-standards.md`.

- **Adding a service:** add one explicit line to `container.ts` (`asClass(X)`,
  transient by default) and its type to `cradle.ts`. Never glob-load services
  with `loadModules`.
- **Service return values:** services return plain DTOs, never entities.
  Client components import the DTO *type* with `import type`.
- **External integrations** (payments, notifications, video) go through a port
  interface (`*.port.ts`) with a mock adapter under `adapters/`. Callers depend
  on the port, never on a vendor SDK.
- **Config:** `config.ts` (`createAppConfig()`, cradle `config`), lazily
  validated sections built with `defineConfigSection` from
  `packages/core/src/config/env.ts`; a missing key throws `ConfigError`.
- **Operator CLI:** `cli/` (`run-cli.ts`, one `commands/*.command.ts` per
  command). Command modules must not value-import `@devmentor/db` (type imports
  only): its config reads `DATABASE_URL` on first import, before the runner
  loads env.

## Dependency injection (Awilix)

- `createAppContainer()` from `@devmentor/core` builds the container with
  `InjectionMode.PROXY` and `strict: true`. Don't create raw Awilix containers.
- `container.ts` is the **only composition root**. It calls each package's
  `register*()` function. It is `server-only` and cached on `globalThis`, so
  there is one container, one ORM and one pool per process.
- **Expose a `register*` function.** A package that provides services exports
  `registerX(container)`, the way `registerDb` does. It adds its keys to the
  `Cradle` interface with declaration merging
  (`declare module "@devmentor/core" { interface Cradle { … } }`). Every
  registration must be typed; `cradle` must never be `any`.
- **Constructor style:** services take a destructured cradle in their
  constructor or factory (`({ em, logger }) => …`) and never import singletons
  directly.
- **Lifetimes:** `SINGLETON` for process-wide resources such as the ORM, clients
  and config; `SCOPED` for per-request state such as `em`; `TRANSIENT` for
  everything else. `strict` mode rejects a singleton that depends on a scoped
  registration. Fix the lifetime rather than turning `strict` off.
- **Per-request work:** each request, server action or job calls
  `createRequestScope()` and resolves from that scope's `cradle`.

## Sessions and roles

- Session cookie rules: `auth/session-cookie.ts`.
- **Sessions are DB rows** (`auth_sessions`), looked up by token hash on
  every request; nothing is cached across requests, so role grants and
  revokes apply on the next request. Activity is request-based: every page
  request that reaches the server (document, RSC navigation, prefetch) and
  every API call counts. Expiry moves to 30 days after the request, with at
  most one DB write per session per hour.
- **Operator role:** granted and revoked only with `npm run operator`;
  `mentor` is refused. Production requires `--yes`.

## Email (P10)

Callers depend on the `EmailSender` port
(`services/notifications/email-sender.port.ts`), registered as `emailSender`
(SINGLETON). Adapters: `services/notifications/adapters/smtp-email-sender.ts`
(nodemailer; transport failures become `EmailSendError`, vendor error only as
`cause`) and `services/notifications/adapters/memory-email-sender.ts` for unit
tests. Templates are pure functions in
`services/notifications/templates/<name>.ts` returning `{ subject, text, html }`,
with absolute links built from `APP_URL` and HTML values escaped with
`services/notifications/templates/html.ts`. `config.email()` (`SMTP_URL`,
`MAIL_FROM`) is read on `send`, never on resolve.

- Success means **SMTP acceptance**, not inbox delivery; copy never claims
  delivery. Failure policy is the caller's; nothing retries in the background.
- Send only **after** the transaction commits.
- Unit tests use `MemoryEmailSender`; integration tests read Mailpit through
  `packages/app/tests/integration/mailpit.ts` (`MailpitInbox`).

## Rate limits (P11)

The `RateLimiter` port is in `packages/core/src/security/rate-limiter.ts`; its
only adapter is `PostgresRateLimiter` (`packages/db/src/rate-limiter.ts`,
`rate_limit_buckets`, cradle `rateLimiter`, TRANSIENT because it uses the scoped
`em`). There is no in-memory limiter; unit tests mock the port.

- Keys are `<rule>:<subject>:<normalized value>`, stored only as a hash.
  E01's four rules and `rateLimitKey()` live in `PASSWORD_RATE_LIMITS` in
  `services/auth/password-account.service.ts`; define a new concept's rules next
  to its service.
- Every limiter hit finishes **before** the business transaction opens, so a
  failed attempt still counts. Per-IP rules run before password hashing.
- The IP comes from `clientIp(req, config.app())`
  (`packages/core/src/http/client-ip.ts`). It is `null` unless `TRUST_PROXY=true`
  and `X-Forwarded-For` is exactly one valid address. When it is `null`,
  **skip** per-IP rules; never pool unknown clients into one bucket.
- A refusal throws `TooManyRequestsError` (`rate_limited`, 429); `apiHandler`
  adds `Retry-After`. The envelope and `apiCall` stay unchanged, and forms show
  `RATE_LIMITED_MESSAGE` for every 429, whatever the server says, with no
  countdown.
