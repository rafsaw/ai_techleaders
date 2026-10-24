# Storybook stage 5 — verification and report

- Request: record approval of P-DOC1/P-DOC2 in POSTEP and Content; execute
  stage 5; prepare but do not execute the fresh-agent screen-building test.
- Specification: `lekcja-06/prompt-storybook.md` and `packages/ui/POSTEP.md`.
- Base: `47260dd`; previous gate-resumption metadata remains in the worktree.
- Decisions: P-DOC1/P-DOC2 are “proposal approved by Rafał”; preserve existing
  components, themes, tokens and dependencies. No remote operations/publication.
- Audit inventory delegated per root AGENTS; no fresh-agent build test delegated.
- Status: audit completed with open documentation findings. The design system is not yet fully ready; the fresh-agent test is prepared and unexecuted.

## Browser audit evidence

{
  "combinations": 2364,
  "docs": 420,
  "stories": 1944,
  "axeAffectedChecks": 197,
  "axeAffectedPages": 53,
  "themeMismatchChecks": 38,
  "themeMismatchPages": 13,
  "rules": {
    "scrollable-region-focusable": 96,
    "color-contrast": 135,
    "listitem": 12,
    "landmark-unique": 12,
    "landmark-no-duplicate-main": 6
  },
  "overflow": 0,
  "brokenLinks": 0,
  "runtimeErrors": 0
}

Counts above represent rule occurrences per page/theme/width, not distinct product defects.
Axe on docs was scoped to `.sbdocs-content`, with `region` excluded because this is documentation chrome. Story a11y configuration was unchanged (`error`).

| Axe rule | Affected pages | Checks | Observed source / proposed correction |
|---|---:|---:|---|
| `scrollable-region-focusable` | 48 | 96 | Markdown/Foundations tables scroll at narrow widths without a keyboard focus target; provide a named focusable scroll container and token focus outline (WCAG 2.1.1). |
| `color-contrast` | 40 | 135 | Canvas toolbar / Controls and ArgsTable text against dark documentation surfaces; theme the documentation controls using existing semantic tokens (WCAG 1.4.3). |
| `listitem` | 2 | 12 | Storybook ArgsTable object inspector emits li without a list parent; replace that docs-only object control or give it valid list semantics (WCAG 1.3.1). |
| `landmark-unique` | 2 | 12 | Multiple inline examples repeat identical named regions; isolate examples in independently themed frames or give instance-specific names (WCAG 1.3.1). |
| `landmark-no-duplicate-main` | 1 | 6 | Several full detail-view examples render main in one docs document; isolate full-page previews (WCAG 1.3.1). |

### Every affected documentation page

| Source | Axe rules | Wrong requested theme |
|---|---|---|
| `packages/ui/src/docs/foundations/color.mdx` | `scrollable-region-focusable` |  |
| `packages/ui/src/docs/foundations/icons.mdx` | `scrollable-region-focusable` |  |
| `packages/ui/src/docs/foundations/shape-and-depth.mdx` | `scrollable-region-focusable` |  |
| `packages/ui/src/docs/foundations/spacing-and-layout.mdx` | `scrollable-region-focusable` |  |
| `packages/ui/src/docs/foundations/typography.mdx` | `scrollable-region-focusable` |  |
| `packages/ui/src/patterns/delete-confirmation.mdx` |  | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/patterns/detail-view.mdx` | `color-contrast`, `landmark-no-duplicate-main`, `landmark-unique`, `scrollable-region-focusable` |  |
| `packages/ui/src/patterns/form.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/patterns/provider-status.mdx` | `color-contrast` |  |
| `packages/ui/src/patterns/setup-checklist.mdx` | `color-contrast` |  |
| `packages/ui/src/patterns/sign-in-and-return.mdx` | `color-contrast` |  |
| `packages/ui/src/frontend/actions/link-button.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/frontend/feedback/notice.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/frontend/forms/password-field.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/frontend/forms/schema-form.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/frontend/forms/submit-button.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/frontend/forms/text-field.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/alert.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/alert-dialog.mdx` | `scrollable-region-focusable` | dark / 320, dark / 768 |
| `packages/ui/src/components/badge.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/button.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/card.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/empty.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/backend/feedback/error-state.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/field.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/input.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/label.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/backend/feedback/loading-message.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/native-select.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/separator.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/skeleton.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/spinner.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/table.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/textarea.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/auth/account-summary.mdx` | `color-contrast`, `listitem`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/auth/confirm-email-panel.mdx` | `color-contrast` |  |
| `packages/ui/src/components/auth/invitation-panel.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/auth/sign-in-options.mdx` | `color-contrast`, `landmark-unique`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/auth/site-header.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/bookable-status-line.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/mentor-profile-header.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/not-bookable-notice.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/payments/payout-status.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/price-list.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/public-work-links.mdx` | `color-contrast`, `listitem`, `scrollable-region-focusable` |  |
| `packages/ui/src/components/mentors/setup-checklist.mdx` | `color-contrast` |  |
| `packages/ui/src/components/availability/slot-list.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/components/mentors/text-only-note.mdx` | `color-contrast`, `scrollable-region-focusable` |  |
| `packages/ui/src/screens/e01/account.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e01/check-email.mdx` |  | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e01/confirm-email.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e01/invitation.mdx` |  | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e01/sign-in.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e01/sign-up.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e02/mentor-setup.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e02/profile-form.mdx` |  | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e02/public-profile.mdx` |  | dark / 1440, dark / 320, dark / 768 |
| `packages/ui/src/screens/e02/slots.mdx` | `scrollable-region-focusable` | dark / 1440, dark / 320, dark / 768 |

