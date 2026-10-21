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
