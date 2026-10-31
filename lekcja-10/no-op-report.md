# No-op audit: AGENTS.md

**Audited:** 2026-10-30 · **Mode:** full
**Also read for cross-file duplication:** `CLAUDE.md`, `packages/app/AGENTS.md`, `packages/app/CLAUDE.md`, `packages/ui/AGENTS.md`, `.ai/lessons.md`, `SDLC.md`, `CODE_REVIEW.md`, `eslint.config.mjs`, `vitest.config.ts`, `.github/workflows/ci.yml`, `packages/ui/src/forms/useSchemaForm.ts`

## Summary

| | Before | After | Δ |
|---|---|---|---|
| Directives | 495 | 466 | −29 |
| Lines | 659 | 624 | −35 |
| Est. tokens | 9,042 | 8,487 | −555 (−6%) |
| Signal density | — | 94% (466/495 survive) | |

This file is long because the project is complicated, not because it is padded. About two-thirds of its directives carry a project-specific noun, and more than 100 hand-checked paths and symbols all resolve. The one missing path, `packages/core/src/events`, is intentional: L99 says to add it with the first event. The dominant waste is small duplication: the same fact stated in two sections, or in a code comment and here. A subtractive pass is safe but only saves 6%. The bigger lever is moving domain detail out of the always-loaded file, which needs your decision (see Observations). Confidence in the cuts is high.

## Verdict breakdown

| Verdict | Findings | Est. tokens removed |
|---|---|---|
| KEEP | the rest (~450 directives) | 0 |
| TRIM | 5 | ~148 |
| MERGE | 12 | ~180 |
| MOVE | 6 (not applied) | 0 now, ~2,400 movable |
| CUT | 10 | ~219 |

## Findings

| Line | Verdict | Code | Directive (abbreviated) | Rationale |
|---|---|---|---|---|
| 41-46 | TRIM | N6 | "Never introduce cycles… never import from `@devmentor/app`"; `core` bullet | `eslint.config.mjs:62-82` enforces both; kept the direction and the rule's name, folded in `core` |
| 70-72 | MERGE | N4 | "They live in app's server-only zone and are registered in `container.ts`" | Path is in the same bullet; registration is L84 |
| 90 | TRIM | N11 | "later notifications" | Notifications shipped (`email-sender.port.ts`) |
| 122-123 | CUT | N6 | "There is no default, so a forgotten rule is a type error" | `access` is a required property at `apiHandler.ts:50`, `makeCrudRoute.ts:29`, `navigationHandler.ts:24`; "required" stays in the bullet |
| 185-208 | MOVE | — | Auth "Homes" index | Only needed when working on auth; see Observations |
| 193-194 | MERGE | N4 | "cookies: `core/src/http/cookies.ts`" | Already at L140; kept the session-cookie path |
| 197 | MERGE | N4 | "navigation handler: `core/src/http/navigationHandler.ts`" | Already at L106 + L131 |
| 209-214 | MOVE | — | Session activity and expiry mechanics | In `.ai/specs/implemented/2026-10-17-accounts-and-roles.md`; see Observations |
| 244-246 | MERGE | N4 | Operator command syntax | Exact syntax is in the Commands table (L487); the rule stays |
| 248-308 | MOVE | — | Mail, tokens and rate-limit detail | Weakest move candidate; see Observations |
| 271-272 | CUT | N4 | "Keep its image tag in sync with `docker-compose.yml`" | Both sites carry the reminder: `mailpit.ts:5`, `docker-compose.yml:19` |
| 289-290 | MERGE | N4 | Rate-limit message in forms | Takes in L448, so this line grows slightly |
| 310-347 | MOVE | — | Mentor invitations | One feature, already shipped, ~600 tokens; see Observations |
| 332-333 | MERGE | N4 | "The GET page only inspects" | General rule at L253-254 |
| 340-341 | MERGE | N4 | "A redirect never gets `headers()` rules… (R10)" | Same fact and rule at L233-236 |
| 343-347 | MOVE | — | Staged for E02 | Temporary. Do not cut: the `2026-10-18-mentor-setup` spec does not mention these names |
| 441-448 | TRIM | N4 | In-flight guard; `lockAfterSuccess`; every 429 | Guard has no caller action and is documented at `useSchemaForm.ts:59-61`; kept the lock behavior because a public form that doesn't navigate would look stuck; 429 moved to L290 |
| 455-458 | MERGE | N4 | shadcn add | Destination is in L168; command is in L486 |
| 480-482 | MERGE | N4 | build / lint / typecheck rows | Exact commands are in L489-490, directly below |
| 504 | CUT | N6 | "Keep package import boundaries in tests" | The `packages/*/**` ESLint rules do not exclude tests |
| 525 | CUT | N7 | "home, dashboard, and users scenarios are the baseline" | No action follows from it; the sentence before it already asks for new cases, and the suite has outgrown these three scenarios |
| 531-558 | MOVE | — | Integration notes | Only needed under `packages/app/tests/integration/`; best first move |
| 559-561 | TRIM | N11 | CI job list | Stale: omits the Storybook and tokens jobs in `ci.yml`. Dropping the list makes the line true |
| 584-587 | TRIM | N3 | "Every agent… MUST follow this structure" | Self-reference; kept the source-of-truth and don't-improvise parts |
| 591-593 | MERGE | N4 | Spec file naming | Covered by Naming rules, L631-632 |
| 606-608 | MERGE | N4 | Run-log file naming | Covered by Naming rules, L631-632 |
| 621-625 | CUT | N4 | Lesson write-ups; "Never delete lessons" | Both are in `.ai/lessons.md:10-14`, which L619 already sends the writer to |
| 633 | CUT | N2 | "Slugs should be short and descriptive" | L631 already says "short kebab-case"; no threshold |
| 637 | CUT | N10 | Source URL | Provenance only; the heading keeps the attribution |
| 639-643 | CUT | N2 | "Make the plan detailed enough…" | No way to tell compliance from non-compliance |
| 646-647 | CUT | N2 | "Keep rules short… refine them until…" | Unfalsifiable; "write a lesson" stays |
| 650-652 | MERGE | N4 | "run the relevant tests, lint, and build" | L489-490 is the stricter version; see Open questions |
| 655 | CUT | N2 | "Specific specs and prompts produce better output" | Observation for humans, no action |

