# @devmentor/core

Framework-agnostic reusable code: DI container, errors, utils. **No React, no
Next.js, no MikroORM.**

**Isomorphism rule.** `@devmentor/core`'s `.` entry is server-side and may
use `node:crypto`. `@devmentor/core/validators/*` must stay isomorphic,
because client components import it. Anything a client needs (role names,
the `returnTo` schema) goes in `validators/`.

## Reusable API layer: `src/http/`, exported from `@devmentor/core`

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
- **Envelope types:** `core` (`src/http/apiHandler.ts`) and `ui`
  (`packages/ui/src/api/types.ts`) each declare the envelope and `CSRF_HEADER`,
  because ui may not import core. Keep the two in sync.

## Other homes

- clock: `src/time/clock.ts` (`clock` on the cradle, `fixedClock` in tests).
  Time rules read `clock.now()`, never `new Date()`.
- tokens: `src/security/tokens.ts` (`generateToken`, `hashToken`,
  `isWellFormedToken`). Only the hash is stored; never log a raw token.
- schemas: `src/validators/auth/return-to.schema.ts` and `role.schema.ts`.
- Domain events are emitted through a typed in-process emitter in
  `src/events`, registered on the `Cradle`. There is no queue or worker. Add
  the emitter with the first feature that emits an event, not before. Event
  IDs follow `concept.entity.action` (e.g. `bookings.booking.created`).
