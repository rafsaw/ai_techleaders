# Lessons Learned

Append-only long-term memory for LLMs working in this repo. Record a lesson
right after fixing a non-obvious bug, discovering a gotcha, or finding a
better way to do something that isn't already documented in code or specs.

## How to add a lesson

1. Add a dated entry below using the template.
2. If the lesson is long, substantial, or deserves its own write-up, create
   `.ai/lessons/YYYY-MM-DD-slug.md` instead and link it from here.
3. Keep entries short and actionable. Prefer "do X because Y" over narration.
4. Never delete a lesson because it's old — if it's superseded, say so inline
   (`Superseded by entry on YYYY-MM-DD`) rather than removing it.

## Entry template

```
### YYYY-MM-DD — short-title

**Context:** what task/bug led to this.
**Lesson:** the actual learning, stated as a rule.
**Applies to:** files/areas/patterns this affects.
```

---

<!-- New entries go below this line, most recent first. -->

### 2026-10-28 — An in-flight guard is not a double-submit guard when success navigates

**Context:** Phase 2 manual test: a double click on Create account sent two confirmation emails. The ref guard blocked a second submit only while the request ran; it released on the answer, and the page (values kept) stayed up while `router.push` loaded, so the second click sent a valid re-registration.
**Lesson:** A form that leaves the page on success must stay locked from success until it unmounts, with an escape hatch (back/forward-cache `pageshow`, a timeout) so a failed navigation does not strand it. Test it with a fast answer and a click after it, not only two clicks in one turn. In integration, a `MutationObserver` that clicks as soon as the button is re-enabled hits the window deterministically.
**Applies to:** `ui/src/forms/useSchemaForm.ts` (`lockAfterSuccess`), `SchemaForm`, any future form whose `onSuccess` navigates.

### 2026-10-28 — Token pages need headers *and* meta tags; `Cache-Control` in next.config sticks for dynamic pages

**Context:** E01 Phase 2 review fix R7. `/confirm-email` had the referrer meta tag and header but no `noindex` and no `Cache-Control: private, no-store`, although the spec required all three.
**Lesson:** for a page whose URL carries a token, spread `TOKEN_PAGE_METADATA` into its metadata and add its route to `headers()` in `next.config.ts` with `TOKEN_PAGE_HEADERS` (`packages/app/src/app/token-page.ts`); test with `unstable_getResponseFromNextConfig`. A `Cache-Control` set in `headers()` is kept on dynamic App Router pages in production (Next only adds its own when the response has none), but `next dev` overwrites it with `no-store`, so assert it against the production build.
**Applies to:** `/confirm-email`, Phase 3 `/invite/[token]`, any future page with a secret in its address.

### 2026-10-28 — Canonicalize an IP before using it as a key

**Context:** E01 Phase 2 review fix R8. `clientIp` only lowercased IPv6, so `2001:db8::1`, `2001:0db8:0:0::1` and the IPv4-mapped `::ffff:192.0.2.1` / `::ffff:c000:201` / `192.0.2.1` each got their own rate-limit bucket, multiplying the per-IP allowance for anyone who controls the spelling.
**Lesson:** any value used as a limiter, dedupe or cache key needs one spelling per identity. For IPs: validate with `isIP`, then `new URL("http://[" + ip + "]").hostname` gives RFC 5952-compatible IPv6 (no dependency), and unmap `::ffff:0:0/96` to IPv4. Test equivalence classes, not just one example per form.
**Applies to:** `packages/core/src/http/client-ip.ts`, any future key built from addresses, emails or other user-spelled identifiers.

### 2026-10-28 — agent-browser `click` does not scroll; below the fold it hits `<html>`

**Context:** E01 step 2.6. Every submit in the new password-UI scenario did nothing: no request, no validation message, no error. The form was hydrated and filled; the submit button sat at y = 592 in a 577 px viewport, and a capture-phase listener showed the click landing on `<html>`. `agent-browser click @ref` clicks at the element's coordinates without scrolling it into view (unlike Playwright's `click`). Earlier scenarios passed only because their buttons were above the fold.
**Lesson:** scroll before clicking (`scrollintoview @ref`, now inside `IntegrationBrowser.click`). When a click "does nothing" in agent-browser, record `click` targets with `document.addEventListener("click", …, true)` via `eval` before suspecting hydration. Also: never `pkill -f <pattern>` to stop a debug server (lesson 2026-10-21); kill its PID from `ss -ltnp`.
**Applies to:** `packages/app/tests/integration/browser.ts`, any agent-browser interaction with tall pages.

### 2026-10-28 — A form's in-flight guard must be a ref, and its request must die with it

