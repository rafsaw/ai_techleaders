# Backward compatibility

This file lists what DevMentor treats as a **protected contract surface**, and what a change to one must carry. Review skills check PRs against it. Implementation skills warn when a change doesn't comply.

DevMentor is pre-1.0. It is a private monorepo with no published packages and no external API consumers yet, so most surfaces are internal contracts between workspace packages and between the server and its own client. Those contracts still break silently when one side changes without the other, so the rule throughout is: **change both sides in the same PR, or keep the old shape working.**

## How to handle a breaking change

1. Say so in the PR body under a `💥 Breaking` heading: what breaks, who is affected, and the migration path.
2. Update every in-repo consumer in the same PR, and keep the validation gate green.
3. Label the PR `risk-high` (see `SDLC.md` for the gates that triggers).
4. If a spec covers the surface, update the spec too.

Once a surface has consumers outside this repository (a published package, a public API, a mobile client), add a deprecation window for it here before that release.

## Recorded breaking changes

- **Accounts Phase 1 (`.ai/specs/2026-10-17-accounts-and-roles.md`):**
  - `apiHandler` and `makeCrudRoute` take a required `access` option (PD3); every in-repo route was updated.
  - `/api/users` went from open to operators only: 401 signed out, 403 without `operator`.
  - `/backend` and its pages are operators only: signed out redirects to `/sign-in?returnTo=…`, a signed-in non-operator gets the neutral 404. The home page no longer links to `/backend`; the header shows the sign-in state instead.
  - `@devmentor/ui/backend/api/*` moved to `@devmentor/ui/api/*` with no alias.

## Protected surfaces

### 1. HTTP API envelope and routes (`/api/*`)

The surface:

- The JSON envelope `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }` (`packages/core/src/http/apiHandler.ts`).
- The error `code` strings and their HTTP status mapping: 400 validation, 401, 403, 404, 409, and 500 `internal_error` (`packages/core/src/http/errors.ts`).
- The `makeCrudRoute` conventions: `POST` returns 201, and `PUT` / `DELETE` take `?id=<uuid>`.
- Every route and method states its access rule (`access` on `apiHandler`, `makeCrudRoute` and `navigationHandler`, platform PD3); it is required and has no default. Loosening a rule (e.g. `user` to `public`) is a security change.
- The existing routes, their access rules, and their request and response shapes:
  - `GET`/`POST /api/users`: operators only (`{ role: "operator" }`); 401 signed out, 403 without the role.
  - `GET`/`PATCH /api/account`: `user`; the caller's own account, `PATCH` takes `{ displayName }`.
  - `POST /api/auth/sign-out`: `optional`; ends the presented session, clears the cookie and returns `{ redirectTo: "/" }` (also when already signed out).
  - `GET /api/auth/github` (`?returnTo=`) and `GET /api/auth/github/callback`: `public` browser navigations answered with a 303 (`navigationHandler`). Expected callback failures redirect to `/sign-in?error=<code>` (keeping `returnTo`); unexpected ones to `/error?code=internal_error`.

Breaking changes include renaming or removing an envelope field, changing a `code` string or its status, moving `id` out of the query string, removing a route or method, adding a required request field, or removing or retyping a response DTO field.

Required path: the server envelope (`core`) and the client twin (`packages/ui/src/api/types.ts`, `apiCall`) change in the same PR, all consumers (`CrudForm`, `DataTable`, panels) are updated, and the unit and integration tests cover the new shape. Additive changes (an optional field, a new route) are not breaking.

### 2. CSRF header

The surface: `CSRF_HEADER = "x-devmentor-csrf"`, declared in both `core` (`apiHandler.ts`) and `ui` (`src/api/types.ts`), and required on every non-GET/HEAD/OPTIONS request.

Breaking changes include renaming the header, changing which methods require it, or letting the two declarations drift apart.

Required path: change both declarations together. Never remove the check without an approved spec that replaces the CSRF defense. That is a security change and gets the `security` label.

### 3. Workspace package exports

The surface is the `exports` map of each package and what it exposes:

- `@devmentor/core`: `.` (the DI container, `createApiHandler`, `createMakeCrudRoute`, `createNavigationHandler`, `parseInput`, the `AppError` hierarchy and `isAppError`, `Access`/`Principal`/`PrincipalResolver`, `ResponseCookies`/`readCookie`, `defineConfigSection`/`ConfigError`, `Clock`/`systemClock`/`fixedClock`, `generateToken`/`hashToken`/`isWellFormedToken`, logger, `registerCore`) and `./validators/*` (isomorphic: client code imports it, so no Node-only APIs).
- `@devmentor/db`: `.` (entities, `registerDb`) and `./config`.
- `@devmentor/ui`: `./globals.css`, `./components/*`, `./lib/*`, `./hooks/*`, `./api/*` (moved from `./backend/api/*` in accounts Phase 1; the old path was removed), `./backend/{forms,tables,feedback}/*`, `./forms/*` and `./frontend/*`.
- The `Cradle` interface keys added through declaration merging (`em`, `logger`, `clock`, `config`, `principalResolver`, `userService`, `roleService`, `authSessionService`, `githubOAuth`, `githubSignInService`, …).

