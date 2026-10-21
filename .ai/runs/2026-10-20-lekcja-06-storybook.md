# Run: lekcja 06, Storybook design systemu DevMentor (ćwiczenie 3)

- Started: 2026-10-20
- Asked: execute `lekcja-06/prompt-storybook.md` stage by stage (0–5), stopping after each stage
  for the PO's "dalej". Progress, decisions and open questions live in `packages/ui/POSTEP.md`.

## Stage 0 (2026-10-20 – 2026-10-21)

- Did: read the brief, backlog, E01/E02/platform specs, references, tokens and lessons; inspected
  the repo; wrote the plan into `packages/ui/POSTEP.md`.
- Decisions (PO): scope E01–E02 only; two kits (shadcn signed-in, Tailwind-only public F3);
  no toast; status roles success/warning; role radii 8/10/12 px; buttons 40/36/32/28 px;
  Geist/Geist Mono via Fontsource; motion 120/180/240 ms; stories colocated and excluded from
  coverage. Outcome: success; the PO committed the plan.

## Stage 1 (2026-10-21)

- Did: installed Storybook 10.6.3 and the planned add-ons; wrote three-layer tokens into
  `globals.css`; theme switch on `<html>`; Foundations pages with live measured contrast;
  `check:tokens` script with tests.
- Key decisions: aligned Vitest to 5.0.5 at the root to avoid a duplicate copy; msw-storybook-addon
  v3 CSF 3 loader; theme synced from globals because docs-only pages run no decorators.
- Checks: build-storybook, browser review of 7 pages in both themes, typecheck, lint,
  test:coverage, next build and test:integration pass. `check:tokens` fails on 18 values in the
  existing components (stage 2). `test:storybook` has no stories yet.
- Outcome: stage complete, waiting for the PO's decisions on proposals P-*.

## 2026-10-21: decyzje o propozycjach etapu 1, start etapu 2

- PO zatwierdził P-T1–T3 (jako role), P-L1–L4 (jako tokeny układu), P-S1, P-TH1 i rozmiary ikon;
  zestaw ikon został luką.
- Dodane tokeny: `--text-page-title`, `--text-section-title`, `--text-body`, `--text-label`,
  `--container-content`, `--container-text`, `--spacing-page-gutter`, `--shadow-overlay`.
  Strony Typography, Spacing and layout, Shape and depth, Icons i Themes zaktualizowane.
- Sprawdzone: build-storybook, lint, typecheck, 7 stron × 2 motywy w Chromium.
- Etap 2: lista różnic względem bazy shadcn w POSTEP.md; pięć pytań B1–B5 (gęstość kontrolek,
  stany przycisku, fokus i błąd, wnętrze paneli, warianty statusu). Partia 1 czeka na odpowiedzi.
- Wynik: częściowy (etap 2 zatrzymany na pytaniach, zgodnie z promptem).

## 2026-10-21: etap 2, partia 1

- Decyzje B1–B5 zapisane w POSTEP.md, tokenach i Foundations („proposal approved by Rafał”).
- Nowe tokeny: `--disabled`, `--disabled-foreground` (kontrast 4,73 / 5,85 : 1 policzony przed
  zapisem), `--spacing-control-md/sm/x`, `--spacing-button-x-*`, `--spacing-panel-compact`,
  `text-control`, `color-scheme` na motywach.
- `cn` z `createCn` (znajomość tokenów); komponenty importują `@devmentor/ui/lib/utils`.
- Przepisane: Button, Input, Label, Field; dodane `ui:add`: Textarea, NativeSelect (CLI nie
  dodało zależności ani nie zmieniło globals.css, sprawdzone diffem).
- 6 stron MDX po 13 sekcji, 34 stories, zamrożone stany przez `preview-states.css`.
- Błędy znalezione w przeglądarce i poprawione: niewidoczny fokus (`outline-solid`), ikona
  kalendarza w ciemnym motywie (`color-scheme`), przewijanie docs przy 320 px, Textarea
  poszerzana przez długi URL (`wrap-anywhere`).
