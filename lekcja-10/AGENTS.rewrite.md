<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor — architecture & stack rules

These are fixed project decisions. Follow them; don't swap in alternatives
(other ORMs, DI libraries, CSS frameworks, component kits, package managers)
without an approved spec in `.ai/specs/`. Background and rationale are in
`README.md` and `.ai/specs/implemented/2026-10-13-monorepo-foundation.md`.

## Stack

| Concern             | Use                                                         |
| ------------------- | ----------------------------------------------------------- |
| Framework           | Next.js 16 (App Router, Turbopack) + React 19               |
| Language            | TypeScript, `strict`, ESM everywhere (`"type": "module"`)   |
| Database            | PostgreSQL                                                  |
| ORM / migrations    | MikroORM v7 (`@mikro-orm/postgresql`, `@mikro-orm/migrations`) |
| Dependency injection| Awilix                                                      |
| Frontend pages      | Tailwind CSS v4 utilities                                   |
| Backend (admin) pages | shadcn/ui components (Base UI primitives, Tailwind v4)    |
| Monorepo            | npm workspaces — always use `npm`, never pnpm/yarn/bun      |

## Monorepo layout

```
packages/
  app/   @devmentor/app   Next.js app: routes, server actions, composition root
  core/  @devmentor/core  framework-agnostic reusable code: DI container, errors, utils
  db/    @devmentor/db    MikroORM config, entities, migrations, DB registrations
  ui/    @devmentor/ui    shadcn/ui components, Tailwind theme (globals.css), `cn()`
```

- **Dependency direction:** `app → ui, db, core`, `db → core`. `core` and
  `ui` depend on no other workspace package. `core` stays framework-agnostic:
  no React, no Next.js, no MikroORM. ESLint `no-restricted-imports` enforces
  all of this, and also that only `db` imports `@mikro-orm/*`.
- **`ui` is presentation only:** no data access, no server-only code.
- **`db` is server-only.** Import it only from Server Components, Route
  Handlers, Server Actions and `packages/app/src/server/**`, never from a
  `"use client"` module.
- **New packages** go in `packages/<name>` as `@devmentor/<name>`. They are
  source-only: `exports` point at `.ts`/`.tsx` files and there is no build
  step. Each one has a `tsconfig.json` extending `../../tsconfig.base.json`
  and a `typecheck` script. Turbopack transpiles workspace packages
  automatically, so don't add them to `transpilePackages`.
- **Imports:** across packages, use the package name
  (`@devmentor/ui/components/button`). Inside `app`, use `@/…` for its own
  `src/`. Never use relative paths that cross a package boundary.
- **Dependencies:** add each one to the package that uses it
  (`npm install <dep> -w @devmentor/<pkg>`). Only repo-wide tooling (eslint,
  typescript, @types/node) goes in the root `package.json`.

## Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, …)
is a same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/app/src/server/services/<concept>/<name>.service.ts`. Services
  need entities and `em`, so they can't live in `core` (`db → core`).
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`: the
  shared Zod schemas, imported as
  `@devmentor/core/validators/<concept>/<file>`.
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx`.

Create a concept folder only when its first file is added. Never scaffold
empty ones. This is a directory convention, not a module runtime: there is
no per-concept setup, ACL or auto-discovery. Full naming table and rules:
`.ai/specs/implemented/2026-09-01-engineering-standards.md`.

- **Adding a service:**
  - Add one explicit line to `container.ts`
    (`asClass(X)`, transient by default).
  - Add its type to `packages/app/src/server/cradle.ts`.
  - Never glob-load services with `loadModules`.
- **Service return values:** services return plain DTOs, never entities.
  Client components import the DTO *type* with `import type`.
- **External integrations** (payments, notifications, video) go
  through a port interface (`*.port.ts`) with a mock adapter under
  `adapters/`. Callers depend on the port, never on a vendor SDK.
- **Domain events:**
  - Event IDs follow `concept.entity.action` (e.g.
    `bookings.booking.created`).
  - They're emitted through a typed in-process emitter in
    `packages/core/src/events`, registered on the `Cradle`. There is no
    queue or worker.
  - Add the emitter with the first feature that emits an event, not before.

## Reusable API & UI layer

Every route and page reuses two shared layers. Don't re-implement fetch,
validation, auth or error handling per feature.

- **Server: `packages/core/src/http/`, exported from `@devmentor/core`.**
  - `errors.ts` is the typed `AppError` hierarchy: `ValidationError` 400,
    `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404,
    `ConflictError` 409. Services throw these and never build responses.
    Detect them with `isAppError(error)`, never `instanceof`: Next.js may
    load `@devmentor/core` once per bundle, so a service's error can come
    from another copy of the class.
  - `apiHandler.ts` provides the wrapper every route goes through. It:
    - checks the CSRF header on non-GET requests,
    - creates a container scope and passes its `cradle`,
    - resolves the session and applies the route's `access` rule,
    - returns `{ ok: true, data }` or
      `{ ok: false, error: { code, message, fieldErrors? } }`,
    - maps `AppError`s to their status, and logs anything else as a 500
      without leaking details.
  - **`access` is required (PD3)** on `apiHandler`, `makeCrudRoute` and
    `navigationHandler`: `"public" | "optional" | "user" | { role }`. `user` and
    `{ role }` answer 401 signed out and 403 without the role; the handler
    gets a typed `principal` (`null` on `public`). Pass a static `logRoute`
    template, never the request path.
  - `makeCrudRoute.ts` builds handlers for plain CRUD resources. You pass
    `methods`, `access`, `service` and the schemas; it returns the handlers.
    `PUT` and `DELETE` take `?id=<uuid>`. Workflow endpoints (booking,
    reschedule, payment) use `apiHandler` directly.
  - `navigationHandler.ts` wraps GET routes that answer a browser navigation
    with a 303 (OAuth start/callback, email links). Internal redirects go
    through the `returnTo` validator and resolve against `APP_URL`; external
    ones only to `externalOrigins`. Expected errors go to `/error?code=…`
    unless `onError` names another page; unexpected ones always go to
    `/error?code=internal_error`.
  - `auth.ts`: `Principal`, `Access`, `authorize()` and the
    `PrincipalResolver` port (the app registers `authSessionService` as
    `principalResolver`).
  - `cookies.ts`: `ResponseCookies` and `readCookie`; `secure` is required
    on every cookie.
  - `validation.ts`: `parseInput(schema, input)` throws a `ValidationError`
    with per-field messages.
- **App wiring: `packages/app/src/server/http.ts`.** It binds `apiHandler`,
  `makeCrudRoute` and `navigationHandler` to the container. Route files
  import them from `@/server/http` and never write their own `try/catch` or
  `NextResponse.json`.
- **Client: `packages/ui/src/api/` and `packages/ui/src/backend/`.**
  - `api/apiCall.ts` (`@devmentor/ui/api/apiCall`): `apiCall` and
    `apiCallOrThrow` are the only sanctioned way to `fetch()` `/api/*`, in
    every area. They always send the CSRF header and parse the envelope
    defensively.
  - `forms/CrudForm.tsx`: a schema-driven form bound to the same Zod schema
    as the route.
  - `tables/DataTable.tsx`: column-config lists with loading, error and
    empty states, pagination, and row actions.
  - `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`: the only
    loading, error and empty renderers.
- **Envelope types:** `core` (`http/apiHandler.ts`) and `ui`
  (`src/api/types.ts`) each declare the envelope and `CSRF_HEADER`, because
  ui may not import core. Keep the two in sync. Zod
  is a peer dependency of `ui`, since ui only uses its types.
- **Reference example:** `api/users/route.ts` together with
  `backend/users/` is the example to copy for a new concept.

Every new reusable component has one designated home:

1. **shadcn primitive:** `ui/src/components/`, added via `npm run ui:add`
   and never hand-written.
2. **Generic, concept-agnostic panel pattern:**
   `ui/src/backend/<category>/`.
3. **Component tied to one concept's domain shape:**
   `ui/src/components/<concept>/`, named after the concept folder used in
   `db` and `app`.
4. **Used by exactly one page:** colocate it next to that `page.tsx` until a
   second consumer appears.

**Isomorphism rule.** `@devmentor/core`'s `.` entry is server-side and may
use `node:crypto`. `@devmentor/core/validators/*` must stay isomorphic,
because client components import it. Anything a client needs (role names,
the `returnTo` schema) goes in `validators/`.

## Auth and sessions (accounts Phases 1–3)

