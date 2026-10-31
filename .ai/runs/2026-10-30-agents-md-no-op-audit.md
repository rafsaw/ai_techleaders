# AGENTS.md no-op audit

**Asked:** run `/eliminate-no-op` on the root `AGENTS.md` (interactive session).

**Did:** ran the mechanical analysis, checked referenced paths and symbols, ESLint, Vitest, CI, lessons and sibling instruction files, and classified the file directive by directive. Wrote `no-op-report.md` and `AGENTS.rewrite.md` in the repo root. `AGENTS.md` itself is unchanged.

**Key decisions:**

- Left the managed block (L1-9) alone, because lesson 2026-10-13 requires it byte-identical in both files. L7 is not true of the root copy, so that is raised as an open question.
- Kept the rewrite subtractive. MOVE candidates (about 2,400 tokens) are recommendations only, because routing needs the user's buy-in.
- Wrote this log because of AGENTS.md L492, although L605-606 limits run logs to autonomous runs. The conflict is an open question in the report.
- No spec applies: this is an audit proposal, not a feature.

**Validation:** lint, typecheck, build, coverage and integration tests were not run, because only Markdown was added and no source or instruction file in use changed. No test or script reads `AGENTS.md`, and nothing links to its anchors. Docs under `packages/ui/src` quote its section names, and the rewrite keeps every heading.

**Outcome:** success as a proposal. The rewrite goes from 9,042 to 8,487 estimated tokens (−6%, 94% of directives survive). Applying it awaits the user's decision.