**Context:** E01 step 2.6, platform F2. `useSchemaForm` blocked double submits with `isSubmitting` state, which only takes effect after a re-render, so two submits in one turn (a double click, Enter plus click) both reached `onSubmit`. A form that unmounted mid-request (the confirm panel swapping to "link no longer valid", a navigation) still received the late result.
**Lesson:** guard with a `useRef` set synchronously before the first `await`, and keep state only for rendering. Give each request an `AbortController`, pass `signal` to `onSubmit` (and on to `apiCall`), abort it in the unmount cleanup and drop the result when `signal.aborted`. Test the same-turn case inside one `act(() => { submit(); submit(); })`. Keep a published component's callback signature (`CrudForm.onSubmit(values)`) by wrapping instead of forwarding the new argument, so existing `toHaveBeenCalledWith` tests still hold.
**Applies to:** `packages/ui/src/forms/useSchemaForm.ts`, any hand-written form or button that posts (e.g. `ResendConfirmation`).

### 2026-10-28 — Vitest reruns failed integration files first; scenarios must not leak rows

**Context:** E01 step 2.5. The new password API scenario created a user. It passed on the first run (it ran after `app.test.ts`), but after an unrelated failure Vitest ordered the previously failed file differently and `app.test.ts`, which asserts exact "N registered users" counts, failed.
**Lesson:** Vitest's sequencer reorders test files between runs (failed and slow files first), even with `fileParallelism: false`, so integration files share one database in no fixed order. A scenario that writes rows other files count must delete them in `afterAll` (here `delete from users where email = …`, which cascades roles, sessions and links, plus `rate_limit_buckets`). Also remember the limiter in API scenarios: sign-in and confirm share rule 2 (5 per address per 15 min), so a long scenario against one address hits 429 by design.
**Applies to:** `packages/app/tests/integration/*.test.ts`, especially scenarios that create accounts.

### 2026-10-28 — Pointing `@devmentor/db` at a scratch database in tests

**Context:** E01 step 2.4, real-PostgreSQL tests of the rate limiter and P9 consume. The limiter's cleanup deletes every expired bucket in the table, and migration `down()` drops tables, so neither may run in the app's integration database.
**Lesson:** give such tests their own database in the integration container (`useScratchDatabase` in `tests/integration/scratch-database.ts`). `packages/db/src/config.ts` reads `DATABASE_URL` when the module is first evaluated, so to get an ORM for that database `vi.stubEnv` it around a *dynamic* `import("@devmentor/db")` and call `registerDb` on a fresh container (`dbContainer`); a static import would bind the app's URL. Dispose the container to close the pool.
**Applies to:** `packages/app/tests/integration/`, any test needing a real ORM against a non-default database.

### 2026-10-28 — `em.execute` inlines `?` params and returns timestamptz as text

**Context:** E01 step 2.3 (P11 Postgres rate limiter, raw `DELETE` + `INSERT … ON CONFLICT … RETURNING`). Checked against a real PostgreSQL 17 before the migration existed.
**Lesson:** In MikroORM v7, `em.execute(sql, [..])` with a string query formats `?` placeholders into the SQL text via `platform.formatQuery` (escaped literals, not bound parameters); `??` is an identifier and `\?` a literal `?`. Pass dates as ISO strings with an explicit `?::timestamptz` so the type never depends on literal inference. Raw result rows bypass entity hydration: `timestamptz` comes back as Postgres text (`2026-10-28 12:01:00+00`), not a `Date`, and `bigint` as a string, so return what you need as numbers (e.g. `(extract(epoch from col) * 1000)::bigint`) and convert with `Number()`.
**Applies to:** `packages/db/src/rate-limiter.ts`, any raw SQL through `em.execute`.

### 2026-10-28 — nodemailer 10: own types, and the second argument is message defaults

**Context:** E01 step 2.2 (P10 SMTP adapter). `createTransport(smtpUrl, { connectionTimeout, … })` failed typecheck; the timeouts would otherwise have been silently ignored at runtime.
**Lesson:** In nodemailer, `createTransport(transport, defaults)`'s second argument is *message* defaults (`from`, headers), not transport options. Pass a URL plus options as one object: `createTransport({ url, connectionTimeout, … })`. nodemailer 10 bundles its own `.d.ts`; don't add `@types/nodemailer` (written for older releases). `sendMail` resolves even when some recipients are refused; check `info.rejected`.
**Applies to:** `packages/app/src/server/services/notifications/adapters/smtp-email-sender.ts`, any new mail transport.

### 2026-10-28 — Don't re-validate a server-built redirect with the user-input length limit

