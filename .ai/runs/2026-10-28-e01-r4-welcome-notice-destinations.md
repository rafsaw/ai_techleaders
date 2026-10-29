# 2026-10-28 — E01 review R4: welcome notice on every returnTo destination

**Asked:** fix review issue R4 (user approved "option A"). Spec Flow 1 step 5 and SM-AC7 (`.ai/specs/2026-10-17-accounts-and-roles.md`) require the one-time "This is the name others see. You can change it." notice after a new account's first GitHub sign-in on `/account?welcome=1` without a `returnTo`, otherwise on the `returnTo` page; never both, never again after a reload or a later sign-in. The code turned an explicit `returnTo=/` into none (a new user went to `/account?welcome=1`), and only `/account` rendered the notice, so `welcome=1` on any other destination showed nothing. Stay in Phase 1.

**Done:**
- `github-sign-in.service.ts`: removed `safeReturnTo` (the `/` special case); every safe `parseReturnTo` value is honoured. `welcome=1` is still only added when the account was created in this callback.
- `packages/ui/src/components/auth/WelcomeNotice.tsx` (+ `welcome-notice.stories.tsx`, `welcome-notice.mdx`, row in `docs/design-system.md`): Tailwind-only info `Notice` with `WELCOME_TITLE`, the display name and a "Change it in Account settings" link (`linkComponent` injected like `SiteHeader`). `AccountSummary` now uses the same `WELCOME_TITLE` constant. Added to `tailwindDomainComponents` and to the allowed public imports in `tests/eslint-config.test.ts`.
- `packages/app/src/app/welcome-notice.tsx` (`AppWelcomeNotice`): client wrapper; latches "show" on first render from `useSearchParams` + `usePathname` (never on `/account`), drops only `welcome` via `history.replaceState` (other params and hash kept, `history.state` preserved), hides for good on a pathname change. Rendered in `(frontend)/layout.tsx` (only with a principal) and `(app)/layout.tsx` inside `<Suspense fallback={null}>`. Added to the public-area ESLint files list.
- Unit tests: service (explicit `/` for new and existing users; `begin` keeps `/`), ui component, wrapper (flag + params/hash, latch after sync, pathname change, `/account`, no flag), both layouts.
- Integration (`app.test.ts`, new block "welcome notice on the returnTo page"): new stub user signs in from `/sign-in?returnTo=%2F`, sees the notice exactly once on `/`, the flag is removed, a reload and `/account` show none; the same account signing in again with `returnTo=/` sees none. The existing "signs in again" case now also asserts no notice on `/`. Screenshot `home-welcome.png`.
- Spec: Phase 1 implementation note for SM-AC7 rewritten; callback row in the API table clarified. No other spec behaviour changed.
- Lesson added (latching vs Next's `replaceState` sync).

**Decisions:**
- Verified the header's **Sign in** on `/` still omits `returnTo` (`site-header.tsx` `signInHref`), so a new user starting from home lands on `/account?welcome=1`; unchanged.
- Suspense: the Next 16 `useSearchParams` docs recommend a boundary and fail a static build without one; these layouts are dynamic (they read the session), but the boundary is added anyway so a future static route cannot break the build.
- The notice body shows the display name so "this is the name" is unambiguous away from `/account`; copy beyond the title ("Your display name: …", "Change it in Account settings") follows SM-AC7's "can be changed in Account settings" and is open for PO review.
- `/account` keeps its own in-card notice and `ForgetWelcome`; `/backend` needs nothing (a new account is never an operator).

**Gate:** `npm run lint` 0 errors (1 pre-existing warning in `.agents/skills/…/prepare-share-bundle.mjs`); `npm run typecheck` pass; `npm run test:coverage` 65 files / 966 tests, 100% statements/branches/functions/lines; `npm run build` pass; `npm run test:integration` 2 files / 29 tests pass; `npm run test:storybook` 54 files / 327 tests pass in light and dark.

**Outcome:** success. Committed in one commit; not pushed. `track.md` left to the user.
