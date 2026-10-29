# 2026-10-29 — E01 Phase 3 R12: Accept invitation on an expired session

**Asked:** fix review finding R12 (manual-test prep). `app/(frontend)/invite/[token]/invitation-panel.tsx` posted **Accept invitation** with a bare `apiCall`, unlike `/account` and `/backend/users`, so an expired or elsewhere-signed-out session showed "Authentication required" on the page instead of fully navigating to `/sign-in?error=session_expired&returnTo=/invite/<token>` (SM-AC2, AGENTS.md: "a client that gets 401 from an API does the same full navigation"). Reproduce first with failing tests, fix with the existing pattern, document, full gate, tracker. Stay in Phase 3 (no spec move, no push, no PR).

**Outcome:** success.

## Reproduction (before the fix)

- Unit (`src/app/(frontend)/invite/[token]/page.test.tsx`, where the panel's tests already live; there is no separate `invitation-panel.test.tsx`): two new cases failed, 2 failed / 13 passed:
  - "fully navigates to sign-in with the session-expired banner, back to this invitation, when accept answers 401 (SM-AC2, R12)": `AssertionError: expected "vi.fn()" to be called with arguments` — `navigateFully` never called; the DOM showed the alert "Authentication required" and an enabled **Accept invitation**.
  - "falls back to returnTo=/ for an expired session when the panel has no invitation path": same assertion.
- Integration (`tests/integration/invitation-flow.test.ts`, new describe "a session that expires before Accept (SM-AC2, R12)", run alone on a production build of the unfixed code): 2 failed / 14 passed. The first case timed out on `wait --text "Your session expired."`; its captured snapshot shows `StaticText "Authentication required"` above `button "Accept invitation"` on the invitation page. The follow-up case failed because the browser never reached sign-in ("Expected one link named \"Sign in with GitHub\", found 0").

## Root cause

The Accept `submit` returned `apiCall(...)` directly. The shared helper `unlessSessionExpired` (`src/app/session-expiry.ts`) that maps a 401 `unauthorized` to the full navigation was never applied on this page; `POST /api/auth/invitations/accept` is `access: "user"`, so an expired session answers 401 and the form showed the server's message.

## Fix

- `invitation-panel.tsx`: `submit: async (body, { signal }) => unlessSessionExpired(await apiCall("/api/auth/invitations/accept", …), invitationPath ?? RETURN_TO_FALLBACK)`. The page (`page.tsx`) sets `invitationPath` to `null` only in the `invalid` state, so it is always the validated `/invite/<token>` in the valid state; the `/` fallback only keeps the `string | null` prop honest and is unit-tested for coverage. Doc comment updated with the 401 behaviour.
- **Sign-out decision:** the mismatch-state **Sign out** is unchanged. `POST /api/auth/sign-out` is `access: "optional"` (signed out already, it only answers the destination), so it never returns 401.
- Other client callers checked: `site-header.tsx` (sign-out, optional), sign-in, sign-up and confirm-email forms (public APIs); `/account` and `/backend/users` already wrap.

## Tests

- Unit: 401 → `navigateFully("/sign-in?error=session_expired&returnTo=%2Finvite%2F<token>")` once, no alert, no server message, button stays pending ("Accepting invitation…", disabled), no success navigation; null-path fallback → `returnTo=%2F`. The existing 403/404/409/429 cases still show on the page.
- Integration: a new invitee (`inv-eve-<suffix>`, GitHub-only, so no email rate-limit budget is spent; added to the file's `afterAll` cleanup list) signs in from the invitation via the GitHub stub, its `auth_sessions` row is deleted, Accept lands on the session-expired sign-in with this invitation as `returnTo` (full navigation, page probe gone, no "Authentication required"), the invitation is not consumed and the role is still `mentee`; GitHub sign-in again returns to `/invite/<token>` and accepts (`mentee`, `mentor`). The token is pushed to `seenTokens`, so the evidence check covers it.

## Docs

- `.ai/specs/2026-10-17-accounts-and-roles.md`: R12 entry after R11 in the Phase 3 implementation notes.
- `.ai/lessons.md`: every client call to a `user`/`{ role }` API goes through `unlessSessionExpired`.
- `AGENTS.md`: unchanged; the rule already exists.

## Non-blocking notes from the same review (no behaviour change, recorded only)

2. `next dev` request logging prints request paths, so `/invite/<token>` and `?token=` appear in the dev server's console (dev only; production access-log redaction is already a README release item).
3. The mismatch copy for an unverified account says the invitation needs the verified address it was sent to, even when the signed-in account *is* that address but unverified; wording could be more specific.
4. `invite create` for an address whose account is already a mentor still creates and emails an invitation; the page then says "You already have the mentor role" and nothing is consumed.
5. An in-form 404 on Accept (link revoked meanwhile) shows "This invitation is not valid" with the button still enabled rather than a full stop; and the `/?invitation=accepted` notice is the E01 standalone destination until E02 Phase 1.

## Gate (sequential)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`, unrelated).
- `npm run typecheck`: pass.
- `npm run test:coverage`: 99 files, 1877 tests passed; 100% statements (1941), branches (1072), functions (552), lines (1729), per-file thresholds met.
- `npm run build`: pass.
- `npm run test:integration`: 12 files, 140 tests passed (JUnit `tests="140" failures="0" errors="0"`).
- `npm run test:storybook`: 56 files, 342 tests passed.

No schema change.

## Commits

- `fix(auth): Accept invitation navigates to sign-in on an expired session (R12)` — panel, unit + integration tests, spec, lesson.
- `chore(e01): Phase 3 R12 gate and run log` — `track.md` and this log.