**Context:** Review R6 on E01 Phase 1. `returnTo` is accepted up to 512 characters, the callback appends `welcome=1` (or re-encodes it into `/sign-in?error=…&returnTo=…`), and `navigationHandler` re-checked the result with `parseReturnTo` (512), so a valid long destination silently became `/`.
**Lesson:** a length limit on user input does not hold after the server adds to the value. Re-check server-built targets with the same safety rules but a bound that covers what the server may add (`parseInternalRedirect`, 2048). Test limits end to end at the boundary (exactly 512, 503–511), through every layer that re-validates, not only the validator alone.
**Applies to:** `packages/core/src/validators/auth/return-to.schema.ts`, `packages/core/src/http/navigationHandler.ts`, any flow that decorates a validated `returnTo`.

### 2026-10-28 — Latch a one-time notice: Next syncs `replaceState` into `useSearchParams`

**Context:** Review R4 on E01 Phase 1. The welcome notice in the shared layouts reads `welcome=1` with `useSearchParams` and then drops the flag with `history.replaceState`, so a reload does not show it again. Next.js syncs `replaceState`/`pushState` with its router, so `useSearchParams` re-renders without the flag right away.
**Lesson:** decide "show" once, in a `useState` initializer on the first render, and never derive it live from `useSearchParams`, or the notice disappears the moment the flag is removed. Remember the pathname it was shown on and clear the latch when `usePathname` changes, because a layout stays mounted across client navigations (otherwise navigating back shows it again). Wrap the `useSearchParams` component in `<Suspense>` as the Next 16 docs require. In unit tests, simulate Next's sync by changing the mocked search params and re-rendering.
**Applies to:** `packages/app/src/app/welcome-notice.tsx`, any flash-once UI driven by a URL flag.

### 2026-10-28 — `fetch` resolving is not the end of the transport: the body read can reject too

