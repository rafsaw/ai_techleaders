# Next.js 16.4.0 → 16.4.1 security update

- Request: apply the proposed minimal update to `next@16.4.1` and the matching `eslint-config-next@16.4.1` on a separate branch from current `main`; verify that the diff touches no unrelated dependencies; run the proposed checks; open a separate PR in English. PR #54 stays open and unmerged; nothing is merged.
- Started: 2026-10-27. Branch `chore/next-16.4.1-security` from `origin/main` (`3f62a49`). Autonomous follow-up to a user-approved proposal.
- Spec: none; dependency patch update, no behavior or schema change.

## Why

`npm audit` reported `next` 16.0.0–16.4.0 as vulnerable (all patched in 16.4.1, confirmed against the GitHub advisories, the npm advisory endpoint and the vercel/next.js v16.4.1 release notes, a security-only release):

- GHSA-2464-fhr4-w9xw (critical): RCE in Image Optimization API when SVG files are used.
- GHSA-673q-mjm6-r5xr (critical): RCE in `use cache` functions returning typed arrays.
- GHSA-p3m5-59mp-jv5r (high, CVE-2026-94482): DoS in App Router using Server Actions.

Local `npm run build` under a coding agent also stopped with `SecurityFatalError` from Next's own upgrade check (default `experimental.agentUpgrade: 'security'`; skipped in CI because no agent is detected). See the lesson in `.ai/lessons.md` on PR #54's branch.

## What was done

- `npm install next@16.4.1 -w @devmentor/app` and `npm install eslint-config-next@16.4.1 -D` (root). Ranges raised to `^16.4.1` in `packages/app/package.json` and root `package.json`.
- Lockfile diff verified programmatically against `origin/main`: only `next`, `@next/env`, `@next/eslint-plugin-next`, eight `@next/swc-*` platform packages and `eslint-config-next` changed version (16.4.0 → 16.4.1), plus metadata for the two workspace ranges and next's own optional `sharp` range (`^0.35.4` → `^0.35.5`; installed `sharp` was already 0.35.5 and did not change). No package was added or removed.
- No other dependency was updated, no `npm audit fix`, no check disabled, no config changed.

## Checks (local, 2026-10-27)

- `npm audit`: `next` no longer reported (0 critical). 7 other vulnerabilities remain (2 moderate, 5 high; `zod` and the `shadcn` chain, among others); unrelated, untouched here.
- `npm run typecheck`: pass. `npm run test:coverage`: pass.
- `npm run build`: pass, no `SecurityFatalError`.
- `npm run test:integration`: pass, 4/4 (Docker and PostgreSQL available this time), run against the rebuilt 16.4.1 app.
- `npm run lint`: exit 1 only because of an untracked local build copy, `packages/ui/.storybook/public/prototypes/konta-i-role/assets/app.js` (1 error in a minified file). That folder is not part of the branch (it is ignored by `.gitignore` on the lesson-07 branch, PR #54) and is absent from CI's checkout. `npx eslint . --ignore-pattern 'packages/ui/.storybook/public/prototypes/**'`: exit 0.
- CI on the PR is the authoritative gate (Build, Lint, Typecheck, Unit tests, Integration, Storybook, Values outside tokens).

## Outcome

Success locally; PR opened for review, not merged. Compatibility: `next@16.4.1` needs Node >=20.9.0 (CI uses 22.23.3) and accepts React ^19 (repo has 19.3.0).
