# POSTĘP: design system DevMentor (Storybook)

Prompt: `lekcja-06/prompt-storybook.md`. Pracujemy etapami 0–5, po każdym etapie
czekamy na „dalej” od PO. W nowej sesji najpierw przeczytaj ten plik.

## Stan

| Etap | Status | Data |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony**, wszystkie pytania rozstrzygnięte | 2026-10-20 – 2026-10-21 |
| 1. Fundamenty | **zrobiony**, czeka na „dalej” i decyzje o propozycjach P-* | 2026-10-21 |
| 2. Komponenty bazowe | nie zaczęty | — |
| 3. Komponenty produktu, wzorce, ekrany | nie zaczęty | — |
| 4. Strony, które uczą | nie zaczęty | — |
| 5. Sprawdzenie i raport | nie zaczęty | — |

**Następny krok:** PO decyduje o propozycjach z etapu 1 (P-T1–P-T3, P-L1–P-L4, P-S1,
P-TH1, sekcja „Etap 1: propozycje do decyzji”), potem „dalej” do etapu 2. Etap 2 zaczyna się
od listy różnic kształtu, gęstości i stanów względem bazy shadcn (Z-3).

## Przeczytane materiały

- `.ai/specs/product-brief.md` (D01–D16, N01–N03, R01–R10)
- `.ai/specs/backlog.md` (E01–E06, #28–#47)
- `.ai/specs/2026-10-17-accounts-and-roles.md` (E01: Flow 1–3, UI/UX, Edge cases)
- `.ai/specs/2026-10-18-mentor-setup.md` (E02: Flow 1–4, UI/UX, Edge cases)
- `.ai/specs/2026-10-17-platform-primitives.md` (inwentarz funkcji, F1–F6)
- `lekcja-06/referencje.md` (R01.1–R02.9, A01–A08, K1–K4, luki)
- `lekcja-06/tokeny.md` (T1–T8, Z1–Z8, C1–C8, kontrast)
- `.ai/lessons.md` (m.in. Base UI link = role button, `shadcn add` w monorepo)
- `.ai/specs/research/`: tylko przez brief (nie czytałem wywiadów osobno)
- Audyt z ćwiczenia 1: brak

## Repozytorium (stan zastany)

- npm workspaces, Node 22.23, TypeScript strict, ESM.
- Next.js 16.4, React 19.3, Vitest 5.0.4, Vite 8.3.4 (z Vitest).
- Tailwind CSS 4.3.3, konfiguracja w CSS.
- shadcn styl `base-nova` na Base UI (`@base-ui/react` 1.9), ikony `lucide-react`.
- Tokeny: `packages/ui/src/styles/globals.css`, wciąż domyślne wartości shadcn.
  `.dark` zdefiniowane, nic go nie włącza. Fiolet w `--sidebar-primary` (.dark).
- Font: Geist przez `next/font/google` w `packages/app/src/app/layout.tsx`. Brak Geist Mono.
- Komponenty shadcn: `alert`, `badge`, `button`, `card`, `empty`, `field`, `input`,
  `label`, `separator`, `spinner`, `table` (wartości arbitralne i wygląd bazy).
- Panele backendu: `CrudForm`, `DataTable`, `feedback/*`, `api/apiCall`.
- Pokrycie 100% per plik dla `packages/*/src/**/*.{ts,tsx}` (bez testów i `.d.ts`).
- Storybooka nie ma. `docs/` nie istnieje. `ui/src/frontend/` (F3) jeszcze nie istnieje.

## Decyzje z materiałów (zatwierdzone wcześniej)

1. Charakter: konkretny, gęsty, czytelny, ciepły, rozmowny. Antycharakter: generyczny,
   efekciarski, hałaśliwy, chłodny, sprzedażowy.
2. Listy: gęsty wiersz, tytuł + jedna linia metadanych (R01.1), cienka linia zamiast kart
   (R01.3, Z4), hierarchia rozmiarem i grubością, nie kolorem (R01.5, Z2).
3. Mono tylko dla kodu, ścieżek i konfiguracji (R01.2, Z3).
4. Ciepłe szarości (R01.4), bez koloru akcentu: primary = warm-900 (T1).
5. Jedna akcja główna na ekranie (R01.6, Z1).
6. Sesja (R02.*, C2–C5): poza zakresem tego design systemu (E05), decyzje zostają w referencjach.
7. Antyreferencje A01–A08; konflikty K1–K4 rozstrzygnięte jak w `referencje.md`.
8. Tokeny T1–T8 z `tokeny.md`.

## Decyzje PO podjęte w tej pracy (2026-10-20)

- **Zakres:** komponenty produktu, ekrany i strony epików tylko dla **E01 i E02**
  (mają specyfikacje). E03, E04, E05 (i E06 Later) trafiają do „What is missing”;
  ich ekranów nie wyprowadzamy z briefu.
- **Q1 = (a):** dwa zestawy na tych samych tokenach. Prymitywy shadcn (Base UI) dla strefy
  zalogowanej `(app)` i `/backend`; zestaw publiczny Tailwind-only w `ui/src/frontend/`
  (platform F3) dla stron `(frontend)`. Reguła o stronach publicznych zostaje.
- **Q5:** ton „bezpośredni, bez marketingu, jak w wywiadach” zatwierdzony. Brak toastu
  w 1.0, wpis w „What is missing”.
- **Pominięte prymitywy:** zgoda; wpis w „What is missing”.
- **Z-1 tak:** zostaje API `CrudForm`, `DataTable`, feedback, `apiCall`, publiczne API
  komponentów shadcn, nazwy tokenów shadcn, `cn`.
- **Z-2 tak:** `globals.css` dostaje wartości z `tokeny.md` i nowe tokeny (etap 1).
- **Z-3 tak, w etapie 2:** przeróbka klas istniejących komponentów dopiero w etapie 2.
  Etap 1 ich nie rusza (zmienią wygląd tylko przez nowe wartości tokenów).
- **Z-4 tak:** usuwamy fioletowy `--sidebar-primary` w `.dark`.
- **Z-5 tak:** nie ruszamy `(frontend)/page.tsx` ani fontu w `layout.tsx`.
- **Q6 = (a):** wzorzec „lista z filtrami” trafia do „What is missing” razem z E03.
- **Z-6 zmienione przez PO:** stories (`*.stories.tsx`) i strony dokumentacji komponentów
  (`*.mdx`) leżą obok komponentów w `src`; `**/*.stories.tsx` dodajemy do `exclude`
  bramki pokrycia w `vitest.config.ts`.

## Decyzje PO z 2026-10-21 (Q2–Q4, akcent)

- **Q2. Statusy:** dodajemy role `success` i `warning` (rola, nie konkretny odcień;
  odcień dobieramy w etapie 1). Kontrast liczymy w obu motywach. Status zawsze ma też
  tekst albo ikonę, nigdy sam kolor (WCAG 1.4.1). `destructive` tylko dla błędów
  i akcji nieodwracalnych.
- **Q3. Kształt i rozmiary:** promienie według roli: małe kontrolki 8 px, przyciski 10 px,
  karty i panele 12 px (nie 16 px, bo Z5 wyklucza `rounded-2xl` na panelach i kartach).
  Pigułka tylko dla plakietek. Rozmiary przycisków 40 / 36 / 32 / 28 px.
- **Q4. Fonty:** Geist i Geist Mono jako wartości startowe, dołączone przez
  `@fontsource-variable/geist` i `@fontsource-variable/geist-mono`. Wybór kroju zostaje
  luką. Cyfry tabelaryczne (`tabular-nums`) dla cen i godzin.
- **Q4. Ruch:** 120 ms kontrolki, 180 ms menu, 240 ms okna; przy
  `prefers-reduced-motion` 0 ms. Nie animujemy sukcesu przed potwierdzeniem serwera.
- **Akcent:** zostaje luką. A01 wyklucza fiolet i indygo jako kolor akcji.

## Otwarte pytania

Brak. Luki świadomie zostawione: kolor akcentu, wybór kroju fontu, kolory wykresów
(`chart-*` bez zmian, nieużywane w E01/E02).

## Plan techniczny

- Pakiet: `packages/ui` (`@devmentor/ui`), Storybook w `packages/ui/.storybook`.
- Storybook **10.6.3**, framework `@storybook/react-vite` (ui nie zależy od Next;
  peer: vite ^5–^8, React 19; addon-vitest: vitest ^4 || ^5).
- Zależności dev w `@devmentor/ui` (nic poza tą listą):
  `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`,
  `@storybook/addon-vitest`, `@storybook/addon-themes`, `@vitest/browser-playwright`,
  `playwright`, `vite`, `@tailwindcss/vite`, `remark-gfm`, `msw`, `msw-storybook-addon`.
  Fonty (Q4): `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`
  (zależności `@devmentor/ui`, importowane w preview Storybooka; aplikacja zostaje
  przy `next/font`, Z-5).
- Nowe tokeny z decyzji z 2026-10-21: `--success`, `--warning` (+ `-foreground`,
  oba motywy), `--radius-control` 8 px, `--radius-button` 10 px, `--radius-panel` 12 px,
  `--radius-pill` (tylko plakietki), wysokości przycisków 40/36/32/28 px,
  `--duration-control` 120 ms, `--duration-menu` 180 ms, `--duration-dialog` 240 ms
  (0 ms przy `prefers-reduced-motion`), `--font-mono`. Nazwy ostateczne w etapie 1.
- Symulowanie API: MSW (klient rozmawia z `/api/*` przez `apiCall`, koperta
  `{ ok, data | error }`, nagłówek CSRF). Potrzebne dla formularzy E01/E02.
- Motyw: `withThemeByClassName` ustawia `.dark` na `<html>` (zasada 9).
- Preview: `a11y: { test: 'error' }`, import `globals.css`, Unstyled w MDX.
- Branding: `manager.ts` z tytułem „DevMentor”, bez logo Storybooka, wyłączone
  powiadomienia o wersji, telemetria i checklista startowa (onboarding nieinstalowany).
- Układ plików:
  - stories i MDX komponentu obok niego, np. `src/components/button.stories.tsx`,
    `src/components/button.mdx`;
  - strony ogólne i Foundations: `src/docs/**/*.mdx`;
  - stories ekranów (pełny ekran, mapa stanów): `src/screens/<epic>/*.stories.tsx`,
    złożone wyłącznie z komponentów pakietu;
  - pomocnicze bloki dokumentacji (próbka koloru, tabela kontrastu): `.storybook/blocks/`,
    bez eksportu z pakietu;
  - stany podglądu (`data-preview-state`): CSS w `.storybook/preview-states.css`.
- Bramka pokrycia: `vitest.config.ts` → `exclude` dostaje `**/*.stories.tsx` (decyzja PO).
  Testy stories uruchamia osobna konfiguracja `packages/ui/vitest.storybook.config.ts`
  (projekt storybook, Chromium), poza `test:coverage`.
- Skrypty w `@devmentor/ui`: `storybook` (port 6006), `build-storybook`, `test:storybook`,
  `test:storybook:themes` (oba motywy po kolei), `check:tokens`
  (`packages/ui/scripts/check-tokens.mjs`; exit 1 przy kolorze spoza pliku tokenów,
  klasie palety Tailwinda, wartości arbitralnej w `packages/ui/src`). W root aliasy
  `storybook`, `build-storybook`, `test:storybook`, `check:tokens`.
- Plik dla agentów: `docs/design-system.md` + odwołanie w AGENTS.md (etap 4).

## Inwentarz: prymitywy, strefa zalogowana i `/backend` (shadcn, Base UI)

| Komponent | Stan | Ekrany |
|---|---|---|
| Button (primary, secondary, outline, ghost, destructive, link) | jest | /mentor („Continue to Stripe”, „Retry setup”, „Check status”), /mentor/slots („Publish slot”, „Remove”), /account („Save”), /backend |
| Input | jest | /account (display name), /mentor/profile (ceny), /mentor/slots (datetime-local) |
| Textarea | dodać (`ui:add textarea`) | /mentor/profile (opis, linki) |
| NativeSelect | dodać (`ui:add native-select`) | /mentor/profile (obszar), /mentor (kraj Stripe) |
| Field + Label (etykieta, podpowiedź, błąd, wymagane/opcjonalne) | jest | wszystkie formularze strefy zalogowanej |
| Card / panel | jest | /mentor (checklista), /account |
| Badge | jest | /account (role), /mentor/slots (Open/Booked), /mentor (stan pozycji) |
| Alert | jest | /mentor (`?stripe=returned`, `check_failed`), /account (`welcome=1`) |
| AlertDialog | dodać (`ui:add alert-dialog`) | /mentor/slots (usunięcie slotu) |
| Skeleton | dodać (`ui:add skeleton`) | /mentor/slots (ładowanie listy) |
| Spinner | jest | wysyłanie formularzy, „Check status” |
| Empty | jest | /mentor/slots („No upcoming slots…”) |
| ErrorState (`backend/feedback/ErrorMessage`) | jest | błąd ładowania list |
| Separator | jest | listy (Z4) |
| Table | jest | /backend/users (`DataTable`) |

## Inwentarz: prymitywy publiczne (Tailwind-only, `ui/src/frontend/`, platform F3)

| Komponent | Stan | Ekrany |
|---|---|---|
| `forms/SchemaForm` | nowy (F3) | /sign-in, /sign-up, /confirm-email |
| `forms/TextField` | nowy (F3) | /sign-in, /sign-up |
| `forms/PasswordField` | nowy (F3, Phase 2) | /sign-in, /sign-up, /confirm-email |
| `forms/SubmitButton` | nowy (F3) | /sign-in, /sign-up, /confirm-email, /invite |
| `feedback/Notice` (info, success, error; `role=status/alert`) | nowy (F3) | banery `github_*`, N03, „Check your inbox”, stany /confirm-email i /invite, „Not taking bookings yet” |
| `actions/LinkButton` (link jako przycisk i link tekstowy) | nowy (F3) | „Sign in with GitHub” (prawdziwy link), „Create an account”, „View public page” |

`SchemaForm` korzysta z `useSchemaForm` (F2, `ui/src/forms/`). F2 to wydzielenie logiki
z `CrudForm` bez zmiany jego API. Reguły ESLint z F3 (zakaz shadcn/Base UI w `frontend/`)
zostają w specyfikacji E01 Phase 2; design system ich nie dodaje.

## Inwentarz: komponenty produktu (E01, E02)

| Epik | Komponent | Zestaw | Folder | Ekran |
|---|---|---|---|---|
| E01 | SignInOptions (GitHub pierwszy, formularz e-mail, notka N03) | publiczny | `components/auth/` | /sign-in |
| E01 | InvitationPanel (5 stanów Flow 3) | publiczny | `components/auth/` | /invite/[token] |
| E01 | ConfirmEmailPanel (4 stany Flow 2) | publiczny | `components/auth/` | /confirm-email |
| E01 | AccountSummary (e-mail, role, metody logowania) | shadcn | `components/auth/` | /account |
| E01 | SiteHeader (Sign in / nazwa + Sign out, Mentor setup, Backend) | publiczny (Tailwind-only, więc działa w obu strefach) | `components/auth/` | wszystkie |
| E02 | BookableStatusLine (4 warianty) | shadcn | `components/mentors/` | /mentor |
| E02 | SetupChecklist + SetupItem (stan tekstem + jedna akcja) | shadcn | `components/mentors/` | /mentor |
| E02 | PayoutStatus (provisioning przed payout; ready/pending/incomplete/blocked) | shadcn | `components/payments/` | /mentor |
| E02 | SlotList + SlotRow (Open/Booked, czas wstawiany przez `children`) | shadcn | `components/availability/` | /mentor/slots |
| E02 | MentorProfileHeader (nazwa, obszar) | publiczny | `components/mentors/` | /mentors/[id] |
| E02 | PublicWorkLinks (host + ścieżka, „opens in a new tab”) | publiczny | `components/mentors/` | /mentors/[id] |
| E02 | PriceList („25 min · $40”) | publiczny | `components/mentors/` | /mentors/[id] |
| E02 | TextOnlyNote (N01) i NotBookableNotice (MD4) | publiczny | `components/mentors/` | /mentors/[id] |

`LocalTime` zostaje w aplikacji (`mentor/slots/local-time.tsx`), tak jak każe E02 UI/UX
(jeden konsument). `SlotRow` przyjmuje sformatowany czas jako `children`.

## Inwentarz: wzorce

| Wzorzec | Gdzie w produkcie |
|---|---|
| Formularz (walidacja po opuszczeniu pola i przy wysłaniu, fokus na pierwszym błędzie, dane zostają, blokada podwójnego wysłania, sukces po odpowiedzi serwera; MSW: sukces, oczekiwanie, błąd pola, błąd serwera, brak sieci) | /sign-up (publiczny), /mentor/profile (shadcn), /mentor/slots (shadcn) |
| Widok szczegółów (+ „nie istnieje albo brak dostępu”, 404) | /mentors/[id] |
| Potwierdzenie usunięcia („Remove slot” z datą w pytaniu) | /mentor/slots |
| Checklista z jedną następną akcją | /mentor (E02 Flow 1) |
| Logowanie z powrotem (`returnTo`) | /sign-in z /invite/[token] (E01 Flow 3, P6) |
| Status od zewnętrznego dostawcy (Check status, Try checking again) | Stripe onboarding (E02 Flow 3) |
| Lista z filtrami | „What is missing”, razem z E03 (Q6 = a) |

## Ekrany (stories na pełny ekran, z mapą stanów)

- E01: /sign-in, /sign-up, /sign-up/check-email, /confirm-email, /invite/[token], /account.
- E02: /mentor, /mentor/profile, /mentor/slots, /mentors/[id].

## „What is missing” (już ustalone wpisy)

- E03 Discovery (#30, #40), E04 Booking and payment (#31, #41–#43), E05 Text session
  (#32, #44–#45): brak specyfikacji, brak ekranów i komponentów.
- E06 Later (#33).
- Prymitywy poza zestawem: Checkbox, RadioGroup, Switch, Avatar, Dialog, Menu, Popover,
  Tooltip, Tabs (żaden ekran E01/E02 ich nie potrzebuje).
- Toast: brak w 1.0 (decyzja PO).
- Wzorzec „lista z filtrami”: razem z E03, bo żaden ekran E01/E02 nie ma filtrów (Q6 = a).

## Drzewo menu Storybooka (plan)

```
Design system
  Start here · Components · How to choose · Usage and accessibility · Content
  What to avoid · What is missing · Contributing
  Epics/ E01 Accounts and access · E02 Mentor setup
Foundations
  Color · Typography · Spacing and layout · Shape and depth · Motion · Icons · Themes
Primitives
  Signed-in/ Button · Input · Textarea · Native select · Field · Label · Card · Badge
             Alert · Alert dialog · Skeleton · Spinner · Empty state · Error state
             Separator · Table
  Public/    Schema form · Text field · Password field · Submit button · Notice · Link button
Product
  E01 Accounts and access/ Sign-in options · Invitation panel · Confirm email panel
                           Account summary · Site header
  E02 Mentor setup/ Bookable status line · Setup checklist · Payout status · Slot list
                    Mentor profile header · Public work links · Price list
                    Text-only note · Not bookable notice
Patterns
  Form · Detail view · Delete confirmation · Setup checklist · Sign-in and return
  Provider status
Screens
  E01/ Sign in · Sign up · Check email · Confirm email · Invitation · Account
  E02/ Mentor setup · Profile form · Slots · Public profile
```

Szacunek: ok. 55 stron MDX (8 ogólnych, 7 Foundations, 2 epiki, ~37 stron komponentów
i wzorców), 22 prymitywy × ~6 stories ≈ 130, 14 komponentów produktu × ~6 ≈ 85,
6 wzorców × ~6 ≈ 35 (formularz ~10 ze stanami API), 10 ekranów × ~4 stany ≈ 40.
Razem ok. 290 stories.

## Etap 1: co zrobione (2026-10-21)

- **Zależności** (tylko z planu): w `@devmentor/ui` devDependencies `storybook`,
  `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`,
  `@storybook/addon-vitest`, `@storybook/addon-themes` (wszystkie 10.6.3),
  `@vitest/browser-playwright`, `playwright`, `vite`, `@tailwindcss/vite`, `remark-gfm`,
  `msw`, `msw-storybook-addon`; dependencies `@fontsource-variable/geist`,
  `@fontsource-variable/geist-mono`. Root: `vitest` i `@vitest/coverage-v8` z `^5.0.4` na
  `^5.0.5`, bo addon-vitest ściągał drugą kopię Vitest 5.0.5 (jedna wersja w drzewie).
- **Storybook** w `.storybook/`: `main.ts` (docs z remark-gfm, a11y, vitest, themes, msw,
  wyłączona telemetria i powiadomienia o nowościach), `preview.tsx` (`a11y: { test: "error" }`,
  motyw na `<html>` także dla stron MDX bez stories, MSW loader, kolejność menu),
  `manager.ts` (marka „DevMentor”, tytuł karty, ukryty nagłówek i tytuł ramki bez słowa
  Storybook, wyłączona checklista startowa), `preview.css` (tokeny, fonty, ciemne strony docs),
  `public/mockServiceWorker.js` (z `msw init`).
- **Testy stories:** `vitest.storybook.config.ts` (Chromium przez Playwright). Skrypty:
  `storybook`, `build-storybook`, `test:storybook`, `test:storybook:themes`, `check:tokens`
  (w `@devmentor/ui`) i aliasy w root (`test:storybook` uruchamia oba motywy).
- **Tokeny** w `src/styles/globals.css`, trzy warstwy, komentarz ze źródłem przy każdym
  tokenie znaczeniowym: surowe (`--warm-*`, `--red/green/amber-*`, fonty), znaczeniowe
  (kolory shadcn + `--success`, `--warning`, `--spacing-in-group/between-groups/panel/
  component/section`, `--text-row-title`, `--text-meta`, `--radius-control/button/panel/pill`,
  `--duration-control/menu/dialog`, `--font-mono`), komponentowe (`--spacing-list-row-y`,
  `--spacing-list-row-gap`, `--spacing-button-lg/md/sm/xs`). Fiolet usunięty (Z-4).
  Klasy: `gap-in-group`, `p-panel`, `text-row-title`, `rounded-panel`, `h-button-md`,
  `duration-control`, `text-success`… Reduced motion: 0 ms dla tokenów i animacji.
- **Wartości `--warm-*`:** tokeny.md podaje L i zakres nasycenia 0,003–0,013, bez wartości
  na stopień. Przyjęte nasycenie: 0:.003, 50:.004, 100:.006, 200:.008, 300:.010, 400:.012,
  450–500:.013, 600:.012, 700:.011, 800:.009, 900:.007, 950:.005. Hex skrajnych stopni zgodny
  z tokeny.md (#fffdfb, #0b0a08).
- **success / warning (Q2):** jasny `oklch(0.5 0.12 150)` i `oklch(0.52 0.11 65)`, ciemny
  `oklch(0.75 0.14 150)` i `oklch(0.78 0.13 75)`. Wartości startowe.
- **Kontrast:** policzony przed zapisem (skrypt w scratchpadzie) i zmierzony w przeglądarce
  na stronie Foundations/Color; wyniki zgodne. Wszystkie pary tekstu ≥ 4,5, UI ≥ 3 poza
  `border` (wyjątek T7). Rozbieżność z tokeny.md: `border`/`background` w ciemnym = 1,89,
  a tokeny.md podawał 1,31; obie wartości < 3, wyjątek T7 bez zmian.
- **Strony Foundations** (`src/docs/foundations/*.mdx`): Color (role, tabela kontrastu mierzona
  na żywo w obu motywach), Typography, Spacing and layout, Shape and depth, Motion, Icons,
  Themes. Bloki pomocnicze: `.storybook/blocks/{contrast.ts,tokens.tsx}`.
- **Skrypt tokenów:** `scripts/check-tokens.mjs` (exit 1), testy `tests/check-tokens.test.ts`.
  Dziś znajduje 18 wartości w istniejących komponentach (alert, badge, button, card); to
  zakres Z-3 w etapie 2. Aplikacja: 7 pozycji tylko informacyjnie (Z-5).
- **Konfiguracja repo:** `vitest.config.ts` wyklucza `**/*.stories.tsx` z pokrycia (Z-6),
  `eslint.config.mjs` ignoruje `storybook-static` i wygenerowany worker MSW, `.gitignore`
  dostał `storybook-static/`, `packages/ui/tsconfig.json` obejmuje `.storybook`.

## Etap 1: co sprawdzone

- `npm run build-storybook`: OK. Zbudowany Storybook obejrzany w Chromium (1440 px) na 7
  stronach w obu motywach: tabele Markdown renderują się jako tabele (0 surowych `|---`),
  `<html>` ma `dark` w ciemnym motywie, Geist Variable załadowany, brak błędów konsoli,
  w managerze brak tekstu „Storybook” (także ukryty nagłówek, tytuł karty).
- Testy stories: tymczasowa story (usunięta) potwierdziła, że play function działa, naruszenie
  a11y (`image-alt`) kończy test błędem, a przebieg `STORYBOOK_THEME=dark` ma `.dark` na `<html>`.
- `npm run typecheck`, `npm run lint`, `npm run test:coverage` (21 plików, 207 testów, 100%),
  `npm run build` (Next.js), `npm run test:integration` (4/4): OK.
- `npm run check:tokens`: exit 1 (18 pozycji w istniejących komponentach, etap 2).

## Etap 1: czego nie sprawdzono

- `npm run test:storybook` kończy się błędem „No test files found”, bo nie ma jeszcze żadnej
  story (pierwsze w etapie 2). Strony MDX nie są testowane przez Vitest; a11y stron docs
  sprawdzę w etapie 5.
- Szerokości 320 i 768 px dla stron Foundations (tabele mają przewijanie poziome).
- Wygląd aplikacji (`/backend`, `/`) po zmianie tokenów obejrzany tylko przez testy integracyjne.
- `check:tokens` nie jest dodany do CI (padłby do czasu etapu 2).

## Etap 1: propozycje do decyzji (bez źródła w materiałach)

- **P-T1** nagłówek strony `text-2xl font-semibold`; **P-T2** nagłówek sekcji
  `text-lg font-semibold`; **P-T3** tekst `text-sm` (14 px, rozmiar shadcn).
- **P-L1** margines strony 16 px przy 320 px; **P-L2** formularze w jednej kolumnie także
  przy 768 px; **P-L3** przy 1440 px treść wyśrodkowana na maks. szerokości;
  **P-L4** maks. szerokość treści `max-w-5xl` (64 rem), tekst ciągły `max-w-prose`.
- **P-S1** cień tylko dla warstw nad stroną (menu, popover, dialog).
- **P-TH1** warianty `dark:` tylko tam, gdzie tokenu nie da się użyć.
- Rozmiary ikon 16/14/12 px i etykieta 14 px medium: stan zastany shadcn, do potwierdzenia
  w etapie 2.

## Opis ekranu do testu agentem (etap 5)

(do uzupełnienia w etapie 5; kandydat musi pochodzić z E01/E02 i nie mieć jeszcze story)