- **Homes:**
  - config: `packages/app/src/server/config.ts` (`createAppConfig()`, cradle
    `config`), lazily validated sections built with `defineConfigSection`
    from `core/src/config/env.ts`; a missing key throws `ConfigError`.
  - clock: `core/src/time/clock.ts` (`clock` on the cradle, `fixedClock` in
    tests). Time rules read `clock.now()`, never `new Date()`.
  - tokens: `core/src/security/tokens.ts` (`generateToken`, `hashToken`,
    `isWellFormedToken`). Only the hash is stored; never log a raw token.
  - session cookie rules: `packages/app/src/server/auth/session-cookie.ts`.
  - schemas: `core/src/validators/auth/return-to.schema.ts` and
    `role.schema.ts`.
  - page guards: `@/server/auth/page-guards` (`getPrincipal`,
    `requirePrincipal`, `requireRole`).
  - GitHub: the port `server/services/auth/github-oauth.port.ts` and the
    arctic adapter `server/services/auth/adapters/arctic-github-oauth.ts`.
    Every GitHub call is bounded by `GITHUB_REQUEST_TIMEOUT_MS` (10 s, body
    included) through an `AbortSignal`; arctic only builds the authorization
    URL, since its token request takes no signal (R13).
  - operator CLI: `packages/app/src/server/cli/` (`run-cli.ts`, one
    `commands/*.command.ts` per command). Command modules must not
    value-import `@devmentor/db` (type imports only): its config reads
    `DATABASE_URL` on first import, before the runner loads env.
- **Sessions are DB rows** (`auth_sessions`), looked up by token hash on
  every request; nothing is cached across requests, so role grants and
  revokes apply on the next request. Activity is request-based: every page
  request that reaches the server (document, RSC navigation, prefetch) and
  every API call counts. Expiry moves to 30 days after the request, with at
  most one DB write per session per hour.
- **Page guards:** every leaf page calls `getPrincipal()` or a guard with its
  own `returnTo` (layouts are reused on client navigation, so they are not
  enough). Signed out redirects to `/sign-in?returnTo=…` (plus
  `error=session_expired` when a presented session was rejected, SM-AC2;
  a client that gets 401 from an API does the same full navigation); a
  missing role calls `notFound()`. Pages that read identity render at
  request time.
- **Backend gate:** each `/backend` page calls
  `requireRole("operator", { returnTo })`. The layout only 404s a signed-in
  non-operator (it cannot know the path for `returnTo`). Guarded pages use
  `generateMetadata = operatorTitle("…")`
  (`app/backend/operator-title.ts`), never static `metadata`, because
  metadata is still sent with a 404. `app/not-found.tsx` is the neutral,
  identity-free 404.
