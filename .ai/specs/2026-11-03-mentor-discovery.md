# E03 — Mentor discovery (#30, story #40)

- Authority: [product brief](product-brief.md), [backlog](backlog.md), [platform primitives](2026-10-17-platform-primitives.md), [story #40](https://github.com/rafsaw/ai_techleaders/issues/40), E01 [accounts](implemented/2026-10-17-accounts-and-roles.md), E02 [mentor setup](implemented/2026-10-18-mentor-setup.md).
- Status: revised after PO review decisions on 2026-11-04. No E03 prototype version is accepted.

## 📝 TLDR

Working developers and freelancers need to find a mentor for a specific blocker. Today DevMentor has public mentor profiles and mentor-managed slots, but no public listing or public slot view. **Proposed future behavior:** anyone can filter a listing of bookable mentors by TypeScript, React or Python, open the same profile from the listing or a direct link, and inspect prices, public work and currently eligible times before E04 adds booking.

## 📝 Problem Statement

One interviewed fintech developer took 40 minutes to find help; two interviewed mentors resisted being listed beside strangers. The first observation motivates a short path from area to profile; the second motivates a direct-link path. These are individual interview accounts, not measured demand. Brief A03 (whether booked help is timely enough) and A04 (mentor supply) remain untested; an empty listing must be a valid state. [Product brief](product-brief.md) · [story #40](https://github.com/rafsaw/ai_techleaders/issues/40).

## 📝 Proposed Solution

Build one discovery capability in two shippable phases: a public listing, then eligible availability on E02's existing profile. The listing includes only mentors whose saved profile, current mentor role and provisioned, ready payout account make them bookable under E02 MD7. A saved profile remains reachable directly when unbookable, says “Not taking bookings yet” and hides slots. A bookable mentor with no eligible times remains listed and gets a truthful empty availability state.

The area filter is a navigable link, not client-side search or a new form system. Put “Find a mentor” on the public homepage; keep E01's `SiteHeader` contract unchanged. Discovery adds no booking, hold, account prompt or rating signal. Splitting listing and profile availability into separate specs was considered because E02's direct profile already works alone; the PO chose one spec for #40's journey. A general search service, calendar engine and public JSON API would add contracts without a current consumer.

## 📝 Research

| Source | Useful pattern | Decision here |
| --- | --- | --- |
| Existing [Topmate benchmark](research/2026-09-04-benchmark-topmate.md) | An expert-owned shareable page serves someone who already knows the expert. | Keep `/mentors/<profile id>` as the single destination. This founder observation is not fresh demand evidence. |
| Existing [Codementor benchmark](research/2026-09-04-benchmark-codementor.md) | Area-specific cards expose rates early. | Show area and short plain description on the listing; prices stay on the profile per #40. Skip ratings under N02. This is an older snapshot. |
| Open-source [Cal.diy community repository](https://github.com/calcom/cal.diy) and the separate [Cal.com FAQ](https://cal.com/faq) | A public scheduling link and visible time choices make the path legible. Both links were checked on 2026-11-04; Cal.diy identifies itself as a community fork of Cal.com. | Reuse direct-link and visible-time patterns. Skip event types, calendars, routing forms and embedded booking; E02 stores concrete one-use starts. |
| Open-source [Easy!Appointments](https://github.com/alextselegidis/easyappointments) [guide](https://github.com/alextselegidis/easyappointments/blob/main/docs/installation-guide.md) | Public booking flows connect provider choice to time slots. | Preserve area → mentor → time; skip service catalogs, working hours and calendar sync. |

The open-source products are scheduling references, not evidence that DevMentor's text-session marketplace will work. The [synthetic mentor walkthrough](research/walkthroughs/2026-10-27-mentor-onboarding-session-001/report.md) suggests some mentors may fear the listing; this remains a hypothesis for real-user validation.

## 📝 Architecture

Public routes live in `packages/app/src/app/(frontend)/mentors/` under the platform catalog's F4 public area and F5 server-read convention. Keep `MentorProfileService.getPublic(id)` as the direct-profile authority and add a read-only `listBookable(area?)` projection. `MentorProfileService` remains the single owner of E02 MD7: factor its existing profile/current-role/provisioned-ready-payout predicate into one private service helper and use it from `getPublic`, `getSetup`, `isBookable` and `listBookable`. Preserve `getPublic`'s 404 for an absent profile or mentor role and `isBookable`'s false result for either case. The listing projection contains only profile id, public display name, area and plain description excerpt, never email or payout data. The existing scoped entity manager and request scope remain the data path. The homepage adds a plain navigation link to `/mentors`; `SiteHeader` is untouched.

For `listBookable`, read area-filtered profiles with their users, then fetch mentor roles for those user IDs and payout accounts for those profile IDs in two set-based queries. Build lookup sets/maps and apply the shared service predicate to each profile. Current entities have no inverse role or payout relations; this avoids per-card queries without adding relations, schema changes or a new eligibility service. Sort the resulting summaries with a case-insensitive English display-name comparison (`Intl.Collator("en", { sensitivity: "accent" })`), then compare profile IDs for names that collate equally. At this course project's expected mentor scale, sorting and excerpting in memory are sufficient.

Add `SlotService.listPublicAvailable(profileId)`: validate `profileId` with E02's `mentorProfileIdSchema` before database access, returning the existing neutral 404 for an invalid ID. This method only retrieves open slots (`booked_at IS NULL`) with `startsAt >= clock.now() + MIN_LEAD_MINUTES` (exactly two hours included), ordered by start and id. Compute the cutoff from the server clock on each read; an old open slot that is now too close disappears from the public display. The profile page first resolves `getPublic(id)` once and calls `listPublicAvailable` only when its `bookable` result is true; it keeps E02's 404 for an absent or role-revoked profile and hides slots on a saved but unbookable profile. A withdrawn slot has been hard-deleted, so no withdrawn status needs filtering. Return ISO instants and slot IDs without mutating or reserving anything. Display every eligible result in one chronological list, with no pagination, batching or “Later times” control. Each item is a session **start time**, not a 25- or 50-minute offer; E04 owns duration and price selection. E04 must use the same `MentorProfileService` MD7 rule and recheck current D16, slot existence and availability at selection/review, post-auth return, checkout/resume and paid claim; E04 defines the transaction-scoped service call. A read is never a slot claim.

E02's `LocalTime` currently lives beside `/mentor/slots`. E03 is its second consumer, so extract it to `@devmentor/ui/components/availability/LocalTime` and update the mentor page import. Preserve the ISO server fallback and browser-zone formatting. Register `availability/LocalTime` in `tailwindDomainComponents` in `eslint.config.mjs` and add an allowed-import case in `tests/eslint-config.test.ts`; the shared file must pass the public Tailwind-only lint boundary. Add its Storybook stories/registry entry and design-system documentation. New public list/filter and availability components follow `packages/ui/AGENTS.md` and platform F3: public Tailwind and page colocation until a second consumer exists. Use page-local text for public empty states; the existing `@devmentor/ui/backend/feedback/EmptyState` and signed-in `@devmentor/ui/components/empty` are not public Tailwind components. Reuse E02 `MentorProfileHeader`, `PublicWorkLinks`, `PriceList`, `TextOnlyNote`, `NotBookableNotice` and core `formatMoney`. Do not reuse signed-in `SlotList`, which imports backend feedback and withdrawal controls.

The listing and profile render current database state at request time with E02's `connection()` and leaf-page `getPrincipal()` pattern. There is no new `/api/*` surface, cache, provider call or event. E02 webhooks and explicit sync update stored payout state; discovery reads it rather than contacting Stripe for each visitor.

### Approved E04 integration amendment (2026-11-04; applies when E04 lands)

[E04](2026-11-04-booking-and-payment.md) preserves E03's public MD7 and current-time D16 predicates and adds checkout holds to availability: exclude non-overdue unreleased holds, but include overdue-held starts as **potentially selectable** candidates without calling Stripe from the projection. Selection/review must reconcile the previous Stripe session before proceeding. Only proof that payment cannot succeed permits release; a paid or uncertain previous attempt rejects the new attempt. Five minutes is a target, not guaranteed availability. Links carry the public slot UUID to `/book/<slotId>` through existing sign-in returnTo; there is no Selection entity, expiry or handle. D16 is rechecked on each relevant request, never frozen at initial selection. A paid claim now failing D16 is compensated under E04.

Withdrawal belongs to E02's `SlotService.withdraw`; E04 adds a 409 `conflict` for an unreleased hold: “This slot has a checkout in progress. Try again after payment is resolved.” Overdue holds are reconciled outside row locks before retrying withdrawal; uncertainty refuses removal. Preserve the existing booked-slot cancellation error. Lock slot then attempt to race safely with checkout/confirmation. E04 also adds a participant-protected booking detail link to booked entries of existing `/mentor/slots`, with no new list. Plan the additive withdrawal/DTO changes in `BACKWARD_COMPATIBILITY.md` when implemented. These are future E04 changes, not claims that E03 already implements holds.

## 📝 Data Model

No new entities, columns, migration or data copy. Reads use existing `mentor_profiles`, `users`, `user_roles`, `payout_accounts` and `availability_slots`. `mentor_profiles.area` is E02 MD3's enum; `payout_accounts` controls bookability; `availability_slots.booked_at IS NULL` and `starts_at` control public availability. Withdrawal hard-deletes an open slot. Do not store a denormalized “listed” flag, availability count, search index, session data or visitor identity. The existing database seed creates only a sample user, so integration tests must arrange mentor roles, profiles, payout states and slots explicitly.

## 📝 Public contracts

| Surface | Input and result | Rules |
| --- | --- | --- |
| `GET /mentors` | Public page, optional `area=typescript\|react\|python`. Missing or one empty `area=` shows all bookable mentors. Page title: “Find a mentor”; include a brief description in metadata. | Validate non-empty values with E02's `mentorAreaSchema`: exact, case-sensitive enum. Unknown non-empty or repeated `area` shows “Unknown area” with an “All mentors” link. No unsafe query or server error. Filter URLs are shareable. |
| `GET /mentors/[id]` | Existing E02 public page, now with eligible start times only when bookable. Optional `fromArea=typescript\|react\|python` records a filtered-list entry. | UUID path keeps E02 404 for missing profile or absent mentor role. Unbookable saved profile remains accessible and hides slots. Listing and direct URL show the same profile content. A valid `fromArea` sets the “Back to mentors” link to `/mentors?area=<value>`; absent, empty or invalid `fromArea` links to `/mentors`. The parameter never changes eligibility, access or profile data. |
| `MentorProfileService.listBookable(area?)` | `PublicMentorSummaryDto[]`: `{ id, displayName, area, descriptionExcerpt }`. | Apply the one MD7 predicate owned by `MentorProfileService`, independent of slot count. Sort case-insensitively by public display name, then by profile ID. Normalize excerpt whitespace, take at most 160 Unicode code points, and append `…` only if the normalized description was truncated; the full description stays on the profile. Listing cards do not show prices. |
| `SlotService.listPublicAvailable(profileId)` | `{ id, startsAt }[]`, all currently eligible slot starts in chronological order. | Validate with `mentorProfileIdSchema` before any database access (invalid → 404). Retrieve only open slots satisfying D16 at read time. The profile caller already gates this read on `getPublic().bookable`; the slot service does not repeat MD7. Return the complete set for one simple list; no pagination, batching or result cap. No duration or price is attached to a slot. |

Filtered listing links append only a validated `fromArea` value to the profile URL; unfiltered listing links and mentor-shared direct URLs omit it. The back link is ordinary same-origin navigation, never an arbitrary return URL. There is no public JSON route. These DTOs are internal application contracts, not external API promises. E04 must revalidate at selection and checkout because content and eligibility can change between requests.

## 📝 UI/UX

### Flow 1 — find a mentor by area

A visitor follows “Find a mentor” on the public homepage to `/mentors`, whose page title is “Find a mentor”, sees All and the three area choices, and can select an area without signing in. `SiteHeader` stays as E01 designed it. The current filter is evident in text and `aria-current`; the URL can be copied. Missing or empty `area` means All; an unknown non-empty area shows “Unknown area” and “All mentors”. Results appear case-insensitively alphabetically by public display name, with profile ID breaking ties. Each card shows public display name, area and a plain description excerpt of at most 160 Unicode code points followed by `…` only if truncated, with a clear profile link. It does not show prices. The full description and both format prices remain on the profile. Do not show ratings, reviews, employer badges, “verified expert” claims or synthetic availability counts. A ready mentor with no eligible slots still appears; an area with no listed mentors shows a page-local public empty state. At narrow widths the filter wraps and cards remain readable with keyboard focus.

### Flow 2 — evaluate a profile from either entry path

Both paths reach E02's existing page. “Back to mentors” returns to the selected area after a filtered-list visit, and to All after an unfiltered-list or direct-link visit. The page shows public work links, the full description, USD prices for 25 and 50 minutes, and the text-only note. For a bookable mentor, “Available times” is one simple chronological list of every open start at least two hours away, in the viewer's browser zone with that zone named; the ISO fallback prevents hydration mismatch. Each item labels a session start, not a selected duration or price. If none qualify, say “No available times right now” while keeping the profile readable. E04 adds duration selection, the matching price, slot selection and sign-in return. For an unbookable mentor, keep “Not taking bookings yet” and omit the entire time section. A listing-to-profile readiness change follows this profile rule. There is no booking control or sign-in prompt in E03.

The time list is semantic; date and time appear inside `<time dateTime>`. No E03 prototype has PO acceptance; a later mockup is a separate proposal.

## 📝 Edge Cases & Failure Scenarios

| Scenario | Visitor result / invariant |
| --- | --- |
| No bookable mentors, or none in an area | Clear listing empty state and a way to view all areas; no fabricated card. |
| Saved profile lacks payout readiness or provisioning | Absent from listing; direct page says “Not taking bookings yet” and hides slots. |
| Mentor role revoked | Absent from listing; direct page keeps E02's neutral 404. |
| Ready mentor has no slots, only booked slots, or only starts under two hours away | Still listed; profile says no available times. Each public read applies `>= clock.now() + 120 minutes`; E04 rechecks at booking. |
| Mentor withdraws an open slot between visits | The slot row has been hard-deleted and disappears on the next read; there is no withdrawn status. |
| Payout or slot state changes between listing and profile, or while browsing times | Next request reflects stored state. E04 later gives a recoverable unavailable-slot outcome instead of trusting the listing. |
| Empty `area=` in a copied link | Treat as All mentors, matching an omitted filter. |
| Unknown non-empty or repeated area filter | “Unknown area” with an “All mentors” link; no raw database detail. |
| Invalid `fromArea` on a direct profile URL | “Back to mentors” links to unfiltered `/mentors`; profile content and access are unchanged. |
| Long description or unusual line breaks | Escaped plain text; normalized listing excerpt counts Unicode code points, truncates after 160 and adds `…` only when truncated; full profile preserves E02 line breaks. |
| Invalid profile id, missing profile, or failed database read | Existing 404 for absent records; database failure uses existing error behavior and is not mislabeled as empty. |
| Browser locale/time zone changes | Render stored UTC instant in the browser zone with zone label; never infer the mentor's zone. |

## 📝 Risks & Impact Review

- **Eligibility drift:** keep MD7 in one `MentorProfileService` helper used by the profile, setup, `isBookable` and listing. The profile gates the slot read on `getPublic().bookable`; `SlotService` does not reimplement MD7. Use E02's `MIN_LEAD_MINUTES` for the read-time D16 cutoff, and require E04 to recheck MD7 and the chosen slot transactionally before booking. Showing a time never reserves it.
- **Public visibility:** the listing exposes an already public name and description to more visitors, with no new fields. D13 already makes saved profiles public. The synthetic walkthrough raised discomfort; validate with real invited mentors instead of treating synthetic reactions as evidence or silently changing D04/D13.
- **Scale:** E02 permits slots arbitrarily far ahead. E03 deliberately shows every eligible start in one list for this course project; do not add pagination, batching, a result cap or a search index without a later need. The initial listing reads all bookable profiles at brief A04's 50-candidate scale. Avoid N+1 payout checks, and revisit the simple list only if real usage shows it is unusable.
- **Compatibility and rollback:** `/mentors/[id]` gets an additive section; `/mentors` and internal methods are additive. Extracting `LocalTime` adds an exported `@devmentor/ui/components/availability/LocalTime` package path through the existing `./components/*` map and changes the E02 app-local import; update both consumers together. The package remains private, and its export map needs no new entry. Record the new protected export and consumer migration in `BACKWARD_COMPATIBILITY.md` when Phase 2 implements it. There is no migration. Rolling back E03 code removes the listing and public times while restoring E02's local time import; profiles and slots persist.
- **Evidence limit:** this document does not establish marketplace demand, real Stripe readiness or an end-to-end booking. E02's real Stripe validation and brief Q05/Q13 release conditions remain separate.

## 📝 Decisions in play

| Id | Application here |
| --- | --- |
| D03, D16 | Show only starts meeting the current two-hour rule; E04 rechecks on selection/review, post-auth return, checkout/resume and paid claim. |
| D04, D13 | Listing and direct profiles are public, with exactly three approved area filters. |
| D05; E02 MD4, MD7, MD9 | Listing uses stored bookability; an unbookable saved profile remains directly reachable with a notice. |
| D06, R01, R04 | Profile shows existing 25/50-minute prices before any writing; E03 collects no problem text. |
| N01, N02 | Text-only presentation; no ratings or reviews. |
| PO gate Q1, 2026-11-03 | One spec covers listing and profile availability. |
| PO gate Q2, 2026-11-03 | Show only open starts still meeting the two-hour lead time. |
| PO gate Q3, 2026-11-03 | Hide slots on unbookable direct profiles; retain “Not taking bookings yet.” |
| PO follow-up, 2026-11-03 | Keep all eligible slots accessible; do not cap them. Sort listing mentors case-insensitively alphabetically by public display name with profile ID as tie-breaker. Unknown areas show “Unknown area” and “All mentors”. Keep the two phases inside this one spec. |
| PO review, 2026-11-04 | Show all eligible starts in one chronological list, without pagination or batching. Keep prices on the profile; homepage gets “Find a mentor” without changing `SiteHeader`. Truncate listing descriptions after 160 Unicode code points and append `…` only when truncated. A slot is a start; E04 chooses duration and price. Empty `area=` means All. “Back to mentors” preserves a valid filtered-list area; direct links return to All. |

No active brief decision, rule or non-goal is superseded. The product owner owns any future change. The direct-link path does not promise a mentor a way to opt out of the listing while bookable; that would need a new product decision.

## 📋 Phasing

| Phase | Story slice | Shippable result | Acceptance |
| --- | --- | --- | --- |
| 1 — public listing | #40, discovery entry | Homepage entry to `/mentors`; bookable mentors sorted case-insensitively alphabetically, area filters, 160-code-point excerpts, empty states and links to E02 profiles with a return path. | #40 listing, filter, bookable-only and no-rating criteria; empty/unknown area copy, signed-out, filtered return and direct-link journeys work; prices stay off cards. |
| 2 — public availability | #40, evaluate a profile | All eligible open starts appear in one chronological list on bookable profiles, hidden for unbookable profiles; shared `LocalTime` serves public and mentor pages. | #40 same-profile, available-start and negative criteria; D16 boundary, long schedule and state-change cases pass. |

Phase 1 can release while the profile still has E02's no-slot view; Phase 2 completes #40. Each phase ends with applicable repository checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:coverage` (100% per source file), `npm run test:integration`, `npm run check:agents`, Storybook/token checks for new UI, and an `.ai/runs/` log for an autonomous run. No schema migration is expected.

## 📋 Implementation Plan

Each step leaves the app working. Unit tests are colocated with source; journey tests use `packages/app/tests/integration/` and its configured browser provider.

### Phase 1 — listing and area navigation

1. **Read projection.** Refactor E02's MD7 check into one private `MentorProfileService` helper used by `getPublic`, `getSetup` and `isBookable`, then add `listBookable(area?)` using that same helper. Fetch area-filtered profiles with users plus mentor roles and payout accounts in set-based queries; the entities have no inverse role/payout relations. Test profile/role/provisioning/payout parity across all four methods, E02's unchanged 404/false cases, no-slot inclusion, area equality, case-insensitive display-name order with profile-ID tie-breaks, safe DTO fields and no per-result role/payout queries. Test excerpts of 159, 160 and 161 Unicode code points, including non-BMP characters, and append `…` only for the last case.
2. **Public listing, homepage entry and return.** Add `/mentors`, validate `area`, render filters, page-local empty text and linked summaries in `(frontend)`, and place “Find a mentor” on the public homepage without extending `SiteHeader`. Add basic `/mentors` title and description metadata. Add “Back to mentors” to the existing profile: filtered listing links carry validated `fromArea`, while unfiltered and direct links return to `/mentors`. Test omitted and empty `area=` as All, each known area, unknown non-empty and repeated area as “Unknown area” with “All mentors”, signed-out access, title metadata, keyboard/link semantics, no prices on cards and valid/invalid/absent return context. Keep listing components page-local under platform F3/F4/F5; do not import the signed-in `EmptyState`.
3. **Journey verification and contract record.** Real-database integration explicitly creates the mentor role, profile and provisioned/ready payout fixture (the seed contains only a sample user): ready mentor appears even with zero slots; unready mentor is absent but direct URL works; each area filters; filtered return preserves the area and direct-link return shows All; no-mentor and no-rating states work. Record the additive route and UI contracts in `BACKWARD_COMPATIBILITY.md` and phase outcome in a run log if autonomous.

### Phase 2 — eligible public availability

1. **Share the existing time primitive.** Extract E02 `LocalTime` to `@devmentor/ui/components/availability/LocalTime`, update the mentor consumer, and preserve ISO server fallback and browser-zone label. Register `"availability/LocalTime"` in `eslint.config.mjs`'s `tailwindDomainComponents` and add the corresponding allowed-import case in `tests/eslint-config.test.ts`; test that the shared file obeys the Tailwind-only boundary. Add the component's Storybook stories and design-system registry entry. Update `packages/ui/docs/design-system.md`: add the shared component to the map and replace its current app-local guidance with the implemented export. Add a dated E03 progress note to `packages/ui/POSTEP.md` when this phase lands; leave its E01/E02 decisions and historical `.ai/runs/` records intact. Test server/client output and a time-zone boundary. Existing E02 pages still render before the new section is introduced.
2. **Public availability read.** Add `SlotService.listPublicAvailable(profileId)` with `mentorProfileIdSchema` validation before database access and a neutral 404 for an invalid ID. Query only existing open slots at or after the read-time `clock.now() + MIN_LEAD_MINUTES`, sorted by start and id; do not call `getPublic` or duplicate MD7 in this service. Test the invalid-ID no-query path, exact two-hour inclusion and one-minute-short exclusion, booked/past filtering, hard-deleted withdrawal, more than 20 eligible starts with none omitted, stable order and safe DTO fields. Confirm that duration and price are not part of a slot DTO; document E04's transactional MD7 and slot recheck.
3. **Profile availability journey.** Extend `/mentors/[id]` with one chronological list of eligible starts only when the existing `getPublic` result is bookable. Resolve that profile once, preserving E02's missing/no-role 404 and saved-unbookable notice. Test viewer-zone time, full description and existing profile prices, empty state, no booking action or slot data when unbookable, and preservation of Phase 1's return link. Integration fixtures explicitly create eligible mentors and slots; tests cover readiness change after listing and a hard-deleted slot between requests. Add Storybook states and design-system entries only for components actually shared.
4. **Close the story contract.** Run the full applicable gate and integration journeys. Update `BACKWARD_COMPATIBILITY.md` with the additive `@devmentor/ui/components/availability/LocalTime` export and E02 consumer migration; record #40 acceptance evidence and E04 handoff in a run log if autonomous. Mark E03 implemented only after both phases pass and the spec has been reviewed.
