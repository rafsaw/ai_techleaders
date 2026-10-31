<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# @devmentor/app

Next.js app: routes, server actions, composition root. The block above is
managed by `next dev`; keep it here so it is not re-created as an uncommitted
change.

- **`@devmentor/db` is server-only.** Import it only from Server Components,
  Route Handlers, Server Actions and `src/server/**`, never from a
  `"use client"` module.
- **Pages that query the DB** must render at request time. Call
  `await connection()` (from `next/server`) or use a request API, so the build
  never queries the database.
- `next build` must run with `NODE_ENV=production`. The app's build script
  pins it, because some shells export `NODE_ENV=development`, and that breaks
  the prerender with `useContext` of null.
- Async Server Component orchestration may be invoked directly with mocked
  request dependencies in unit tests; verify actual server rendering through
  integration tests too.

## All app code

- Services throw the `AppError` types and never build responses. Detect them
  with `isAppError(error)`, never `instanceof`: Next.js may load
  `@devmentor/core` once per bundle, so an error can come from another copy of
  the class.
- Time rules read `clock.now()`, never `new Date()`.
- Use the scoped `em` from a container scope. Never use `orm.em` (the global EM)
  for request work. v7 has no `persistAndFlush`; use `em.persist(x).flush()`.
- Only a token's hash is stored; never log a raw token.
- `secure` is required on every cookie.

## Routes

`src/server/http.ts` binds `apiHandler`, `makeCrudRoute` and `navigationHandler`
to the container. Route files import them from `@/server/http` and never write
their own `try/catch` or `NextResponse.json`. `src/app/api/users/route.ts`
together with `src/app/backend/users/` is the example to copy for a new concept.

## UI areas (platform PD2)

- **Public pages** live in `src/app/(frontend)/` (plus the shared
  `src/app/site-header.tsx`). Style them with plain Tailwind utility classes,
  `@devmentor/ui/frontend/*`, and the Tailwind-only domain components listed in
  `tailwindDomainComponents` in `eslint.config.mjs`. No shadcn primitives,
  `@devmentor/ui/backend/*` or `@base-ui/*`; ESLint enforces this, including
  relative imports inside the kit and those components.
- **Signed-in pages** live in `src/app/(app)/` (e.g. `/account`) and use shadcn
  components, like the admin area.
- **Backend (admin) pages** live under `src/app/backend/` (URL `/backend`,
  operators only). Compose them from `@devmentor/ui` shadcn components plus the
  theme tokens (`bg-card`, `text-muted-foreground`, …). Don't hand-roll a widget
  when a shadcn component exists for it.

## Building a screen

- Read `packages/ui/docs/design-system.md` before building or changing a screen.
- `apiCall` and `apiCallOrThrow` (`@devmentor/ui/api/apiCall`) are the only
  sanctioned way to `fetch()` `/api/*`, in every area.
- Signed-in and backend pages render loading, error and empty states only with
  `LoadingMessage`, `ErrorMessage` and `EmptyState`.
- In signed-in and backend pages, style navigation links with
  `<Link href="…" className={buttonVariants({ variant: "outline", size: "sm" })}>`;
  do not render them through `Button`, which adds `role="button"` and changes
  their link semantics (WCAG 4.1.2).

## Guards and request handling

- **Page guards** (`@/server/auth/page-guards`: `getPrincipal`,
  `requirePrincipal`, `requireRole`): every leaf page calls `getPrincipal()` or
  a guard with its own `returnTo` (layouts are reused on client navigation, so
  they are not enough). Signed out redirects to `/sign-in?returnTo=…` (plus
  `error=session_expired` when a presented session was rejected, SM-AC2; a
  client that gets 401 from an API does the same full navigation); a missing
  role calls `notFound()`. Pages that read identity render at request time.
- **Backend gate:** each `/backend` page calls
  `requireRole("operator", { returnTo })`. The layout only 404s a signed-in
  non-operator (it cannot know the path for `returnTo`). Guarded pages use
  `generateMetadata = operatorTitle("…")` (`src/app/backend/operator-title.ts`),
  never static `metadata`, because metadata is still sent with a 404.
  `src/app/not-found.tsx` is the neutral, identity-free 404.
- **Proxy (`src/proxy.ts`) is cookie-only.** It re-sends a well-formed session
  cookie with a fresh Max-Age on page requests (not `/api`, `/_next` or files),
  because Server Components cannot set cookies. It never authorizes and never
  imports the DB or the container; validity is always decided by the guards and
  API wrappers. It also sends the trailing-slash 308 (`skipTrailingSlashRedirect`
  is on), with the token-page headers, because Next's own redirect drops every
  `headers()` rule (R10). Don't turn the flag off or narrow the `/:path+/`
  matcher. Next's repeated-slash/backslash 308 (`/sign-in//`, `/invite//<t>`,
  `/sign-in\`) runs before the Proxy and `headers()` and cannot be protected
  in-app: it is a hosting release condition (R11), so don't try to fix it in the
  Proxy.
- **`/error` is identity-free.** It lives in its own `(error)` route group, and
  neither its page, layout nor header resolves a principal, creates a request
  scope or touches the DB, so it can report exactly those failures.
- **Token pages:** every route in `TOKEN_PAGES` (`src/app/token-page.ts`:
  `/confirm-email`, `/invite/:token` and the auth pages that keep a `returnTo`,
  `/sign-in`, `/sign-up`, `/sign-up/check-email`) always sends the token-page
  headers and static metadata, whatever its query. Protect by route; never match
  `returnTo` in a `next.config` `has` rule (R9).

## Auth security

- **N03:** there is no password reset or manual recovery in 1.0. Don't add a
  reset route, link or CLI command without a spec.
- **Email-bound invitations (AD5):** only the account whose verified email
  equals the invitation's may accept; the page never shows the invited address
  to another account. The GET page only inspects.
- **Secret-free invitations:** CLI output and logs carry the id, email, expiry
  and delivery status, never the token or link.
