# 2026-10-28 — E01 Phase 3 step 3.3: invitation inspect/accept, page and API

- **Asked:** implement task 3.3 of `.ai/specs/2026-10-17-accounts-and-roles.md` (Flow 3 steps 2–4): `MentorInvitationService.inspect`/`accept`, `RoleService.grantMentorFromInvitation`, `POST /api/auth/invitations/accept`, the `/invite/[token]` page, with the Phase 3 step 3 unit tests. Integration scenarios and the four races are 3.4; runbook is 3.5.
- **Branch:** `feat/e01-accounts-and-roles`. Outcome: **success**.

## What was done

- **Core:** `validators/auth/invitation-accept.schema.ts` (`{ token }`, `INVITATION_INVALID_MESSAGE`).
- **Services:** `mentor-invitation.service.ts` gains `inspect` (read-only; five states) and `accept` (one transaction: user lock, invitation lock, re-read, 404/403/409 in that order, P9 consume, `acceptedBy`, grant; returns `AccountDto`). `role.service.ts` gains `grantMentorFromInvitation(em, { user, invitation })` with runtime refusal outside the validated path; generic `grant` unchanged, now tested with `// @ts-expect-error`.
- **Route:** `app/api/auth/invitations/accept/route.ts` (`access: "user"`, static `logRoute`).
- **Page:** `app/(frontend)/invite/[token]/page.tsx` + `invitation-panel.tsx` (client wiring). Token-page metadata; `next.config.ts` headers for `/invite/:token` and, when `returnTo` is an invitation, for `/sign-in`, `/sign-up`, `/sign-up/check-email` (these pages now use `generateMetadata` via `returnToPageMetadata`).
- **Home:** `?invitation=accepted` shows "Invitation accepted. You're now a mentor." to a mentor only (`invitation-accepted-notice.tsx`), flag dropped via `dropQueryFlag` (generalized from `dropWelcomeFlag`).
- **UI:** `InvitationPanel` buttons moved onto `useSchemaForm` (`lockAfterSuccess`, `signal`, 429 message); new `InvitationAction` shape. Stories/MDX updated (component, `screens/e01/invitation`, `patterns/sign-in-and-return`), new *Rate limited* story.
- **Tests:** `mentor-invitation.accept.test.ts` (new in-memory em over users/roles/invitations with ordered events), role, route, page, next-config, home, drop-flag, ui panel tests; minimal read-only integration smoke `tests/integration/invitation-page.test.ts`.
- **Docs:** spec "Implementation notes (Phase 3)" Step 3 entry; `track.md` 3.3 ticked; lesson on client-module value imports.

## Key decisions

See the spec's Step 3 notes. In short: unusable link checked before email (404 beats 403); mismatch before already-mentor; destination `/?invitation=accepted` with a mentor-only notice (SM-AC8a); switch-account sign-out returns to the validated invitation path; nested token-bearing `returnTo` pages get the token-page headers/meta.

## Problems met

- Home's notice never rendered in `next start` although unit tests passed: the server page imported a string constant from a `"use client"` module (a client reference across the RSC boundary). Constants moved to `auth-links.ts`; lesson added; the integration smoke now covers the page render.

## Validation

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/…/prepare-share-bundle.mjs`).
- `npm run typecheck`: clean.
- `npm run test:coverage`: 99 files, 1851 tests, 100% statements/branches/functions/lines.
- `npm run build`: success (`/invite/[token]`, `/api/auth/invitations/accept` dynamic).
- `npm run test:integration`: 8 files, 64 tests passed.
- `npm run test:storybook`: 56 files, 341 tests passed (both themes).
- Manual smoke on the production build against the dev DB + Mailpit: `invite create` → link → signed-out page (headers + meta), sign-up + confirm with the invitation `returnTo`, valid page "Accept as Smoke Mentor (…)", accept 200 `AccountDto` `["mentee","mentor"]` with the same session token renewed, second accept 404, reopened page invalid, home notice for the mentor and none signed out, second invitation → "You already have the mentor role." and 409, revoke. All smoke rows (user, invitations, limiter buckets) deleted afterwards.

## Notes for 3.4

- Full Flow 3 browser scenarios per spec Phase 3 step 4; reuse `MailpitInbox` for the `/invite/<token>` link (subject "You're invited to mentor on DevMentor").
- Home's accepted notice is only for a mentor principal; assert it after the full navigation and that a reload no longer shows it.
- Mismatch Sign out navigates to `/invite/<token>` (not `/`); after GitHub cancel the `returnTo` survives via `/sign-in?error=github_cancelled&returnTo=…`, which now carries the token-page headers.
- Races: accept locks user then invitation by `token_hash FOR UPDATE`; resend rotates the hash so a waiting accept re-evaluates to no row → 404; revoke sets `revoked_at` → 404. Two matching sessions serialize on the user lock; loser 404.
