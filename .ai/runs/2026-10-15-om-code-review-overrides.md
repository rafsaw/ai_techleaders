# Run: repo-local om-code-review overrides

- **Date:** 2026-10-15
- **Branch:** `chore/om-code-review-overrides`.
- **Start commit:** `1cda3cd68bddf28017abc51328cc7be65ff578a1`.
- **PR:** #16.
- **Spec:** none. The change is a trivial addition to the agent pipeline
  config, so AGENTS.md › SDD doesn't require one.
- **Outcome:** success.

## Asked

Ship the untracked `.ai/skills/om-code-review/SKILL.md` as its own PR
through `om-open-pr`. Then apply the fixes from the `om-code-review` review
of #16: add this run log, and widen the override's "Agent instruction
changes" trigger.

## Decisions and evidence

- The location is the one `SDLC.md:137` documents for per-skill deviations
  (`.ai/skills/<skill-name>/SKILL.md`). The override only adds report
  sections. It doesn't relax any base-skill gate or safety rule.
- The trigger now covers `AGENTS.md`, `CLAUDE.md`, `SDLC.md` and
  `.ai/skills/**/SKILL.md`. Before, it covered only the first two, so a PR
  like this one, which changes a skill override, printed "No changes to
  agent instruction files".
- `.ai/` is outside the protected surfaces in `BACKWARD_COMPATIBILITY.md`,
  apart from `agentic.config.json` and the tracker and browser descriptors,
  none of which are touched.
- Labels: `review`, `documentation`, `skip-qa`, `priority-low`, `risk-low`.
  A single comment on #16 gives the rationale.

## Work and verification

1. Committed the override on a new branch from `main`, pushed it, and
   opened #16 against `main`.
2. Ran the override in the `om-code-review` review of #15. Both extra
   sections ("🤖 Agent instruction changes" and "🖐️ Manual checks")
   appeared as specified.
3. Reviewed #16 with `om-code-review`. The verdict was approve, with one
   minor finding (no run log) and one nit (trigger too narrow). Both are
   fixed in this follow-up commit.
4. Validation gate on the #16 head `4ab4559`, run in a clean worktree after
   `npm ci`: `npm run lint`, `npm run typecheck`, `npm run test:coverage`
   (18 files, 146 tests, 100% per file) and `npm run build` all passed. CI
   was green. The follow-up commit changes only `.ai/` Markdown, so none of
   the runtime gates are affected.

## Limits

The author of this PR also reviewed it, in the same session, so the review
isn't independent. A maintainer should approve it.
