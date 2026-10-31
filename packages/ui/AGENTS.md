# DevMentor UI

Before building or changing a screen, read [the design system guide](docs/design-system.md), then the linked Storybook component documentation and screen state map. The approved scope and decisions are in [POSTEP.md](POSTEP.md).

Public components are Tailwind-only; signed-in/backend components use the existing Base UI primitives (Q1(a), F3). Keep changes within the approved plan; record missing components instead of adding unapproved variants or dependencies (prompt rule 6).

**`ui` is presentation only:** no data access, no server-only code.

## Reusable API & UI layer

- `src/api/apiCall.ts` (`@devmentor/ui/api/apiCall`): `apiCall` and
  `apiCallOrThrow` are the only sanctioned way to `fetch()` `/api/*`, in every
  area. They always send the CSRF header and parse the envelope defensively.
- `src/backend/forms/CrudForm.tsx`: a schema-driven form bound to the same Zod
  schema as the route. It seeds every field with `""`. Keep it that way: an
  `undefined` value makes Zod report "expected string" instead of the schema's
  own message (e.g. "Name is required").
- `src/backend/tables/DataTable.tsx`: column-config lists with loading, error
  and empty states, pagination, and row actions.
- `src/backend/feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`: the only
  loading, error and empty renderers.
- Zod is a peer dependency of `ui`, since ui only uses its types. The envelope
  types in `src/api/types.ts` mirror `packages/core/src/http/apiHandler.ts`.

Every new reusable component has one designated home:

1. **shadcn primitive:** `src/components/`, added via `npm run ui:add` and never
   hand-written.
2. **Generic, concept-agnostic panel pattern:** `src/backend/<category>/`.
3. **Component tied to one concept's domain shape:**
   `src/components/<concept>/`, named after the concept folder used in `db` and
   `app`.
4. **Used by exactly one page:** colocate it next to that `page.tsx` until a
   second consumer appears.

## Public kit and form core

- **Public kit (F3):** `src/frontend/` (`forms/SchemaForm`, `forms/TextField`,
  `forms/PasswordField`, `forms/SubmitButton`, `feedback/Notice`,
  `actions/LinkButton`), imported as `@devmentor/ui/frontend/<path>`.
- **New Tailwind domain component for a public page:** put it in
  `src/components/<concept>/`, import only the kit, the form core,
  `@devmentor/ui/lib/*` and other listed domain components (through package
  paths, not `./`), add it to `tailwindDomainComponents` in `eslint.config.mjs`,
  and add an allowed case to `tests/eslint-config.test.ts`.
- **Form core (F2):** `src/forms/useSchemaForm.ts` holds the state of both
  `CrudForm` and `SchemaForm`; `src/forms/field-errors.ts` holds
  `toFieldErrors`, `failureMessage` and `RATE_LIMITED_MESSAGE`. Don't
  re-implement form state in a page.
  - `onSubmit(values, { signal })` must pass `signal` to `apiCall` (it aborts on
    unmount) and must not reject.
  - `SchemaForm` passes `lockAfterSuccess`: a public form navigates on success,
    so it stays pending until the page unmounts, a back/forward-cache restore,
    or `SUCCESS_LOCK_TIMEOUT_MS` (10 s). `CrudForm` unlocks right after success.

## shadcn components

- **Adding:** `npm run ui:add -- <component>` from the repo root; dependencies
  go into `@devmentor/ui`. Don't copy component code into `app`.
- **Editing:** treat generated components as owned code: edit them in
  `src/components/` and keep their public API stable.
- Components are built on **Base UI**, not Radix. Style navigation links with
  `<Link href="…" className={buttonVariants({ variant: "outline", size: "sm" })}>`;
  do not render them through `Button`, which adds `role="button"` and changes
  their link semantics (WCAG 4.1.2).

## Styling

- Global styles and theme tokens live only in `src/styles/globals.css`. The
  app's `packages/app/src/app/globals.css` imports it and adds `@source` for the
  ui sources.
- Use `cn()` from `@devmentor/ui/lib/utils` to merge classes.
- There is no `tailwind.config.*`, because Tailwind v4 is configured in CSS.
