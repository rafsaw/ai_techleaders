# POSTĘP: design system DevMentor (Storybook)

Prompt: `lekcja-06/prompt-storybook.md`. Pracujemy etapami 0–5, po każdym etapie
czekamy na „dalej” od PO. W nowej sesji najpierw przeczytaj ten plik.

## Stan

| Etap | Status | Data |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony**, wszystkie pytania rozstrzygnięte | 2026-10-20 – 2026-10-21 |
| 1. Fundamenty | **zakończony**, propozycje P-* rozstrzygnięte i wpisane | 2026-10-21 |
| 2. Komponenty bazowe | **w toku**: partia 1 z 4 zrobiona, decyzje P-C1–P-C8 i P-F1 wpisane; czeka na „dalej” do partii 2 | 2026-10-21 |
| 3. Komponenty produktu, wzorce, ekrany | nie zaczęty | — |
| 4. Strony, które uczą | nie zaczęty | — |
| 5. Sprawdzenie i raport | nie zaczęty | — |

**Następny krok:** „dalej” od PO, potem partia 2: Card, Badge, Alert, AlertDialog (dodać),
Separator, Table. Przed testem agentem (etap 5) zostają rzeczy z sekcji „Do zrobienia poza
design systemem”.

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

## Decyzje PO z 2026-10-21 (propozycje etapu 1)

W tokenach i dokumentacji oznaczone jako „proposal approved by Rafał”.

- **Typografia (P-T1–P-T3):** wartości przyjęte jako nazwane role, nie surowe klasy:
  `text-page-title` 24/600, `text-section-title` 18/600, `text-body` 14/400,
  `text-label` 14/500, do tego `text-row-title` 16/600 i `text-meta` 14/400. Liczby
  z `tabular-nums`, kod w `font-mono` (Geist Mono). Komponenty używają ról, nie klas
  rozmiaru. Wysokości linii (32/28/20/20 px) to wartości domyślne Tailwinda dla tych rozmiarów.
- **Układ (P-L1–P-L4):** margines strony 16 px przy 320 px (`--spacing-page-gutter`,
  `px-page-gutter`); formularze w jednej kolumnie przy 768 px; przy 1440 px treść
  wyśrodkowana. Szerokości jako tokeny układu: `--container-content` 64 rem (`max-w-content`),
  `--container-text` 65ch (`max-w-text`).
- **Cień (P-S1):** tylko menu, popover i dialog (`--shadow-overlay`, `shadow-overlay`);
  karty i wiersze bez cienia. Wartość cienia to wartość startowa.
- **Ciemny motyw (P-TH1):** `dark:` tylko tam, gdzie nie da się tokenem; każdy wyjątek
  w raporcie z powodem i w tabeli na Foundations/Themes.
- **Ikony:** rozmiary 16/14/12 px jako startowe. Zestaw ikon to luka do decyzji PO;
  w etapie 2 używamy jednego obecnego zestawu (`lucide-react`), wpis w „What is missing”.

## Decyzje PO z 2026-10-21 (B1–B5, etap 2)

W tokenach i dokumentacji oznaczone jako „proposal approved by Rafał”.

- **B1. Gęstość kontrolek:** pole 36 px (`--spacing-control-md`, `h-control-md`; mały select
  32 px `--spacing-control-sm`), odstęp poziomy pola 12 px (`--spacing-control-x`), przyciski
  lg 16 / md 12 / sm 10 / xs 8 px (`--spacing-button-x-*`). Nowa rola `text-control`: 16 px
  poniżej 768 px, od 768 px jak `text-body`.
- **B2. Stany przycisku:** hover primary `primary/90`; secondary pokazuje obramowanie `input`;
  outline i ghost tło `accent`; destructive obramowanie `destructive/50` (C7). Wciśnięcie jak
  hover, bez przesunięcia. Zablokowany: **bez `opacity-50`**, tokeny `--disabled` (jasny
  warm-100, ciemny warm-800) i `--disabled-foreground` (jasny warm-500, ciemny warm-400),
  kontrast policzony przed zapisem: 4,73 : 1 jasny, 5,85 : 1 ciemny. Kursor `not-allowed`
  i zawsze tekst z powodem. Źródło: lekcja 06 („zablokowany przycisk ma osobne kolory tła
  i tekstu, bo półprzezroczysty tekst łatwo traci kontrast”).
- **B3. Fokus i błąd:** pełny obrys 2 px w `ring` z odstępem 2 px; błąd pola to obramowanie
  `destructive` bez poświaty i komunikat tekstem pod polem.
