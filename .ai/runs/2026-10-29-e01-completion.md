# 2026-10-29 — E01 accounts and roles: completion documentation

**Asked:** the product owner approved the E01 implementation for the course (after R13 and the green final E01 gate). Finalize the documentation per the repository SDLC rules, move the spec to `implemented/` as the workflow requires, keep R11 documented as an unresolved production release condition, do not describe E01 as production-ready, update `track.md` and the run log, commit. No push, no PR.

**Outcome:** success (documentation only; no application code changed).

## What was done

- **Spec move (AGENTS.md "`.ai/specs/`": a fully implemented spec moves to `implemented/`, filename kept):** `git mv .ai/specs/2026-10-17-accounts-and-roles.md .ai/specs/implemented/2026-10-17-accounts-and-roles.md`. The spec's own Phase 3 Step 5 asks for exactly this, and only this spec: the platform catalog `.ai/specs/2026-10-17-platform-primitives.md` stays active until its provisional E02–E05 entries are implemented, deferred or transferred.
- **Status line:** now "implemented — approved for the course, not production-ready (2026-10-29)", listing Phases 1–3 with their run logs, review fixes R1–R13 and M1, and stating that production release is blocked until the release conditions in Risks & Impact Review are met, including the unresolved known limitation R11.
- **R11 stays open:** the release condition (hosting edge normalizes repeated slashes/backslashes or adds the token-page headers to 3xx, verified with the canary inputs) is unchanged in the spec, platform P8, README hosting checklist and AGENTS.md. Nothing describes it as resolved.
- **Links updated to the new path:** `track.md`, `BACKWARD_COMPATIBILITY.md`, `.ai/specs/2026-10-17-platform-primitives.md` (companion link), `.ai/specs/2026-10-18-mentor-setup.md` (dependency link), `.ai/specs/implemented/2026-09-01-engineering-standards.md`, `packages/ui/src/docs/design-system/usage-and-accessibility.mdx`, `packages/ui/src/docs/design-system/epics/e01-accounts-and-access.mdx`; the spec's own relative link to the platform catalog now points one level up. Bare filename mentions in code comments and stories still resolve by name and were left as is. Historical run logs and course notes (`lekcja-07/`, `POSTEP.md`) are records of their time and were not rewritten.
- **`track.md`:** Phase 3 item 3.5 notes the move; new "E01 completion (2026-10-29)" section with the approval, the move, and an unticked "Production release blocked" item listing the open release conditions.

## Open release conditions (unchanged, from the spec's Risks & Impact Review)

- R11: hosting edge covers Next's repeated-slash/backslash 308 (known limitation, unresolved).
- platform.PD1: production email provider, sender, real-inbox delivery test.
- Hosting decision for the trusted client-IP header contract.
- Verified token redaction in application, Proxy, CLI and hosting access/error logs.
- brief.Q05 (terms of service / data processing owner), brief.Q13 (shared operator contact email).

## Non-blocking notes carried forward

- From the Phase 3 manual-test preparation (R12 run log): dev-server request logging shows token paths (`next dev` only); mismatch copy for an unverified account with the invited address; `invite create` gives no warning for an existing mentor; in-form 404 message lacks a full stop and `/?invitation=accepted` shows its notice to any mentor; `role revoke --role mentor` refusal is worded for grant.

## Checks

- Documentation only. `npm run lint` and `npm run test:storybook` (the two `.mdx` docs changed) were run on the final tree: lint 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`), Storybook 56 files, 342 tests passed. No code, schema or test changed, so the last full E01 gate (R13: coverage 1885 tests at 100%, build, integration 145 tests) still applies.
