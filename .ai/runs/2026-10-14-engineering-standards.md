# Run: implement engineering-standards spec

- **Date:** 2026-10-14
- **Spec:** `.ai/specs/implemented/2026-09-01-engineering-standards.md`
- **Outcome:** success. Two items were deferred or blocked (see below).

## Asked

Implement the engineering-standards spec: domain-concept folders, the
reusable API/UI layer, the `/backend/users` reference example, and the
AGENTS.md updates.

## Decisions (confirmed with the user)

- **Services** live in `packages/app/src/server/services/<concept>/`, not
  in `core`. In `core` they would need `db`, which already depends on
  `core`, creating a cycle.
- **Auth:** the `/api/users` reference route exposes GET + POST. `auth.ts`
  is deferred until the auth concept exists (YAGNI). Until then the route is
  unauthenticated, as `/backend` already is. Writes are protected by the
  CSRF custom-header check in `apiHandler`.

## Done

1. **Moved the User entity** into
   `packages/db/src/entities/auth/user.entity.ts`. Table, migration and
   schema are unchanged: `migration:check` reports the schema is up to
   date.
2. **Built the server layer**, `packages/core/src/http/`:
   - `errors.ts` (the `AppError` hierarchy with status codes),
   - `apiHandler.ts`, created with `createApiHandler(container)`,
   - `makeCrudRoute.ts` (type-safe: POST requires `createSchema`, the
     service must have the matching methods, and only the listed methods
     are returned),
   - `validation.ts`.

   I also added a `logger` with secret redaction, registered via
   `registerCore()`, and zod v4 in `core`.
3. **Built the client layer**, `packages/ui/src/backend/`: `api/apiCall.ts`
   with `api/types.ts`, `forms/CrudForm.tsx`, `tables/DataTable.tsx`, and
   `feedback/*`. I added the shadcn primitives they need with
   `npm run ui:add` (input, label, field, table, spinner, alert, empty,
   separator). zod is a peer dependency of `ui`.
4. **Built the reference example:**
   - `UserService` (returns DTOs; the unique index turns a duplicate into a
     `ConflictError`),
   - `cradle.ts`, and the explicit registration in `container.ts`,
   - `server/http.ts`, `api/users/route.ts` (via `makeCrudRoute`),
   - `/backend/users` (`DataTable` + `CrudForm` + `apiCall`).

   The dashboard now uses `userService.count()`.
5. **Added `core/src/validators/auth/user-create.schema.ts`**, shared by the
   route and the form.
6. **Added ESLint `no-restricted-imports` package boundaries.** I checked
   each rule with deliberate violations.
7. **Updated AGENTS.md** (domain concept convention, reusable API & UI layer,
   gotchas) and README, and added two lessons.

## Verification

- `npm run lint`, `npm run typecheck` and `npm run build` all pass. The
  build makes no DB access; `/api/users` is dynamic.
- **Against the local Postgres with `next start`:**
  - GET list → 200
  - POST without the CSRF header → 403
  - invalid body → 400 with `fieldErrors`
  - malformed JSON → 400
  - a valid POST with an extra `id` or `createdAt` → 201; the extra fields
    are ignored (no mass assignment)
  - duplicate email, case-insensitive → 409
  - PUT → 405
- **With a throwaway tsx probe:**
  - an unexpected throw → 500 with a generic message; the details go to the
    log only
  - PUT/DELETE `?id` validation and `NotFoundError` → 404 both work
  - the logger redacts `password`, `cookie` and `token` at any depth
- **In headless Chromium** (Playwright, installed in /tmp and removed
  afterwards):
  - client-side validation messages appear
  - a server conflict shows on the form
  - Ctrl+Enter submits
  - a successful create refreshes the list and resets the form
- **Bug found and fixed:** `CrudForm` didn't seed empty values, so the
  schema's messages never showed. See lessons.md.
- I deleted the test rows afterwards.

## Not done or deferred

- **Spec step 8 (`docs/product-scope.md`):** this file is in the external
  training pack, not in this repo. It still needs the "DI container"
  exclusion removed or qualified there.
- **Deferred by the spec's own rules (YAGNI):**
  - `core/src/events/`, until the first emitting feature (bookings or
    messages)
  - `core/src/http/auth.ts`, until the auth concept
  - payment port and adapters, until the payments concept
- **No automated test runner** is set up in the repo yet. Verification was
  manual, as listed above. Adding one (e.g. Vitest) needs its own decision.
