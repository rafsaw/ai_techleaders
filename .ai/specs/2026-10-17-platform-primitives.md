# Platform primitives — the reusable backend and frontend layer for Now

- Companion spec: [`2026-10-17-accounts-and-roles.md`](./2026-10-17-accounts-and-roles.md) (epic #28), the first consumer. It builds every primitive marked **E01** below, inside its own phases.
- Design authority: `.ai/specs/product-brief.md` (Now scope), `AGENTS.md` (stack and layer rules), `BACKWARD_COMPATIBILITY.md` (protected surfaces)
- Status: **draft for review** (PO revisions 2026-10-18; E02–E05 candidates remain provisional)

## 📝 TLDR

**Today.** The baseline has one reusable server layer: `apiHandler`, `makeCrudRoute`, `AppError` and `parseInput`. It also has one reusable client layer: `apiCall`, `CrudForm`, `DataTable` and the feedback states. That client layer is backend-only and styled with shadcn.

**What Now needs.** Every Now epic needs more than that:

- who is calling, plus role and ownership checks
- routes that answer a browser navigation with a redirect
- a way back to where the visitor was after signing in
- expiring single-use links
- outbound email
- a clock for time-window rules
- idempotent external callbacks
- frontend forms for three page areas

**Proposed (future behavior).** This spec records E01's primitive contracts and provisional candidates for the rest of Now. Each gets a proposed home and first consumer. E01 builds only what E01 uses; public-form infrastructure starts in Phase 2. E02–E05 contracts are finalized when their first feature is specified, following the `AGENTS.md` rule to add a piece "with the first feature that needs it".

**Identifier legend.** `PD` = platform decision; `P` = server primitive; `F` = frontend primitive. `AD` belongs to the companion accounts spec. `D`, `N`, `R`, `A` and zero-padded `Q` belong to the product brief (decision, non-goal, rule, assumption, question). `E01-S01` is a backlog story. Historical authoring questions use `platform.gate.Q4`, never bare `Q4`; use `brief.Q05` for a brief question and `accounts.AD2` / `platform.P3` across documents. Unqualified PD/P/F references below are local.

## 📝 Decisions

The product owner made the original decisions on 2026-10-17 and revised scope, invitations and session activity on 2026-10-18. These are spec-level ids, not brief ids. The latest PO instruction supersedes the earlier conflicting choices.

| Id | Decision | Why | Changes a standing rule? |
|---|---|---|---|
| PD1 | Email goes through an `EmailSender` port. The real adapter is SMTP via `nodemailer`. Mailpit catches mail locally and in integration tests. A production provider supporting SMTP is chosen through env vars. **Release requires a chosen provider, a configured sender and a successful delivery test.** (platform.gate.Q4) | Provider selection does not block planning; production delivery must work before release. Mailpit alone does not establish that. | No. It applies the existing port and adapter rule. |
| PD2 | The UI is split into three areas by audience, not two (platform.gate.Q5):<br>• **Public** (`(frontend)`): listing, mentor profile, sign-in, sign-up, email and invitation links. Uses the Tailwind-only kit.<br>• **Signed-in** (`(app)`): account, mentor profile and slot editors, sessions, session screen. Uses shadcn.<br>• **Admin** (`/backend`): uses shadcn.<br>All three share one presentation-free core: `apiCall` and a form-state hook bound to Zod. | Public pages carry the product's look. Signed-in tools are form- and list-heavy, and shadcn already covers them. | **Yes.** It is a spec-sanctioned exception to "frontend pages don't use shadcn": the signed-in area may use shadcn. `AGENTS.md` is updated in accounts Phase 1. |
| PD3 | Every route states its access rule explicitly (`access: "public" \| "optional" \| "user" \| { role }`). There is no default. | Fail closed: a forgotten check becomes a type error, not an open endpoint. `/api/users` shipped open with a TODO for exactly this reason. | Extends the protected `apiHandler` and `makeCrudRoute` surface. Every in-repo caller is updated in the same PR. |
| PD4 | Authorization remains in `apiHandler`, `navigationHandler` and page guards. A narrow `app/src/proxy.ts` renews the existing page-request session cookie only; it never resolves identity, queries the DB or authorizes access. P3/P4 update the authoritative DB expiry on every authenticated request. | The PO requires 30 days from the last visit, including read-only pages. Server Components cannot set cookies. Cookie renewal in Proxy is not an authorization decision. | Supersedes the earlier blanket "no proxy.ts" choice; retains one authorization policy in the data access layer. |
| PD5 | Phase 1 is **one PR**, focused on GitHub sign-in, accounts, sessions and protecting admin. F2 and the public-form portion of F3 ship in Phase 2. | No public input form needs that infrastructure in Phase 1. | No. The Phase 1 PR updates all touched contracts and their consumers together. |

## 📝 Problem Statement

- **Deferred pieces.** `AGENTS.md` and the engineering-standards implementation notes deferred these to "their first feature":
  - `core/src/http/auth.ts`
  - the zod env schema
  - ports with mock adapters
  - the typed event emitter

  The backlog (#28–#47) now names those features.
- **Redirect routes.** `apiHandler` always answers JSON. These routes need redirect responses with the same scope, logging and error mapping:
  - the OAuth start and callback (E01-S01)
  - the Stripe onboarding return (E02-S02)
  - the Stripe checkout return (E04-S02)

  Without a primitive, each one grows its own `try/catch`, which `AGENTS.md` forbids.
- **Time rules.** Four stories have time rules, and each needs a controllable clock to reach the 100% branch gate:
  - token expiry (E01)
  - the 2-hour lead time (D16, E04-S01)
  - the message window (D10, E05-S02)
  - upcoming and past lists (E05-S01)
- **Frontend reuse.** About a dozen Now screens are not admin screens. The only form primitive (`CrudForm`) is admin-styled. Without a shared core, each screen would re-implement Zod validation, the server `fieldErrors` mapping, submit state, and the empty and error states.

## 📝 Feature-type inventory (from the Now backlog)

Every Now story reduces to a small set of capability types. The primitives below come from this table. No primitive exists that a row does not need.

| Feature type | Now stories | Primitive(s) |
|---|---|---|
| Know who is calling; sign in and sign out | E01-S01, E01-S02, and every signed-in story after | P3 identity context, P4 page guards |
| Role gate (mentor-only tools, operator-only admin) | E01-S03, E02-S01–S03, accounts.AD4 admin | P3 (`access: { role }`), P4 |
| Ownership / participant-only access, concealing existence | E02-S01 (own profile), E02-S03 (own slots), E05-S01/S02 (own sessions; "denied without revealing the session") | P5 access assertions |
| Return to where the visitor was after sign-in | E01-S03 (invite link), E04-S01 ("returns to the same slot") | P6 `returnTo` |
| Browser-navigation route that ends in a redirect, internal or to an allowlisted provider | E01-S01 OAuth start and callback, E02-S02 Stripe onboarding return and refresh, E04-S02 checkout return | P7 navigation handler |
| Expiring, single-use, unguessable link | E01-S02 confirmation, E01-S03 invitation | P8 tokens, P9 single-use token records |
| Outbound email | E01-S02 confirmation, E01-S03 invitation, E04-S03 booking information | P10 `EmailSender` |
| Abuse control on credential endpoints | E01-S02 sign-in, sign-up, resend | P11 rate limiter |
| Operator action without a UI (D12, D14) | E01-S03-T01 invitations, accounts.AD4 operator grant/revoke | P12 operator CLI |
| Time-window rule | E01 token and session expiry, E04-S01 lead time (D16), E05-S01 upcoming/past, E05-S02 send window (D10) | P2 clock, P15 time windows |
| Configuration and secrets | E01 GitHub OAuth, E01 SMTP, E02/E04 Stripe | P1 config |
| External provider behind a port | E01-S01 GitHub OAuth, E01-S02 email, E02-S02 Stripe Connect onboarding, E04-S02 Stripe Checkout | port + adapter pattern: `GitHubOAuth` (accounts spec), P10, P13 |
| Idempotent external callback (retries, late duplicates) | E02-S02 ("callback is idempotent"), E04-S02 ("no second booking") | P14 webhook inbox |
| Side effect that must not roll back the main action | E04-S03 ("booking stays confirmed" when email fails) | P16 domain events |
| Money and price per format | E02-S01, E04-S01, E04-S02 | P17 money |
| Owner-scoped editor form (signed-in) | E01 account, E02-S01 profile, E02-S03 slots | existing `CrudForm`; F2 extraction only in Phase 2 |
| Public form (signed-out) | E01-S02 email sign-in, sign-up | F2 form core + F3 Tailwind kit |
| Public read page (no sign-in) | E03-S01 listing and profile, E04-S01 slot picker | F4 area layouts, F5 server-read convention |
| Participant list with upcoming/past and empty state | E05-S01 | F6 lists (reuses `DataTable`/feedback) |
| Text exchange refreshed manually (no realtime, D10) | E05-S02 | none (refresh is enough; **realtime explicitly skipped**) |

## 📝 Proposed Solution

Extend the two layers that already exist rather than add a framework next to them:

- **Server.** `apiHandler` gains an access rule, a resolved principal and response cookies. A sibling `navigationHandler` covers redirect routes. Small, framework-agnostic contracts live in `core`: config reader, clock, tokens, rate-limiter port, access assertions and return-to schema. Next- and DB-bound bindings live in `app/src/server` (page guards, adapters, CLI) and `db` (single-use token records).
- **Client.** The presentation-free half of the backend kit moves to shared folders. A Tailwind skin sits beside the existing shadcn skin.

**Alternatives rejected:**

- **A plugin or module runtime per concept.** `AGENTS.md` and the engineering standards rule it out ("directory convention, not a module runtime").
- **Next Server Actions for mutations.** They would bypass `apiHandler`'s envelope, CSRF check and error mapping, and fork the client contract into two styles. Reads still happen in Server Components (F5).
- **One generic "resource" abstraction over `makeCrudRoute` for every concept.** The stories are workflows (sign in, accept, book, pay, send within a window), not CRUD. Forcing them into CRUD would be exactly the flattening the backlog warns against. `makeCrudRoute` stays for genuinely plain resources.
- **A full UI kit for the public area.** Only the pieces E01's public pages use are built (F3). E03 and E04 add theirs when they arrive.

## 📝 Research (shared by both specs)

One pass, checked 2026-10-17. Sources: the Next 16 docs in `node_modules/next/dist/docs/` (authentication, proxy, `cookies`), the installed `server-only` package, and the market research recorded below.

| Leader / source | What they get right that we adopt | Complexity we skip |
|---|---|---|
| **Lucia** (deprecated March 2025; now the reference file `auth_session.ts`) and **The Copenhagen Book** | Store only SHA-256 of a ≥256-bit token. New session token on sign-in and privilege gain. OAuth `state` plus PKCE in an HttpOnly Lax cookie. Provider identity uses its stable user id. Email confirmation tokens are single-use, ≤24 h, bound to user **and** email; sends are rate-limited. `Referrer-Policy` on token pages. | Their under-15-days renewal optimization is **not** adopted: accounts.AD2 requires expiry 30 days after every authenticated visit. `id.secret` split tokens are unnecessary at this scale. |
| **Better Auth 1.7** | Implicit linking only for verified provider emails. Linking never overwrites the profile (accounts AD3: the display name is not overwritten). | Plugins, adapters, secondary storage, the cookie cache, "fresh session" gating, multi-provider. Its default rate limiter is also in-memory, the same trade-off as P11. |
| **[Auth.js account linking](https://authjs.dev/reference/core/providers#allowdangerousemailaccountlinking)** | Its default disables automatic linking even for a matching email. accounts.AD3 deliberately differs: it trusts GitHub's verified primary email and links automatically. | Its opt-in `allowDangerousEmailAccountLinking: true` is the closer comparison to AD3. Credentials support leaves registration, verification and throttling to the application; this is a cost of AD1, not proof that custom auth is simpler. |
| **OWASP** Authentication, Session Management, Credential Stuffing and Password Storage cheat sheets | Generic sign-in and registration messages with equal timing (dummy hash). Session ids from a CSPRNG, regenerated on privilege change, invalidated on the server. Cookies `HttpOnly; Secure; SameSite=Lax; Path=/` with the `__Host-` prefix. bcrypt input capped at 72 bytes and rejected rather than truncated. Throttle rather than lock out. | MFA, account lockout, breached-password services. |
| **[NIST 800-63B rev 4](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver)** | Single-factor passwords are ≥15 Unicode code points, with no composition rules or truncation, **and** checked against a modest local common-password blocklist (accounts.AD6). Length does not replace the blocklist. | No external breached-password service. bcrypt's 72-byte ceiling can admit fewer than the recommended 64 characters for multibyte passwords; document that limit rather than claiming full NIST conformance. |
| **GitHub OAuth docs** | `user:email` scope; `GET /user/emails` (`primary`, `verified`, `per_page` ≤100). A cancel returns `?error=access_denied&state=…`. Codes expire after 10 minutes. PKCE (S256) is supported since 2025-07-14. | Storing the GitHub access token: it is discarded after reading the identity. |
| **arctic 3.7** | `generateState`, `generateCodeVerifier`, and the generic `OAuth2Client` with `createAuthorizationURLWithPKCE` and `validateAuthorizationCode(endpoint, code, verifier)`. The generic client also takes **configurable endpoints**, which lets integration tests point it at a local stub. Errors: `OAuth2RequestError`, `ArcticFetchError`, `UnexpectedResponseError`. ESM-only, which suits our ESM repo. | arctic's `GitHub` class, which has no PKCE and fixed endpoints. |
| **Stripe** webhooks and Account Links (for P13 and P14) | Dedupe by `event.id`. Verify the signature over the raw body. Webhooks bypass CSRF. `return_url` is not proof of completion, so re-read the account. `refresh_url` must mint a new link. | Event ordering logic: state is re-read from Stripe instead. |
| **Scanner prefetch** of email links (Supabase, Auth0 community reports; no Microsoft documentation found) | A GET that grants something must render a page whose button POSTs (accounts AD5). | Typed codes and fragment tokens. |
| **Conform / react-hook-form** | Errors keyed by input name, a separate form-level error, a native `<form>`, focus on the first invalid field. F2 keeps `CrudForm`'s existing mapping and adds first-invalid focus. | A form library dependency. The hook is about 80 lines and already proven by `CrudForm`. |
| **Next 16 docs** (`node_modules/next/dist/docs/`, cookies/proxy rechecked 2026-10-18) | Authorization lives in the data access layer. Pages update DB activity through P4; the narrow Proxy sets the renewed browser cookie because Server Components cannot. APIs set their own cookies through P3. Auth checks belong in pages, not only layouts. | No authorization or DB work in Proxy. `authInterrupts` (`forbidden()`/`unauthorized()`) is experimental and not used. |
| **`server-only` package** (installed, read) | `exports["react-server"] → ./empty.js`, so `tsx --conditions=react-server` lets the operator CLI import the real `container.ts` (P12). | — |

**Package versions checked 2026-10-17:**

- `arctic@3.7.0` (ESM)
- `bcryptjs@3.0.3` (bundled types, so no `@types/bcryptjs`)
- `nodemailer@10.1.2` (TypeScript rewrite with bundled types, so no `@types/nodemailer`; high release churn means the lockfile is pinned)
- `cookie@2.0.1`
- Mailpit `axllent/mailpit:v1.31.6`:
  - SMTP on 1025, HTTP on 8025, readiness check `/readyz`
  - `GET /api/v1/search?query=to:…` and `GET /api/v1/message/{ID}` for tests
  - no Testcontainers module exists, so tests use `GenericContainer`

**Considered, not adopted:** `Sec-Fetch-Site`/`Origin` checks on top of the CSRF header. The custom header already forces a CORS preflight. Changing CSRF behavior is a protected surface (2) with no current gap, so it is left alone.

## 📝 Architecture

```mermaid
flowchart LR
    classDef existing fill:#e5e7eb,color:#111,stroke:#9ca3af
    classDef e01 fill:#2f6feb,color:#fff,stroke:#1b4fb0
    classDef planned fill:#fff,color:#111,stroke:#9ca3af,stroke-dasharray: 4 3

    subgraph ui["@devmentor/ui"]
      api["F1 api/apiCall"]:::e01
      formcore["F2 forms/useSchemaForm"]:::e01
      fk["F3 frontend/* Tailwind kit"]:::e01
      bk["backend/* CrudForm, DataTable"]:::existing
    end
    subgraph core["@devmentor/core"]
      h["http/apiHandler + P3 access"]:::existing
      nav["P7 http/navigationHandler"]:::e01
      sec["P8 tokens, P11 rate limiter"]:::e01
      assertions["P5 access assertions"]:::planned
      cfg["P1 config, P2 clock"]:::e01
      ev["P16 events, P15 time windows, P17 money"]:::planned
    end
    subgraph db["@devmentor/db"]
      sut["P9 single-use token records"]:::e01
      inbox["P14 webhook inbox"]:::planned
    end
    subgraph app["@devmentor/app"]
      guards["P4 page guards (DAL)"]:::e01
      cli["P12 operator CLI"]:::e01
      ports["P10 EmailSender"]:::e01
      paymentports["P13 payment ports"]:::planned
      cookieproxy["P4 page-cookie renewal Proxy"]:::e01
    end
    fk --> formcore
    bk --> formcore
    formcore --> api
    api -->|"HTTP /api/*"| h
    guards --> h
    nav --> h
    h --> sec
    ports --> cfg
    sut --> sec
```

Takeaway: everything new hangs off the two existing seams, `apiHandler` and the form and API client. Solid blue boxes are built in E01. Dashed boxes are provisional candidates for E02–E05. F2/F3 are built in E01 Phase 2; the page-cookie Proxy does no authorization.

**Isomorphism rule (new, written into `AGENTS.md`).** `@devmentor/core`'s `.` entry is server-side and may use `node:crypto`. `@devmentor/core/validators/*` must stay isomorphic, because client components import it. Anything a client needs (role names, the `returnTo` schema) goes in `validators/`.

## 📝 Primitive catalog — server

Each entry gives the home, the contract (TypeScript shape, abbreviated), what it reuses, and the **first builder**. P5, P13–P17 and F6 are **provisional E02–E05 candidates**, not binding contracts. Their first consuming feature spec decides whether the abstraction is needed and finalizes its shape after resolving that feature's requirements.

### P1. Config, a lazily validated env (E01-S01)

- **Home:**
  - generic reader: `core/src/config/env.ts`
  - app schema: `app/src/server/config.ts`
  - cradle key: `config` (SINGLETON)
- **Contract:**
  ```ts
  defineConfigSection(schema, source?): () => z.output<schema>
  // memoized; throws ConfigError naming missing keys, never values
  interface AppConfig {
    app: () => { url: URL; trustProxy: boolean };
    github: () => { clientId; clientSecret; oauthUrl; apiUrl };
    email: () => { smtpUrl; from };
  }
  ```
- **Why sections:** `next build` and a developer without GitHub credentials must still boot. Only the route that needs a section fails, with a 500 that names the missing key in the server log.
- Existing `DATABASE_URL`/`DB_*` parsing in `db/src/config.ts` is left as is (protected surface 5).

### P2. Clock (E01-S01)

- **Home:** `core/src/time/clock.ts`. Cradle key: `clock` (SINGLETON).
- **Contract:**
  ```ts
  interface Clock { now(): Date }
  systemClock
  fixedClock(date)  // for tests
  ```
- **Rule:** every time comparison in a service reads `clock.now()`. It never calls `new Date()` directly. `baseProperties` timestamps stay as they are.

### P3. Request identity context on `apiHandler` (E01-S01)

- **Home:**
  - `core/src/http/auth.ts`: `Principal`, `Access`, `PrincipalResolver`
  - `core/src/http/cookies.ts`: `ResponseCookies`, `readCookie`
  - `core/src/validators/auth/role.schema.ts`: `roleSchema`, `Role`
- **Contract:**
  ```ts
  type Role = "mentee" | "mentor" | "operator";
  interface Principal { userId: string; sessionId: string; displayName: string; roles: readonly Role[] }
  type Access = "public" | "optional" | "user" | { role: Role };
  interface PrincipalResolver { resolve(req: Request, cookies: ResponseCookies): Promise<Principal | null> }
  // Cradle gains `principalResolver`; app registers it (accounts spec)

  apiHandler<TParams, A extends Access>(
    handler: (args: { req; params; cradle; principal: PrincipalFor<A>; cookies: ResponseCookies }) => Promise<unknown>,
    options: { access: A; status?: number; logRoute?: string },
  )
  // PrincipalFor<"public"> = null; <"optional"> = Principal | null; otherwise Principal
  ```
- **Order inside the wrapper:**
  1. create a scope
  2. resolve a presented session cookie and record activity, even on `public` routes; no cookie means no session lookup
  3. check the CSRF header; session activity is the only write before this check
  4. `user` with no principal → `UnauthorizedError`
  5. missing role → `ForbiddenError`
  6. run the handler
  7. write `cookies` to success **and error** responses (`Set-Cookie`); a new session, rotation or deletion overrides renewal of the old cookie

  A `public` handler still receives `principal: null`; resolving a cookie here only records authenticated activity. All authenticated API requests count, including denied/invalid requests and public auth endpoints. An unexpected error is logged with the caller's literal `logRoute` template (e.g. `/invite/[token]`), never the raw pathname, query string or `returnTo`; omitted templates use a constant `api`/`navigation` label, never a request-derived fallback. `makeCrudRoute` forwards the optional template. Use a safe error summary; provider URLs, headers, message bodies and error causes containing credentials are not logged.
- **Why the resolver receives `cookies`:** every valid session lookup extends DB expiry to `clock.now() + 30 days` and renews the cookie. An expired or revoked session is never revived. Roles are loaded from the DB on each authorization check, not cached across requests.
- **Authorization concurrency:** resolution locks the user then its session in one transaction, matching operator role changes' lock order, and reads session validity plus current roles under that lock. Return a principal only if the still-unexpired session's conditional touch succeeds. Never combine a pre-grant session lookup with post-grant roles from a later unlocked lookup; deleting sessions on grant/revoke must also defeat an in-flight resolver that has not yet authorized. Requests authorized before the role change are not retroactively undone.
- **Framework-agnostic:** it reads `Cookie` from the Web `Request` and writes `Set-Cookie` itself. Nothing depends on Next's `cookies()` merging.
- `makeCrudRoute` config gains a required `access` passed through to every method. `/api/users` becomes `access: { role: "operator" }` (accounts.AD4).
- `ResponseCookies` serializes with the `cookie` package (`cookie@2`, added to `core`) rather than hand-rolled code.

### P4. Page guards, the data access layer (E01-S01)

- **Home:** `app/src/server/auth/page-guards.ts` (server-only).
- **Contract:**
  ```ts
  getPrincipal(): Promise<Principal | null>  // React cache() per render; reads next/headers cookies()
  requirePrincipal({ returnTo }): Promise<Principal>  // redirect("/sign-in?returnTo=…")
  requireRole(role, { returnTo }): Promise<Principal>  // signed out → sign-in; wrong role → notFound()
  ```
- **Activity on pages:** `getPrincipal()` validates and touches the DB session once per render through React `cache()`. Every leaf page calls it (or a guard that calls it), including **public leaves**, so any signed-in page request extends expiry to 30 days from that request. A public layout/header call alone is insufficient because layouts do not rerun on every navigation. Page activity is request-time work and cannot be served from a shared/static identity cache. Static assets do not count. Updates are conditional on the row still existing and unexpired; concurrent touches cannot shorten expiry or recreate a deleted session.
- **Browser cookie renewal:** `app/src/proxy.ts` resends a well-formed existing session cookie with `Max-Age=30 days` on page requests, including RSC navigations. It excludes `/api/*`, Next assets and other static resources, imports only cookie/config helpers, and performs no DB lookup or authorization. Extending an invalid cookie grants nothing: P4 always checks the DB. APIs/navigation routes renew their own response cookies through P3/P7. No cookie write occurs during Server Component render. This narrows the original PD4 prohibition to authorization work, rather than forbidding cookie renewal.
- **Wrong role → `notFound()`, not 403:** `forbidden()` requires the experimental `authInterrupts` flag. A 404 also conceals the admin area.
- **Used by:**
  - the `(app)` layout (`requirePrincipal`)
  - `/backend/layout.tsx` (`requireRole("operator")`)
  - the leaf pages that render private data, which repeat the check, per the Next docs' warning that layouts don't re-run on navigation
  - every public leaf via `getPrincipal()` for optional identity/activity, even if its header already called it; test public-to-public RSC navigation as well as full document visits

### P5. Access assertions (provisional, first builder E02-S01)

- **Home:** `core/src/http/auth.ts`.
- **Contract:**
  ```ts
  assertSelf(principal, ownerUserId)  // ForbiddenError
  assertParticipant(principal, participantUserIds, { conceal: true })  // NotFoundError when conceal
  ```
- **Rule:** services receive the `Principal` (or its `userId`) as an argument and run the assertion themselves. Routes never pass raw ids taken from the body as "the owner".
- **E01 needs none:** its "me" endpoints act on `principal.userId` by construction.

### P6. `returnTo` (E01-S01)

- **Home:** `core/src/validators/auth/return-to.schema.ts` (isomorphic).
- **Contract:**
  ```ts
  returnToSchema  // same-origin relative path only: starts with "/" but not "//" or "/\";
                  // no scheme; ≤ 512 chars. Anything else becomes "/".
  ```
- **Carried through:**
  - the sign-in and sign-up pages' query string
  - the OAuth state cookie (E01-S01)
  - the email-confirmation link's query string (E01-S02; never stored, per P8)
  - later, the slot URL (E04-S01)
- **Rule:** a returned-to page must re-check everything. Returning never implies a reservation (brief Key flows, "does not reserve it").

### P7. Navigation handler (E01-S01)

- **Home:** `core/src/http/navigationHandler.ts`, bound in `app/src/server/http.ts` next to `apiHandler`.
- **Contract:**
  ```ts
  navigationHandler(
    handler: (args: { req; params; cradle; principal; cookies; url: URL }) => Promise<{ redirectTo: string } | { externalUrl: URL }>,
    options: { access: Access; logRoute?: string; onError?: (error: AppError) => string; externalOrigins?: (cradle) => string[] },
  )  // GET only
  ```
- **Behavior:**
  - **Internal success:** `303` to `redirectTo`. The target is resolved against `config.app().url` and never against the `Host` header. It must pass `returnToSchema`.
  - **External success:** `303` to `externalUrl`, only when its origin is in `externalOrigins` (e.g. `config.github().oauthUrl`, later the Stripe Connect origin). Any other origin is a bug: it is logged and redirected to `/error`.
  - **`AppError`:** redirect to `onError(error)`. The default is `/error?code=<code>`.
  - **Anything else:** logged with a static route template and safe error summary, never raw URL/path/query values, then redirect to `/error?code=internal_error`.
- **Session activity:** uses P3's presented-cookie resolution and renewal policy even when `access` is public; applies response cookies on both successful and failed navigation outcomes.
- **No CSRF header:** a browser navigation can't carry one. The handler is therefore GET-only. State changes it makes must be protected by their own proof:
  - OAuth `state` plus PKCE
  - an unguessable single-use token
  - a provider signature
- **Shared error page:** `(frontend)/error/page.tsx` maps known codes to plain messages.

### P8. Tokens (E01-S01)

- **Home:** `core/src/security/tokens.ts`.
- **Contract:**
  ```ts
  generateToken(): string  // 32 random bytes from node:crypto, base64url
  hashToken(token): string  // SHA-256 hex
  ```
- **Rule:** only hashes are stored, and no column stores a URL or path that embeds a raw token. A `returnTo` that contains one travels in the link instead. Raw invitation tokens exist transiently in memory and in the delivered email/browser link; **CLI stdout, stderr and logs never contain tokens or token-bearing URLs**. There is no raw-token persistence or background send queue.
- **Logging boundary:** handlers, page errors, Proxy and CLI use static route templates or command names and sanitized error summaries. Redact secret keys, cookies and nested `returnTo`; do not log raw request URLs or provider error messages that can embed them. Configure hosting/reverse-proxy access logs to omit or redact invitation path segments and confirmation queries. Token pages send `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store` and `noindex`; metadata alone is not the log protection. Capture tests and diagnostics without copying token-bearing URLs into artifacts.

### P9. Single-use token records (E01-S02; reused by E01-S03)

- **Home:**
  - `db/src/entities/single-use-token.ts`: the `singleUseTokenProperties` spread
  - `db/src/single-use-token.ts`: the helpers, exported from `@devmentor/db`
- **Contract:**
  ```ts
  singleUseTokenProperties = { tokenHash: unique string, expiresAt: datetime, consumedAt: datetime | null }
  inspectSingleUseToken(em, Entity, rawToken, now): Promise<TokenLookup<T>>
  consumeSingleUseToken(em, Entity, rawToken, now): Promise<TokenLookup<T>>
  type TokenLookup<T> = { status: "valid" | "consumed"; record: T } | { status: "invalid" } | { status: "expired" | "used"; record: T }
  ```
- **Atomicity:** `consume` performs a conditional `nativeUpdate` (`consumed_at IS NULL AND expires_at > now`). Of two concurrent consumers, exactly one sees `consumed`; the other sees `used`. The caller runs it inside `em.transactional` together with the effect it unlocks (a role grant, an email confirmation). Pages that only display a link's state use `inspect`, so a GET never consumes.
- **Concept invariants:** the helper alone does not protect credential replacement, invitation revocation or email ownership. Callers lock the affected user and token/invitation rows in a documented order, recheck state, and perform consume plus effect in one transaction. Invitation resend/revoke/accept serialize on the same invitation; the bound verified email must match before any grant. Real PostgreSQL race tests cover these guarantees.
- The stories need a reason ("says why", E01-S02), so the helper distinguishes invalid, expired and used.

### P10. `EmailSender` port (E01-S02; reused by E04-S03)

- **Home:**
  - `app/src/server/services/notifications/email-sender.port.ts`
  - `adapters/smtp-email-sender.ts` (`nodemailer`)
  - `adapters/memory-email-sender.ts` (unit tests)
  - `templates/<name>.ts`
- **Cradle key:** `emailSender` (SINGLETON). SMTP config is validated lazily on `send`, so resolving a password sign-in service does not require SMTP to be configured.
- **Contract:**
  ```ts
  interface EmailSender { send(message: { to: string; subject: string; text: string; html?: string }): Promise<void> }  // throws on failure
  // templates are pure functions: (data) => { subject, text, html }
  // every link inside is absolute, built from config.app().url
  ```
- **Failure policy is the caller's:** E01-S02 keeps the account and offers resend. E01-S03 keeps the invitation hash and reports delivery failure; CLI `invite resend` rotates the token before retrying. E04-S03 keeps the booking. Invitation emails go only to their bound address, never to CLI output.
- **Local dev and integration:** a `mailpit` service in `docker-compose.yml` (SMTP 1025, UI 8025). Integration tests run Mailpit through Testcontainers and read messages over its HTTP API.

### P11. Rate limiter (E01-S02)

- **Home:**
  - `core/src/security/rate-limiter.ts`: the port and a memory implementation
  - `core/src/http/client-ip.ts`
- **Cradle key:** `rateLimiter` (SINGLETON, depends on `clock`).
- **Contract:**
  ```ts
  interface RateLimiter { hit(key: string, rule: { limit: number; windowMs: number }): Promise<{ allowed: boolean; retryAfterMs: number }> }
  clientIp(req, { trustProxy }): string | null  // one validated address from the configured, overwriting edge; else null
  TooManyRequestsError  // new AppError: code "rate_limited", 429; apiHandler adds Retry-After
  ```
- **Unknown IP:** callers **skip** per-IP rules when `clientIp` is `null`. They never pool every visitor into one bucket, which would let one attacker lock everyone out. Per-account rules always apply. `TRUST_PROXY` defaults to `false` and is added in accounts Phase 2.
- **Trust boundary:** `TRUST_PROXY=true` is supported only when the selected edge replaces inbound `X-Forwarded-For` with a single validated client address and direct origin access is blocked. Reject multi-value/malformed headers as unknown; never trust an attacker-supplied first hop. Deployment must document and test this edge contract; other topologies require an explicit adapter. Expired memory buckets are pruned so arbitrary email keys do not grow memory indefinitely.
- **Adapter:** in-memory, per process. This is the engineering standards' "simple counter, note it needs a stronger backend". A Postgres adapter can replace it behind the port without touching callers, and is required before more than one app instance runs (see Risks).

### P12. Operator CLI (E01-S01 for operator role grant/revoke; E01-S03-T01 adds invitation create/revoke/resend)

- **Home:**
  - `app/src/server/cli/run-cli.ts`: argv parsing (`node:util` `parseArgs`), scope creation, output and exit codes, `container.dispose()`
  - `app/src/server/cli/commands/<name>.command.ts`
  - entry `app/src/server/cli/operator.ts`
- **Command:** `npm run operator -- <command> [flags]`. The root script delegates to `@devmentor/app`.
- **Mechanics (verified in research):**
  - It runs through `tsx --conditions=react-server`. `server-only` resolves to an empty module under that condition (`exports["react-server"]: "./empty.js"`), so the real composition root (`container.ts`) is reused.
  - Env loads through `@next/env` from `packages/app`, the same files as the db CLI.
- **Contract:**
  ```ts
  interface OperatorCommand<F> { name: string; summary: string; options: ParseArgsOptionsConfig; run(cradle: Cradle, flags: F, out: Output): Promise<void> }
  ```
- **Output rules:**
  - Commands print safe status only: invitation id, bound email, expiry and delivery result, or role-change status. Tokens, invitation links, SMTP credentials and mail bodies never appear in stdout/stderr or logs, including on failure. `--note` and variable-expiry flags are not supported.
  - Errors exit 1 with an `AppError` message.
  - Unknown errors exit 1 with "unexpected error", and the details go to `logger`.

### P13. Payment and onboarding ports (provisional, first builders E02-S02 and E04-S02)

- **Home:** `app/src/server/services/payments/`.
- **Ports:**
  - `PayoutOnboarding` (`createOnboardingLink(mentor, returnUrl, refreshUrl)`, `getStatus(accountId)`)
  - `PaymentGateway` (`createCheckout(booking draft) → redirect URL`, `verifyWebhook(rawBody, signature) → event`)
- **Adapters:** mock adapters under `adapters/`, then a Stripe adapter. The return URLs land on P7 navigation routes. The authoritative status comes from P14, never from the return URL's query string.
- E02-S02-T01 (#47, Stripe requirements) feeds the port's shape. This spec does not fix it.

### P14. Webhook inbox (provisional, first builder E02-S02)

- **Home:**
  - entity `db/src/entities/integrations/processed-webhook-event.entity.ts` (`provider`, `eventId` unique, `processedAt`)
  - wrapper `webhookHandler` in `app/src/server/webhooks/`, **not `core`**, because it needs `em`, and `core` is MikroORM-free (`db → core`). It reads the raw body, skips the CSRF check (Stripe can't send the header) and checks the provider signature through the port.
- **Behavior:** the wrapper inserts the event id and applies the effect in one `em.transactional`. A duplicate id returns 200 with no effect. This is how "the callback is idempotent" (E02-S02) and "no second booking" (E04-S02) are met in one place.

### P15. Time windows (provisional, first builders E04-S01 and E05-S02)

- **Home:** `core/src/time/windows.ts` (pure).
- **Contract:**
  ```ts
  isBookable(slotStart, now, minLeadMs)  // D16: two hours from the moment of selection
  sessionWindow(start, durationMinutes, now): "upcoming" | "open" | "ended"  // D10
  ```
- These are pure functions over P2. The server always decides; the client only displays.

### P16. Domain events (provisional, first builder E04-S03)

- **Home:** `core/src/events/`. Cradle key: `events` (SINGLETON).
- **Contract:**
  ```ts
  createEventBus<EventMap>()  // emit(id, payload)
  ```
  Listeners are registered explicitly in `container.ts`.
- **Behavior:** the bus in `core` is a plain typed emitter with no ORM hooks. A service emits only **after** its `em.transactional(...)` call has resolved, which is an explicit ordering rule checked in review and tests. A listener's error is logged and never propagates. That is the E04-S03 rule "email failure leaves the booking confirmed". Ids follow `concept.entity.action` (e.g. `bookings.booking.confirmed`).
- **Why not in E01:** E01 has no cross-concept side effect. Confirmation and invitation emails are part of their own auth workflows, so direct port calls after commit are smaller.

### P17. Money (provisional, first builder E02-S01)

- **Home:** `core/src/validators/money/money.schema.ts`.
- **Contract:** integer minor units plus an ISO currency code. The price is always recomputed on the server from the mentor's per-format price (engineering standards, "money correctness").
- **Open for E02:** the currency is not decided in the brief. E02-S01's spec must ask.

## 📝 Primitive catalog — frontend

### F1. Shared API client (E01-S01)

- **Move:** `ui/src/backend/api/{apiCall,types}.ts` moves to `ui/src/api/` with a new export path `./api/*`. Every importer is updated in the same PR. The `./backend/api/*` export is removed, with a 💥 note (protected surface 3).
- **Behavior:** unchanged. It is still the only sanctioned `fetch('/api/*')`.

### F2. Form core (E01-S02, Phase 2)

- **Home:**
  - `ui/src/forms/useSchemaForm.ts`
  - `ui/src/forms/field-errors.ts` (`toFieldErrors`, moved out of `CrudForm`)
- **Contract:**
  ```ts
  useSchemaForm({ schema, fields, initialValues, onSubmit, onSuccess, onCancel, resetOnSuccess = true })
    → { values, setValue, fieldErrors, formError, isSubmitting, handleSubmit, handleKeyDown }
  ```
- **Behavior:**
  - Every field starts as `""`, which keeps the lesson of 2026-10-14.
  - Server `fieldErrors` land on their fields. A non-field failure becomes `formError`.
  - Cmd/Ctrl+Enter submits; Escape cancels.
  - `onSuccess` receives the response `data`, so a sign-in form can navigate to `data.redirectTo`.
- **Phase 1 account support:** add only the optional `resetOnSuccess` prop to the existing `CrudForm` (default `true`, today's behavior), so `/account` can keep the saved value. No hook extraction or public-form kit ships in Phase 1.
- **Phase 2 `CrudForm` refactor:** extract the existing state/mapping into this hook when public email forms become its second skin. Preserve all existing props and tests; add first-invalid-field focus and cover cancellation, rejected submissions and form-level errors.

### F3. Public Tailwind kit (public forms first built in E01-S02, Phase 2)

- **Home:** `ui/src/frontend/`
  - `forms/SchemaForm.tsx`
  - `forms/TextField.tsx`
  - `forms/SubmitButton.tsx`
  - `feedback/Notice.tsx` (`info | success | error`, `role="status"`/`"alert"`)
  - `actions/LinkButton.tsx`
- **Exports:** `./frontend/*`. Plain Tailwind utilities only.
- **ESLint enforces:**
  - Public pages and `ui/src/frontend/**` cannot import shadcn primitives, backend panel components, or Base UI directly. Enforce both package aliases and relative imports; transitive wrappers cannot hide a forbidden dependency.
  - Concept-specific Tailwind-only components keep the canonical home `ui/src/components/<concept>/` and may be imported by public pages. They must not import shadcn/backend/Base UI code transitively. Do not ban the entire `components/*` namespace: it also contains these domain components.
  - `tests/eslint-config.test.ts` gains the matching cases.
- **Built only on demand:** Phase 1 uses native links and colocated Tailwind sign-in banners, with no shared public-form infrastructure. Phase 2 introduces the form pieces and `PasswordField`; extract `Notice`/`LinkButton` only when their second consumer exists. Listing cards/filters arrive with E03-S01. Phase 1's docs establish these placement rules; enforcement expands with the Phase 2 kit.

### F4. Area layouts (E01-S01)

| Area | Route group / path | Guard | Styling | E01 pages |
|---|---|---|---|---|
| Public | `app/src/app/(frontend)/` | no access gate; each leaf calls `getPrincipal()` for activity, header also reads it for display | plain Tailwind; F3 forms from Phase 2 | `/`, `/sign-in`, `/sign-up`, `/sign-up/check-email`, `/confirm-email`, `/invite/[token]`, `/error` |
| Signed-in | `app/src/app/(app)/` (new) | `requirePrincipal` in layout **and** in each page | shadcn + `ui/src/backend/*` panel primitives | `/account` |
| Admin | `app/src/app/backend/` | `requireRole("operator")` | shadcn (unchanged) | `/backend`, `/backend/users` |

A public header that reads the session makes public pages render per request. That is acceptable: E03's pages query the database anyway, and `AGENTS.md` already requires `connection()` for those.

### F5. Read on the server, write through `/api` (convention, E01-S01)

- **Reads:** pages and layouts call services in Server Components through `createRequestScope().cradle` and render DTOs, as `/backend/page.tsx` already does.
- **Writes:** client components call `/api/*` with `apiCall`.
- **Result:** one write contract (`apiHandler`), no client data-fetching library, and no duplicated authorization. Page guards (P4) and `apiHandler` (P3) resolve the same principal through the same service.

### F6. Lists (provisional, first builder E05-S01)

- **Signed-in lists:** they reuse `DataTable` and the feedback states.
- **Upcoming/past split:** computed on the server with P15.
- **Public lists:** E03-S01's listing gets a Tailwind card grid and an `EmptyState` twin in F3 when that story is built.

## 📝 API Contracts (framework surface changes)

| Surface | Change | Compatibility |
|---|---|---|
| `apiHandler(handler, options)` | `options.access` becomes **required**. Handler args gain `principal` and `cookies`. Session activity applies on every authenticated request; logs use safe route templates. | Breaking for in-repo callers (1 route). Updated in the same PR (accounts Phase 1). |
| `makeCrudRoute(config)` | `config.access` becomes required. | Same as above. |
| Error codes | Adds `rate_limited` (429, sets `Retry-After`). The accounts spec adds `invalid_credentials` (401) and `email_not_confirmed` (403) as `AppError` subclasses. | Additive. The envelope shape is unchanged. |
| `navigationHandler` | New, with internal `redirectTo` or allowlisted `externalUrl`. | Additive. |
| `@devmentor/ui` exports | Phase 1 adds `./api/*`, removes `./backend/api/*`, and adds optional `CrudForm.resetOnSuccess`. Phase 2 adds `./forms/*` and the public `./frontend/*` kit. | The Phase 1 path move is breaking; all importers, contract docs and 💥 notes change in that PR. Other changes are additive. |
| `@devmentor/core` exports | Adds `config`, `time`, `security` and `auth` modules to `.`. Adds `validators/auth/role.schema`, `validators/auth/return-to.schema`. | Additive. |
| Cradle | Adds `config`, `clock`, `principalResolver`, `emailSender`, `rateLimiter`. | Additive. |

## 📝 Edge Cases & Failure Scenarios

| Scenario | Behavior |
|---|---|
| A required env section is missing (e.g. no `SMTP_URL` in dev) | Only routes that touch that section fail: 500 `internal_error`, with the missing key names in the server log. Build and other pages are unaffected. |
| A malicious `returnTo` (`//evil.com`, `https://…`, `/\evil`) | Normalized to `/`. Covered by unit tests over a table of payloads. |
| A route forgets its access rule | Type error at build time (PD3). |
| The principal resolver throws (DB down) | 500 `internal_error`, logged. Never treated as signed out-and-allowed (fail closed). |
| Two consumers race on one single-use token | Exactly one gets `consumed`. The other gets `used` (P9 conditional update). |
| A reader visits pages without making mutations | P4 extends DB expiry on every authenticated page request; Proxy renews the browser cookie. The session remains valid for 30 days after the last visit. |
| An invitation URL or nested `returnTo` reaches an error path | Static route templates and sanitized errors are logged. Raw tokens never reach app, CLI, access logs or diagnostic artifacts. |
| SMTP is down | `EmailSender.send` throws. The caller's documented policy applies: E01-S02 shows "We couldn't send the email — try Resend". |
| Several app instances behind a load balancer | The memory rate limiter undercounts. This is a known limitation, a launch checklist item and in Risks. |
| The CLI runs against the wrong database | It prints the database host (not credentials) before executing, and needs `--yes` when `NODE_ENV=production`. |

## 📝 Risks & Impact Review

- **Protected surfaces touched:** 1 (apiHandler options), 3 (ui and core exports), 5 (new env vars: `APP_URL`, `GITHUB_*`, `SMTP_URL`, `MAIL_FROM`, `TRUST_PROXY`), 6 (new `npm run operator`). Each is changed together with all its consumers, `.env.example`, `README.md` and CI, per `BACKWARD_COMPATIBILITY.md`.
- **The PD2 rule change is a direction call.** It was made by the product owner, and it reverses part of a standing `AGENTS.md` rule. Rollback is cheap while the signed-in area has one page (`/account`) and grows with each E02 and E05 page.
- **In-memory rate limiting is a deployment constraint.** No deployment target is recorded anywhere in the repo, so this spec cannot rule multi-instance hosting in or out. If hosting is serverless or multi-instance, the Postgres adapter must ship before launch. ⚠ This needs a hosting decision before release, not before planning.
- **Release email condition (PD1).** The PO selects an SMTP-capable provider, configures the production sender and verifies delivery to a real inbox before launch. No production invitation/confirmation test writes its token to evidence or logs.
- **Build budget (brief.A02).** Deferring abstractions does not establish that all Now fits 25 hours. Phase 1 is one focused PR; public forms wait for Phase 2; E02–E05 candidates stay provisional. The task-hour estimate is supplied in the review reply, not stored in these specs. Feasibility remains unproven until scope and schedule are reconciled by the tech lead.
- **Rollback.** Deploy compatible previous code while keeping additive schema. Destructive migration `down()` procedures are documented separately with data-loss effects and backup/restore requirements; they are not the normal production rollback.

## 📝 Decisions in play

- **Brief:**
  - D12 (no operator screens: the CLI, not the admin UI, is the operator's tool)
  - D13 (sign-in methods)
  - D14 (invitation by the operator)
  - D10 (refresh, not realtime: no realtime primitive)
  - D15 and E04-S03 (email: P10, P16)
  - D16 and D10 (time rules: P2, P15)
  - D05 (onboarding gate: P13, P14)
- **PO supersessions, 2026-10-18:** PD4's blanket no-Proxy decision, the optional Phase 1A/1B split, and the create-only bearer invitation interpretation of issue #46 are superseded by the session activity, single-PR and email-bound invitation decisions in the companion spec. D12–D16 and N03 remain active. The product brief is not edited; the PO owns follow-up recording in #49.

## 📋 Phasing

This spec has no phases of its own. By the product owner's instruction, each accounts phase builds the primitives it first needs. Planned primitives are built by their first story.

| Primitive | Built in |
|---|---|
| P1 config, P2 clock, P3 identity context, P4 page guards + cookie-renewal Proxy, P6 `returnTo`, P7 navigation handler, P8 tokens, P12 operator role grant/revoke, F1, F4, F5, minimal `CrudForm.resetOnSuccess` | Accounts **Phase 1** (#34), one PR |
| P9 single-use token records, P10 `EmailSender` + Mailpit, P11 rate limiter, F2 extraction, F3 public forms | Accounts **Phase 2** (#35) |
| P12 invitation create/revoke/resend commands and template (reuse P9/P10) | Accounts **Phase 3** (#36 + #46) |
| P5 access assertions, P17 money | E02-S01 (#37) |
| P13 onboarding port, P14 webhook inbox | E02-S02 (#38) |
| P15 time windows | E04-S01 (#41) |
| P13 payment port (checkout) | E04-S02 (#42) |
| P16 domain events | E04-S03 (#43) |
| F6 lists | E05-S01 (#44) |

## 📋 Implementation Plan

The executable steps for every E01-built primitive are in the accounts spec's Implementation Plan. Each step names the primitive ids it delivers. The provisional E02–E05 candidates get executable steps and final contracts only in their first consuming feature's spec; citing this catalog does not make the provisional design mandatory.

**Completion status:** E01 completion does not complete this whole catalog. Keep this file in `.ai/specs/` after accounts Phase 3; record E01 entries as implemented only after their validation passes. Move it to `implemented/` only when all remaining candidates have been implemented, explicitly deferred, or transferred to their consuming specs with links and status. Never mark E02–E05 runtime work complete merely because its design is written here.

The documentation updates this spec requires land in accounts Phase 1, Step 1.11:

- **`AGENTS.md`:**
  - the PD2 three-area rule
  - the PD3 required access rule
  - the PD4 split between page-cookie renewal and DB authorization/activity
  - the isomorphism rule
  - the catalog homes
  - `npm run operator`
  - removing "`auth.ts` is added together with the auth concept"
- **`BACKWARD_COMPATIBILITY.md`:** the new protected surfaces (new export paths, new env vars, the `operator` command, the session cookie name).

Phase 2 documents F2/F3 homes, exports and enforcement when built. Phase 3 documents email-bound invitations, create/revoke/resend and secret-free CLI output, including the supersession of issue #46's earlier create-only decision. Every phase's single PR includes its contract documentation, run log and full validation gate; no documentation is deferred to a later PR.