## Cut lines, verbatim

> **L122-123** — There is no default, so a forgotten rule is a type error.
> **L271-272** — Keep its image tag in sync with `docker-compose.yml`.
> **L504** — Keep package import boundaries in tests.
> **L525** — The existing home, dashboard, and users scenarios are the baseline.
> **L621-623** — If a lesson is substantial enough to warrant a full write-up, create `.ai/lessons/YYYY-MM-DD-slug.md` and link it from `.ai/lessons.md` instead of inlining the whole thing.
> **L624-625** — Never delete lessons. If a lesson becomes outdated, mark it as superseded inline rather than removing it.
> **L633** — Slugs should be short and descriptive (e.g. `2026-10-13-auth-session-fix.md`).
> **L637** — Source: https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips
> **L640-641** — Make the plan detailed enough that the implementation can be done in one pass.
> **L646-647** — Keep rules short and specific, and refine them until the mistake actually stops happening.
> **L655** — Specific specs and prompts produce better output than vague ones.

## Kept despite looking generic

| Line | Code | Why it stays |
|---|---|---|
| 1-9 | L5 | The whole managed block. Lesson 2026-10-13 requires it byte-identical in both files, even though L7 is not true of the root copy (see Open questions) |
| 29 | L1 | "never pnpm/yarn/bun": counters reaching for another package manager |
| 78-80 | L1 | "Never scaffold empty ones", "not a module runtime": counters inventing structure |
| 99 | L1 | Explains why `core/src/events` is absent, so it isn't scaffolded early or read as a dead path |
| 103-104 | L1 | "Don't re-implement fetch, validation, auth…" |
| 110-112 | L1 | `isAppError`, not `instanceof`: a real incident (lesson 2026-10-27) |
| 190 | L1 | "never `new Date()`": `clock.ts` is the only server use today, so the rule is working |
| 383 | L4 | "Never hard-code credentials" reads as a platitude, but safety rules aren't cut for efficiency |
| 192, 255, 334 | L4 | Token handling is stated three times; the redundancy is deliberate |
| 400 | L1 | "v7 has no `persistAndFlush`": training data says otherwise |
| 462-465 | L1 | Links must not render through `Button`: a real incident in `.ai/lessons.md` |
| 472-473 | L1 | "no `tailwind.config.*`": counters creating one |
| 499-501 | L1 | "Never lower thresholds… or mock the code under test": the highest-value lines in the testing section |
| 519 | L1 | "or silently skip when Docker is unavailable" |
| 644-645 | L1 | "Turn every correction into a rule": not default behavior |
| 653-654 | L1 | "throw it out and rewrite": counters patching on top of a bad fix |