- **B4. Wnętrze paneli:** `p-panel` 24 px; `--spacing-panel-compact` 16 px dla małej karty
  i alertu; tytuł karty `text-section-title`; stopka oddzielona linią, bez tła.
- **B5. Warianty statusu:** Badge `success`/`warning` i Alert `success`/`warning` tak, ale tekst
  plakietki to `text-label`; przy każdym nowym wariancie ekran i plik specyfikacji, a wariant
  bez źródła jako propozycja w raporcie (partia 2).

## Decyzje PO z 2026-10-21 (po partii 1)

Reguły bez źródła w materiałach: w dokumentacji „proposal approved by Rafał”.

- **P-C1** (proposal approved by Rafał): `sm` tylko w gęstych wierszach, `lg` tylko dla jedynej
  akcji na rzadkiej stronie.
- **P-C2** (źródło: lekcja 06, „Przycisk i formularz w DevMentorze”): w stopce formularza
  najpierw Anuluj, potem akcja główna, oba wyrównane do prawej, w tej samej kolejności
  w kodzie i na ekranie.
- **P-C3** (proposal approved by Rafał): etykieta przycisku do ok. 3 słów / 25 znaków. Dopisek:
  etykieta to czasownik i obiekt („Delete profile”, nie „OK”); źródło: prompt, etap 4, Content.
- **P-C4** (źródło: heurystyka „widoczność stanu”, lekcja 06, „Zasady UX”): ładowanie w formie
  „-ing” z wielokropkiem.
- **P-C5** (proposal approved by Rafał): 30 % zapasu na tłumaczenie; przy 320 px `w-full`
  zamiast skracania.
- **P-C6** (proposal approved by Rafał): pole blokowane tylko na czas zapisu; wartość
  niezmienna jako tekst.
- **P-C7** (proposal approved by Rafał): etykieta pola bez dwukropka, jednostka w nawiasie.
- **P-C8** (proposal approved by Rafał): select zaczyna się pustą opcją-instrukcją; kraje
  alfabetycznie. Dopisek (źródło: wzorzec formularza z promptu, „placeholder to przykład, nie
  nazwa pola”): select zawsze ma widoczną etykietę, pusta opcja jej nie zastępuje.
- **P-F1** (proposal approved by Rafał): wymagane bez oznaczenia w tekście, opcjonalne
  z „(optional)”. Dopisek (źródło: WCAG 3.3.2, 4.1.2, WAI-ARIA): wymagane pole ma atrybut
  `required`, żeby czytnik ogłosił „wymagane”. Story Field/Profile form to testuje.
- **Link jako Button:** AGENTS.md i kodu aplikacji nie zmieniamy (zasada 11). Dokumentacja
  Button zostaje przy `buttonVariants()` na `<Link>`. PO zrobi poprawkę osobnym commitem.

## Do zrobienia poza design systemem (przed testem agentem, etap 5)

- **Link jako przycisk (PO, osobny commit):**
  - `AGENTS.md` l. 240: reguła `<Button nativeButton={false} render={<Link href="…" />}>`
    → `buttonVariants()` na `<Link>`;
  - `packages/app/src/app/backend/layout.tsx` l. 26: przycisk „View site” renderowany przez
    `render={<Link href="/" />}` (dziś `role="button"`);
  - `packages/ui/src/components/primitives.test.tsx` l. 86: test, który oczekuje `role="button"`
    dla linku.
- **CrudForm a P-C2:** sprawdzone 2026-10-21 w `packages/ui/src/backend/forms/CrudForm.tsx`
  l. 145–153: kolejność już jest zgodna z P-C2 (Cancel, potem submit, `justify-end`, ta sama
  kolejność w kodzie i na ekranie). Do zmiany zostaje tylko odstęp `gap-2` → `gap-in-group`
  (ta sama wartość 8 px, nazwa tokenu); zrobię to w partii 3 przy komponentach `backend/`,
  chyba że PO zdecyduje inaczej.

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
- Zestaw ikon: luka do decyzji PO; do tego czasu tylko `lucide-react` (2026-10-21).
- Przełącznik motywu w aplikacji: nie ma go w backlogu (Foundations/Themes).

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

## Etap 1: poprawki po decyzjach z 2026-10-21

- `globals.css`: role `--text-page-title`, `--text-section-title`, `--text-body`, `--text-label`;
  `--container-content`, `--container-text`, `--spacing-page-gutter`; `--shadow-overlay`.
