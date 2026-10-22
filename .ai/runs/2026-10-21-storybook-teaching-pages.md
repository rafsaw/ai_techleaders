# Storybook teaching pages — stage 4

- Request: resume `lekcja-06/prompt-storybook.md` from `packages/ui/POSTEP.md`.
- Started: 2026-10-21, branch at `8413c6b` (clean worktree).
- Approved specification/plan: prompt + POSTEP stages 0–3 decisions, stage 4 scope.
- Scope: additive English teaching pages, E01/E02 epic guides, local agent guide.
- Decisions: keep all existing foundations, components, stories and themes; no dependencies;
  local `packages/ui/AGENTS.md` links `docs/design-system.md` to respect prompt rule 11.
- Parallel help per root AGENTS working rule 5: inventory/epic coverage audit and teaching-page drafting.
- Status: stage 4 implemented; app build/integration blocked by environment. Stopped before stage 5.

## Implementation and decisions

- Added 8 general teaching pages and 2 epic guides under ui/src/docs/design-system.
- Start guide maps 37 component families plus 5 composites to actual import modules;
  the catalog renders all 37 existing playground stories, without copying package components.
- Added ui/docs/design-system.md and ui/AGENTS.md entry point. No app, dependency,
  token, existing component/story or remote changes.
- Content explicitly proposes P-DOC1 (English named dates, year, 24-hour clock) and
  P-DOC2 (English grouping for non-money numbers without shortening exact counts).
- Root AGENTS instructs using subagents: one audited inventory and wrote epic/missing pages;
  one drafted the five guidance pages; root integrated and checked them.
- Browser found that nested Canvas iframes reset the catalog theme. Reused inline Story
  under Unstyled and .docs-story instead; this also avoids low-contrast Canvas chrome.
- Narrow axe checks found nonfocusable scrolling documentation tables. New pages use
  named, keyboard-focusable JSX tables with token-based focus outlines; existing pages untouched.
- Updated approved execution plan/spec ledger in POSTEP and appended the catalog lesson.

## Verification and outcome

- Pass: lint, typecheck, token scan; unit coverage 278 tests / 100% all metrics.
- Pass: built Storybook, 70 documentation pages / 324 stories in its index.
- Pass: 324 story tests in each theme, 53 files per run, with a11y errors enabled.
- Browser checks cover the 10 new pages × light/dark × 320/768/1440, internal links,
  theme, tables and overflow. Axe is scoped to documentation content, with the region rule
  excluded because Storybook docs do not model an app landmark. Story tests retain their
  unchanged a11y configuration. Artifacts: /tmp/devmentor-stage4-browser.json and screenshots.
- Catalog keyboard check: solid 2px outline; Enter opens AlertDialog; Escape restores focus.
- Build app failed reproducibly (including elevated retries): Turbopack cannot bind its CSS
  processing port, Operation not permitted. Docker is available and browser install passed;
  integration setup failed for missing .next/BUILD_ID after the failed production build.
- Outcome: stage 4 documentation implemented; required app gates remain blocked by the
  environment, and P-DOC1–2 await PO decisions. No claim of full stage completion.
- Next: resolve the two proposals and run build/integration in an environment allowing
  Turbopack's port; stage 5 starts only after the user's “dalej”. Fresh-agent test not run.
- Final browser/axe matrix after table fix: 60/60 checks passed, zero reported violations
  or broken documentation links. All 10 pages rendered in all three widths and both themes.
