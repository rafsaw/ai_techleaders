# Fresh-agent `/error` design-system test

- **Date:** 2026-10-21
- **Request:** Use the documented design system in a fresh session to build and verify a local prototype of `/error?code=internal_error`, without publishing or changing the design-system backlog.
- **Starting state:** clean worktree; E01 specifies a minimal identity-free error route but does not specify its copy or recovery action.
- **Scope:** application route, focused unit/integration coverage, browser checks at 320/768/1440 px in light/dark themes, and the test result in `packages/ui/POSTEP.md`.

## Decisions

- Do not use `SiteHeader`: its source and docs explicitly reserve a separate identity-free header for `/error`, and its API accepts account state.
- Keep the page synchronous and static. It does not read `searchParams`, cookies, a principal, the request scope, or the database.
- Place it at `app/error`, outside `(frontend)`, because E01 requires it to remain outside future identity-reading layouts.
- Reuse the public `linkButtonVariants()` export for a real Next.js recovery link. The local header uses the approved header grid and semantic tokens.
- Treat all error copy and the recovery destination as prototype assumptions because E01 provides neither.

## Outcome

Success. Added the static application prototype and focused unit/integration coverage. The
existing `SiteHeader` was rejected after a source/dependency audit because its signed-out state
would misrepresent an unknown identity. Browser verification covered light/dark at 320, 768 and
1440 px, keyboard focus and navigation, overflow, console/runtime errors, and screenshots in
`test-results/error-screen/`. A first screenshot review found the recovery link stretched at wide
viewports; the final responsive classes keep it full-width only at 320 px.

Validation passed: lint, typecheck, production build (`○ /error`), token check, 281 unit tests
with 100% per-file coverage, browser install, and 5/5 production integration scenarios. The
complete source and assumption ledger is in `packages/ui/POSTEP.md`. No commit, push or publish.