- Strony: Typography (tabela ról z klasą, rozmiarem i źródłem), Spacing and layout (tokeny
  układu, ramka strony `mx-auto w-full max-w-content px-page-gutter`), Shape and depth (cień),
  Icons (zestaw jako luka, rozmiary startowe), Themes (tabela wyjątków `dark:`, dziś pusta).
- Sprawdzone: `build-storybook`, `lint`, `typecheck`; 7 stron Foundations w obu motywach
  w Chromium (0 surowych tabel, klasy ról obecne w zbudowanym CSS).

## Etap 2: różnice względem bazy shadcn (base-nova)

Kolumna „Decyzja” podaje źródło. „Pytanie” oznacza, że materiały milczą i czekam na PO.

| Cecha | Baza shadcn | DevMentor | Decyzja |
|---|---|---|---|
| Wysokość przycisku lg/md/sm/xs | 36/32/28/24 px | 40/36/32/28 px, domyślny = 36 | Q3 |
| Promień przycisku | `rounded-lg` (z `--radius`) | `rounded-button` 10 px | Q3 |
| Promień pola, selecta, textarea | `rounded-lg` | `rounded-control` 8 px | Q3 |
| Promień karty, panelu, alertu | `rounded-xl` (14 px) / `rounded-lg` | `rounded-panel` 12 px | Q3, Z5 |
| Promień plakietki | `rounded-4xl` | `rounded-pill` | Q3 |
| Krawędź karty | `ring-1 ring-foreground/10` | `border border-border` | R01.3, T7 |
| Obrys pola | `border-input` (1,26 : 1 przed T5) | `border-input` (≥ 3 : 1) | T5, WCAG 1.4.11 |
| Cień | brak / różne | brak; `shadow-overlay` tylko w nakładkach | P-S1 |
| Tekst przycisku, etykiety | `text-sm`, `text-[0.8rem]`, `text-xs` | `text-label` | decyzja z 2026-10-21 (role) |
| Tekst opisu i błędu pola | `text-sm` | `text-meta` | T3, role |
| Przejścia | `transition-all`, czas domyślny 150 ms | `transition-colors duration-control` (120 ms, 0 przy reduced motion) | Q4 |
| Hover przycisku destructive | zmiana tła `/20` (4,12 : 1) | zmiana obramowania `border-destructive/50`, tło bez zmian | C7, T6 |
| Hover secondary | `color-mix(…)` (wartość arbitralna) | do decyzji | **B2** |
| Wysokość pola | 32 px | do decyzji | **B1** |
| Odstęp wewnętrzny przycisku i pola | `px-2.5` (10 px) we wszystkich rozmiarach | do decyzji | **B1** |
| Rozmiar tekstu w polu | 16 px poniżej `md`, 14 px od `md` | do decyzji | **B1** |
| Wciśnięcie | `translate-y-px` | do decyzji | **B2** |
| Zablokowany | `opacity-50`, `pointer-events-none` | do decyzji | **B2** |
| Fokus | `ring-3 ring-ring/50` (pierścień w połowie przezroczysty) | do decyzji | **B3** |
| Błąd pola | `border-destructive` + `ring-3 ring-destructive/20` | do decyzji | **B3** |
| Odstęp w karcie i alercie | 16 px / 12 px karta sm / 8–10 px alert | do decyzji | **B4** |
| Warianty statusu | `default`, `secondary`, `destructive`, `outline` | do decyzji | **B5** |

### Pytania B1–B5 (czekają na PO)

- **B1. Gęstość kontrolek.** Propozycja: pole tekstowe, select i textarea mają 36 px, jak
  przycisk domyślny, żeby stały w jednej linii. Odstęp poziomy: pola 12 px; przyciski
  lg 16, md 12, sm 10, xs 8 px. Tekst w polu: 16 px poniżej `md` (iOS Safari powiększa
  stronę przy polu z tekstem poniżej 16 px), od `md` `text-body`. To wymaga nowej roli
  `text-control` (16/400 → 14/400) albo zgody na `text-body` wszędzie.
- **B2. Stany przycisku.** Propozycja: hover primary = tło `primary/90`; hover secondary =
  widoczne obramowanie `border-input` (jak C7: hover zmienia krawędź, nie wypełnienie);
  hover outline i ghost = tło `accent`. Wciśnięcie: bez przesunięcia (`translate-y-px`
  usunięte), wygląd jak hover. Zablokowany: `opacity-50`, kursor `not-allowed`, a obok
  zawsze tekst z powodem (prompt, etap 2, punkt 6).