**Context:** Review R1 on E01 Phase 1. `apiCall` caught a rejected `fetch()` but not a rejected `response.text()` (connection reset or abort after the headers). The promise rejected, and `SiteHeader` stayed on "Signing out…" because its pending state is reset only after `signOut()` resolves.
**Lesson:** `fetch` resolves as soon as the headers arrive, so wrap the body read as well and map it to the same `network_error` failure. Callers rely on `apiCall` never rejecting for transport problems (they don't `try/finally`), so keep that guarantee in `apiCall` itself rather than hardening each caller. To test it, `vi.spyOn(response, "text").mockRejectedValue(...)` on a real `Response`.
**Applies to:** `packages/ui/src/api/apiCall.ts` and any future client transport helper.

### 2026-10-27 — A layout's redirect beats the page's, and agent-browser can't fake every failure

**Context:** E01 step 1.9, the `(app)` layout and `/account`. With `requirePrincipal` in both, a
signed-out visit to `/account` redirected to `/sign-in?returnTo=%2F`: the layout renders first and
its redirect wins, and a layout does not know the requested path. In the integration tests,
`agent-browser network route … --abort` did not stop a `fetch` POST (it reached the server), and
`fill <field> ""` left a React-controlled input unchanged.
**Lesson:** put redirecting guards (with `returnTo`) in pages, not layouts; a layout may read
`getPrincipal()` for display only. To make a client request fail in agent-browser use
`set offline on` / `off`; to submit an "empty" field, fill whitespace that the schema trims; to
wait for a `history.replaceState` URL change use `wait --fn`, not `wait --url`.
**Applies to:** `packages/app/src/app/(app)/layout.tsx`, future signed-in layouts,
`packages/app/tests/integration/`.

### 2026-10-27 — React `cache()` is a no-op in unit tests unless you load the server build

**Context:** E01 step 1.7 page guards: `getPrincipal = cache(...)` must dedupe within one render
and never across requests. Under Vitest, `react` resolves to the client build, whose `cache`
just calls the function, so a dedupe test proves nothing.
**Lesson:** to test per-render caching, `vi.mock("react")` with
`react/cjs/react.react-server.development.js` (loaded via `createRequire` + absolute path, the
subpath is not exported) and set its `__SERVER_INTERNALS_…`.`A` to a fake dispatcher whose
`getCacheForType` keeps one Map per simulated request. See
`packages/app/src/server/auth/page-guards.test.ts`. Also: Proxy (`src/proxy.ts`) runs in a
server-only layer, so it may import `server-only` modules such as `@/server/config`.
**Applies to:** tests of anything wrapped in React `cache()`, `src/proxy.ts`.

### 2026-10-21 — An error removed on blur can swallow the submit click

**Context:** `CrudForm` started validating on blur. On `/backend/users`, after an empty submit the
person fixed the fields and clicked **Create user**: mousedown blurred the field, the error under it
disappeared, the button moved up, mouseup landed elsewhere and no click fired (integration tests
failed; unit and story tests passed).
**Lesson:** never change layout on blur in a form. Re-check a field that already shows an error
while the user types (`useSchemaForm.setValue`), so it clears before they leave the field; blur may
only add errors. Run `npm run test:integration` after any change to shared form behaviour.
**Applies to:** `packages/ui/src/forms/useSchemaForm.ts`, `CrudForm`, `SchemaForm`.

### 2026-10-21 — Circular imports between ui components fail only in the browser

**Context:** `SetupChecklist` started importing `PayoutStatus`, which already imported
`LOCKED_NOTE` from `SetupChecklist`. Unit tests (jsdom) passed; three story files failed to load
in Chromium with `Cannot access 'LOCKED_NOTE' before initialization`.
**Lesson:** when one component starts rendering another, check the reverse import first. Put
shared constants in the lower-level module (`SetupItem`), never in the composite, and run the
story tests, not only unit tests, after such a change.
**Applies to:** `packages/ui/src/components/<concept>/` modules that import each other.

### 2026-10-21 — Compose components into a page before trusting their a11y checks

**Context:** every `SetupItem` story passed axe, but the Setup checklist pattern (the item under a
page `h1`) failed `heading-order`: the item title was hard-coded to level 3.
**Lesson:** a component story checks the component alone; heading levels, landmarks and
duplicate names only show up in context. Build at least one pattern or screen story that puts the
component under a real page heading, and pick heading levels for the page it lives on.
**Applies to:** `packages/ui/src/patterns/`, `packages/ui/src/screens/`, product components with headings.

### 2026-10-21 — A `<header>` for a page section is a second banner landmark

**Context:** `MentorProfileHeader` (name, area, description at the top of `/mentors/[id]`) was a
`<header>`. axe in the Storybook a11y test failed with `landmark-no-duplicate-banner`.
**Lesson:** use `<header>` only for the site header (`SiteHeader`). A `<header>` that is not inside
`<main>`, `<article>` or `<section>` becomes a banner landmark, so a page-top block next to the site
header gives two banners. Use a `<div>` and let the `h1` name the page.
**Applies to:** product components in `packages/ui/src/components/<concept>/` that open a page.

### 2026-10-21 — A no-horizontal-scroll check misses clipped text

**Context:** Lesson 06 design system, `SetupItem` at 320 px. A long state in a `Badge` (`overflow-hidden whitespace-nowrap`) beside the card title covered the title and was cut off, yet `scrollWidth <= clientWidth` passed.
**Lesson:** `overflow-hidden` hides overflow from scroll-width checks, so for narrow-screen stories look at the screenshot too. Do not fix a long badge by letting it wrap (rejected by PO as P-M8): a badge holds one to three words and never wraps (P-C10). Put a short label in the badge and the spec's full sentence in the text under the title.
**Applies to:** stories "Long content, narrow" in `packages/ui`, `Badge` with long text.

### 2026-10-21 — Storybook docs canvases stay white in a dark theme

**Context:** Lesson 06 design system; dark-mode docs pages looked fine around the canvases, but story examples (light token text) sat on Storybook's white `.sbdocs-preview` and args table.
**Lesson:** When theming Storybook docs with CSS, also set the background of `.sbdocs-preview` and `.docblock-argstable-body` rows, and scope text-colour overrides with `:not(.docs-story *)` so stories keep their own token colours. Check the story canvases, not only the prose, in screenshots.
**Applies to:** `packages/ui/.storybook/preview.css`.

### 2026-10-21 — overflow-hidden on a wrapper hides a child's focus outline

**Context:** `DataTable` wraps the focusable table scroll container in a rounded `overflow-hidden` panel; the container's outline (offset outward) was clipped, so keyboard focus was invisible.
**Lesson:** When a focusable child fills an `overflow-hidden` parent, draw the focus ring on the parent with `has-[<child>:focus-visible]:outline-*`, and verify the computed outline in a real browser.
**Applies to:** `packages/ui/src/backend/tables/DataTable.tsx`, any clipped panel around a focusable region.

### 2026-10-21 — Storybook docs-only MDX pages run no decorators

**Context:** `withThemeByClassName` toggled `.dark` for stories, but MDX pages without stories
stayed light, and the measured contrast table showed only the light theme.
**Lesson:** sync global state that must reach docs pages (theme class on `<html>`) from the
preview channel (`SET_GLOBALS`, `GLOBALS_UPDATED`) in `preview.tsx`, not only in a decorator.
**Applies to:** `packages/ui/.storybook/preview.tsx`, any addon that relies on decorators.

### 2026-10-21 — msw-storybook-addon 3 changed its API

**Context:** `import { initialize, mswLoader } from "msw-storybook-addon"` failed the Storybook
build with MISSING_EXPORT.
**Lesson:** with v3 and CSF 3 stories use `import { mswLoader } from "msw-storybook-addon/csf3"`
and `loaders: [mswLoader()]`, add `"msw-storybook-addon"` to `addons`, and drop `initialize()`.
**Applies to:** `packages/ui/.storybook/{main.ts,preview.tsx}`.

### 2026-10-21 — `@storybook/addon-vitest` can pull a second Vitest

**Context:** `npm install -D -w @devmentor/ui …` crashed (`Cannot read properties of null
(reading 'edgesOut')`); adding the deps to `package.json` and running `npm install` worked, but
the addon then installed Vitest 5.0.5 next to the root's 5.0.4.
**Lesson:** add workspace dev deps by editing `package.json` + `npm install` when npm crashes,
then check `npm ls vitest` and keep one version by raising the root range.
**Applies to:** root `package.json`, `packages/ui/package.json`.

### 2026-10-17 — Split platform primitives from feature specs

**Context:** E01 started as one spec covering the accounts features and the
reusable primitives under them. The product owner split it into two companion
specs: platform primitives and accounts and roles.
**Lesson:** When a request asks for a feature *and* the framework beneath it,
write two companion specs. (1) A platform spec designs every primitive the
backlog needs, each with a home, a contract and its first-builder story.
(2) A feature spec whose phases follow the stories, each phase building only
the primitives it first uses. The platform spec's plan is a build schedule
that points into feature phases, not a separate delivery track.
**Applies to:** `.ai/specs/`, om-spec-writing runs, any epic that introduces
cross-cutting primitives.

### 2026-10-14 — `migration:pending` exits 0 when the database is unreachable

**Context:** Building the idempotent `npm run setup` (#13): the migrations
done-check could not rely on `mikro-orm migration:pending`'s exit code.
**Lesson:** `npm run migration:pending -w @devmentor/db` prints the connection
error and still exits 0 (`migration:up` exits 1). Parse its stdout for
`No pending migrations` instead of trusting the exit code. Related: npm
rewrites `node_modules/.package-lock.json` on every install, just after
`package-lock.json`, so its mtime is a reliable "dependencies installed" marker.
**Applies to:** `scripts/setup/steps.mjs`, any tooling or CI step that checks
for pending migrations.

### 2026-10-14 — Keep specs aligned with implementation

**Context:** The monorepo foundation spec described DB configuration, ORM
access (`getOrm()` versus `registerDb()`) and backend routes inaccurately;
its `Corrections (2026-10-14)` section now records the implementation.
Run logs were also skipped twice: CI/testing and monorepo foundation.
Related case: the 2026-10-14 entry "Domain services can't live in `core`".
**Lesson:** Verify spec claims against code. When implementation deviates,
update the spec or add a Corrections section in the same PR. After all gates
pass, the spec must match the code and move to `.ai/specs/implemented/`.
Use the completion checklist in `AGENTS.md` as the primary enforcement for
updating the spec and creating the run log before reporting completion;
the repeated omissions explain why that check is required.
**Applies to:** `.ai/specs/`, `.ai/runs/`, `AGENTS.md`, implementation PRs
and documentation audits.

### 2026-10-14 — Check env file precedence before debugging migrations

**Context:** The Next.js development app and MikroORM CLI can load different
env files. The CLI wrapper calls `loadEnvConfig` without the development
argument, selecting production files even when `NODE_ENV=development`
(`NODE_ENV=test` selects test files instead).
**Lesson:** If a migration hits the wrong database, check env file precedence
first; see README, "Configure env". Existing process env values win, and the
first file defining a variable wins, so mode-specific files can make the app
and CLI use different databases.
**Applies to:** `packages/db/mikro-orm.config.ts`, `.env*` files in
`packages/app`, migration commands and Next.js env loading.

### 2026-10-14 — Create the run log before reporting completion

**Context:** The user identified that the CI/testing task had no required
`.ai/runs/` log after implementation and verification were reported complete.
**Lesson:** For autonomous task execution, create the dated run log at the
start and finalize it before reporting completion, even when work spans user
follow-ups. Record branch, start commit, spec link, steps, decisions, problems,
and verification. Never overwrite an earlier run; use a new slug for a retry.
**Applies to:** `.ai/runs/`, autonomous implementation and CI/testing tasks.

### 2026-10-14 — Verify agent-browser commands against the installed CLI

**Context:** Browser smoke tests found real headings in snapshots, but the
installed CLI's semantic `find` command returned no match; a URL glob wait
also timed out after navigation had already succeeded.
**Lesson:** Resolve current snapshot refs by accessible role/name before
acting, wait for concrete page content, and assert the resulting URL with
`get url`. Never persist refs across navigation. Confirm command behavior
in a real browser before using it in CI.
**Applies to:** `packages/app/tests/integration/browser.ts`, agent-browser tests.

### 2026-10-14 — Keep unit tests out of the migrations directory

**Context:** Ephemeral database setup failed because MikroORM imported a
colocated `Migration*.test.ts` as a migration, executing Vitest outside its runner.
**Lesson:** Put migration unit tests in `packages/db/src/`, with imports into
`./migrations/`. MikroORM's default migration glob includes `.test.ts` files.
Always validate fresh migration application through integration tests.
**Applies to:** MikroORM CLI discovery and database unit test placement.

### 2026-10-14 — Base UI links rendered as buttons retain the button role

**Context:** The first navigation unit test queried `View site` as a link,
but Base UI's `Button` with `render={<Link />}` renders an anchor with
`role="button"`. The same assumption would break agent-browser navigation.
**Lesson:** Query the rendered semantic role, not the HTML tag or component
name. In the current backend layout, `View site` is a button with an href;
`Open backend` and `Users` are links. Verify accessibility snapshots when
adding browser locators.
**Applies to:** Base UI polymorphic buttons, React Testing Library, agent-browser.

### 2026-10-14 — CrudForm must seed every field with "" before validating

**Context:** In the browser, submitting the empty `/backend/users` form
showed no "Name is required" message. The form state started as `{}`, so
untouched fields were `undefined`. Zod then failed with its generic
"expected string" type error, not the schema's own `.min(1, …)` message.
**Lesson:** Form state must hold the same value the input displays (`""`
for empty text inputs), so the shared schema produces the messages its
author wrote. Check client-side validation in a real browser, not only
with curl.
**Applies to:** `packages/ui/src/backend/forms/CrudForm.tsx`, any bespoke
form validated with a shared Zod schema.

### 2026-10-14 — Domain services can't live in `core`

**Context:** The engineering-standards spec put services in
`core/src/services/<concept>/`. Services need entities and `em` from `db`,
but `db` already depends on `core`, so that placement would create a
cycle.
**Lesson:** Domain services live in
`packages/app/src/server/services/<concept>/` (server-only, next to the
composition root). `core` keeps only the framework-agnostic pieces:
`http/` helpers, `validators/`, ports and events.
**Applies to:** every new `*.service.ts`, and future specs that place code
by layer.

### 2026-10-13 — `next build` breaks if the shell exports NODE_ENV=development

**Context:** The production build failed while prerendering `/_global-error`
with `TypeError: Cannot read properties of null (reading 'useContext')`,
plus a flood of React "unique key" warnings. Only one React copy was
installed. The sandbox exports `NODE_ENV=development` globally, and Next
only defaults it to `production` when it is unset.
**Lesson:** If a build fails with `useContext` of null, check `NODE_ENV`
before hunting for duplicate React copies. The app's build script pins
`NODE_ENV=production`, so keep that.
**Applies to:** `packages/app/package.json` build script, CI and Docker
build steps.

### 2026-10-13 — Next's serverExternalPackages list predates MikroORM v7

**Context:** Next's built-in list of external packages has
`@mikro-orm/core` and `@mikro-orm/knex`. v7 replaced knex with
`@mikro-orm/sql` (Kysely), and the driver package (`@mikro-orm/postgresql`)
isn't on the list at all.
**Lesson:** Add every MikroORM package the server imports to
`serverExternalPackages` in `packages/app/next.config.ts`.
**Applies to:** `packages/app/next.config.ts`, any new `@mikro-orm/*`
dependency.

### 2026-10-13 — `shadcn add` in a monorepo skips the style and theme unless `init` ran

**Context:** `shadcn init` refuses to run in `packages/ui`, which has no
framework. Running `shadcn add` from `packages/app` created the components
but installed none of their deps (`@base-ui/react`) and wrote no theme
tokens. New-registry components also import `cn` from the `cn` package,
not from the `utils` alias.
**Lesson:** If the base style is ever missing, run `npm run ui:add -- style`
to get the deps. The theme tokens in `packages/ui/src/styles/globals.css`
came from `shadcn init -d` in a throwaway Next app; regenerate them the
same way. Never run that throwaway with its `node_modules` symlinked to
the repo, because its install mutates the repo's tree. Keep
`@devmentor/ui/lib/utils` re-exporting `cn` so there is only one
implementation.
**Applies to:** `packages/ui`, `packages/app/components.json`.

### 2026-10-13 — `git mv` of directories fails in this sandbox

**Context:** Moving the Next app into `packages/app` failed with
`renaming 'src' failed: Invalid cross-device link`. The workspace is on
overlayfs, which can't rename directories from the lower layer.
**Lesson:** To move a directory, copy it (`cp -a`), delete the original,
then `git add -A`. Git still detects the renames.
**Applies to:** Repo restructuring in the sandbox.

### 2026-10-13 — `next dev` writes AGENTS.md into the Next project directory

**Context:** The Next app now lives in `packages/app`. When an agent runs
`next dev`, it creates or updates the managed block in
`packages/app/AGENTS.md`. Next 16.4 also changed the block's heading from
`#` to `##`. Any mismatch causes a rewrite, which shows up as an
uncommitted change.
**Lesson:** Keep the managed block byte-identical to the installed Next
version in both the root and `packages/app` AGENTS.md. Check with
`require("next/dist/server/lib/generate-agent-files.js").hasCurrentAgentRules(dir)`
after upgrading Next.
**Applies to:** `AGENTS.md`, `packages/app/AGENTS.md`, Next upgrades.

### 2026-10-17 — Booking information uses display names

**Context:** The PO corrected D15 during approval of the accounts and booking refresh.
**Lesson:** Use the other participant’s display name in booking information and related flows; do not reinterpret it as a first or legal name. Keep decision records and the brief consistent.
**Applies to:** D15, booking notifications and session-list specifications.

### 2026-10-21 — Tailwind 4 `outline-none` hides a later `outline-2`

**Context:** Stage 2 of the design system: buttons had `outline-none … focus-visible:outline-2 focus-visible:outline-ring`, and the frozen focus preview showed no outline. Real keyboard focus was invisible too.
**Lesson:** In Tailwind 4 `outline-none` sets `outline-style: none`, and `outline-2` only sets the width. Add `focus-visible:outline-solid` (or use `outline-hidden` as the base). Story tests assert `getComputedStyle(el).outlineStyle === "solid"` after `userEvent.tab()`.
**Applies to:** every focusable component in `packages/ui/src/components/`.

### 2026-10-21 — `cn` drops custom type roles unless it knows the tokens

**Context:** `cn("text-label text-primary-foreground")` returned only the colour, because the merge tables treat an unknown `text-*` class as a text colour.
**Lesson:** `packages/ui/src/lib/utils.ts` builds `cn` with `createCn` from `cn/config` and lists every token utility (type roles, relation spacing, role radii, shadow, container widths, durations). When you add a token utility to `globals.css`, add it there too, plus a case in `lib/utils.test.ts`. Components import `cn` from `@devmentor/ui/lib/utils`; `shadcn add` writes `from "cn"`, so fix the import after each add.
**Applies to:** `packages/ui/src/lib/utils.ts`, new shadcn components.

### 2026-10-21 — Frozen hover/focus previews by redefining Tailwind variants in Storybook only

**Context:** The prompt asks for state matrices that show hover and focus without a pointer, using the component's own declarations.
**Lesson:** `.storybook/preview-states.css` redefines `@custom-variant hover|active|focus-visible` to also match `[data-preview-state~=…]`. The Storybook build compiles it; the app's CSS does not import it, so production keeps the plain pseudo-classes. Set `data-preview-state` on the component in a story.
**Applies to:** state-matrix stories in `packages/ui/src/components/*.stories.tsx`.

### 2026-10-21 — `cva` variant functions do not resolve class conflicts

**Context:** A link styled with `buttonVariants({ variant: "outline" })` lost its border in the dark theme. `cva` concatenated the base `border-transparent` and the variant's `border-input`; the later rule in the CSS won. `<Button>` was fine because it passed the string through `cn`.
**Lesson:** Exported `*Variants` helpers in `packages/ui/src/components/` wrap the `cva` function in `cn(...)` (see `button.tsx`, `badge.tsx`). Test them with whole class names (`value.split(" ")`), because substrings such as `data-disabled:border-transparent` give false failures.
**Applies to:** every exported `cva` helper used outside its component.

### 2026-10-21 — `shadcn add` prompts before overwriting an edited component

**Context:** `npm run ui:add -- alert-dialog` asked "button.tsx already exists. Would you like to overwrite?" and a non-interactive run hung.
**Lesson:** Run it as `(printf 'n\n'; sleep 60) | npm run ui:add -- <name>` so restyled primitives are kept, then diff `package.json` (root, app, ui) and `globals.css`, and switch the new file's `import { cn } from "cn"` to `@devmentor/ui/lib/utils`.
**Applies to:** `npm run ui:add` after stage 2 of the design system.

### 2026-10-21 — `pkill -f <pattern>` can kill the shell that runs it

**Context:** `pkill -f "http.server 6007"; npm run …` in one Bash call exited with 144 before the rest ran: the shell's own command line contained the pattern.
**Lesson:** Stop helper servers in a separate command, or match on something only the target has (`pkill -f "^python3 -m http.server"`), and don't chain the real work after it.
**Applies to:** local preview servers started from agent shells.


### 2026-10-21 — A multi-story MDX catalog needs themed inline previews

**Context:** 37 Canvas iframe previews reset the catalog's dark globals to light; inline
Canvas added low-contrast Storybook toolbar controls. Plain Story previews needed the
existing `.docs-story` boundary so documentation anchor/table overrides did not affect them.
**Lesson:** for a catalog, render existing stories with `Story inline autoplay={false}` inside
`Unstyled` and a `.docs-story` token-styled wrapper. Check the whole catalog with axe at 320 px
and both themes; per-story passes do not validate the documentation composition.
**Applies to:** `packages/ui/src/docs/design-system/components.mdx`.

### 2026-10-21 — Story a11y passes do not validate documentation controls

**Context:** the final Storybook audit passed 324 stories in both themes, while
full MDX pages exposed nonfocusable scrolling tables, dark Canvas/ArgsTable contrast,
object-inspector list semantics, repeated landmarks and docs theme resets.
**Lesson:** audit built MDX as well as stories at narrow widths and both themes;
assert the actual class on html after embedded examples settle. For browser probes,
ignore hidden `.sb-errordisplay` boilerplate and allow portal-only stories whose root
is empty. Keep documentation findings separate from story-test results.
**Applies to:** `packages/ui/.storybook/`, full Storybook audits.

### 2026-10-21 — Storybook iframe previews must carry theme globals

**Context:** P-AUD2 docs frames booted light and broadcast SET_GLOBALS/GLOBALS_UPDATED,
resetting dark docs. A class-on-html decorator alone could not prevent it.
**Lesson:** use the supported MDX Story override to pass the selected theme in every
iframe URL and reload frames on toolbar changes; verify both docs and frame roots.
Theme DocsContainer too: Canvas/ArgsTable controls need their matching base theme.
Keep prose CSS out of Unstyled component previews; overriding anchor colours there
broke the primary LinkButton contrast. Record cross-frame axe best-practice findings
explicitly instead of disabling rules.
**Applies to:** `packages/ui/.storybook/blocks/documentation.tsx`, `preview.css`.

### 2026-10-27 — `next build` fails under a coding agent, passes in CI

**Context:** local `npm run build` compiled, then exited 1 with `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability`, while CI's Build job on the same lockfile (next 16.4.0, Node 22.23.3) passed.
**Lesson:** Next 16.4.0 defaults `experimental.agentUpgrade` to `'security'`. During `next build` it queries the npm advisory API; when it detects a coding agent (e.g. `CLAUDECODE` env var) and the installed version is affected, it stops the command once (retry allowed for 5 minutes via a receipt in `.next/cache`). In CI no agent is detected, so the check returns early and the build passes silently. CI green does not mean the version is unaffected: `npm audit` reports next `16.0.0–16.4.0` critical (GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr). Do not disable the check; decide on the upgrade separately.
**Applies to:** `packages/app` build, `npm run build` run by agents, Next.js version policy.

### 2026-10-27 — `instanceof AppError` fails when a page built the container

**Context:** E01 step 1.10 moved the integration readiness probe from `/api/users` to the home page. Afterwards a duplicate email on `POST /api/users` answered 500 ("Unhandled API error", code `conflict`) and a cancelled GitHub sign-in went to `/error`. Next.js loads workspace packages once per bundle (pages vs route handlers), but the container is cached on `globalThis`: the first request's bundle builds it, so services throw errors from that bundle's copy of `@devmentor/core`, and the route's `instanceof AppError` / `instanceof GitHubSignInError` is false. The old probe hid it by always building the container in the route bundle first. Reproduced with `next start` and `next dev`.
**Lesson:** Never use `instanceof` on an error class from a workspace package across the container boundary. Use `isAppError()` (a `Symbol.for` brand) from `@devmentor/core`; recognize subclasses by their properties or code (`fieldErrors`, `isGitHubSignInError`). Test with `vi.resetModules()` + a dynamic import to get a real second copy. Keep the readiness probe on a page, so integration runs exercise page-first ordering.
**Applies to:** `core/src/http/{errors,apiHandler,navigationHandler}.ts`, any `onError`/error mapping in routes, new error subclasses.

### 2026-10-27 — Static page `metadata` leaks through a 404 from a layout guard

**Context:** `/backend` answers a non-operator with `notFound()` from the layout. The SSR `<title>` was the 404's, but the RSC payload still carried the page's static `metadata` ("Dashboard"), and the browser showed it after hydration. If `generateMetadata` throws `notFound()`, Next sends no metadata at all.
**Lesson:** On guarded pages, export `generateMetadata` that returns the page's title only when the role is held and the not-found metadata otherwise (`app/backend/operator-title.ts`). `getPrincipal` is `cache()`d, so this costs no extra lookup.
**Applies to:** every page under a role-gated layout.