Breaking changes include removing or renaming an export path or a named export, changing a function signature or a component's props incompatibly, or renaming or retyping a `Cradle` key.

Required path: update every importer in the monorepo in the same PR (`npm run typecheck` proves it). Generated shadcn components keep their public API stable even when their internals are edited.

### 4. Database schema and migrations

The surface is the PostgreSQL schema as defined by the committed migrations in `packages/db/src/migrations/` (today `users`, `user_roles` and `auth_sessions`), plus the `baseProperties` columns every entity inherits.

Breaking changes include dropping or renaming a table or column, narrowing a type, adding a `NOT NULL` column without a default, adding a uniqueness constraint over existing data, or editing an already-applied migration.

Required path:

- A new migration created with `npm run db:migration:create`, reviewed, and committed. Applied migrations are never edited.
- `down()` implemented so `npm run db:migrate:down` reverts it. If the change can't be reverted, say so in the PR body. The initial `Migration20261013225312` is up-only, as `README.md` documents.
- A migration test (one directory above `src/migrations/`).
- For a destructive change, a rollback plan in the PR body and a two-step expand/contract (add the new column, migrate the data, then drop the old one in a later PR) whenever existing data must survive.

Schema changes are `risk-high`.

### 5. Environment variables and configuration

The surface:

- `DATABASE_URL`, `DB_POOL_MIN`, `DB_POOL_MAX` and `DB_DEBUG` (read in `packages/db/src/config.ts`, documented in `packages/app/.env.example`).
- `APP_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_URL` and `GITHUB_API_URL` (lazily validated sections in `packages/app/src/server/config.ts`).
- `.env*` loading from `packages/app`, shared by Next.js and the MikroORM CLI.
- `.ai/agentic.config.json`.

Breaking changes include renaming or removing a variable, changing its default or its parsing (for example `DB_DEBUG` accepting only `"true"`), making an optional variable required, or moving where env files are loaded from.

Required path: update `.env.example`, `README.md` and the CI workflow in the same PR, and call out the change under `💥 Breaking` so developers update their `packages/app/.env`. Changes to `agentic.config.json` also update `SDLC.md`.

### 6. Repository scripts and commands

The surface is the root `package.json` scripts that `AGENTS.md`, `README.md`, CI and the agent pipeline invoke: `setup`, `dev`, `build`, `lint`, `typecheck`, `test:coverage`, `test:integration`, `test:integration:install`, the `db:*` scripts, `ui:add`, and `operator` (`npm run operator -- role grant|revoke --email <email> --role operator [--yes]`, its flags, output lines and exit codes 0/1/2).

Breaking changes include renaming or removing a script, or changing what it validates (for example dropping a package from `typecheck`).

Required path: update `AGENTS.md`, `README.md`, `.github/workflows/ci.yml` and `validation.commands` in `.ai/agentic.config.json` in the same PR.

### 7. Session and auth cookies

The surface:

- The session cookie `__Host-devmentor_session` (Secure, when `APP_URL` is https) or `devmentor_session` (plain http), HttpOnly, `SameSite=Lax`, `Path=/`, 30-day Max-Age renewed on activity (`packages/app/src/server/auth/session-cookie.ts`). Its value is an opaque token; only its SHA-256 hash is stored in `auth_sessions`.
- The OAuth attempt cookie `devmentor_oauth` (`Path=/api/auth/github`, 10 minutes).

Breaking changes include renaming a cookie (it signs every user out), widening its path or dropping a security attribute. Renaming is allowed only with a spec that accepts the forced sign-out; dropping an attribute is a `security` change.

### 8. Domain events (planned)

The surface: event IDs in `concept.entity.action` form (for example `bookings.booking.created`) and their payload types, emitted through the typed emitter in `packages/core/src/events`.

No emitter exists yet. This section applies from the first PR that adds one. From then on, renaming an event ID or removing or retyping a payload field is breaking, and every listener must be updated in the same PR.

## Not protected

These can change freely within the rules in `CODE_REVIEW.md`:

- Internal service implementations, as long as their DTOs stay the same.
- Page markup and styling.
- Test helpers and integration-test internals.
- Anything under `.ai/`, other than `agentic.config.json` and the tracker and browser descriptors.