- **B3. Fokus i błąd.** Propozycja: fokus to pełny obrys 2 px w `ring` z odstępem 2 px na
  wszystkich elementach interaktywnych (T5 liczył kontrast `ring` dla pełnego koloru;
  połowa przezroczystości go obniża; WCAG 2.4.7, 2.4.13). Błąd pola: `border-destructive`
  bez poświaty + komunikat tekstem pod polem (WCAG 3.3.1, 1.4.1).
- **B4. Wnętrze paneli.** Propozycja: karta `p-panel` (24 px); karta `sm` i alert mają nowy
  token komponentowy `--spacing-panel-compact` 16 px. Tytuł karty `text-section-title`.
  Stopka karty: linia `border-t`, bez szarego tła.
- **B5. Warianty statusu.** Q2 dodało role `success` i `warning`, ale nie warianty. Propozycja:
  Badge dostaje `success` i `warning` (Open/Booked w /mentor/slots, stany Stripe w /mentor),
  Alert dostaje `success` (`?stripe=returned`, `welcome=1`) i `warning` (onboarding
  incomplete). Bez tego statusy E02 pokazujemy tylko wariantami `secondary` i `destructive`.
  Tekst plakietki: `text-meta` z grubością 500, wysokość 24 px.

### Partie etapu 2 (plan)

1. Button (warianty `link` = akcja tekstowa i link), Input, Textarea (dodać), NativeSelect
   (dodać), Label, Field.
2. Card, Badge, Alert, AlertDialog (dodać), Separator, Table.
3. Skeleton (dodać), Spinner, Empty, ErrorState (`backend/feedback`), LoadingMessage.
4. Zestaw publiczny F3: SchemaForm, TextField, PasswordField, SubmitButton, Notice, LinkButton.

## Etap 2, partia 1: co zrobione (2026-10-21)

Komponenty: Button (z akcją tekstową `link` i linkiem przez `buttonVariants`), Input,
Textarea (dodany `ui:add`), NativeSelect (dodany `ui:add`), Label, Field.

- **Tokeny (globals.css):** `--disabled`, `--disabled-foreground` (oba motywy),
  `--spacing-control-md/sm/x`, `--spacing-button-x-lg/md/sm/xs`, `--spacing-panel-compact`,
  utility `text-control`; `color-scheme: light/dark` na `:root`/`.dark` (natywne kontrolki
  w ciemnym motywie, np. ikona kalendarza w `datetime-local`); bazowy `outline-ring` bez `/50`.
- **`cn` (lib/utils.ts):** `createCn` z `cn/config` zna tokeny (role tekstu, odstępy, promienie,
  cień, szerokości, czasy). Bez tego `cn("text-label text-primary-foreground")` gubiło rolę.
  Komponenty partii 1 importują `cn` z `@devmentor/ui/lib/utils` (AGENTS.md), nie z `cn`.
- **Komponenty:** klasy przepisane na tokeny; zero `dark:`, zero `opacity` dla stanu
  zablokowanego, zero wartości arbitralnych. API bez zmian (Z-1). Usunięte z Field style kart
  wyboru dla checkboxów i radio (prymitywów nie ma w planie). Textarea dostała `wrap-anywhere`
  (długi URL nie poszerza układu przy 320 px). Destructive ma tło `/10` w obu motywach
  (6,18 / 5,45 : 1 w ciemnym), więc nie potrzebuje `dark:`.
- **Storybook:** `.storybook/preview-states.css` przedefiniowuje warianty `hover`, `active`,
  `focus-visible` tak, że te same klasy działają też na `data-preview-state` (tylko w Storybooku);
  widoki 320/768/1440 px w `preview.tsx`; bloki `StateTable`, `DoDont`, `Sample`
  (`.storybook/blocks/stories.tsx`); tabele Markdown w docs przewijają się w swoim polu przy
  320 px; `optimizeDeps.include` w `vitest.storybook.config.ts` (bez przeładowania Vite w teście).
- **Stories (34):** Button 8, Input 5, Textarea 5, Native select 6, Label 3, Field 7. Każdy
  komponent: Playground z kontrolkami, warianty/rozmiary lub typy, macierz stanów z zamrożonym
  hover/focus/pressed, długa treść przy 320 px, testy interakcji (kliknięcie, klawiatura,
  disabled z powodem, link, wpisywanie, wybór opcji, komunikat błędu, fokus z widocznym obrysem).
