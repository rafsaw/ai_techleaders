# Mentor onboarding: discovery prototype, revision 001

- Brief: `.ai/specs/product-brief.md` (refreshed 2026-10-17). Flow: **Key flows → "Future state, a mentor"** (invitation → Stripe onboarding, profile, pricing, availability).
- Date: 2026-10-25. Previous revision: none. Panel report: none supplied, so no `[SYNTHETIC]` suggestions are recorded here.
- This is a grey, clickable simulation with fictitious data. It cannot establish demand, research evidence or production readiness, and approving it does not satisfy the Definition of Ready.
- The product owner approved the simulation boundary in the conversation of 2026-10-25 with four clarifications: follow the brief's definition of bookable; land on `/` after accepting (E01 decision L01); mark E02-specific details as simulation assumptions; leave the brief, specs, screen map and design system unchanged.

## Open and reset

Open `index.html` in a browser (no server needed). **Reset simulation** in the dark bar restores the invitation email, signs out, and clears every input and outcome. Reloading the page also resets it: nothing is stored. The "Test state" panel at the bottom reaches edge states and is not part of the product. Fictitious accounts all use the password `demo-password`: `ada@example.test` (the invited address), `jan@example.test` (another address), `marta@example.test` (already a mentor).

## Scope

- **Actor:** a senior engineer invited by the operator, with no DevMentor account.
- **Start:** the operator's invitation email. **Success:** the mentor sees "You are bookable." (Stripe onboarding confirmed, profile saved) and can publish slots. Slots are a separate availability line, not a condition of bookable.
- **Included:** invitation link, sign-in or account creation (GitHub, or email with confirmation), accepting the invitation, home with notice, Mentor setup checklist, profile, Stripe stand-in, slots, public mentor page.
- **Excluded (outside this prototype):** public listing, slot picking, payment, session screen, operator screens, cancellation and refunds, password reset, mentor-side cancellation policy.

## Brief rules, decisions and non-goals preserved (source-backed)

| Id | What it says | How it appears |
|---|---|---|
| D14 | Mentor role only through a single-use invitation link created manually by the operator; no open mentor registration; one account may hold both roles. Status active, owner product owner, change path: superseding row approved by the product owner. | Flow starts at the invitation; reopening an accepted link is invalid; a mentee account gains the mentor role next to mentee; no mentor sign-up and no operator screen exist. |
| D13 | GitHub is primary sign-in; email and password with email confirmation is the fallback; mentor profiles are public; mentee returns after sign-in. | Sign-in offers both; return to the invitation after signing in. |
| N03 | No password reset in 1.0. | Sign-in states that reset is not available. |
| D05 | Stripe onboarding completes before the profile is bookable. | "Bookable" appears only after the Stripe stand-in reports payouts confirmed. |
| D06 | The mentor sets the price per format; commission 20%, provisional. | Two price fields; commission hint on the form. |
| R01 | Sessions are 25 or 50 minutes. | The two price formats. |
| D04 | Areas are TypeScript, React, Python; public profile. | Area choices; public page. |
| N02 | No ratings; links to public work and a plain description instead. | Profile fields; public page shows no ratings or reviews. |
| N01 | Sessions are text only. | Public page says "Text sessions only" (the brief ties the wording to session screens; see SA8). |
| D12 | Cancellation, refunds, no-shows and disputes are outside the product, with no screens. | Excluded. |
| D16 | A slot is bookable only if it starts at least two hours after the mentee selects it. | Not simulated for mentees. The mentor-side check is an adaptation (SA7). |
| E01 L01 (approved screen map 2026-10-24) | After accepting, navigate to `/` with "Invitation accepted. You're now a mentor." | Implemented exactly; the notice disappears after leaving home. |

Open in the brief and unchanged: Q05 (terms and data processing owner) and the concrete operator email address in Q13, both launch conditions; A04 (enough mentors accept, finish Stripe onboarding and publish slots) is untested and this prototype does not test it.

## Assumptions (`[ASSUMPTION]`)

These come from the E02 draft specification, the E01 screen map, or this simulation's needs. None is an approved brief decision. Confirming the simulation does not remove a tag.

