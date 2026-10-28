# 2026-10-28 — E01 Phase 2, step 2.6: shared public forms and the password UI

**Asked:** platform F2 (form core) and F3 (public Tailwind kit) as far as still missing, and the password UI: `/sign-in` email form with the resend state, `/sign-up`, `/sign-up/check-email`, `/confirm-email`, and the GitHub-cancelled banner's live link to the email form. Unit tests for every state, the full Step 6 integration list, spec notes, lessons. Docs in AGENTS.md / BACKWARD_COMPATIBILITY.md are step 2.7 (not done here).

**Found:** most of F2/F3 already existed from the design-system work (lesson 06): `useSchemaForm`, `toFieldErrors`, `SchemaForm`, `TextField`, `PasswordField` (with the approved show/hide toggle), `SubmitButton`, `Notice`, `LinkButton`, the ESLint public-area rules, and design-system mocks `SignInOptions` / `ConfirmEmailPanel` with screen stories.

**Done:**
- F2 (`ui/src/forms/`): ref-based in-flight guard, abort on unmount via `onSubmit(values, { signal })`, `failureMessage` / `RATE_LIMITED_MESSAGE` (one 429 copy everywhere). `CrudForm` API and tests unchanged.
- Components (`ui/src/components/auth/`): new `CheckEmailNotice` and `SignUpForm` (stories + mdx, catalog entries, ESLint allow-list); `SignInOptions` cancelled-banner link with focus, SM-AC4 resend copy, one resend at a time; `ConfirmEmailPanel` SM-AC6 copy and the 404-after-open state. Screen mocks updated to the screen-map copy.
- ESLint: allow-list + `tests/eslint-config.test.ts` cases (kit, new components, form core allowed; field/input primitives, Base UI field, look-alike names and relative imports rejected).
- Pages (`app/src/app/(frontend)/`): `/sign-in` with `sign-in-form.tsx`, `/sign-up` with `sign-up-form.tsx`, `/sign-up/check-email`, `/confirm-email` with `confirm-email-form.tsx`, `auth-links.ts`; `Referrer-Policy: no-referrer` for `/confirm-email` in `next.config.ts`.
- Tests: `password-pages.test.tsx` (every page state, 429/network feedback, navigation only after success), updated `/sign-in` tests; `tests/integration/password-ui.test.ts` (10 steps, own browser session, cleans up users and buckets); `IntegrationBrowser.click` scrolls first.

**Decisions** (spec "Implementation notes (Phase 2)", Step 6 bullets): signed-in `/sign-up` redirects like `/sign-in`, check-email and confirm-email render for anyone; `emailSent` travels as `sent=0`; invitation notice when `returnTo` starts with `/invite/`; SM-AC3/4/6 copy overrides the older mocks (P-SCR4 superseded by SM-AC3's "Back to sign-up"); the GitHub-cancelled link is a fragment link that also focuses the email field.

**Problems:** all browser submits did nothing at first: agent-browser clicks at coordinates without scrolling, and the submit buttons were below the 577 px fold (lesson added). A `pkill -f` while debugging killed the shell (known lesson).

**Outcome:** success. lint (0 errors; 1 pre-existing warning in `.agents/`), typecheck, test:coverage (87 files, 1672 tests, 100% per file), build, test:integration (6 files, 54 tests), test:storybook (56 files, 340 tests, light and dark) all pass. Screenshots: `test-results/integration/<run>/password-*.png`.
