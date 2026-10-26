# Konta i role: clickable prototype of Epic 01

Clickable prototype of "Accounts and access" (stories #34, #35, #36), built from the approved screen map
`lekcja-07/mapa-ekranow.md` (approved 2026-10-24) and the components of `@devmentor/ui`. All data is fictional.
**GitHub, email and sign-in are simulations.** No real card, password or email address is collected, nothing is
sent, and nothing is stored outside the browser tab.

This directory is the **source**. It is not imported by the app and not part of the npm workspaces. The **build
output** goes to `packages/ui/.storybook/public/prototypes/konta-i-role/` (git-ignored; it is build output, not
design-system code, so do not commit it). Progress and decisions: `POSTEP.md`.

## Run

Run these from this directory. Dependencies come from the repository's root `node_modules` (React, Vite, Tailwind,
`@devmentor/ui`); there is nothing to install here.

```bash
npm run dev        # Vite dev server with hot reload, for working on the prototype
npm run build      # writes the static prototype to packages/ui/.storybook/public/prototypes/konta-i-role/
npm test           # navigation and simulation tests (Vitest, jsdom)
npm run typecheck  # type-checks the sources
```

To see the built prototype next to the design system, start Storybook and open `/prototypes/konta-i-role/index.html`:

```bash
cd packages/ui && npx storybook dev --config-dir .storybook --host 0.0.0.0 --port 3000 --no-open --ci --disable-telemetry
# http://localhost:3000/prototypes/konta-i-role/index.html
```

## How to use it

- The page opens in **Presentation** mode: one screen at a time, starting at the home page (s07). Switch Presentation
  off to see every screen stacked, each with its note (stories, what is simulated, what is not decided).
- **Review bar** (top): the "Prototype" badge, the screen list (s01 to s14), the demo inbox, **Scenarios**, the
  review-engine buttons (Clickable / Comment, hotspots, Presentation, Threads, pins) and the theme toggle.
  Product navigation is only what the product screens show (the site header); scenario controls are only in the bar.
- **Comments:** choose Comment, click an element, write a note. They live in your browser; "Export for repository"
  and "Export Markdown" in Threads share them (`src/review/` is the engine from `lekcja-07/silnik-przegladu/`).
- **Back** (bottom left, or Backspace) returns to the previous screen. **Reset demo** restores all accounts, the
  inbox, the clock and the scenarios.

### Try this first