## Open questions

- **L492 vs L605-606.** L492 says a task isn't complete until its run log exists. L605-606 says logs are for autonomous runs, "not a normal interactive session". Which one applies to interactive work? This audit followed L492 and wrote a log.
- **Gate vs CI.** CI also runs `Storybook tests` and `Values outside tokens`, but the L489-490 gate, the Commands table and `SDLC.md` omit them, so work can pass the stated gate and still fail CI. Should the gate include `npm run test:storybook` and `npm run check:tokens`?
- **L650-652.** Rule 3 says "relevant tests, lint, and build"; L489-490 requires all five commands. The rewrite drops the weaker wording, which treats L489-490 as the rule. Is that right?
- **L639 vs L600.** Rule 1 allows plan mode or a spec; L600 requires a reviewed spec for non-trivial work. Is plan mode enough?
- **L656-659.** Kept pending your view. "Hand off research… to subagents" pulls against Claude Code's own guidance to spawn only when it's worth the cost, and "more than once a day" gives an agent no way to count across sessions. Is there a story behind this rule?
- **L7.** `next dev` runs in `packages/app` and writes only `<projectDir>/AGENTS.md`, so "written and re-added by `next dev`" is false for the root copy. Does the root still need the markers and L7, or only L5? The block also loads twice under `packages/app`, whose `CLAUDE.md` imports both files.
- **L343-347.** Move this to the `2026-10-18-mentor-setup` spec so it leaves with E02 Phase 1? Left in place, it goes stale at that point.

## Observations

Not applied to the rewrite, which is subtractive only.

- **Routing is the real lever.** Moves in recommended order, smallest risk first:
  1. Integration notes, L531-558 (~425 tokens), to `packages/app/tests/integration/`. They apply only there.
  2. Mentor invitations, L310-347 (~600 tokens), to the auth services folder, keeping one root line for "Only path to `mentor`" (L325-329), which is a security rule.
  3. Auth homes and session mechanics, L185-214 (~450 tokens).
  4. Mail, tokens and rate limits, L248-308 (~915 tokens): **leave these in root for now**. E02 and bookings will send email and take rate limits outside `auth`, so an on-demand file may not load when the rule matters.
- **Moving needs a shim.** A nested `AGENTS.md` needs a `CLAUDE.md` importing it for Claude Code, as `packages/app/CLAUDE.md` does.
- **Commands table gaps.** It has no rows for `test:coverage`, `test:integration`, `test:storybook` or `check:tokens`.
- **Analyzer noise.** Its 293 "references not found" are almost all package names, globs and paths relative to a package. Every real path was checked by hand.

## Proposed rewrite

Written to `AGENTS.rewrite.md`. Diff below. Nothing has been applied to the original.

```diff
--- AGENTS.md	2026-10-29 11:30:15.834022183 -0500
+++ AGENTS.rewrite.md	2026-10-30 15:08:52.486180474 -0500
@@ -39,11 +39,9 @@
 ```

 - **Dependency direction:** `app → ui, db, core`, `db → core`. `core` and
-  `ui` depend on no other workspace package. Never introduce cycles, and
-  never import from `@devmentor/app` in another package. ESLint
-  `no-restricted-imports` enforces this, and also enforces that only `db`
-  imports `@mikro-orm/*`.
-- **`core` stays framework-agnostic:** no React, no Next.js, no MikroORM.
+  `ui` depend on no other workspace package. `core` stays framework-agnostic:
+  no React, no Next.js, no MikroORM. ESLint `no-restricted-imports` enforces
+  all of this, and also that only `db` imports `@mikro-orm/*`.
 - **`ui` is presentation only:** no data access, no server-only code.
 - **`db` is server-only.** Import it only from Server Components, Route
   Handlers, Server Actions and `packages/app/src/server/**`, never from a
@@ -68,8 +66,7 @@

 - `packages/db/src/entities/<concept>/<name>.entity.ts`
 - `packages/app/src/server/services/<concept>/<name>.service.ts`. Services
-  need entities and `em`, so they can't live in `core` (`db → core`). They
-  live in app's server-only zone and are registered in `container.ts`.
+  need entities and `em`, so they can't live in `core` (`db → core`).
 - `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`: the
   shared Zod schemas, imported as
   `@devmentor/core/validators/<concept>/<file>`.
