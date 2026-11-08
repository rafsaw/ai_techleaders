# Run — E03-A: public mentor directory

- Date: 2026-11-07
- Engine: `om-auto-create-pr` (plain)
- Branch: `cez/7d091915` (reused Cezar worktree branch), base `main`
- Source doc: `.ai/specs/2026-11-03-mentor-discovery.md` — Implementation Plan, **Phase 1, steps 1 and 2 only**
- Story: #40 (shared with a parallel slice; this run neither claims nor closes it)

## 🎯 Goal

Give a signed-out visitor a public, area-filtered directory of bookable mentors
at `/mentors`, reachable from the public homepage, with a return path from a
mentor profile that preserves the chosen area filter.

## 📋 Scope

In scope — spec Phase 1 steps 1–2:

- `MentorProfileService`: factor E02 MD7 (saved profile + current `mentor` role
  + provisioned, ready payout) into **one** private helper used by `getPublic`,
  `getSetup`, `isBookable` and the new `listBookable(area?)`.
- `listBookable(area?)` → `PublicMentorSummaryDto[]` (`id`, `displayName`,
  `area`, `descriptionExcerpt`), set-based role/payout queries (no N+1),
  case-insensitive display-name order with profile-id tie-break, excerpt
  normalized and cut at 160 Unicode code points with `…` only when truncated.
- Public `/mentors` page: `area` validation, filter links with `aria-current`,
  page-local empty state, "Unknown area" + "All mentors" recovery, title and
  description metadata, cards without prices.
- "Find a mentor" entry on the public homepage, `SiteHeader` untouched.
- "Back to mentors" on `/mentors/[id]`, honouring a valid `fromArea`.
- Additive contract record in `BACKWARD_COMPATIBILITY.md`.

Non-goals (explicitly out):

- `SlotService` of any kind, `listPublicAvailable`, `LocalTime` extraction, the
  availability/time section of the profile — spec Phase 2, owned by the parallel
  slice.
- Any change to `SiteHeader`, prices on listing cards, booking controls,
  sign-in prompts, ratings, pagination, caching or a public JSON route.
- Marking the spec implemented, editing its status, or closing #40.
- `npm run test:integration` and the spec's Phase 1 step 3 browser journey: this
  worktree has no `.env` and no provisioned database, so the real-database
  journey cannot be executed here. Verified instead through unit tests at the
  page-orchestration level (see Risks).

## 📋 Implementation Plan

### Phase 1: shared bookable rule and read projection

- 1.1 Factor MD7 into one private `MentorProfileService` helper and route
  `getPublic`, `getSetup` and `isBookable` through it, preserving their existing
  404 / `false` behaviour.
- 1.2 Add `PublicMentorSummaryDto`, the excerpt normalizer and
  `listBookable(area?)` using the shared helper plus two set-based queries.
- 1.3 Unit tests: predicate parity across all four methods, area equality,
  inclusion of a bookable mentor with zero slots, ordering and tie-break,
  excerpt boundaries at 159/160/161 code points including non-BMP, safe DTO
  fields, and a fixed query count (no per-result role/payout query).

### Phase 2: public listing, homepage entry and return path

- 2.1 Add the page-local `area` / `fromArea` reader (`all` | `area` | `unknown`)
  and the back-link href helper, with unit tests.
- 2.2 Add `/mentors` with filter links, cards, page-local empty text, the
  "Unknown area" state and metadata.
- 2.3 Add the "Find a mentor" homepage link without touching `SiteHeader`.
- 2.4 Add "Back to mentors" to `/mentors/[id]` from a validated `fromArea`.
- 2.5 Unit tests for the listing, homepage and profile return path, including
  signed-out access and a ready mentor with no slots.

### Phase 3: gate and contract record

- 3.1 Record the additive `/mentors` route, `fromArea` parameter and
  `listBookable` DTO in `BACKWARD_COMPATIBILITY.md`.
- 3.2 Run the full validation gate (`npm run lint`, `typecheck`,
  `test:coverage`, `build`) plus `check:tokens` and `check:agents`.

## 📋 Risks

- **Eligibility drift.** Four methods must agree on MD7. Mitigated by one
  private helper and a parity test that drives all four through the same
  provisioning/status matrix.
- **N+1 payout reads.** `listBookable` must not query per card. Mitigated by two
  `$in` queries and a test asserting the total `em.find` call count.
- **Coverage gate.** 100% per source file; every new branch (empty `area=`,
  repeated `area`, unknown area, collator tie, truncation boundary) needs a
  case.
- **No integration run.** The database-backed Phase 1 step-3 journey is not
  executed in this worktree (no `.env`, no database). The signed-out and
  zero-slot paths are covered by unit tests against the real page
  orchestration; the browser journey remains open work.
- **Shared-file contention.** `BACKWARD_COMPATIBILITY.md` is also touched by the
  Phase 2 slice. This run appends one self-contained Phase 1 bullet to minimise
  conflict.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: shared bookable rule and read projection

- [x] 1.1 Factor E02 MD7 into one private MentorProfileService helper — be156d6
- [x] 1.2 Add PublicMentorSummaryDto, excerpt normalizer and listBookable(area?) — be156d6
- [x] 1.3 Unit-test predicate parity, ordering, excerpt boundaries and query count — be156d6

### Phase 2: public listing, homepage entry and return path

- [ ] 2.1 Add the page-local area/fromArea reader and back-link helper with tests
- [ ] 2.2 Add the /mentors listing page with filters, empty and unknown-area states
- [ ] 2.3 Add the Find a mentor homepage entry without touching SiteHeader
- [ ] 2.4 Add Back to mentors to /mentors/[id] from a validated fromArea
- [ ] 2.5 Unit-test listing, homepage and return journeys including signed-out access

### Phase 3: gate and contract record

- [ ] 3.1 Record the additive route, parameter and DTO in BACKWARD_COMPATIBILITY.md
- [ ] 3.2 Run the full validation gate and the token/agents checks
