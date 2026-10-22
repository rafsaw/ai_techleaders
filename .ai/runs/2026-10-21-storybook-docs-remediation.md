# Storybook documentation remediation — P-AUD1–3

- Request: implement P-AUD1/P-AUD2/P-AUD3 approved by Rafał; compare the same
  pages, themes and widths before/after. Do not commit, add dependencies or run
  the fresh-agent screen-building test.
- Approval: “proposal approved by Rafał”; sources WCAG 2.1.1, 1.4.3, 1.3.1
  and prompt rule 9. Scope: `packages/ui/POSTEP.md`, final audit findings.
- Start: `47260dd`, preserving earlier uncommitted stage 4/5 metadata and Content.
- Baseline: 70 docs × 2 themes × 3 widths = 420 checks; 197 checks / 53 pages
  with axe findings, 38 checks / 13 pages with wrong requested theme.
  Rules per combination: contrast 135, scrollable focus 96, listitem 12,
  unique landmark 12, duplicate main 6.
- Baseline canonical evidence: `test-results/design-system-stage5/browser.json`.
- Delegated only P-AUD3 MDX composition/control fixes per root AGENTS; main
  agent owns documentation theming, table rendering, CSS and verification.
- Package manifests and lockfile SHA256 snapshot saved before edits; no install
  command or dependency addition authorized/needed.
- Status: implemented and verified; 18/420 docs checks retain explicitly documented best-practice exceptions on three pages. No commit or fresh-agent build test.

## Implementation

- `blocks/documentation.tsx`: supported Storybook MDX overrides. DocsContainer follows
  the actual HTML theme, so Canvas and ArgsTable controls use the matching theme.
  Framed stories receive `globals=theme:…` in their URL and remount on theme changes;
  inline previews still delegate to the real Storybook renderer.
- Root cause P-AUD2: default frames omitted globals, booted light, and sent light
  SET_GLOBALS/GLOBALS_UPDATED to the docs parent. Passing the selected theme prevents
  those contradictory initial events without filtering or disabling channel events.
- Markdown/Foundations tables and generated Controls/ArgTypes scroll regions now have
  names, keyboard targets and semantic-token focus outlines. Removed nested scrolling
  from generated tables. Boolean control labels use foreground text in both themes.
- Dark prose CSS excludes Unstyled examples as well as `.docs-story`, preserving actual
  LinkButton token colours in the Do/Don't preview (contrast was 1.18:1 there).
- P-AUD3: isolated full Detail view and Sign-in options previews in uniquely titled
  frames; read-only ArgTypes replace malformed object/array inspectors in Account
  summary and Public work links docs. Standalone Playground controls remain available.
- Added existing `@storybook/addon-docs/blocks` and `storybook/theming` imports to the
  Vitest prebundle list to prevent Vite reloading midway through story tests. These
  are existing packages, not dependency additions.
- All three proposals are recorded as “proposal approved by Rafał” in POSTEP and
  source comments/docs; sources WCAG 2.1.1, 1.4.3, 1.3.1 and prompt rule 9.

## Same-page before/after comparison

70 identical documentation page IDs × light/dark × 320/768/1440 = 420 combinations.
Comparison script asserted exact equality of those keys against the original baseline.
Chromium, axe-core 4.14, `.sbdocs-content` scope and the existing `region` exception
were retained; no new axe rule was disabled. The after run waits 700 ms for embedded
frames (the baseline used 180 ms). The longer settle exposes frame document best-practice
findings as well; it is not a filter that reduces failures.

| Measurement | Before | After |
|---|---:|---:|
| Checks with axe findings | 197/420 | 18/420 |
| Pages with axe findings | 53/70 | 3/70 |
| Checks with wrong requested theme | 38/420 | 0/420 |
| Pages with wrong requested theme | 13/70 | 0/70 |
| `color-contrast` occurrences per combination | 135 | 0 |
| `scrollable-region-focusable` | 96 | 0 |
| `listitem` | 12 | 0 |
| `landmark-no-duplicate-main` | 6 | 0 |
| `landmark-unique` | 12 | 18 |
| `landmark-one-main` | 0 | 12 |
| `page-has-heading-one` | 0 | 12 |