@@ -87,7 +84,7 @@
   - Never glob-load services with `loadModules`.
 - **Service return values:** services return plain DTOs, never entities.
   Client components import the DTO *type* with `import type`.
-- **External integrations** (payments, later notifications and video) go
+- **External integrations** (payments, notifications, video) go
   through a port interface (`*.port.ts`) with a mock adapter under
   `adapters/`. Callers depend on the port, never on a vendor SDK.
 - **Domain events:**
@@ -119,8 +116,7 @@
     - maps `AppError`s to their status, and logs anything else as a 500
       without leaking details.
   - **`access` is required (PD3)** on `apiHandler`, `makeCrudRoute` and
-    `navigationHandler`: `"public" | "optional" | "user" | { role }`. There
-    is no default, so a forgotten rule is a type error. `user` and
+    `navigationHandler`: `"public" | "optional" | "user" | { role }`. `user` and
     `{ role }` answer 401 signed out and 403 without the role; the handler
     gets a typed `principal` (`null` on `public`). Pass a static `logRoute`
     template, never the request path.
@@ -190,11 +186,9 @@
     tests). Time rules read `clock.now()`, never `new Date()`.
   - tokens: `core/src/security/tokens.ts` (`generateToken`, `hashToken`,
     `isWellFormedToken`). Only the hash is stored; never log a raw token.
-  - cookies: `core/src/http/cookies.ts`; the session cookie rules:
-    `packages/app/src/server/auth/session-cookie.ts`.
+  - session cookie rules: `packages/app/src/server/auth/session-cookie.ts`.
   - schemas: `core/src/validators/auth/return-to.schema.ts` and
     `role.schema.ts`.
-  - navigation handler: `core/src/http/navigationHandler.ts`.
   - page guards: `@/server/auth/page-guards` (`getPrincipal`,
     `requirePrincipal`, `requireRole`).
   - GitHub: the port `server/services/auth/github-oauth.port.ts` and the
@@ -241,9 +235,8 @@
 - **`/error` is identity-free.** It lives in its own `(error)` route group,
   and neither its page, layout nor header resolves a principal, creates a
   request scope or touches the DB, so it can report exactly those failures.
-- **Operator role:** granted and revoked only with `npm run operator`
-  (`role grant|revoke --email <email> --role operator`); `mentor` is
-  refused. Production requires `--yes`.
+- **Operator role:** granted and revoked only with `npm run operator`;
+  `mentor` is refused. Production requires `--yes`.

 ### Email accounts, mail and rate limits (Phase 2)

@@ -268,8 +261,7 @@
     background.
   - Send only **after** the transaction commits.
   - Unit tests use `MemoryEmailSender`; integration tests read Mailpit
