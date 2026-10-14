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