1. **GitHub, new person:** Sign in, Sign in with GitHub, Authorize. You land on `/account` with the one-time note
   about your public name (#34).
2. **Email:** Sign in, Create an account, fill the form, open **Demo inbox**, follow the link, enter the password,
   Confirm (#35).
3. **Invitation:** Scenarios, GitHub identity "Bartek", open **Demo inbox**, the invitation for bartek.dab, the link,
   Sign in, Sign in with GitHub, Authorize, Accept invitation. You land on `/` with "Invitation accepted. You're now
   a mentor." (#36).

## Demo accounts

All addresses end in `@example.test`. Pick one under Scenarios, "Signed in as", or sign in the normal way.

| Id | Name | Roles | Signs in with | Use it for |
|---|---|---|---|---|
| a1 | Ola Nowak | mentee | GitHub `ola-nowak` | second GitHub sign-in without a duplicate; "other address" on an invitation |
| a2 | Tomek Wiśniewski | mentee | email, password `zielona-lampa-nad-rzeka` | password sign-in; "you already have an account" mail |
| a3 | Ewa Lis | mentee | email, password `kamienna-brama-2026-x`, **unconfirmed** | refusal and Resend confirmation; confirmation links |
| a4 | Marta Zielińska | mentee, mentor | GitHub `marta-z` | an existing mentor |
| a5 | Jan Kruk | mentee, operator | GitHub `jan-kruk` | the Backend link and `/backend` |
| a6 | Zofia Maj | mentee, mentor, operator | email, password `maly-statek-na-jeziorze` | all roles |
| a7 | Piotr Sowa | mentee | GitHub `piotr-sowa` and password `stara-mapa-z-poddasza` | `/account` with both sign-in methods |
| i1 | Bartek Dąb | mentee | GitHub `bartek-dab` | accepting an invitation with an existing account |
| i2 | Celina Rak | no account | invited; registers with email and any password of at least 15 characters | a newly registered invitee |
| g1, g4 | Kuba Lis, Wiktor Bor | no account | GitHub identities Kuba and Wiktor (c02) | first GitHub sign-in; invitee new on GitHub |
| g2, g3 | | no account | not identities: c01 "no verified email" and "email linked to another GitHub account" reproduce them | the two GitHub error banners |

Invitations (the demo clock starts at Monday 2 November 2026, 10:00 UTC): `demo-bartek`, `demo-celina`,
`demo-wiktor` are valid; `demo-wygasle` is expired, `demo-odwolane` revoked, `demo-uzyte` used, `demo-zly-token`
forged. Confirmation links for Ewa: valid, expired, replaced, claimed by GitHub; one for Tomek: used.

## Scenarios

| Control | Values | What it changes |
|---|---|---|
| Signed in as | signed out or any account | who is signed in, without going through sign-in |
| c01 GitHub result | authorizes, cancelled or denied, unavailable, OAuth state expired, identity without a verified email, email linked to another GitHub account | what the simulated GitHub page leads to |
| c02 GitHub identity | Kuba, Ola, Wiktor, Bartek, Jan | who the GitHub page signs in |
| c03 Sending email | works, SMTP down, address limit used up | whether mails are delivered; both failures give the same neutral text |
| c04 Address typed at sign-up | new, unconfirmed (Ewa), confirmed (Tomek) | pre-fills the email on s02; the page is the same, only the mail differs |
| c05 Too many attempts | off, on | sign-in and resend answer 429, no countdown |
| c06 Confirmation link | valid, expired, used, replaced, claimed by GitHub | opens s04 with that link |
| c07 Invitation link | valid, expired, revoked, used, forged | opens s05 with that link |
| c08 Accepting, next request | works, lost a race (404), already a mentor (409), forced other address (403) | the next Accept only |
| c09 Session | active, expired in the database | the next request ends the session and says so |
| c11 Saving the name, next request | works, field error | the next save only |
| c12 Network and server | works, no network, database unavailable | requests fail; the database case opens s12 |
| c13 Demo clock | fixed, +25 hours, +15 days, +31 days | link, invitation and session expiry |
| c14 Return after sign-in | none, the invitation | pages s01, s02 and s04 carry the way back |
| c15 Reset | Reset demo, Clear inbox | everything; Clear inbox shows the empty mailbox |
| c16 Open /backend | as a mentee, signed out, as an operator | access control for the existing page |

c10 (a role changing during a session) is not a control: the map documents it (s08) and does not simulate it.

## Where each screen state lives

| Screen | States, and how to reach them |
|---|---|
| s01 Sign in | default; wrong email or password; GitHub-only account (Ola's email with any password); unconfirmed + Resend confirmation (Ewa); resend sent / not sent (c03); 429 (c05); the four GitHub banners (c01); with `returnTo` (c14 or from s05); expired-session banner (c09, c13); signed in: redirect |
| s02 Sign up | default; from an invitation (c14 or s05); validation (empty name, bad email, under 15 characters, over 72 bytes, common password); success to s03; existing address (c04); no network (c12); signed in: redirect |
| s03 Check your inbox | sent; not sent (c03); opened without an email: redirect to s02 |
| s04 Confirm email | valid; wrong password; expired; used; replaced; claimed by GitHub (c06); success to `returnTo` |
| s05 Invitation | not valid (c07); signed out; other address; already a mentor (after a 409 in c08, or a mentor with a valid invitation); ready; first-GitHub notice (identity Wiktor); accept failures (c08) |
| s06 Account | default; welcome (identity Kuba); several roles and both methods (Zofia, Piotr); "Name saved"; field errors (empty, over 100, c11); signed out; expired session on save (c09) |
| s07 Home | signed out; mentee; mentor; operator (with Backend); after accepting an invitation |
| s08 Backend | operator; mentee or mentor (the 404); signed out (c16) |
| s11 No access | neutral 404 with a link to `/` |
| s12 Error | database unavailable (c12) |
| s13 Demo inbox | confirmation, "you already have an account" and invitation mails; empty (Clear inbox) |
| s14 GitHub (simulated) | authorize or deny; unavailable (c01) |

The map's 15 documented-only states ([D]: loading and 429 variants, the cross-tab race, failed sign-out, saving in
progress, server error, live role changes) have no separate simulation. The pending labels the design-system forms show
while a request runs ("Signing in…") do appear, because every simulated request takes 300 ms.

## Simulation limits

Read these before drawing conclusions from the prototype.

- **Nothing is real.** There is no GitHub OAuth (no state, PKCE or cookie, only its outcomes), no email delivery, no
  SMTP, no database and no server. A simulated "server" is a few functions in `src/sim.ts` that answer after 300 ms.
- **Nothing persists.** Reloading the page resets accounts, sessions, mails and scenarios. Only the theme and your review
  comments are kept, in the browser's local storage.
- **Passwords are demo passwords** compared as plain text. There is no hashing, no timing equalisation and no
  per-address or per-IP counting: the limits (5 sign-in attempts per 15 minutes, 3 confirmation mails per hour) are
  switches, not counters.
- **No concurrency.** Races (a second tab confirming first, two invitations accepted at once) appear only as the forced
  outcomes of c08. Registration, confirmation and GitHub linking are not locked against each other because nothing runs
  in parallel.
- **Sessions** end when c09 says so or after 30 idle days of demo time at the next request. There is no cookie and no
  renewal rule, and live role changes (c10) are not simulated.
- **Routes are screens.** The address bar shows `#s01`; the product paths (`/sign-in`, `/invite/[token]`) appear in the
  screen labels and in the logic, but no real URL, header (`no-referrer`, `no-store`) or `noindex` exists. Access control
  of the API is not shown, only of the pages.
- **`returnTo` checking** follows the spec's rule (a same-origin page path, at most 512 characters, never `/api`) but not
  every encoding trick a real implementation must handle.
- **Texts invented for the simulation:** the password messages for 72 bytes and common passwords and the list of "common"
  passwords; the public-name notice on s05; the field error from c11; the page texts of s08, s11, s12, s13 and s14. The
  mail texts are the ones approved for the prototype (map, section 3a), not production templates; their expiry dates
  come from each invitation.
- **Scope:** only Epic 01. `/mentor` and Mentor setup (E02), listings, booking and payment are not here. The operator's
  invitation command (#46) has no screen: its effect is the invitation mail. #36 AC4 (no public mentor registration) is
  a test, not a screen.
- **English only,** like the design system.

## Gaps and open questions

Design-system gaps found while building (LD01 to LD13 are in the map, section 5; these are the ones this prototype
touches or adds):

- **LD14.** `SiteHeader` shows "Mentor setup" to every mentor, but the map hides it in Epic 01 (O8). The header gets the
  roles without `mentor`, marked in `src/Frame.tsx`.
- **LD15.** `ConfirmEmailPanel` says "use the link in the most recent email" for an invalid link; the decision L11 wants a
  neutral text. s04 draws its own `Notice` for that state.
- **LD08.** The spec wants `CrudForm resetOnSuccess={false}`; `CrudForm` has no such prop and resets the field after a
  save. s06 keys the form on the saved name. "Name saved" and the expired-session state have no design-system story.
- **LD13.** `SignInOptions` has its own text for a resend that was not sent; the prototype sends the neutral text of PO O3
  as an error instead.
- **LD02, LD03, LD04, LD06, LD07, LD09, LD10, LD12:** screens or states drawn from tokens and existing components, marked
  with `GAP` in the code.

Questions for the specification: the wording of the 72-byte and common-password messages; the exact text of the public-name
notice on the invitation page (the account page has the design system's); what happens to an invitation when the
operator's email failed to send (map L14, O2); how the "shown once" notice is remembered in production (O5).

## Files

| Path | What it is |
|---|---|
| `src/data.ts` | demo accounts, GitHub identities, invitations, confirmation links, mail texts, demo clock |
| `src/sim.ts` | the simulated server and browser state (in memory) and every scenario control |
| `src/routes.ts` | product paths to screens, access gates, the screen list |
| `src/screens.tsx`, `src/Frame.tsx`, `src/notes.ts` | the screens (ids s01 to s14 from the map), the page frame, the per-screen notes |
| `src/ReviewBar.tsx`, `src/links.ts` | the review bar; turning product links into screen changes |
| `src/review/` | the review engine (`prototype.js` unchanged); `mostek.css` maps it to design-system tokens |
| `src/*.test.ts(x)` | routes, simulation rules and click-through tests |
| `POSTEP.md` | stage-by-stage progress, for resuming in a new session |
