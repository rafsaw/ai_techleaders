# E03 — Mentor discovery (#30, story #40)

- Authority: [product brief](product-brief.md), [backlog](backlog.md), [story #40](https://github.com/rafsaw/ai_techleaders/issues/40), E01 [accounts](implemented/2026-10-17-accounts-and-roles.md), E02 [mentor setup](implemented/2026-10-18-mentor-setup.md).
- Status: proposed for review; PO answered the gate on 2026-11-03. No E03 prototype version is accepted.

## 📝 TLDR

Working developers and freelancers need to find a mentor for a specific blocker. Today DevMentor has public mentor profiles and mentor-managed slots, but no public listing or public slot view. **Proposed future behavior:** anyone can filter a listing of bookable mentors by TypeScript, React or Python, open the same profile from the listing or a direct link, and inspect prices, public work and currently eligible times before E04 adds booking.

## 📝 Problem Statement

One interviewed fintech developer took 40 minutes to find help; two interviewed mentors resisted being listed beside strangers. The first observation motivates a short path from area to profile; the second motivates a direct-link path. These are individual interview accounts, not measured demand. Brief A03 (whether booked help is timely enough) and A04 (mentor supply) remain untested; an empty listing must be a valid state. [Product brief](product-brief.md) · [story #40](https://github.com/rafsaw/ai_techleaders/issues/40).

## 📝 Proposed Solution

Build one discovery capability in two shippable phases: a public listing, then eligible availability on E02's existing profile. The listing includes only mentors whose saved profile, current mentor role and provisioned, ready payout account make them bookable under E02 MD7. A saved profile remains reachable directly when unbookable, says “Not taking bookings yet” and hides slots. A bookable mentor with no eligible times remains listed and gets a truthful empty availability state.

The area filter is a navigable link, not client-side search or a new form system. Discovery adds no booking, hold, account prompt or rating signal. Splitting listing and profile availability into separate specs was considered because E02's direct profile already works alone; the PO chose one spec for #40's journey. A general search service, calendar engine and public JSON API would add contracts without a current consumer.

## 📝 Research

| Source | Useful pattern | Decision here |
| --- | --- | --- |
| Existing [Topmate benchmark](research/2026-09-04-benchmark-topmate.md) | An expert-owned shareable page serves someone who already knows the expert. | Keep `/mentors/<profile id>` as the single destination. This founder observation is not fresh demand evidence. |
| Existing [Codementor benchmark](research/2026-09-04-benchmark-codementor.md) | Area-specific cards expose rates early. | Show area and short plain description on the listing; prices stay on the profile per #40. Skip ratings under N02. This is an older snapshot. |
| Open-source [Cal.com](https://github.com/calcom/cal.diy) and its [FAQ](https://cal.com/faq) | A public profile link and visible time choices make the path legible. | Reuse direct-link and visible-time patterns. Skip event types, calendars, routing forms and embedded booking; E02 stores concrete one-use starts. |
| Open-source [Easy!Appointments](https://github.com/alextselegidis/easyappointments) [guide](https://github.com/alextselegidis/easyappointments/blob/main/docs/installation-guide.md) | Public booking flows connect provider choice to time slots. | Preserve area → mentor → time; skip service catalogs, working hours and calendar sync. |

The open-source products are scheduling references, not evidence that DevMentor's text-session marketplace will work. The [synthetic mentor walkthrough](research/walkthroughs/2026-10-27-mentor-onboarding-session-001/report.md) suggests some mentors may fear the listing; this remains a hypothesis for real-user validation.

## 📝 Architecture

Public routes live in `packages/app/src/app/(frontend)/mentors/`. Keep `MentorProfileService.getPublic(id)` as the direct-profile authority and add a read-only `listBookable(area?)` projection. Both paths must share E02's bookability conditions rather than duplicate subtly different rules. The listing projection contains only profile id, public display name, area and plain description excerpt, never email or payout data. Fetch results without a per-card role/payout query. The existing scoped entity manager and request scope remain the data path.

Add `SlotService.listPublicAvailable(profileId)`: verify the current public profile/bookability state, then read all open slots with `startsAt >= clock.now() + MIN_LEAD_MINUTES` (exactly two hours included), ordered by start and id. Return ISO instants and slot IDs without mutating or reserving anything. Every eligible slot must remain accessible to the visitor; the UI/UX design stage decides how to present the set. A missing or role-revoked profile stays 404; a saved but unbookable profile exposes no public slots. E04 can reuse the read projection, but must recheck role, payout, `booked_at` and D16 inside its atomic booking path. A read is never a slot claim.

E02's `LocalTime` currently lives beside `/mentor/slots`. E03 is its second consumer, so extract it to `@devmentor/ui/components/availability/LocalTime` and update the mentor page import. Preserve the ISO server fallback and browser-zone formatting. New public list/filter and availability components follow `packages/ui/AGENTS.md`: public Tailwind and page colocation until a second consumer exists. Add Storybook and design-system registration for the newly shared `LocalTime` and any other component actually shared. Reuse E02 `MentorProfileHeader`, `PublicWorkLinks`, `PriceList`, `TextOnlyNote`, `NotBookableNotice` and core `formatMoney`. Do not reuse signed-in `SlotList`, which imports backend feedback and withdrawal controls.

The listing and profile render current database state at request time with E02's `connection()` and leaf-page `getPrincipal()` pattern. There is no new `/api/*` surface, cache, provider call or event. E02 webhooks and explicit sync update stored payout state; discovery reads it rather than contacting Stripe for each visitor.

## 📝 Data Model

No new entities, columns, migration or data copy. Reads use existing `mentor_profiles`, `users`, `user_roles`, `payout_accounts` and `availability_slots`. `mentor_profiles.area` is E02 MD3's enum; `payout_accounts` controls bookability; `availability_slots.booked_at IS NULL` and `starts_at` control public availability. Do not store a denormalized “listed” flag, availability count, search index, session data or visitor identity. If a query plan against real seed volume shows a missing index, propose a migration during implementation review rather than inventing one without evidence.

## 📝 Public contracts

| Surface | Input and result | Rules |
| --- | --- | --- |
| `GET /mentors` | Public page, optional `area=typescript\|react\|python`. Without `area`, show all bookable mentors. | Validate with E02's existing `mentorAreaSchema`: exact, case-sensitive enum. Unsupported or repeated `area` shows “Unknown area” with an “All mentors” link, never an unsafe query or server error. Filter URLs are shareable. |
| `GET /mentors/[id]` | Existing E02 public page, now with eligible times only when bookable. | UUID path keeps E02 404 for missing profile or absent mentor role. Unbookable saved profile remains accessible and hides slots. Listing and direct URL show the same page. |
| `MentorProfileService.listBookable(area?)` | `PublicMentorSummaryDto[]`: `{ id, displayName, area, descriptionExcerpt }`. | E02 MD7 bookability, independent of slot count. Sort alphabetically by public display name, then by profile ID as the stable tie-breaker. Excerpt is whitespace-normalized plain text limited to 160 characters; the full description stays on the profile. |
| `SlotService.listPublicAvailable(profileId)` | `{ id, startsAt }[]`, all currently eligible slots in chronological order. | Reapply bookability, open-slot and D16 conditions on each read. No fixed result cap or visitor-facing traversal interaction is prescribed. If the UI/UX design chooses batching, it must keep every eligible slot accessible. |

There is no public JSON route. These DTOs are internal application contracts, not external API promises. E04 must revalidate at selection and checkout because content and eligibility can change between requests. The UI/UX design stage chooses how visitors browse all eligible times; it may not silently hide some of them.

## 📝 UI/UX

### Flow 1 — find a mentor by area

A visitor follows a visible “Find a mentor” link to `/mentors`, sees All and the three area choices, and can select an area without signing in. The current filter is evident in text and `aria-current`; the URL can be copied. Results appear alphabetically by public display name, with profile ID breaking ties. Each result shows public display name, area and a description excerpt of at most 160 characters, with a clear profile link; the full description remains on the profile. Do not show ratings, reviews, employer badges, “verified expert” claims or synthetic availability counts. A ready mentor with no eligible slots still appears; an area with no listed mentors shows an empty state, not an error. At narrow widths the filter wraps and cards remain readable with keyboard focus.

### Flow 2 — evaluate a profile from either entry path

Both paths reach E02's existing page. It shows public work links, the full description, USD prices for 25 and 50 minutes, and the text-only note before any booking choice. For a bookable mentor, a new “Available times” section makes all open starts at least two hours away accessible in the viewer's browser zone with that zone named; the ISO fallback prevents hydration mismatch. UI/UX design determines the presentation mechanism. If none qualify, say “No available times right now” while keeping the profile readable. Times are informational in E03: E04 adds selection and sign-in return. For an unbookable mentor, keep “Not taking bookings yet” and omit the entire time section. A listing-to-profile readiness change follows this profile rule. There is no booking control or sign-in prompt in E03.

The time list is semantic; date and time appear inside `<time dateTime>`. No E03 prototype has PO acceptance; a later mockup is a separate proposal.

## 📝 Edge Cases & Failure Scenarios

| Scenario | Visitor result / invariant |
| --- | --- |
| No bookable mentors, or none in an area | Clear listing empty state and a way to view all areas; no fabricated card. |
| Saved profile lacks payout readiness or provisioning | Absent from listing; direct page says “Not taking bookings yet” and hides slots. |
| Mentor role revoked | Absent from listing; direct page keeps E02's neutral 404. |
| Ready mentor has no slots, only booked slots, or only starts under two hours away | Still listed; profile says no available times. The cutoff is `>= now + 120 minutes` using the server clock. |
| Payout or slot state changes between listing and profile, or while browsing times | Next request reflects stored state. E04 later gives a recoverable unavailable-slot outcome instead of trusting the listing. |
| Invalid or repeated area filter in a copied link | “Unknown area” with an “All mentors” link; no raw database detail. |
| Long description or unusual line breaks | Escaped plain text; bounded list excerpt; full profile preserves E02 line breaks. |
| Invalid profile id, missing profile, or failed database read | Existing 404 for absent records; database failure uses existing error behavior and is not mislabeled as empty. |
| Browser locale/time zone changes | Render stored UTC instant in the browser zone with zone label; never infer the mentor's zone. |

## 📝 Risks & Impact Review

- **Eligibility drift:** the listing, profile and E04 booking can diverge. Keep E02 MD7 and D16 in shared server-side rules, test boundaries, and require E04 transactional rechecks. Showing a time never reserves it.
- **Public visibility:** the listing exposes an already public name and description to more visitors, with no new fields. D13 already makes saved profiles public. The synthetic walkthrough raised discomfort; validate with real invited mentors instead of treating synthetic reactions as evidence or silently changing D04/D13.
- **Scale:** E02 permits slots arbitrarily far ahead. The UI/UX design stage must choose a presentation mechanism that keeps all eligible slots accessible without making large schedules unusable; this spec imposes no fixed count or named traversal control. The initial listing can read all bookable profiles at brief A04's 50-candidate scale; measure query cost before adding a search index. Avoid N+1 payout checks.
- **Compatibility and rollback:** `/mentors/[id]` gets an additive section; `/mentors` and internal methods are additive. Moving `LocalTime` changes an app-local import, not a published package export. E02's forward-looking second-consumer note is updated with this spec; record the actual extraction in `BACKWARD_COMPATIBILITY.md` during implementation. There is no migration. Rolling back E03 code removes the listing and public times while preserving E02 profiles and slots.
- **Evidence limit:** this document does not establish marketplace demand, real Stripe readiness or an end-to-end booking. E02's real Stripe validation and brief Q05/Q13 release conditions remain separate.

## 📝 Decisions in play

| Id | Application here |
| --- | --- |
| D03, D16 | Show only starts meeting the two-hour selection rule; E04 still rechecks when selected. |
| D04, D13 | Listing and direct profiles are public, with exactly three approved area filters. |
| D05; E02 MD4, MD7, MD9 | Listing uses stored bookability; an unbookable saved profile remains directly reachable with a notice. |
| D06, R01, R04 | Profile shows existing 25/50-minute prices before any writing; E03 collects no problem text. |
| N01, N02 | Text-only presentation; no ratings or reviews. |
| PO gate Q1, 2026-11-03 | One spec covers listing and profile availability. |
| PO gate Q2, 2026-11-03 | Show only open starts still meeting the two-hour lead time. |
| PO gate Q3, 2026-11-03 | Hide slots on unbookable direct profiles; retain “Not taking bookings yet.” |
| PO follow-up, 2026-11-03 | Keep all eligible slots accessible; UI/UX design chooses their presentation, with no fixed 20-slot cap or prescribed “Later times” control. Sort listing mentors alphabetically by public display name with profile ID as tie-breaker. Invalid area filters show “Unknown area” and “All mentors”. Listing excerpts are at most 160 characters; profiles retain full descriptions. Keep the two phases inside this one spec. |

No active brief decision, rule or non-goal is superseded. The product owner owns any future change. The direct-link path does not promise a mentor a way to opt out of the listing while bookable; that would need a new product decision.

## 📋 Phasing

| Phase | Story slice | Shippable result | Acceptance |
| --- | --- | --- | --- |
| 1 — public listing | #40, discovery entry | `/mentors` shows bookable mentors alphabetically, area filters, 160-character excerpts, empty states and links to E02 profiles. | #40 listing, filter, bookable-only and no-rating criteria; invalid area copy, signed-out and direct-link journeys work. |
| 2 — public availability | #40, evaluate a profile | All eligible open slots remain accessible on bookable profiles, hidden for unbookable profiles; shared `LocalTime` serves public and mentor pages. | #40 same-profile, available-slots and negative criteria; D16 boundary, more than 20 eligible slots and state-change cases pass. |

Phase 1 can release while the profile still has E02's no-slot view; Phase 2 completes #40. Each phase ends with applicable repository checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:coverage` (100% per source file), `npm run test:integration`, Storybook/token checks for new UI, and an `.ai/runs/` log for an autonomous run. No schema migration is expected.

## 📋 Implementation Plan

Each step leaves the app working. Unit tests are colocated with source; journey tests use `packages/app/tests/integration/` and its configured browser provider.

### Phase 1 — listing and area navigation

1. **Read projection.** Add `listBookable(area?)` to `MentorProfileService`, sharing the same readiness rule as `getPublic`. Test profile/role/provisioning/payout truth-table cases, no-slot inclusion, area equality, alphabetical display-name order with profile-ID tie-breaks, safe DTO fields, 160-character excerpt boundaries and no per-result payout queries. Existing profile behavior remains intact.
2. **Public listing route and navigation.** Add `/mentors`, validate `area`, render filters and linked summaries in `(frontend)`, and expose “Find a mentor” in public navigation without changing signed-in guards. Test unfiltered, each area, empty and invalid/repeated filters showing “Unknown area” plus “All mentors”, signed-out access, keyboard/link semantics and direct profile links. Add Storybook states and design-system entries for reusable presentation components.
3. **Journey verification and contract record.** Real-database integration: ready mentor appears even with zero slots; unready mentor is absent but direct URL works; each area filters; no-mentor and no-rating states work. Record the additive route and UI contracts in `BACKWARD_COMPATIBILITY.md` and phase outcome in a run log if autonomous.

### Phase 2 — eligible public availability

1. **Share the existing time primitive.** Extract E02 `LocalTime` to `@devmentor/ui/components/availability/LocalTime`, update the mentor consumer, and preserve ISO server fallback and browser-zone label. Test server/client output and a time-zone boundary; update the UI registry. Existing pages still render before the new section is introduced.
2. **Public availability read.** Add `SlotService.listPublicAvailable(profileId)` returning all eligible slots in chronological order. Test exact two-hour inclusion and one-minute-short exclusion, booked/withdrawn/past filtering, unbookable/no-role/missing profile behavior, more than 20 eligible slots with none omitted, stable order and safe DTO fields. Document E04's transactional recheck.
3. **Profile journey.** Extend `/mentors/[id]` with the public time section only when E02 says bookable. Use the presentation mechanism selected during UI/UX design and test that every eligible slot remains reachable, including schedules longer than 20 slots. Test listing and direct link produce the same profile, viewer-zone time, empty state, and no slot data or booking action when unbookable. Integration covers readiness change after listing and slot withdrawal between requests. Add Storybook states and design-system entries for reusable presentation.
4. **Close the story contract.** Run the full applicable gate and integration journeys. Update `BACKWARD_COMPATIBILITY.md` with the implemented shared-time export; record #40 acceptance evidence and E04 handoff in a run log if autonomous. Mark E03 implemented only after both phases pass and the spec has been reviewed.
