# Run — E03-B: public slot availability read

- Engine: om-auto-create-pr (steps: 5, --loop: no)
- Source doc: `.ai/specs/2026-11-03-mentor-discovery.md` (Phase 2, step 2 — "Public availability read")
- Story context: [#40](https://github.com/rafsaw/ai_techleaders/issues/40) — referenced only; this run is one bounded slice and does not claim or close the story.
- Branch: `cez/e6fb0b80` (the Cezar worktree branch this run was told to reuse, instead of a fresh `feat/` branch)
- Base: `main`

## 🎯 Goal

Add the read-only service method that answers "which of this mentor's published
starts may a visitor still see?" — `SlotService.listPublicAvailable(profileId)`
returning `{ id, startsAt }[]` — with the spec's D16 two-hour rule applied from
the server clock at read time.

## 📋 Scope

In scope:

- `packages/app/src/server/services/availability/slot.service.ts`: one new
  public method plus its DTO type.
- `packages/app/src/server/services/availability/slot.service.test.ts`:
  colocated unit tests for the new method (100% per-file coverage is the repo
  gate).
- This run log / execution plan.

Non-goals (explicitly left to the parallel slice and to later spec steps):

- The public listing (`MentorProfileService.listBookable`, `/mentors`) and the
  homepage entry — a separate slice.
- The `/mentors/[id]` page's availability section (spec Phase 2 step 3): this
  run ships the service read only, so the page keeps rendering exactly as today.
- Extracting or touching `LocalTime`, Storybook, design-system docs,
  `eslint.config.mjs`, `BACKWARD_COMPATIBILITY.md`.
- Any entity, migration or schema change — the spec requires none.
- Re-implementing the E02 MD7 bookable predicate. The spec assigns MD7 to
  `MentorProfileService`; the profile page gates this read on
  `getPublic().bookable`, and `SlotService` must not duplicate the rule.
- Booking, holds, duration or price: a read is never a slot claim.

## 📝 Design decisions

1. **Validate before touching the database.** `mentorProfileIdSchema.safeParse`
   runs first; a failure throws `NotFoundError("Mentor profile not found")` —
   the same neutral 404 `MentorProfileService.getPublic` already throws for an
   invalid mentor-profile id, which the public page maps to `notFound()`. No
   query is issued on that path.
2. **D16 from the server clock on each read.** The cutoff is
   `clock.now() + MIN_LEAD_MINUTES * 60_000` (E02's existing constant, 120
   minutes) compared with `$gte`, so a start exactly two hours away is included
   and one minute short is excluded. No cutoff is cached, so an open slot that
   has drifted too close simply disappears from the next read.
3. **Open slots only.** `bookedAt: null` is `booked_at IS NULL`. A withdrawn
   slot was hard-deleted by `withdraw`, so there is no withdrawn status to
   filter.
4. **Stable order, no cap.** `orderBy: { startsAt: "asc", id: "asc" }` gives a
   deterministic order even for equal starts (possible across profiles,
   impossible within one because of the unique index — the tie-break is
   defensive and keeps the order reproducible). Per the PO follow-up the full
   eligible set is returned: no pagination, batching or limit.
5. **Minimal DTO.** `PublicSlotDto = { id, startsAt }`. A slot is a session
   *start*; E04 owns duration and price, and the DTO deliberately carries
   neither, nor `booked`, nor any mentor data.

## 📋 Risks

- **Eligibility drift** — if a later caller trusted this list as a reservation,
  it would overbook. Mitigated by keeping the method a pure read and recording
  in the code comment that E04 must recheck MD7 and the slot transactionally.
- **Unbounded result size** — a mentor with a very long schedule returns every
  eligible start. Accepted deliberately by the spec at this course project's
  scale; revisit only on real usage evidence.
- **Local `npm run build`** — a known environment failure (`.ai/lessons.md`,
  2026-10-27: Next 16.4.0's agent security check). Recorded as a blocker rather
  than worked around if it reproduces.

## Progress

PR: #73

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Public availability read

- [x] 1.1 Add `PublicSlotDto` and `SlotService.listPublicAvailable(profileId)` with pre-query id validation, the read-time D16 cutoff, open-slot filter and stable order — c8dc563
- [x] 1.2 Add colocated unit tests: invalid-id no-query path, exact two-hour inclusion and one-minute-short exclusion, booked/past exclusion, more than 20 eligible starts with none omitted, stable order and the two-field DTO — c8dc563

### Phase 2: Gate and contract record

- [x] 2.1 Run the full validation gate (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`)
- [x] 2.2 Record the outcome in this run log and open/refresh the PR — PR #73, body refreshed, labels applied
- [x] 2.3 Authoritative review pass and any follow-up fixes — `om-auto-review-pr 73 --autofix`: **approve**, no blocker or major, so no fix commits

## Validation

Run in this worktree on commit c8dc563 (`npm ci` first — the Cezar worktree had no `node_modules`):

| Command | Result |
| --- | --- |
| `npm run lint` | ✅ exit 0 |
| `npm run typecheck` | ✅ all four workspaces plus `tests/` clean |
| `npm run test:coverage` | ✅ 121 files, 2084 tests; 100% statements/branches/functions/lines, per-file gate satisfied |
| `npm run build` | ✅ exit 0 — the known agent-mode `SecurityFatalError` (`.ai/lessons.md`, 2026-10-27) did not reproduce |
| `npm run check:agents` | ✅ 16 routes resolve, every `AGENTS.md` within budget |

`npm run test:integration` was **not** run: it needs the live Postgres/Mailpit
environment and exercises journeys through routes, and this slice changes no
route or page. The spec assigns the profile-availability journey tests to
Phase 2 step 3, which is outside this run.

## Outcome

**Success, for this slice only.** `SlotService.listPublicAvailable(profileId)`
and its five unit cases are on [PR #73](https://github.com/rafsaw/ai_techleaders/pull/73)
(branch `cez/e6fb0b80`, base `main`), ready for review with the full gate green.
Story #40 stays open: this run delivered spec Phase 2 step 2 and nothing else.

Review: `om-auto-review-pr 73 --autofix` returned **approve** — no blocker, no
major, so no autofix commits were needed. GitHub refused the formal approval
(`Can not approve your own pull request`, the automation account is also the
author), so the report was posted as a comment and a human approval is still
outstanding. One Minor stands by design: the query filter is proved against a
fake entity manager, and the real-database evidence belongs to spec Phase 2
step 3, whose integration case can reach the method once a page calls it.

Handoff to the next E03 slice: call this method from `/mentors/[id]` only when
`MentorProfileService.getPublic(id).bookable` is true. `SlotService` does not
check MD7, and nothing in the DTO reveals whether a mentor is bookable.

Decisions recorded during the run:

- Reused the Cezar worktree branch `cez/e6fb0b80` as the PR head instead of a
  fresh `feat/e03-b-public-slot-availability` branch, because the run order
  required reusing this worktree and branch. The plan slug and PR title still
  identify the slice.
- Referenced story #40 with `Refs` rather than `Closes`, and left its labels and
  the shared spec untouched, so the parallel listing slice can close it.
- Did not add a `BACKWARD_COMPATIBILITY.md` entry: `SlotService` is an
  app-internal service, the change is additive, and the spec's BC obligation for
  this phase concerns the `LocalTime` export owned by Phase 2 steps 1 and 4.
