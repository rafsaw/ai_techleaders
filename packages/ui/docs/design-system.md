# DevMentor design system: read before building a screen

English UI and documentation. Concrete, dense, readable, warm, conversational; avoid generic, showy, noisy, cold and sales-driven presentation (approved reference character words).

## Sources and scope

The approved plan and decision ledger is `../POSTEP.md`; the full task is `../../../lekcja-06/prompt-storybook.md`. Sources R/A/K refer to `../../../lekcja-06/referencje.md`, T/Z/C to `tokeny.md`, D/N to `../../../.ai/specs/product-brief.md`, E01/E02 to their dated specs, and Q/B/P-* to POSTEP decisions. Only E01 accounts/access and E02 mentor setup have approved component/screen scope. E03–E06 and unapproved primitives stay in What is missing. Package components are presentation; API/Stripe/auth persistence remains application work.

## Before coding

1. Open Storybook → Design system → Start here, then the epic and screen state map.
2. Follow How to choose; choose public Tailwind-only components for public routes, signed-in primitives for signed-in/backend routes (Q1(a), F3).
3. Use semantic tokens and `cn` from `@devmentor/ui/lib/utils` (Z6, package contract).
4. Cover data states and simulated API outcomes (prompt stage 3).
5. Check What to avoid, keyboard, narrow screens and themes (prompt stage 4).

## Component map