- **Strony dokumentacji:** `button.mdx`, `input.mdx`, `textarea.mdx`, `native-select.mdx`,
  `label.mdx`, `field.mdx`, każda z 13 sekcjami.
- **Foundations:** Color (role `disabled`, pary kontrastu `disabled-foreground/disabled`,
  destructive `/10` w obu motywach, hover `primary/90`), Typography (`text-control`),
  Spacing (`panel-compact`), Shape and depth (wysokości i odstępy kontrolek, fokus, błąd).
- **Testy jednostkowe:** `components/form-controls.test.tsx`, `lib/utils.test.ts`.
- **Wyjątki `dark:`:** brak w partii 1.

## Etap 2, partia 1: co sprawdzone

- `npm run test:storybook` w obu motywach: 34/34 i 34/34 (play functions i a11y `error`).
- Zbudowany Storybook w Chromium: 6 stron komponentów w obu motywach przy 1440 px i przy 320 px
  (bez poziomego przewijania, 0 surowych tabel, brak błędów konsoli), macierze stanów przy
  768 px w ciemnym motywie, 5 stories „długa treść” przy 320 px, 7 stron Foundations przy 320 px.
- Znalezione i poprawione w przeglądarce: niewidoczny fokus (Tailwind 4: `outline-none` +
  `outline-2` nie rysuje obrysu, potrzebny `outline-solid`; dopisany test), ciemna ikona
  kalendarza w ciemnym motywie (`color-scheme`), poziome przewijanie stron docs przy 320 px.
- `check:tokens`: zero pozycji w plikach partii 1; zostaje 12 w alert, badge, card (partia 2).
- Kontrast nowych par policzony przed zapisem (skrypt w scratchpadzie) i mierzony na
  Foundations/Color.
- lint, typecheck, test:coverage (100%), build Next.js, test:integration (4/4).

## Etap 2, partia 1: czego nie sprawdzono

- Wygląd `/backend` (Button, Input, Label w `CrudForm` i `DataTable`) w przeglądarce; przeszły
  tylko testy integracyjne. Partia 2 zmienia Card i Table, więc obejrzę `/backend` po niej.
- Czytnik ekranu na żywo (NVDA/VoiceOver): sprawdzone tylko nazwy i opisy dostępne w testach.
- `viewport` w testach Vitest: stories „narrow” renderują się przy 320 px w Storybooku; nie
  sprawdzałem, czy Vitest zmienia rozmiar ramki.
- Strony MDX nie przechodzą przez test a11y (etap 5).

## Etap 2, partia 1: do decyzji (reguły bez źródła, oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 1)”.

- **P-C1** `size="sm"` tylko w gęstych wierszach (tabele), `lg` tylko dla jedynej akcji na rzadkiej stronie.
- **P-C2** akcja główna ostatnia w stopce formularza, po „Cancel”.
- **P-C3** etykieta przycisku do ok. 3 słów / 25 znaków.
- **P-C4** stan ładowania: forma „-ing” z wielokropkiem („Publishing slot…”).
- **P-C5** zapas 30 % na tłumaczenie; przy 320 px `w-full` zamiast skracania etykiety.
- **P-C6** pole zablokowane tylko na czas zapisu; wartość, której nie da się zmienić, jako tekst.
- **P-C7** etykieta pola: fraza rzeczownikowa, bez dwukropka, jednostka w nawiasie.
- **P-C8** select zaczyna się pustą opcją-instrukcją („Choose an area”); kraje alfabetycznie w grupie.
- **P-F1** pola wymagane bez oznaczenia, opcjonalne z „(optional)” w etykiecie.
- **Link jako przycisk (konflikt z AGENTS.md):** AGENTS.md każe renderować link jako
  `<Button nativeButton={false} render={<Link />}>`, ale to daje `role="button"` (lekcja
  z 2026-10-14), więc czytnik ogłasza przycisk zamiast linku (WCAG 4.1.2). Dokumentacja Button
  zaleca `className={buttonVariants(...)}` na `<Link>`. Do decyzji: zmienić regułę w AGENTS.md
  (to zmiana poza design systemem, więc jej nie robię) czy zostawić obie drogi.

## Opis ekranu do testu agentem (etap 5)

(do uzupełnienia w etapie 5; kandydat musi pochodzić z E01/E02 i nie mieć jeszcze story)
