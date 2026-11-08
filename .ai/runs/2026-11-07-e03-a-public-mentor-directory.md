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
- Originally scoped out: the spec's Phase 1 step-3 real-database journey, on the
  assumption that this worktree could not run it. Docker turned out to be
  available, so it was implemented after all — see Outcome. What remains out is
  the browser-driven (agent-browser) variant, which cannot start from this
  worktree's path.

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
- **Integration reach.** Resolved during the run: the database-backed journey
  was written and passes. What is left unverified locally is the browser-driven
  suites, which cannot launch Chromium from this worktree's path; CI covers them.
- **Shared-file contention.** `BACKWARD_COMPATIBILITY.md` is also touched by the
  Phase 2 slice. This run appends one self-contained Phase 1 bullet to minimise
  conflict.

## Progress

PR: #74

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: shared bookable rule and read projection

- [x] 1.1 Factor E02 MD7 into one private MentorProfileService helper — be156d6
- [x] 1.2 Add PublicMentorSummaryDto, excerpt normalizer and listBookable(area?) — be156d6
- [x] 1.3 Unit-test predicate parity, ordering, excerpt boundaries and query count — be156d6

### Phase 2: public listing, homepage entry and return path

- [x] 2.1 Add the page-local area/fromArea reader and back-link helper with tests — a1e0458
- [x] 2.2 Add the /mentors listing page with filters, empty and unknown-area states — a1e0458
- [x] 2.3 Add the Find a mentor homepage entry without touching SiteHeader — a1e0458
- [x] 2.4 Add Back to mentors to /mentors/[id] from a validated fromArea — a1e0458
- [x] 2.5 Unit-test listing, homepage and return journeys including signed-out access — a1e0458

### Phase 3: gate and contract record

- [x] 3.1 Record the additive route, parameter and DTO in BACKWARD_COMPATIBILITY.md
- [x] 3.2 Run the full validation gate and the token/agents checks

## Outcome

Phase 1 steps 1–2 of the mentor-discovery spec are implemented. The run is a
success for its stated slice; the spec itself stays open, because Phase 2 and
Phase 1 step 3 are not part of it.

What landed:

- `MentorProfileService.listBookable(area?)` plus one private MD7 helper shared
  with `getPublic`, `getSetup` and `isBookable`.
- Public `/mentors` with area filters, empty and unknown-area states, metadata
  and page-local cards.
- "Find a mentor" on the homepage; `SiteHeader` untouched.
- "Back to mentors" on `/mentors/[id]`, honouring a validated `fromArea`.
- The additive contract record in `BACKWARD_COMPATIBILITY.md`.

Key decisions:

- The MD7 helper takes what each caller already proved (profile presence,
  current mentor role) and owns only the payout rule, so `getSetup` can keep
  reading the role from the principal while `getPublic` keeps its two 404s.
- `listBookable` reads profiles, then roles and payout accounts in two `$in`
  queries. A test asserts exactly three `em.find` calls, which is what keeps an
  N+1 from creeping back in.
- A repeated `area` or `fromArea` is treated as a mistake, not as a choice of
  its first value — the listing shows "Unknown area" and the profile's return
  link falls back to the whole listing.
- The excerpt counts Unicode code points, so an emoji costs one character
  rather than two; verified at 159, 160 and 161 code points.

Verification: `npm run lint`, `npm run typecheck`, `npm run test:coverage`
(123 files, 2,115 tests, 100% per source file), `npm run build`,
`npm run check:tokens` and `npm run check:agents` all pass.

Integration: this plan originally recorded `npm run test:integration` as
unrunnable here. That was wrong — Docker is available in this worktree — so the
spec's Phase 1 step-3 real-database journey was written after all, as
`packages/app/tests/integration/public-mentor-directory.test.ts`. It passes 5/5
against real PostgreSQL, with the mentor role arranged through the real
invitation flow and payout readiness through the real hosted-onboarding flow,
reading every page without a cookie.

Partial limit: in the full integration run, the 10 suites that drive
`IntegrationBrowser` fail (58 tests) because Chromium cannot start from this
worktree — `Socket path too long: …/.ai/cezar/tmp/7d091915-…/SingletonSocket`,
the constraint `packages/app/tests/integration/AGENTS.md` documents. Confirmed by
launching `agent-browser` directly against `about:blank` outside any test, which
fails identically. Every non-browser suite passes, including the new scenario
(5/5), `mentor-profile.test.ts` (9/9) and `migrations.test.ts` (21/21). Those
browser suites cover password, invitation and Stripe-onboarding UI, none of which
this slice touches; CI runs them from a short checkout path.

Lesson for future runs in a cezar worktree: browser-driven integration tests
cannot run from `.ai/cezar/worktrees/<uuid>/` — the path alone exceeds Chromium's
singleton-socket limit. Prefer non-browser integration coverage where the
behaviour allows it (fetching rendered HTML from the production build proved this
whole discovery journey) and leave the browser suites to CI.