-    through `tests/integration/mailpit.ts` (`MailpitInbox`). Keep its image
-    tag in sync with `docker-compose.yml`.
+    through `tests/integration/mailpit.ts` (`MailpitInbox`).
 - **Rate limits (P11):** the `RateLimiter` port is in
   `core/src/security/rate-limiter.ts`; its only adapter is
   `PostgresRateLimiter` (`db/src/rate-limiter.ts`, `rate_limit_buckets`,
@@ -287,7 +279,8 @@
     **skip** per-IP rules; never pool unknown clients into one bucket.
   - A refusal throws `TooManyRequestsError` (`rate_limited`, 429);
     `apiHandler` adds `Retry-After`. The envelope and `apiCall` stay
-    unchanged, and forms show `RATE_LIMITED_MESSAGE` with no countdown.
+    unchanged, and forms show `RATE_LIMITED_MESSAGE` for every 429, whatever the
+    server says, with no countdown.
 - **Passwords:** `PasswordHasher` port
   (`server/services/auth/password-hasher.port.ts`), bcryptjs adapter
   `adapters/bcrypt-password-hasher.ts`, cradle `passwordHasher`
@@ -329,16 +322,15 @@
   refused. Never add another route, field or command that grants `mentor`.
 - **Email-bound (AD5):** only the account whose verified email equals the
   invitation's may accept; the page never shows the invited address to
-  another account. The GET page only inspects; resend rotates the hash in
-  place, revoke closes the row; neither touches a role already granted.
+  another account. Resend rotates the hash in place, revoke closes the row;
+  neither touches a role already granted.
 - **Secret-free:** CLI output and logs carry the id, email, expiry and
   delivery status, never the token or link. Every route in `TOKEN_PAGES`
   (`app/token-page.ts`: `/confirm-email`, `/invite/:token` and the auth
   pages that keep a `returnTo`, `/sign-in`, `/sign-up`,
   `/sign-up/check-email`) always sends the token-page headers and static
   metadata, whatever its query. Protect by route; never match `returnTo` in
-  a `next.config` `has` rule (R9). A redirect never gets `headers()`
-  rules, so the Proxy sends the trailing-slash 308 with the headers (R10).
+  a `next.config` `has` rule (R9).
   A failed send keeps the invitation and exits 1 asking for `invite resend`.
 - **Staged for E02:** `INVITATION_ACCEPTED_DESTINATION`
   (`(frontend)/auth-links.ts`, now `/?invitation=accepted`) becomes
@@ -438,23 +430,18 @@
   re-implement form state in a page.
   - `onSubmit(values, { signal })` must pass `signal` to `apiCall` (it
     aborts on unmount) and must not reject.
-  - One request runs at a time: the in-flight guard is a ref, so a double
-    submit sends one request.
   - `SchemaForm` passes `lockAfterSuccess`: a public form navigates on
-    success, so it stays pending until the page unmounts (a late second
-    click sends nothing). It unlocks on a back/forward-cache restore or after
-    `SUCCESS_LOCK_TIMEOUT_MS` (10 s), so a failed navigation never strands
-    it. `CrudForm` keeps the default and unlocks right after success.
-  - Every 429 reads `RATE_LIMITED_MESSAGE`, whatever the server says.
+    success, so it stays pending until the page unmounts, a back/forward-cache
+    restore, or `SUCCESS_LOCK_TIMEOUT_MS` (10 s). `CrudForm` unlocks right after
+    success.
 - **Signed-in pages** live in `packages/app/src/app/(app)/` (e.g.
   `/account`) and use shadcn components, like the admin area.
 - **Backend (admin) pages** live under `packages/app/src/app/backend/`
   (URL `/backend`, operators only). Compose them from `@devmentor/ui` shadcn
   components plus the theme tokens (`bg-card`, `text-muted-foreground`, …).
   Don't hand-roll a widget when a shadcn component exists for it.
-- **Adding shadcn components:** run `npm run ui:add -- <component>` from
-  the repo root. Files land in `packages/ui/src/components/` and
-  dependencies go into `@devmentor/ui`. Don't copy component code into
+- **Adding shadcn components:** `npm run ui:add -- <component>` from the repo
+  root; dependencies go into `@devmentor/ui`. Don't copy component code into
   `app`.
 - **Editing shadcn components:**
   - Treat generated components as owned code: edit them in
@@ -477,9 +464,6 @@
 | Task | Command |
 | ---- | ------- |
 | Dev server | `npm run dev` |
-| Production build | `npm run build` |
-| Lint (all packages) | `npm run lint` |
-| Typecheck (all packages) | `npm run typecheck` |
 | New migration | `npm run db:migration:create` (first one: `-- --initial`) |
 | Apply / revert / list migrations | `npm run db:migrate` / `db:migrate:down` / `db:migration:list` |
 | Seed sample data (idempotent) | `npm run db:seed` |
@@ -501,7 +485,7 @@
   test to make the gate pass.
 - Use **Vitest** for TypeScript units and **React Testing Library** with
   **jsdom** for components. Colocate `*.test.ts` / `*.test.tsx` with source.
-  Keep package import boundaries in tests. Coverage includes all workspace
+  Coverage includes all workspace
   `src` runtime TypeScript, including generated UI primitives and migrations,
   plus the executable `eslint.config.mjs` package-boundary configuration and
   the Node-only repo scripts in `scripts/**/*.mjs` (e.g. `npm run setup`);
@@ -521,8 +505,7 @@
   `npm run test:integration:install` (Linux may need `-- --with-deps`).
   Docker must be running. Run `npm run test:integration`; evidence is written
   to `test-results/integration/`, coverage to `coverage/`.
-- Add integration cases for new user flows and persistence behavior. The
-  existing home, dashboard, and users scenarios are the baseline.
+- Add integration cases for new user flows and persistence behavior.
   Admin scenarios sign in through the GitHub stub
   (`tests/integration/github-stub.ts`) and grant `operator` with the real
   CLI (`npm run operator -- role grant …`), never by writing the role row.
@@ -556,9 +539,8 @@
   - Tests that need their own schema or table-wide cleanup use
     `tests/integration/scratch-database.ts` (`useScratchDatabase`,
     `dbContainer`), not the app's database.
-- `.github/workflows/ci.yml` checks each PR with Build, Lint, Typecheck,
-  Unit tests (100% coverage), and Integration tests (PostgreSQL + agent-browser).
-  A feature is complete only when all checks pass.
+- `.github/workflows/ci.yml` checks each PR. A feature is complete only when
+  all checks pass.

 ## Gotchas

@@ -581,16 +563,13 @@

 # Spec-Driven Development (SDD) & agent metadata

-This project uses a `.ai/` folder as the source of truth for specs, run logs,
-and lessons learned. Every agent (human-directed or autonomous) working in
-this repo MUST follow this structure — do not improvise alternative
-locations for specs, logs, or notes.
+`.ai/` is the source of truth for specs, run logs and lessons learned. Do not
+improvise alternative locations for specs, logs, or notes.

 ## `.ai/specs/` — specifications

-- Every feature/change that goes through SDD gets a spec file named
-  `YYYY-MM-DD-slug.md` (date the spec was created, kebab-case slug).
-- New specs are written directly in `.ai/specs/`.
+- Every feature/change that goes through SDD gets a spec file, written
+  directly in `.ai/specs/`.
 - Once a spec has been fully implemented, move the file into
   `.ai/specs/implemented/` (keep the original filename — don't rename or
   change the date).
@@ -603,9 +582,7 @@
 ## `.ai/runs/` — autonomous run logs

 - Every autonomous AI run (unattended / agentic execution, not a normal
-  interactive session) writes a log file to `.ai/runs/` named
-  `YYYY-MM-DD-slug.md` (date the run started, kebab-case slug describing the
-  task).
+  interactive session) writes a log file to `.ai/runs/`.
 - The log should capture: what the run was asked to do, what it did, key
   decisions, and the outcome (success/failure/partial).
 - Do not overwrite or delete past run logs. If a run is retried, use a new