| Id | Assumption | Why needed | How to check |
|---|---|---|---|
| SA1 | Stripe's hosted onboarding is shown as a labelled local stand-in with five states (not started, incomplete, checking, blocked, ready); an unreachable Stripe on start gives an error and changes nothing. | The real pages cannot be simulated. Outcome names follow the E02 draft (G3) loosely. | Tech lead verifies Stripe onboarding (D05 task); E02 spec review. |
| SA2 | After acceptance, a mentor reaches Mentor setup through a header link "Mentor setup". The approved E01 map hides this link in E01 (O8); E02 adds it. | The later steps need an entry point. | Decide link placement when E01 and E02 are reconciled. |
| SA3 | Bookable means profile saved **and** Stripe confirmed; Stripe and slots stay locked until a profile exists. The brief names Stripe onboarding as the gate; the profile requirement comes from E02 (MD7, MD10). | Needed to order the checklist. | E02 spec review. |
| SA4 | Profile rules: one area; description 1 to 2,000 characters; 1 to 5 full https links, no duplicates, error names the line; prices whole USD from 5 to 1,000. | Needed for validation states. Source E02 MD2, MD3, Flow 2. | E02 spec review; the price bounds were not set by the brief. |
| SA5 | Country list: United States, United Kingdom, Germany, Poland, Canada, Switzerland (a sample of E02's supported regions). The country cannot be changed later. | Needed for the Stripe step. | Stripe country support, tech lead. |
| SA6 | Mentor sees one status line ("Not bookable yet: finish ..." or "You are bookable.") and a separate line when bookable with no slots. | Source E02 Flow 1; wording is invented here. | Walk with real mentors. |
| SA7 | A slot is a start date and time. It reserves a 50-minute block; it must start at least 2 hours after the simulated current time (Mon 2 Nov 2026, 10:00) and at least 50 minutes from another slot; a booked slot cannot be removed. Times use the browser's time zone. | Source E02 MD1, MD6, MD11, adapting D16. | E02 spec review. |
| SA8 | The public page is `/mentors/<id>` (shown only as a label), is public before bookable with "Not taking bookings yet", and carries "Text sessions only". | Source E02 MD4, MD5; N01 extended from session screens. | E02 spec review. |
| SA9 | Invitation edge states: used, revoked, expired or forged links give one "not valid" message; a signed-in account with a different address cannot accept; email accounts need a confirmation link; password at least 8 characters. | Source E01 approved map and accounts spec (not the brief, which says only single-use). The 8-character minimum is not sourced and is a simulation choice. | E01 spec and map. |
| SA10 | "Ask for a new invitation" and "Contact the DevMentor team" show `team@example.test`, a fictitious address. | Q13's real address is open. | Q13 resolution before launch. |
| SA11 | Invited address, expiry date (9 Nov 2026) and the one-time GitHub-name notice ("Your GitHub name is shown publicly...") are simulation values carried from the approved E01 map. | Realistic states. | E01 map. |

## Screen and state map

| Screen (hash) | States and actions | Next | Rules and assumptions |
|---|---|---|---|
| Invitation email (`#email`) | Start; "Open the invitation link" | `#invite` | D14, SA11 |
| Invitation (`#invite`) | signed out → Sign in / Create account; signed in with invited address → "Accept as name (email)"; different address → no Accept, sign out or ask for a new invitation; already mentor → no Accept; used/invalid link; accepting (loading); accept errors (race lost, server error with retry) | `#signin`, `#home` | D14, D13, SA9, SA10 |
| Sign in / Create account (`#signin`) | GitHub; email and password with validation and wrong-credentials error; tabs | `#invite` via return, `#confirm`, `#home` | D13, N03, SA9 |
| Check your email (`#confirm`) | simulated link opens the confirmation | return | D13, SA9 |
| Home (`#home`) | notice "Invitation accepted. You're now a mentor."; header shows name, Sign out, Mentor setup | `#mentor` | L01, SA2 |
| Mentor setup (`#mentor`) | status line; three checklist items with locked, not started, saved, incomplete, checking, blocked, ready states; contact panel | `#profile`, `#stripe`, `#slots`, `#public` | D05, SA3, SA6 |
| Profile (`#profile`) | create or edit; validation errors with summary | `#mentor` | D06, R01, D04, N02, SA4 |
| Stripe (`#stripe`, `#stripe-hosted`) | country; start failure; stand-in with "Submit my details" or "Leave before finishing" | `#mentor` | D05, SA1, SA5 |
| Slots (`#slots`) | add with validation; list; remove; booked slot; empty state | `#mentor` | SA7 |
| Public page (`#public`) | not bookable, bookable | `#mentor` or `#home` | N02, N01, SA8 |
| No access / not found / sign-in required | mentee on a mentor page; unknown fragment | `#home`, `#email` | permission-denied and recovery states |

## Verification

Static review passed: all references are local, there are no scripts or styles from elsewhere, no storage, cookies or network calls, forms never submit anywhere, user text is inserted as text nodes, and the brief, specs, screen map, design system and application code are untouched.

Browser walk through the `agent-browser` descriptor (0.35.2, isolated session `mo1`, local `file://` URL), run after installing the pinned binary through the descriptor's own ensure-installed step with the user's approval. Four scripted walks, 73 assertions, 0 failures. Log: [`evidence/browser-walk.log`](evidence/browser-walk.log). Screenshots: `evidence/01-…` to `evidence/32-…`.

| Check | Result | Evidence |
|---|---|---|
| Journey: GitHub sign-in, accept, lands on `/` with notice (L01), profile, Stripe stand-in, "You are bookable.", slots, public page | passed | 01 to 17 |
| Invalid then corrected submissions: profile (errors name line and price bounds), country, slot (too soon, too close), sign-in | passed | 06, 13, 20 |
| Edge states: wrong address, create account and confirm, race lost, accept error then retry, used link, invalid link, already mentor, no access, Stripe start failure, blocked with contact | passed | 21 to 29 |
| Completed action changes later screens (status line, checklist, availability line, public page) | passed | 11, 12, 16, 17 |
| Browser back/forward, unknown fragment recovery, Reset restores start and clears session | passed | 18, 19 |
| Keyboard: Enter submits forms, Accept operable by keyboard, heading focus after navigation, error summary focused and announced as an alert, visible focus outline | passed | 30 |
| Narrow viewport 375 px: no horizontal scroll, actions visible | passed | 31, 32 |
| No storage, cookies or remote requests | passed (storage empty; only the local file loaded) | log end |

Defects found and fixed inside this revision during the walk: the native date-time picker could not be operated by the browser tool and gave no clear group label, so slot start uses two labelled text fields (date and time); the slot error's `aria-describedby` pointed at a missing id, now corrected. The walk was rerun in full afterwards.

Not checked: screen-reader output (announcements were checked only as `role` and live-region markup), exhaustive Tab order on every screen (sampled on sign-in), other browsers, and widths other than 375 and 1280. One assertion in the keyboard walk (aria-invalid on sign-in fields) is a placeholder that carries no information; the sign-in screen reports errors through the alert summary only. The tab buttons "Sign in" and "Create account" share names with the form's submit buttons, which a reviewer may find confusing.