- **Proxy (`packages/app/src/proxy.ts`) is cookie-only.** It re-sends a
  well-formed session cookie with a fresh Max-Age on page requests (not
  `/api`, `/_next` or files), because Server Components cannot set cookies.
  It never authorizes and never imports the DB or the container; validity is
  always decided by the guards and API wrappers. It also sends the
  trailing-slash 308 (`skipTrailingSlashRedirect` is on), with the
  token-page headers, because Next's own redirect drops every `headers()`
  rule (R10). Don't turn the flag off or narrow the `/:path+/` matcher.
  Next's repeated-slash/backslash 308 (`/sign-in//`, `/invite//<t>`,
  `/sign-in\`) runs before the Proxy and `headers()` and cannot be
  protected in-app: it is a hosting release condition (R11), so don't try
  to fix it in the Proxy.
- **`/error` is identity-free.** It lives in its own `(error)` route group,
  and neither its page, layout nor header resolves a principal, creates a
  request scope or touches the DB, so it can report exactly those failures.
- **Operator role:** granted and revoked only with `npm run operator`;
  `mentor` is refused. Production requires `--yes`.

### Email accounts, mail and rate limits (Phase 2)

- **Single-use tokens (P9):** link tables spread `singleUseTokenProperties`
  (`db/src/entities/single-use-token.ts`) and use `inspectSingleUseToken` /
  `consumeSingleUseToken` from `@devmentor/db`. They report
  `valid | consumed | invalid | expired | used`, so pages can say why. A GET
  page only **inspects**; consume runs in a POST, inside the transaction
  that applies its effect. Store only the hash; the raw token travels in the
  link's query string and the POST body.
- **Email (P10):** callers depend on the `EmailSender` port
  (`server/services/notifications/email-sender.port.ts`), registered as
  `emailSender` (SINGLETON). Adapters: `adapters/smtp-email-sender.ts`
  (nodemailer; transport failures become `EmailSendError`, vendor error only
  as `cause`) and `adapters/memory-email-sender.ts` for unit tests. Templates
  are pure functions in `templates/<name>.ts` returning
  `{ subject, text, html }`, with absolute links built from `APP_URL` and
  HTML values escaped with `templates/html.ts`. `config.email()`
  (`SMTP_URL`, `MAIL_FROM`) is read on `send`, never on resolve.
  - Success means **SMTP acceptance**, not inbox delivery; copy never claims
    delivery. Failure policy is the caller's; nothing retries in the
    background.
  - Send only **after** the transaction commits.
  - Unit tests use `MemoryEmailSender`; integration tests read Mailpit
    through `tests/integration/mailpit.ts` (`MailpitInbox`).
- **Rate limits (P11):** the `RateLimiter` port is in
  `core/src/security/rate-limiter.ts`; its only adapter is
  `PostgresRateLimiter` (`db/src/rate-limiter.ts`, `rate_limit_buckets`,
  cradle `rateLimiter`, TRANSIENT because it uses the scoped `em`). There is
  no in-memory limiter; unit tests mock the port.
  - Keys are `<rule>:<subject>:<normalized value>`, stored only as a hash.
    E01's four rules and `rateLimitKey()` live in
    `PASSWORD_RATE_LIMITS` in `password-account.service.ts`; define a new
    concept's rules next to its service.
  - Every limiter hit finishes **before** the business transaction opens, so
    a failed attempt still counts. Per-IP rules run before password hashing.
  - The IP comes from `clientIp(req, config.app())`
    (`core/src/http/client-ip.ts`). It is `null` unless `TRUST_PROXY=true`
    and `X-Forwarded-For` is exactly one valid address. When it is `null`,
    **skip** per-IP rules; never pool unknown clients into one bucket.
  - A refusal throws `TooManyRequestsError` (`rate_limited`, 429);
    `apiHandler` adds `Retry-After`. The envelope and `apiCall` stay
    unchanged, and forms show `RATE_LIMITED_MESSAGE` for every 429, whatever the
    server says, with no countdown.
- **Passwords:** `PasswordHasher` port
  (`server/services/auth/password-hasher.port.ts`), bcryptjs adapter
  `adapters/bcrypt-password-hasher.ts`, cradle `passwordHasher`
  (SINGLETON). It refuses or never matches input over 72 bytes, and
  `dummyCompare` keeps timing equal for unknown accounts. Rules live in
  `core/src/validators/auth/password.schema.ts`; sign-in, resend and
  confirm use `currentPasswordSchema`, so they never reveal the
  registration rules. DTOs never carry `passwordHash`.
- **Credential transactions (`PasswordAccountService`,
  `GitHubSignInService`):** lock the user row `FOR UPDATE` **first**, then
  touch its token rows, and re-read confirmation state under the lock. No
  SMTP call and no cookie inside an uncommitted transaction: write the
  session row through the transaction's `em`
  (`authSessionService.create(userId, em)`), set the cookie after commit.
  Unit tests assert this order with one shared event log.
  Responses never reveal whether an email has an account.
- **N03:** there is no password reset or manual recovery in 1.0. Don't add a
  reset route, link or CLI command without a spec.

### Mentor invitations (Phase 3)

- **Homes:** `MentorInvitation` (`db/src/entities/auth/`, table
  `mentor_invitations`, P9 token columns plus `email`, `revoked_at`,
  `accepted_by_user_id`; one open row per email by a partial unique index);
  `MentorInvitationService` (`server/services/auth/mentor-invitation.service.ts`,
  cradle `mentorInvitationService`: `create`/`revoke`/`resend`/`inspect`/
  `accept`); the db-free `mentor-invitation.policy.ts`
  (`INVITATION_LIFETIME_DAYS = 14`, safe for CLI modules to import);
  the template `notifications/templates/mentor-invitation.ts`; the commands
  `cli/commands/invite-{create,revoke,resend}.command.ts` with
  `invite-flags.ts`; the page `app/(frontend)/invite/[token]/` and
  `POST /api/auth/invitations/accept` (`access: "user"`,
  `invitationAcceptSchema`). The operator runbook is the README section
  "Mentor invitations (operator runbook)".
- **Only path to `mentor`:** `RoleService.grantMentorFromInvitation`, called
  inside `accept`'s transaction (user `FOR UPDATE`, then the invitation by
  hash, then the checks, then `consumeSingleUseToken`). Generic `grant`
  takes only `mentee | operator`, and `role grant|revoke --role mentor` is
  refused. Never add another route, field or command that grants `mentor`.
- **Email-bound (AD5):** only the account whose verified email equals the
  invitation's may accept; the page never shows the invited address to
  another account. Resend rotates the hash in place, revoke closes the row;
  neither touches a role already granted.
- **Secret-free:** CLI output and logs carry the id, email, expiry and
  delivery status, never the token or link. Every route in `TOKEN_PAGES`
  (`app/token-page.ts`: `/confirm-email`, `/invite/:token` and the auth
  pages that keep a `returnTo`, `/sign-in`, `/sign-up`,
  `/sign-up/check-email`) always sends the token-page headers and static
  metadata, whatever its query. Protect by route; never match `returnTo` in
  a `next.config` `has` rule (R9).
  A failed send keeps the invitation and exits 1 asking for `invite resend`.
- **Staged for E02:** `INVITATION_ACCEPTED_DESTINATION`
  (`(frontend)/auth-links.ts`, now `/?invitation=accepted`) becomes
  `/mentor` in E02 Phase 1, and `SiteHeader` shows **Mentor setup** only
  when the app passes `mentorSetupHref`, which `AppSiteHeader` does from E02
  Phase 1. Don't link to `/mentor` before it exists.

## Dependency injection (Awilix)

- `createAppContainer()` from `@devmentor/core` builds the container with
  `InjectionMode.PROXY` and `strict: true`. Don't create raw Awilix
  containers.
- `packages/app/src/server/container.ts` is the **only composition root**.
  It calls each package's `register*()` function. It is `server-only` and
  cached on `globalThis`, so there is one container, one ORM and one pool
  per process.
- **Expose a `register*` function.** A package that provides services
  exports `registerX(container)`, the way `registerDb` does. It adds its
  keys to the `Cradle` interface with declaration merging
  (`declare module "@devmentor/core" { interface Cradle { … } }`). Every
  registration must be typed; `cradle` must never be `any`.
- **Constructor style:** services take a destructured cradle in their
  constructor or factory (`({ em, logger }) => …`) and never import
  singletons directly.
- **Lifetimes:**
  - `SINGLETON`: process-wide resources such as the ORM, clients and config.
  - `SCOPED`: per-request state such as `em`.
  - `TRANSIENT`: everything else.
  - `strict` mode rejects a singleton that depends on a scoped
    registration. Fix the lifetime rather than turning `strict` off.
- **Per-request work:** each request, server action or job calls
  `createRequestScope()` and resolves from that scope's `cradle`.

## Database (MikroORM v7 + PostgreSQL)

- **Configuration:**
  - `packages/db/src/config.ts` is the runtime config, shared by the app and
    the CLI.
  - `packages/db/mikro-orm.config.ts` is the CLI entry. It loads `.env*`
    from `packages/app`, the same files Next.js reads.
  - Settings come from env vars: `DATABASE_URL`, `DB_POOL_MIN`,
    `DB_POOL_MAX` and `DB_DEBUG`. Never hard-code credentials.
- **Entities:**
  - Define entities with `defineEntity` + `p` and a class
    (`class X extends XSchema.class {}` then `XSchema.setClass(X)`).
  - Don't use decorators or `reflect-metadata`. SWC/Turbopack don't emit
    decorator metadata.
  - Spread `baseProperties` (uuid `id`, `createdAt`, `updatedAt`) into every
    entity.
  - Name files `*.entity.ts` under `packages/db/src/entities/`.
  - List every entity in the `entities` array in `entities/index.ts`.
    There's no folder discovery.
- **Seeders:** live in `packages/db/src/seeders/` and must be listed in
  `seeder.seedersList` in `src/config.ts`. Without the list, `seeder:run`
  imports every file in that folder, colocated tests included.
- **Entity manager:**
  - Use the scoped `em` from a container scope (a fork).
  - Never use `orm.em` (the global EM) for request work.
  - v7 has no `persistAndFlush`. Use `em.persist(x).flush()`.
- **Schema changes go through migrations only:**
  - Change the entity, run `npm run db:migration:create`, review the
    generated file in `packages/db/src/migrations/`, commit it, and apply
    it with `npm run db:migrate`.
  - Never use `schema:update` or `schema:fresh` against shared databases.
  - Never edit a migration that has already been applied. Write a new one.
- **Pages that query the DB** must render at request time. Call
  `await connection()` (from `next/server`) or use a request API, so the
  build never queries the database.
- **New MikroORM packages** must be added to `serverExternalPackages` in
  `packages/app/next.config.ts`. Next's built-in list only knows the v6
  package names.

## UI: frontend vs backend pages

The UI has three areas by audience (platform PD2):

- **Public pages** live in `packages/app/src/app/(frontend)/` (plus the
  shared `app/site-header.tsx`). Style them with plain Tailwind utility
  classes, `@devmentor/ui/frontend/*`, and the Tailwind-only domain
  components listed in `tailwindDomainComponents` in `eslint.config.mjs`.
  No shadcn primitives, `@devmentor/ui/backend/*` or `@base-ui/*`; ESLint
  enforces this, including relative imports inside the kit and those
  components.
  - **Public kit (F3):** `ui/src/frontend/` (`forms/SchemaForm`,
    `forms/TextField`, `forms/PasswordField`, `forms/SubmitButton`,
    `feedback/Notice`, `actions/LinkButton`), imported as
    `@devmentor/ui/frontend/<path>`.
  - **New Tailwind domain component for a public page:** put it in
    `ui/src/components/<concept>/`, import only the kit, the form core,
    `@devmentor/ui/lib/*` and other listed domain components (through
    package paths, not `./`), add it to
    `tailwindDomainComponents`, and add an allowed case to
    `tests/eslint-config.test.ts`.
- **Form core (F2):** `ui/src/forms/useSchemaForm.ts` holds the state of
  both `CrudForm` and `SchemaForm`; `ui/src/forms/field-errors.ts` holds
  `toFieldErrors`, `failureMessage` and `RATE_LIMITED_MESSAGE`. Don't
  re-implement form state in a page.
  - `onSubmit(values, { signal })` must pass `signal` to `apiCall` (it
    aborts on unmount) and must not reject.
  - `SchemaForm` passes `lockAfterSuccess`: a public form navigates on
    success, so it stays pending until the page unmounts, a back/forward-cache
    restore, or `SUCCESS_LOCK_TIMEOUT_MS` (10 s). `CrudForm` unlocks right after
    success.
- **Signed-in pages** live in `packages/app/src/app/(app)/` (e.g.
  `/account`) and use shadcn components, like the admin area.
- **Backend (admin) pages** live under `packages/app/src/app/backend/`
  (URL `/backend`, operators only). Compose them from `@devmentor/ui` shadcn
  components plus the theme tokens (`bg-card`, `text-muted-foreground`, …).
  Don't hand-roll a widget when a shadcn component exists for it.
- **Adding shadcn components:** `npm run ui:add -- <component>` from the repo
  root; dependencies go into `@devmentor/ui`. Don't copy component code into
  `app`.
- **Editing shadcn components:**
  - Treat generated components as owned code: edit them in
    `packages/ui/src/components/` and keep their public API stable.
  - Components are built on **Base UI**, not Radix. Style navigation links with
    `<Link href="…" className={buttonVariants({ variant: "outline", size: "sm" })}>`;
    do not render them through `Button`, which adds `role="button"` and changes
    their link semantics (WCAG 4.1.2).
- **Design system:** read [packages/ui/docs/design-system.md](packages/ui/docs/design-system.md) before building a screen.
- **Styling setup:**
  - Global styles and theme tokens live only in
    `packages/ui/src/styles/globals.css`. The app's
    `src/app/globals.css` imports it and adds `@source` for the ui sources.
  - Use `cn()` from `@devmentor/ui/lib/utils` to merge classes.
  - There is no `tailwind.config.*`, because Tailwind v4 is configured in
    CSS.

## Commands (run from the repo root)

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| New migration | `npm run db:migration:create` (first one: `-- --initial`) |
| Apply / revert / list migrations | `npm run db:migrate` / `db:migrate:down` / `db:migration:list` |
| Seed sample data (idempotent) | `npm run db:seed` |
| Add shadcn component | `npm run ui:add -- <name>` |
| Grant / revoke operator | `npm run operator -- role grant\|revoke --email <email> --role operator [--yes]` |

Before calling work done, `npm run lint`, `npm run typecheck`,
`npm run build`, `npm run test:coverage`, and `npm run test:integration`
must all pass. If the schema changed, the migration must also apply cleanly.
A task is not complete until its run log exists in .ai/runs/ and its spec is updated. Check this before reporting completion.

## Testing and pull request CI

- **Every new feature and every change must have 100% unit test coverage:**
  statements, branches, functions, and lines, enforced **per source file** by
  `npm run test:coverage`. Cover successful behavior, validation, errors, and
  relevant edge cases with meaningful assertions. Never lower thresholds,
  omit source files, add coverage-ignore directives, or mock the code under
  test to make the gate pass.
- Use **Vitest** for TypeScript units and **React Testing Library** with
  **jsdom** for components. Colocate `*.test.ts` / `*.test.tsx` with source.
  Coverage includes all workspace
  `src` runtime TypeScript, including generated UI primitives and migrations,
  plus the executable `eslint.config.mjs` package-boundary configuration and
  the Node-only repo scripts in `scripts/**/*.mjs` (e.g. `npm run setup`);
  tests and declaration files are excluded. Type-only files have no runtime.
  Migration tests live one directory above `src/migrations/` so the MikroORM
  CLI cannot discover them as migrations. Repository tooling tests live in
  `tests/`; `tests/eslint-config.test.ts` exercises forbidden and allowed imports.
- Mock external resources for unit tests. Async Server Component orchestration
  may be invoked directly with mocked request dependencies; verify actual
  server rendering through integration tests too.
- Use **Testcontainers PostgreSQL + agent-browser** for integration tests in
  `packages/app/tests/integration/`. Apply committed migrations to a fresh
  container, run the production build, use isolated browser sessions, and
  clean up resources on success and failure. Never use a developer/shared
  database, depend on demo data, or silently skip when Docker is unavailable.
- Before integration tests: `npm run build` and
  `npm run test:integration:install` (Linux may need `-- --with-deps`).
  Docker must be running. Run `npm run test:integration`; evidence is written
  to `test-results/integration/`, coverage to `coverage/`.
- Add integration cases for new user flows and persistence behavior.
  Admin scenarios sign in through the GitHub stub
  (`tests/integration/github-stub.ts`) and grant `operator` with the real
  CLI (`npm run operator -- role grant …`), never by writing the role row.
  The readiness probe is `GET /` with a well-formed but unknown session
  cookie, so a DB or migration failure fails it.
- **Integration notes:**
  - Read email through `MailpitInbox` (`waitForMessageTo`, `linksIn`); take
    links from the message, since the DB holds only token hashes.
  - Keep a browser session's suffix short (`-dbl`, `-password`): the
    session name goes into agent-browser's socket path, which may not
    exceed 103 bytes.
  - `IntegrationBrowser.click` scrolls the target into view first:
    agent-browser clicks at coordinates, and below the fold it hits
    `<html>`. Keep that when adding browser helpers.
  - Rate limits are shared across scenarios in one app. Plan each address's
    attempt budget. `password-ui.test.ts` spends exactly 5 of rule 2 for
    its main address, so don't add sign-in/confirm attempts for it.
  - A scenario that creates users or limiter buckets deletes them in
    `afterAll` (`users` rows, `rate_limit_buckets`), because other scenarios
    count users and Vitest reruns failed files first.
  - Invitation scenarios use `tests/integration/invitations.ts`:
    `operator()` runs the real CLI with the app's `APP_URL`/`SMTP_URL`/
    `MAIL_FROM` and returns the exit code and output (`runNpmResult`),
    `expectSecretFree` checks CLI output, and races force their order with a
    separate lock-holding `pg` client plus `waitForLockWaiters` (no sleeps).
  - Evidence never holds a raw link token: `IntegrationBrowser` redacts
    `/invite/<token>` and `token=` in what it writes, and
    `expectEvidenceFreeOf(tokens)` checks the run's text artifacts. Several
    same-named controls: `click(role, name, { nth })` (snapshot order;
    agent-browser ref ids are not in document order).
  - Tests that need their own schema or table-wide cleanup use
    `tests/integration/scratch-database.ts` (`useScratchDatabase`,
    `dbContainer`), not the app's database.
- `.github/workflows/ci.yml` checks each PR. A feature is complete only when
  all checks pass.

## Gotchas

- `next build` must run with `NODE_ENV=production`. The app's build script
  pins it, because some shells export `NODE_ENV=development`, and that
  breaks the prerender with `useContext` of null.
- Restart `next dev` after changing entity definitions. The ORM is cached
  per process and won't see HMR'd entity metadata.
- MikroORM v7 is ESM-only and needs Node ≥ 22.17. The CLI runs TypeScript
  through `tsx`, which it auto-detects. Don't add `ts-node`.
- `packages/app/AGENTS.md` exists so `next dev` finds its managed block
  there. Keep project rules in this root file.
- The root `node_modules/zod` is **v3**, pulled in by shadcn and
  eslint-plugin-react-hooks. Workspaces use zod **v4**
  (`z.email()`, `z.uuid()`), installed under `packages/core/node_modules`.
  Run zod scripts from inside a workspace package, not the repo root.
- `CrudForm` seeds every field with `""`. Keep it that way: an `undefined`
  value makes Zod report "expected string" instead of the schema's own
  message (e.g. "Name is required").

# Spec-Driven Development (SDD) & agent metadata

`.ai/` is the source of truth for specs, run logs and lessons learned. Do not
improvise alternative locations for specs, logs, or notes.

## `.ai/specs/` — specifications

- Every feature/change that goes through SDD gets a spec file, written
  directly in `.ai/specs/`.
- Once a spec has been fully implemented, move the file into
  `.ai/specs/implemented/` (keep the original filename — don't rename or
  change the date).
- If a spec is abandoned, superseded, or no longer relevant, move it into
  `.ai/specs/archive/` instead of deleting it.
- Before starting implementation work, check `.ai/specs/` for an existing
  spec covering the task. If none exists and the task is non-trivial, write
  one first and get it reviewed before coding.

## `.ai/runs/` — autonomous run logs

- Every autonomous AI run (unattended / agentic execution, not a normal
  interactive session) writes a log file to `.ai/runs/`.
- The log should capture: what the run was asked to do, what it did, key
  decisions, and the outcome (success/failure/partial).
- Do not overwrite or delete past run logs. If a run is retried, use a new
  slug (or append `-2`, `-3`, ...) rather than clobbering the original file.

## `.ai/lessons.md` + `.ai/lessons/` — long-term memory

- `.ai/lessons.md` is the append-only index of lessons learned: gotchas,
  bug-fix root causes, and improvements worth remembering across sessions.
- After fixing a non-trivial bug, or whenever you discover something future
  agents should know, add an entry to `.ai/lessons.md` using the template at
  the top of that file.
- Check `.ai/lessons.md` before starting non-trivial work, especially in
  areas with a history of bugs — a relevant lesson may already exist.

## Naming rules (applies to all of the above)

- Format: `YYYY-MM-DD-slug.md`, date first, then a short kebab-case slug.
- Use the date the file was created/the run started — never update it later.

# Working rules (distilled from Boris Cherny's Claude Code tips)

1. **Plan before you build. If it goes wrong, plan again.** Start non-trivial
   work in plan mode or with a spec in `.ai/specs/`. If the
   implementation goes off track, stop and update the plan instead of piling
   patches on top.
2. **Turn every correction into a rule.** When a human corrects you, write a
   lesson to `.ai/lessons.md` (or update this file if it's a standing
   convention) so the same mistake doesn't come back.
3. **Fix things yourself and prove they work.** When you're given a bug
   report, a failing test, or a CI failure, find the root cause and fix it
   without waiting for step-by-step instructions. Ask for review only after
   the checks pass.
4. **Prefer the elegant fix over the first one that works.** If a fix feels
   hacky, throw it out and rewrite it cleanly using what you've learned.
5. **Use subagents, and turn repeated work into reusable tools.** Hand off
   research, exploration, and parallel subtasks to subagents so the main
   context stays focused. Anything you do more than once a day should become
   a skill or slash command and be committed to git.