@@ -618,11 +595,6 @@
 - After fixing a non-trivial bug, or whenever you discover something future
   agents should know, add an entry to `.ai/lessons.md` using the template at
   the top of that file.
-- If a lesson is substantial enough to warrant a full write-up, create
-  `.ai/lessons/YYYY-MM-DD-slug.md` and link it from `.ai/lessons.md` instead
-  of inlining the whole thing.
-- Never delete lessons. If a lesson becomes outdated, mark it as superseded
-  inline rather than removing it.
 - Check `.ai/lessons.md` before starting non-trivial work, especially in
   areas with a history of bugs — a relevant lesson may already exist.

@@ -630,29 +602,22 @@

 - Format: `YYYY-MM-DD-slug.md`, date first, then a short kebab-case slug.
 - Use the date the file was created/the run started — never update it later.
-- Slugs should be short and descriptive (e.g. `2026-10-13-auth-session-fix.md`).

 # Working rules (distilled from Boris Cherny's Claude Code tips)

-Source: https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips
-
 1. **Plan before you build. If it goes wrong, plan again.** Start non-trivial
-   work in plan mode or with a spec in `.ai/specs/`. Make the plan detailed
-   enough that the implementation can be done in one pass. If the
+   work in plan mode or with a spec in `.ai/specs/`. If the
    implementation goes off track, stop and update the plan instead of piling
    patches on top.
 2. **Turn every correction into a rule.** When a human corrects you, write a
    lesson to `.ai/lessons.md` (or update this file if it's a standing
-   convention) so the same mistake doesn't come back. Keep rules short and
-   specific, and refine them until the mistake actually stops happening.
+   convention) so the same mistake doesn't come back.
 3. **Fix things yourself and prove they work.** When you're given a bug
    report, a failing test, or a CI failure, find the root cause and fix it
-   without waiting for step-by-step instructions. Before you say it's done,
-   run the relevant tests, lint, and build. Ask for review only after the
-   checks pass.
+   without waiting for step-by-step instructions. Ask for review only after
+   the checks pass.
 4. **Prefer the elegant fix over the first one that works.** If a fix feels
    hacky, throw it out and rewrite it cleanly using what you've learned.
-   Specific specs and prompts produce better output than vague ones.
 5. **Use subagents, and turn repeated work into reusable tools.** Hand off
    research, exploration, and parallel subtasks to subagents so the main
    context stays focused. Anything you do more than once a day should become
```