The last three rows are explicitly retained, not counted as a clean axe pass. They
amount to 42 rule occurrences across 18 checks on 3 pages, with overlapping rules.
Raw audit exits 1; the evidence retains every node selector and failure summary.
There are zero findings outside the exact documented exception set below.

## Explicit exceptions retained (not a WCAG conformance waiver)

The installed axe 4.14 metadata tags all three remaining rules `best-practice`, not
WCAG rules. Metadata is saved in `test-results/design-system-remediation/exception-rules.json`.
These exceptions apply only to the docs preview composition, not to future product pages.
No screen reader session was performed, so the cross-frame navigation trade-off remains
unverified by a human. Each frame has a distinct title containing component/pattern and
story name; the real component's internal heading and landmark names remain unchanged.

### EX-AUD1 — repeated landmark names across independently titled example frames

- `landmark-unique`: 18 checks, all 6 theme/width combinations for each of:
  `product-e01-accounts-and-access-sign-in-options--docs`,
  `product-e02-mentor-setup-slot-list--docs`, `patterns-detail-view--docs`.
- Regions in the first two repeat “Sign in with email” / “Upcoming slots” in two
  separate frames. Each frame has only one such region. Detail view frames each
  have one main; the combined scan reports their repeated unnamed main landmarks.
- This is a retained documentation limitation, not a claim that axe is wrong.
  We preserve real component semantics and uniquely title the browsing contexts
  instead of changing product components for this audit. Review with a screen reader
  before deciding whether docs-only instance labels are needed.
- Sources: [Deque landmark-unique guidance](https://dequeuniversity.com/rules/axe/4.11/landmark-unique)
  explicitly treats repeated names across frames as a best-practice finding;
  [WAI-ARIA APG landmarks](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
  describes both nested documents and landmark naming. WCAG 1.3.1 informs the original
  P-AUD3 fix; it is not used to waive this remaining best-practice result.

### EX-AUD2 — component fragments are not full page documents

- `landmark-one-main` and `page-has-heading-one`: 12 checks each, all 6 combinations
  for Sign-in options docs and Slot list docs above.
- These frames intentionally render component fragments, without adding a main or h1
  to the component just for its docs. The outer documentation has its page heading;
  real full-page screen stories continue to contain their own page structure.
- Sources: [Deque landmark-one-main](https://dequeuniversity.com/rules/axe/4.14/landmark-one-main)
  permits a frame with no main or one main;
  [Deque page-has-heading-one](https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one)
  discusses the parent page and frame heading hierarchy. Both are best-practice rules;
  the installed 4.14 rule IDs/help URLs/tags are preserved in the metadata artifact.
- Detail view frames each have exactly one visible h1 and one main; this exception
  does not apply to them. `frames.json` records actual counts per frame.

## Other verification

- `build-storybook`, lint, typecheck, token scan: pass. No token violations in ui;
  7 unchanged informational app findings remain outside scope (Z-5).
- `test:coverage`: 278/278 tests, all four coverage metrics 100% (76 runtime files).
- `build`: pass. `test:integration`: 4/4 pass with isolated PostgreSQL, migrations,
  production app and browser. No app runtime code changed.
- Final `test:storybook`: 324/324 light + 324/324 dark, 53 files; a11y as error.
- Actual manager toolbar light→dark→light→dark: parent docs and nested preview frame
  both followed correctly (3 toggles, `toggle.json`).
- Keyboard scrolling of Foundations/Color and generated Account summary controls at
  320 px: named focus target, solid 2px outline, ArrowRight scrolls 40 px (2/2).
- AlertDialog keyboard/portal matrix: 6/6 across both themes and all widths; focus on
  Cancel, Tab trap, Escape closes and restores trigger focus, correct portal colours.
- No page overflow, raw Markdown table text, broken docs links or runtime errors in
  the 420-check docs matrix. Every embedded frame URL carried the requested theme.
- All package manifests and the lockfile match pre-edit SHA256 values; `package.json`
  and dependency diffs empty after P-AUD3 and at completion. No install command ran.
- Source and plan status recorded in POSTEP; prior audit preserved as historical evidence.
- Local evidence: `test-results/design-system-remediation/{before,after,comparison}.json`,
  scripts, logs, rule metadata, frame counts and representative keyboard/portal screenshots.
- Not done: fresh-agent screen-building test (still only prepared), live screen reader
  testing, application work outside the design system, commit, push or publication.