Storybook links below assume its origin (local default http://localhost:6006).

| Component / exports | Import module | Use when | Do not use when / alternative | Source |
|---|---|---|---|---|
| [Button, buttonVariants](?path=/docs/primitives-signed-in-button--docs) | `@devmentor/ui/components/button` | Run an action; style a navigation anchor with buttonVariants | Submitting a public form: SubmitButton | R01.6, P-C1–C5 |
| [Input](?path=/docs/primitives-signed-in-input--docs) | `@devmentor/ui/components/input` | Single-line signed-in input | Long description: Textarea | B1, E02 Flow 2 |
| [Textarea](?path=/docs/primitives-signed-in-textarea--docs) | `@devmentor/ui/components/textarea` | Mentor description and public-work links | A single-line name: Input | E02 Flow 2 |
| [NativeSelect, NativeSelectOption, NativeSelectOptGroup](?path=/docs/primitives-signed-in-native-select--docs) | `@devmentor/ui/components/native-select` | Choose an area or Stripe country | Searchable discovery: missing E03 pattern | E02 Flow 2–3, P-C8 |
| [Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle](?path=/docs/primitives-signed-in-field--docs) | `@devmentor/ui/components/field` | Compose a labelled control, hint and error | Standalone text: a paragraph | WCAG 1.3.1, 3.3.1, 3.3.2, P-F1 |
| [Label](?path=/docs/primitives-signed-in-label--docs) | `@devmentor/ui/components/label` | Associate a signed-in label and input | Placeholder as a label | WCAG 3.3.2 |
| [Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter](?path=/docs/primitives-signed-in-card--docs) | `@devmentor/ui/components/card` | Group related account or setup information | One card per list row: Separator | B4, R01.3 |
| [Badge, badgeVariants](?path=/docs/primitives-signed-in-badge--docs) | `@devmentor/ui/components/badge` | Name a short state or role | Long explanation: body text | P-C10, WCAG 1.4.1 |
| [Alert, AlertTitle, AlertDescription, AlertAction](?path=/docs/primitives-signed-in-alert--docs) | `@devmentor/ui/components/alert` | Persistent signed-in feedback | Field validation: FieldError | E02 Flow 3, P-PS1 |
| [AlertDialog family](?path=/docs/primitives-signed-in-alert-dialog--docs) | `@devmentor/ui/components/alert-dialog` | Confirm removing a named slot | Ordinary editing: a page/form | E02 Flow 4, WAI-ARIA APG Alert Dialog |
| [Skeleton](?path=/docs/primitives-signed-in-skeleton--docs) | `@devmentor/ui/components/skeleton` | Show the shape of a loading list | Saving a button: Spinner | P-LD1 |
| [Spinner](?path=/docs/primitives-signed-in-spinner--docs) | `@devmentor/ui/components/spinner` | Indicate an operation with a text label | Unknown content shape: Skeleton | P-C4, WCAG 4.1.3 |
| [Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia](?path=/docs/primitives-signed-in-empty-state--docs) | `@devmentor/ui/components/empty` | Explain an empty collection and next action | Request failed: ErrorMessage | E02 UI/UX, prompt stage 3 |
| [ErrorMessage](?path=/docs/primitives-signed-in-error-state--docs) | `@devmentor/ui/backend/feedback/ErrorMessage` | Load error with recovery | Validation of one field: FieldError | P-M5, WCAG 4.1.3 |
| [LoadingMessage](?path=/docs/primitives-signed-in-loading-message--docs) | `@devmentor/ui/backend/feedback/LoadingMessage` | Announce loading once | A confirmed empty list: EmptyState | P-LD1, WCAG 4.1.3 |
| [Separator](?path=/docs/primitives-signed-in-separator--docs) | `@devmentor/ui/components/separator` | Separate dense rows or sections | Layout spacing alone: gap tokens | R01.3, Z4 |
| [Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption](?path=/docs/primitives-signed-in-table--docs) | `@devmentor/ui/components/table` | Compare data in columns | Mentor availability: SlotList | R01.1, WCAG 1.3.1 |
| [SchemaForm](?path=/docs/primitives-public-schema-form--docs) | `@devmentor/ui/frontend/forms/SchemaForm` | Schema-driven public account form | Signed-in form: CrudForm | Q1(a), F3 |
| [TextField, FieldShell](?path=/docs/primitives-public-text-field--docs) | `@devmentor/ui/frontend/forms/TextField` | Labelled public email or name input | Password: PasswordField | F3, WCAG 3.3.2 |
| [PasswordField](?path=/docs/primitives-public-password-field--docs) | `@devmentor/ui/frontend/forms/PasswordField` | Password input with show/hide and hint | Ordinary input: TextField | P-PF1, E01 AD6 |
| [SubmitButton](?path=/docs/primitives-public-submit-button--docs) | `@devmentor/ui/frontend/forms/SubmitButton` | Submit public form with pending text | Navigation: LinkButton | F3, P-C4 |
| [Notice](?path=/docs/primitives-public-notice--docs) | `@devmentor/ui/frontend/feedback/Notice` | Persistent public info, success or error | Signed-in feedback: Alert | F3, E01 Flow 1–3 |
| [LinkButton](?path=/docs/primitives-public-link-button--docs) | `@devmentor/ui/frontend/actions/LinkButton` | Public navigation, primary or text action | Mutation: SubmitButton | F3, WCAG 4.1.2 |
| [SignInOptions](?path=/docs/product-e01-accounts-and-access-sign-in-options--docs) | `@devmentor/ui/components/auth/SignInOptions` | GitHub first, email form, password-reset limitation | Signed-in account: AccountSummary | E01 Flow 1, N03 |
| [InvitationPanel](?path=/docs/product-e01-accounts-and-access-invitation-panel--docs) | `@devmentor/ui/components/auth/InvitationPanel` | Explain and accept mentor invitation states | An invitation-creation UI: outside scope | E01 Flow 3, D14 |
| [ConfirmEmailPanel](?path=/docs/product-e01-accounts-and-access-confirm-email-panel--docs) | `@devmentor/ui/components/auth/ConfirmEmailPanel` | Confirm address and explain expired/used/invalid token | Password reset: excluded | E01 Flow 2, N03 |
| [SignUpForm](?path=/docs/product-e01-accounts-and-access-sign-up-form--docs) | `@devmentor/ui/components/auth/SignUpForm` | Create an email account; N03 and the password rule before typing | Signing in: SignInOptions | E01 Flow 2, AD6, N03 |
| [CheckEmailNotice](?path=/docs/product-e01-accounts-and-access-check-email-notice--docs) | `@devmentor/ui/components/auth/CheckEmailNotice` | Where the confirmation link went, or that it could not be sent | 429: the form error | E01 Flow 2, SM-AC3, SM-AC4 |
| [AccountSummary](?path=/docs/product-e01-accounts-and-access-account-summary--docs) | `@devmentor/ui/components/auth/AccountSummary` | Show email, roles and sign-in methods | Editing display name: CrudForm | E01 UI/UX, D13–D14 |
| [SiteHeader](?path=/docs/product-e01-accounts-and-access-site-header--docs) | `@devmentor/ui/components/auth/SiteHeader` | Account navigation and sign-out on every screen | Session sidebar: excluded | E01 UI/UX, R02.6, P-A4 |
| [WelcomeNotice](?path=/docs/product-e01-accounts-and-access-welcome-notice--docs) | `@devmentor/ui/components/auth/WelcomeNotice` | One-time "your name is public" notice on the `returnTo` page after a first GitHub sign-in | `/account`: AccountSummary `welcome` | E01 Flow 1, SM-AC7 |
| [BookableStatusLine](?path=/docs/product-e02-mentor-setup-bookable-status-line--docs) | `@devmentor/ui/components/mentors/BookableStatusLine` | Explain whether a mentor can take bookings | Treating a saved profile as bookable | E02 Flow 1, MD3, MD4 |
| [SetupChecklist](?path=/docs/product-e02-mentor-setup-setup-checklist--docs) | `@devmentor/ui/components/mentors/SetupChecklist` | Guide profile, payouts and availability setup | Course progress: excluded | E02 Flow 1, Q-SC1, A02 |
| [PayoutStatus](?path=/docs/product-e02-mentor-setup-payout-status--docs) | `@devmentor/ui/components/payments/PayoutStatus` | Render Stripe setup and payout state with next action | Assuming return from Stripe means ready | E02 Flow 3, MD9 |
| [SlotList](?path=/docs/product-e02-mentor-setup-slot-list--docs) | `@devmentor/ui/components/availability/SlotList` | Upcoming availability, loading, empty or error | Discovery filters: E03 missing | E02 Flow 4 |
| [MentorProfileHeader](?path=/docs/product-e02-mentor-setup-mentor-profile-header--docs) | `@devmentor/ui/components/mentors/MentorProfileHeader` | Public name, area and plain description | Ratings and employer prestige | E02 Flow 2, N02, P-PP1–2 |
| [PublicWorkLinks](?path=/docs/product-e02-mentor-setup-public-work-links--docs) | `@devmentor/ui/components/mentors/PublicWorkLinks` | Link to verifiable public work | Testimonials: excluded | N02, P-PP3–4 |
| [PriceList](?path=/docs/product-e02-mentor-setup-price-list--docs) | `@devmentor/ui/components/mentors/PriceList` | Formatted prices for both session durations | Money calculation: application/core | E02 MD2, P17, P-PP5 |
| [TextOnlyNote](?path=/docs/product-e02-mentor-setup-text-only-note--docs) | `@devmentor/ui/components/mentors/TextOnlyNote` | Make the text-only format explicit | Video or call actions: excluded | N01, P-PP6 |
| [NotBookableNotice](?path=/docs/product-e02-mentor-setup-not-bookable-notice--docs) | `@devmentor/ui/components/mentors/NotBookableNotice` | Explain public profile cannot take bookings yet | A booking action before eligibility | E02 MD4, P-PP7 |
| [CrudForm](?path=/docs/patterns-form--docs) | `@devmentor/ui/backend/forms/CrudForm` | Signed-in schema form including textarea/select | Public forms: SchemaForm | F2, Q-CF1, E02 Flow 2 |
| [DataTable](?path=/docs/primitives-signed-in-table--docs) | `@devmentor/ui/backend/tables/DataTable` | Paginated admin data with row actions and feedback | Availability: SlotList | Reusable API/UI layer, Table docs |
| [EmptyState](?path=/docs/primitives-signed-in-empty-state--docs) | `@devmentor/ui/backend/feedback/EmptyState` | Generic empty collection title and next action | Load failure: ErrorMessage | Reusable API/UI layer |
| [SlotRow](?path=/docs/product-e02-mentor-setup-slot-list--docs) | `@devmentor/ui/components/availability/SlotRow` | Open/booked slot with named delete confirmation | Editable booked slot: excluded | E02 Flow 4, P-DC1 |
| [SetupItem](?path=/docs/product-e02-mentor-setup-setup-checklist--docs) | `@devmentor/ui/components/mentors/SetupItem` | One setup item inside SetupChecklist | Course progress or completion percentage | E02 Flow 1, A02 |

## Semantic tokens

| Purpose | Utilities / CSS tokens | Source |
|---|---|---|
| Page / panel / overlay surface | `bg-background`, `bg-card`, `bg-popover`; corresponding `text-*-foreground` | R01.4, T1 |
| Main / secondary text | `text-foreground`, `text-muted-foreground` | R01.5 |
| One main action | `bg-primary text-primary-foreground` via Button/SubmitButton/LinkButton | R01.6 |
| Secondary / hover | `secondary`, `accent` and their foregrounds; accent is not a brand color | T1 |
| Boundaries / field / focus | `border-border`, `border-input`, `outline-ring` | T5, T7, B3 |
| Error / success / warning | `destructive`, `success`, `warning` with text and foreground roles | Q2, WCAG 1.4.1 |
| Disabled controls | `disabled`, `disabled-foreground`; explain the reason in visible text | B2 |
| Hierarchy | `text-page-title`, `text-section-title`, `text-row-title`, `text-body`, `text-label`, `text-meta`, `text-control` | P-T1–3, B1 |
| Code / numbers | `font-mono` only code/paths/configuration; `tabular-nums` for prices/times | R01.2, Q4 |
| Relationships | `gap-in-group`, `gap-between-groups`, `p-panel`, `p-panel-compact`, `gap-component`, `gap-section` | T4, B4 |
| Page geometry | `px-page-gutter`, `max-w-content`, `max-w-text` | P-L1–4 |
| Shape | `rounded-control`, `rounded-button`, `rounded-panel`; pill only Badge | Q3 |
| Overlay depth / motion | `shadow-overlay` only overlays; `duration-control`, `duration-menu`, `duration-dialog`; reduced motion zero | P-S1, Q4 |

Tokens live in `../src/styles/globals.css` (raw → semantic → component). Never reference raw color values from a component. See Foundations/Color for measured contrast in both themes; no color changes without remeasuring actual pairs (T5, prompt rule 3).

## If… use…

| Need | Choice | Source |
|---|---|---|
| Change data / navigate | Button or SubmitButton / real anchor via LinkButton or buttonVariants | F3, WCAG 4.1.2 |
| Long text / finite area choice | Textarea / NativeSelect; public SchemaForm is not a general textarea/select builder | E02 Flow 2, current API |
| Independent choice / immediate setting / one of several | Checkbox / Switch / RadioGroup conceptually; all are missing, do not add silently | prompt stage 4, approved inventory |
| Searchable choice / filtered list | Missing with E03; no ad hoc combobox | Q6(a) |
| Remove slot / substantial editing | AlertDialog / separate page | E02 Flow 2, 4 |
| Field error / persistent problem / transient toast | FieldError or TextField errors / Alert or Notice / no toast in 1.0 | Q5, WCAG 3.3.1 |
| List shape loading / action pending | Skeleton / Spinner plus visible pending verb | P-LD1, P-C4 |
| Compare columns / scan availability / related panel | DataTable / SlotList / Card | R01.1, R01.3, B4 |
| Tabs, menu, popover, tooltip, generic dialog or side panel | Missing: use the existing page and visible text until approved | approved inventory, prompt rule 6 |

SetupChecklist assigns primary styling to the first unfinished item with an action. Waiting for Stripe does not consume primary; failed/blocked has Contact the DevMentor team as an action. Other actions are outline; zero primary only when none can act (Q-SC1 final decisions).

## What to avoid

No ratings, testimonials, invented traction, employer prestige, subscriptions, course progress, video, community feeds or promotional countdowns (A02–A08, N01–N03). No decorative gradients, glass, glow, sparkle/emoji UI, three feature cards, pills everywhere, card nesting, shadow-only grouping or centered body copy (A01, prompt stage 4). Avoid palette classes, arbitrary values, raw colors, unapproved variants, div buttons, placeholder labels, color-only states, unexplained disabled buttons and essential instructions hidden in tooltips (prompt rules 3/6, WCAG 1.4.1, 3.3.2, 4.1.2).

Retain values after errors; validate blur/submit, revalidate visible errors while typing, focus the first invalid field, prevent duplicate submission and show success only after server confirmation (Form pattern, Q-CF1). Real navigation keeps anchor semantics; do not use Base UI render-as-Link for navigation (approved Button docs; root AGENTS discrepancy tracked in POSTEP).

## Content and formats

Direct English, verb + object: Save profile, Publish slot, Remove slot (Q5, P-C3). Explain what happened and how to recover. Badges hold 1–3 words, never wrap; longer explanations go below (P-C10, P-M8 rejected). Prices are USD; use core formatMoney in the application, pass formatted strings to PriceList; retain cents such as $1.40 (E02 MD2/P17). Times are UTC instants in storage, displayed in the viewer's browser zone with the zone named; LocalTime remains app-local (E02 MD6). No password reset in 1.0; preserve the published N03 notice.

## Commands (repository root)

```sh
npm run storybook
npm run build-storybook
npm run check:tokens
npm run test:storybook  # all stories, light then dark; a11y violations fail
npm run lint
npm run typecheck
npm run build
npm run test:coverage
npm run test:integration:install
npm run test:integration
```

New reusable parts need at least two consumers, approved scope, API docs, the 13 required sections, state/width stories, interaction tests and 100% runtime unit coverage. Generated primitives come from npm run ui:add, then check dependency changes (prompt stages 2/4, AGENTS testing rules). The PO approves visual/product choices; do not invent missing defaults. Full guidance: Storybook/Design system/Contributing.