- Sprawdzone: test:storybook w obu motywach (34/34 × 2), lint, typecheck, test:coverage
  (100%), build, test:integration (4/4), check:tokens (0 w partii 1; 12 w partii 2).
- Wynik: partia 1 zakończona, czeka na „dalej” i decyzje P-C1–P-C8, P-F1, link jako przycisk.

## 2026-10-21: etap 2, partia 2

- Card, Badge, Alert, AlertDialog (`ui:add`, bez nadpisania button.tsx), Separator, Table.
- Tokeny: `--spacing-badge`, `--spacing-badge-x`, `--scrim`, `grid-cols-icon-text`,
  `grid-cols-text-action`, `--tw-duration` w `duration-*`.
- Znalezione i poprawione: tabela przy 320 px bez dostępu z klawiatury (axe w teście, `tabIndex`),
  `buttonVariants`/`badgeVariants` bez łączenia klas (link outline bez ramki w ciemnym motywie),
  niestabilny test fokusu w dialogu (`waitFor`).
- Sprawdzone: test:storybook 65/65 × 2, lint, typecheck, test:coverage, check:tokens (0 w ui),
  build, test:integration, przegląd w Chromium 6 stron × 2 motywy × 2 szerokości.
- Wynik: partia 2 zakończona, czeka na „dalej” i decyzje P-C9–P-C11, P-T4, mapowanie stanów.

## 2026-10-21: etap 2, partia 3

- Skeleton (`ui:add`, globals.css i package.json bez zmian mimo komunikatu CLI), Spinner, Empty,
  ErrorMessage, LoadingMessage na tokenach; CrudForm i DataTable na tokenach odstępów.
- Znalezione i poprawione: obrys fokusu tabeli ucinany przez `overflow-hidden` panelu
  `DataTable`; białe ramki przykładów w docs w ciemnym motywie (dotyczyło też partii 1–2).
- Sprawdzone: test:storybook 85/85 × 2, lint, typecheck, check:tokens, test:coverage (222, 100%),
  build, test:integration (4/4), Chromium 5 stron × 2 motywy × 2 szerokości.
- Wynik: partia 3 zakończona, czeka na decyzje P-LD1–P-LD4, P-E1–P-E4 i „dalej”.
- Decyzje po partii 3: P-LD1–P-LD4, P-E1–P-E3 przyjęte; P-E4 (b): domyślny tytuł
  `ErrorMessage` „Couldn't load the data”, `errorTitle` w `DataTable` zapisany jako możliwy później.

## 2026-10-21: etap 2, partia 4

- F2: `ui/src/forms/useSchemaForm.ts` i `field-errors.ts`; `CrudForm` na hooku bez zmiany API
  i testów (nowe: fokus na pierwszym błędzie). F3: `ui/src/frontend/` (TextField, PasswordField,
  SubmitButton, SchemaForm, Notice, LinkButton), eksporty `./forms/*`, `./frontend/*`.
- Znalezione i poprawione: brak eksportu w `package.json` (Vite nie rozwiązał importu), test
  linku nawigujący ramkę testową, brak ikony GitHub w lucide (bez logo, luka).
- Sprawdzone: test:storybook 113/113 × 2, lint, typecheck, check:tokens, test:coverage (235,
  100%), build, test:integration (4/4), Chromium 6 stron × 2 motywy × 2 szerokości.
- Wynik: etap 2 zakończony, czeka na decyzje P-F2–P-F4, P-PF1, P-LB1, P-N1 i „dalej”.
- Decyzje po partii 4: P-F2–P-F4, P-PF1, P-LB1, P-N1 przyjęte („proposal approved by PO(Rafał)”);
  do zrobienia poza DS: „pokaż hasło” w specyfikacji E01 przy Phase 2.