The complete evidence in `test-results/design-system-stage5/browser.json` contains the exact selectors and axe failure summaries for every flagged node.

## Changes, validation and limits

- Recorded both PO approvals as “proposal approved by Rafał” in Content and POSTEP.
- Updated POSTEP's stage 5 report, next action and a fresh-session `/error` test prompt.
- Pass: build-storybook, lint, typecheck, app build, coverage (278 tests / 100%),
  integration (4/4), token scan for ui, story tests (324 light + 324 dark).
- Inventory: 70 documentation pages, 37 documented component families, 5 shared
  composites additionally catalogued, 324 stories in 53 files; 202 explicit play
  functions. Every family has 13 numbered sections; six patterns have the approved
  nine-section structure. All #28–47 backlog entries are accounted for; E03–E06 deferred.
- Browser geometry/theme/render matrix: 2364 unique combinations; every story and
  docs page × both requested themes × 320/768/1440. No page overflow, broken docs
  links, raw Markdown tables or runtime errors. Documentation theme and axe findings
  remain as enumerated above. The audit did not manually inspect every screenshot.
- Keyboard: six AlertDialog checks passed. Focus initially Cancel, Tab loops,
  Escape restores trigger focus, outline solid 2px, portal inherits correct theme.
- Manager check: document title ends in DevMentor; accessible heading is
  “DevMentor design system”. Checklist/version notification suppression verified
  in existing configuration, not every possible future notification state.
- Five isolated docs-theme probes after a 2-second settle all reproduced dark→light
  resets (Alert dialog, Sign in, Slots, Slot list, Delete confirmation).
- Harness corrections: hidden static `.sb-errordisplay` text is not a render failure;
  check its visibility. Portal-only SmallWithMedia has an empty story root: reran
  its six combinations waiting for alertdialog instead. Discarded the first harness
  attempt; canonical JSON merges the 2358 completed checks and six successful reruns.
  A first keyboard attempt raced the Playground play function; used the existing
  autoplay-disabled catalog preview for the final six manual keyboard checks.
- Proposals P-AUD1–3 are recorded in POSTEP. Existing documentation was not rewritten
  during this audit because prompt rule 12 requires approval for that scope.
- Remaining: docs accessibility/theme corrections, older date fixtures after P-DOC1,
  external application/spec integration gaps, live screen reader validation, and the
  fresh-agent screen-building test in a separate session. No screen was built by
  the inventory subagent; it performed read-only counts and scenario selection only.
- Canonical local artifacts: `test-results/design-system-stage5/browser.json`,
  `keyboard.json`, `theme-probe.json`, log files, scripts and representative PNGs.
  Integration artifacts remain under `test-results/integration/`.

## Token scanner findings outside the design-system scope (Z-5)

```text

> devmentor@0.1.0 check:tokens
> npm run check:tokens --workspace @devmentor/ui


> @devmentor/ui@0.1.0 check:tokens
> node scripts/check-tokens.mjs

Info, not failing (packages/app, see POSTEP.md Z-5): 7 value(s) outside tokens
packages/app/src/app/(frontend)/page.tsx:7:57  Tailwind palette class  text-neutral-500
packages/app/src/app/(frontend)/page.tsx:10:60  Tailwind palette class  text-neutral-950
packages/app/src/app/(frontend)/page.tsx:13:50  Tailwind palette class  text-neutral-600
packages/app/src/app/(frontend)/page.tsx:19:58  Tailwind palette class  bg-neutral-950
packages/app/src/app/(frontend)/page.tsx:19:103  Tailwind palette class  text-white
packages/app/src/app/(frontend)/page.tsx:19:138  Tailwind palette class  bg-neutral-800
packages/app/src/app/backend/users/users-panel.tsx:68:44  Tailwind arbitrary value  lg:grid-cols-[1fr_20rem]

OK: no values outside tokens in packages/ui.

```

## Follow-up

P-AUD1–3 were subsequently approved and implemented. Historical baseline above is
preserved; current results and explicit exceptions are recorded in
`.ai/runs/2026-10-21-storybook-docs-remediation.md` and POSTEP.
