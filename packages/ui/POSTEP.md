# POSTĘP: design system DevMentor (Storybook)

Prompt: `lekcja-06/prompt-storybook.md`. Pracujemy etapami 0–5, po każdym etapie
czekamy na „dalej” od PO. W nowej sesji najpierw przeczytaj ten plik.

## Stan

| Etap | Status | Data |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony**, wszystkie pytania rozstrzygnięte | 2026-10-20 – 2026-10-21 |
| 1. Fundamenty | **zakończony**, propozycje P-* rozstrzygnięte i wpisane | 2026-10-21 |
| 2. Komponenty bazowe | **zakończony**: partie 1–4 (1–3 w 766a227, d2073e8, 9739dab); decyzje po partii 4 wpisane | 2026-10-21 |
| 3. Komponenty produktu, wzorce, ekrany | **zakończony**: partie 1–5 (1–4 w a45f031, 9fbecd9, 09081a1, e044136); decyzje po partii 5 wpisane; czeka na „dalej” do etapu 4 | 2026-10-21 |
| 4. Strony, które uczą | **zakończony**, bramki aplikacji domknięte; P-DOC1–2 zatwierdzone | 2026-10-21 |
| 5. Sprawdzenie i raport | **audyt i poprawki wykonane**, jawne wyjątki docs EX-AUD1–2; test świeżym agentem wykonany, luki i decyzje P-ERR1–5 zapisane | 2026-10-21 – 2026-10-22 |

**Następny krok:** decyzje P-ERR1–5 zapisane w dokumentacji. Uzupełnić zadania poza design
systemem w specyfikacji E01 i głównym `AGENTS.md`; implementacja `/error` pozostaje poza tą
pracą. Nie powtarzać testu, nie budować `/error`, nie scalać gałęzi testowych i niczego nie
commitować.

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
- **Z-5 zmienione przez Rafała:** `check:tokens` kończy się błędem (exit 1) także dla
  wartości spoza tokenów w `packages/app/src`, nie tylko informacyjnie (po commicie
  `337204c` aplikacja nie ma takich wartości). **Znana luka:** kolory zakodowane w adresie
  `data:` (np. `%231B1B1B` w faviconie w `layout.tsx`) skrypt nie wykrywa, bo szuka
  literalnego `#`.
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

## Decyzje PO z 2026-10-21 (po partii 2)

Wszystkie jako „proposal approved by Rafał” (w dokumentacji i tokenach).

- **P-C9:** tytuł karty `sm` w roli `text-row-title` (16/600).
- **P-C10:** plakietka 1–3 słowa, do ok. 30 znaków; dłuższy stan w tekście.
- **P-C11:** AlertDialog `size="sm"` tylko dla krótkiego pytania w jednej linii.
- **P-T4:** `--scrim` 40 % (jasny) / 70 % (ciemny) z warm-950; `--spacing-badge-x` 8 px.
- **Mapowanie stanów E02 na warianty:** Badge *Saved*, *Confirmed* → `success`; *Incomplete* →
  `warning`; *Blocked* → `destructive`; stany oczekiwania (*Stripe is checking your details*,
  *Starting Stripe setup*, *Locked*) → neutralny `secondary`. Alert: `ready` → `success`,
  `pending` → `default`, `incomplete` → `warning`, `blocked` i `check_failed` → `destructive`.
- **Tabela:** kontener zawsze w kolejności Tab (`tabIndex={0}`), także bez przewijania.

## Do zrobienia poza design systemem (po teście agentem, etap 5)

- **Kolejność na ekranie Slots w specyfikacji E02:** `2026-10-18-mentor-setup.md` Flow 4 krok 1
  wymienia najpierw „Upcoming slots”, potem „Add a slot”. Design system stawia „Add a slot” nad listą
  (P-SCR5, decyzja PO 2026-10-21: akcja przed listą, widoczna bez przewijania). Zmienić kolejność
  w specyfikacji.
- **`CrudForm` ma już pola `textarea` i `select` (E02 Phase 1):** dodane w partii 5 etapu 3
  (2026-10-21, proposal approved by Rafał, źródło: spec E02 Flow 2 i zgoda PO wg zasady 12).
  Przy implementacji E02 Phase 1 **nie dodawać ich drugi raz**: krok „`CrudForm`/`useSchemaForm`
  gain `textarea` and `select` kinds” w `2026-10-18-mentor-setup.md` jest już zrobiony w `ui`;
  zostaje `npm run ui:add -- textarea native-select` tylko jeśli prymitywów by brakowało (są).
  `select` bierze `options` i opcję-instrukcję z `placeholder`.
- **Layouty aplikacji:** `(frontend)` i `(app)` nie mają layoutów; ekrany w Storybooku używają ramy
  P-SCR1 (nagłówek `SiteHeader` + `main` na siatce nagłówka). Przy stronach E01 Phase 2 i E02
  zbudować layouty tak samo.
- **Strona 404 w aplikacji:** `packages/app` nie ma `not-found.tsx`, więc 404 z `/mentors/[id]`
  (brak profilu albo brak roli) pokazuje domyślną stronę Next. Wzorzec Detail view proponuje treść
  (P-DV3); dodać `not-found.tsx` przy stronie `/mentors/[id]`.
- **`formatMoney` w core (E02, P17):** nie istnieje jeszcze w `core`
  (`core/src/validators/money/money.schema.ts`). Dodać go przy stronie `/mentors/[id]`; do tego
  czasu `PriceList` przyjmuje gotowe kwoty (decyzja PO 2026-10-21).
- **Adres „Contact the DevMentor team” (E02):** ustalić prawdziwy adres kontaktu przy stronach
  `/mentor` i dopisać go do specyfikacji E02 (`2026-10-18-mentor-setup.md`). Do tego czasu
  `PayoutStatus` przyjmuje go w propsie `contactHref` (decyzja PO 2026-10-21).
- **„Pokaż hasło” w specyfikacji E01 (przy Phase 2):** `PasswordField` ma przycisk pokazania
  hasła (P-PF1, zatwierdzone 2026-10-21), a `2026-10-17-accounts-and-roles.md` dziś go nie
  wymienia (AD6 i UI/UX mówią tylko o podpowiedzi i menedżerach haseł). Dopisać go do UI/UX
  `/sign-up`, `/sign-in`, `/confirm-email` przy E01 Phase 2. To zmiana poza design systemem,
  więc specyfikacji nie ruszam.
- **Role rozmiaru i promienia na stronie głównej (PO, 2026-10-21):** `(frontend)/page.tsx` ma
  jeszcze surowe klasy rozmiaru: `text-sm`, `text-lg`, `text-5xl sm:text-6xl`, `rounded-md`,
  `px-4 py-2`, `gap-6`, `max-w-3xl`. Zamienić na role (`text-label`, `text-body`, `text-page-title`,
  `rounded-button`, `px-button-x-lg`, `gap-between-groups`, `max-w-content`). Zmiana kolorów na
  tokeny jest już zrobiona; rozmiarów celowo nie ruszano.
- **Favicon z szablonu (audyt, lekcja-06/audyt.md):** zob. `.ai/runs/2026-10-21-hardcoded-colors-to-tokens.md`;
  zatwierdzony znak DevMentor to decyzja PO.
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
  (ta sama wartość 8 px, nazwa tokenu). **Zrobione:** przy partii 3 etapu 3 sprawdziłem, że
  `CrudForm.tsx` ma już `gap-in-group` (l. 85), więc nic tu nie zostało.
- **Kontrakt kodów `/error` (E01):** zadać autorowi specyfikacji pytanie o zamkniętą listę
  dozwolonych kodów błędu, mapowanie kodów na stany/komunikaty oraz zachowanie dla kodu
  nieznanego, pustego i brakującego. Test świeżym agentem znalazł tylko `internal_error`;
  nie dopisywać mapy samodzielnie. Źródło: E01 „Auth navigation and error fallback”,
  E01-S01/P7 oraz wynik testu świeżym agentem.
- **Język interfejsu:** dodać jedną linię o tym, że język interfejsu i treści UI jest
  angielski, do głównego `/home/rafal/projects/ai_techleaders/AGENTS.md`. Nie zmieniać
  głównego `AGENTS.md` w ramach tej pracy. Źródło: `lekcja-06/prompt-storybook.md`,
  „Język interfejsu produktu: angielski”.

## Decyzje PO po teście `/error` (2026-10-22)

Wszystkie poniższe zasady są zapisane w dokumentacji jako **proposal approved by Rafał**.

- **P-ERR1 — komunikat 5xx:** na stronie błędu użyć tytułu **Something went wrong**,
  komunikatu **We couldn't complete your request. Please try again in a moment.** oraz
  akcji **Go to the home page**. Nie pokazywać użytkownikowi technicznego kodu
  `internal_error`; bezpieczny identyfikator wsparcia wymaga osobnej decyzji. Źródło:
  lekcja 06, strona „Content”, zasada „Errors: what happened and what to do” oraz E01 P7.
- **P-ERR2 — pełna strona a Notice:** `Notice` służy do błędu całego formularza lub
  zadania pozostającego w kontekście strony. Błąd, który uniemożliwia wyrenderowanie
  całej strony, używa osobnej kompozycji pełnoekranowej: `h1`, akapit i jedna akcja
  odzyskania; nie jest opakowany w `Notice`. Źródło: lekcja 06, „How to choose” i
  „Content”; E01 P7.
- **P-ERR3 — `h1`:** każdy pełny ekran aplikacji ma dokładnie jeden widoczny `h1`;
  fragmenty komponentów i stories nie muszą go dodawać. Źródło: prompt etap 3 (mapa
  stanów pełnych ekranów), P-SCR2 oraz WCAG 2.4.6.
- **P-ERR4 — tytuł i fokus:** strona ustawia metadane `title: "Something went wrong"`;
  istniejący layout renderuje kartę jako **Something went wrong · DevMentor** przez
  `title.template`. Fokus pozostaje widoczny zgodnie z istniejącym tokenowym obrysem;
  nie przenosimy go programowo na `main`, ponieważ `/error` ładuje się zwykłym
  przejściem, a przeglądarka ustawia początek strony. Źródło: `packages/app/src/app/layout.tsx`,
  B3 oraz decyzja PO z 2026-10-22.
- **P-ERR5 — link-logo w `ui`:** komponent `ui` używa wstrzykiwanego `linkComponent`,
  domyślnie zwykłego `<a>`, a aplikacja przekazuje Next `Link`. `ui` nie importuje
  `next/link` i nie dostaje wyjątku ESLint. Źródło: P-A6, `SiteHeader.tsx` i granica
  pakietu `ui` w `AGENTS.md`.

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
- Menu (luka): po jej rozwiązaniu pełna nazwa konta przechodzi z nagłówka do menu konta
  w `SiteHeader`; dzisiejsze ucinanie nazwy wielokropkiem to rozwiązanie tymczasowe (P-A4,
  2026-10-21).
- Toast: brak w 1.0 (decyzja PO).
- Wzorzec „lista z filtrami”: razem z E03, bo żaden ekran E01/E02 nie ma filtrów (Q6 = a).
- Zestaw ikon: luka do decyzji PO; do tego czasu tylko `lucide-react` (2026-10-21). lucide nie
  ma ikon marek, więc przycisk GitHub nie ma logo (partia 4).
- Przełącznik motywu w aplikacji: nie ma go w backlogu (Foundations/Themes).
- **`/error` — brakujący zestaw fundamentów (priorytet P0, E01 #28 / E01-S01 #34):**
  brak nagłówka bez tożsamości (istniejący `SiteHeader` explicite odsyła do takiego
  przypadku, ale komponent nie istnieje), brak publicznego szkieletu strony bez layoutu
  odczytującego tożsamość w `(frontend)`, brak mapy stanów Storybooka dla `/error` oraz
  brak jawnego wpisu tej strony w pokryciu E01. Wynik testu świeżym agentem potwierdził,
  że `account={null}` nie jest bezpiecznym zamiennikiem: oznacza „wylogowany” i pokazuje
  `Sign in`, gdy na `/error` tożsamość jest nieznana. Źródła: E01 UI/UX i P4/P7,
  komentarz w `SiteHeader.tsx`, prompt etap 3 oraz testowe gałęzie
  `test/agent-error-screen` i `test/agent-error-app`.

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

## Etap 2, partia 2: co zrobione (2026-10-21)

Komponenty: Card, Badge, Alert, AlertDialog (dodany `ui:add`), Separator, Table.

- **`ui:add alert-dialog`:** CLI zapytał o nadpisanie `button.tsx`; odpowiedź „nie”, plik
  nietknięty. Dodał tylko `alert-dialog.tsx`; `package.json` (root, app, ui) i `globals.css`
  bez zmian (sprawdzone diffem).
- **Tokeny:** `--spacing-badge` 24 px (B5), `--spacing-badge-x` 8 px, `--scrim` (40 % jasny,
  70 % ciemny z warm-950), utility `grid-cols-icon-text` i `grid-cols-text-action` (zamiast
  wartości arbitralnych), `--tw-duration` w `duration-*` (animacje tw-animate-css biorą czasy
  z tokenów ruchu).
- **Kontrast statusów `/10` w obu motywach** (policzony przed zapisem): success i warning
  4,70–4,87 : 1 jasny, 7,17–8,46 : 1 ciemny; destructive 4,91–5,09 / 5,45–6,18. Bez `dark:`.
- **Card (B4):** `border-border` zamiast `ring`, `rounded-panel`, `p-panel` / `p-panel-compact`,
  tytuł `text-section-title` (`text-row-title` w `sm`), stopka z linią bez tła. API bez zmian.
- **Badge (B5):** `rounded-pill`, `h-badge`, `text-label`; nowe warianty `success`, `warning`.
- **Alert (B4, B5):** `rounded-panel`, `p-panel-compact`, ramka bez cienia; wariant koloruje ikonę
  i tytuł, opis w kolorze tekstu; nowe warianty `success`, `warning`; `data-variant`.
- **AlertDialog:** `bg-scrim` bez rozmycia (Z5), okno z ramką i `shadow-overlay` (P-S1),
  `rounded-panel`, `p-panel`, tylko zanikanie w `duration-dialog` (Q4), stopka Cancel → akcja
  (P-C2), przy 320 px margines `inset-x-page-gutter`; nagłówek zawsze do lewej.
- **Table:** `text-body`, nagłówki `text-label`, komórki `px-in-group py-list-row-y`, hover `accent`,
  stopka z linią bez tła; **kontener z `tabIndex={0}` i obrysem fokusu**: test a11y przy 320 px
  znalazł przewijany obszar bez dostępu z klawiatury (WCAG 2.1.1).
- **Separator:** komentarz i import `cn`; wygląd bez zmian.
- **`buttonVariants` i `badgeVariants` łączą klasy przez `cn`:** `cva` tylko skleja, więc link
  z `buttonVariants({ variant: "outline" })` miał `border-transparent` i `border-input` naraz
  i w ciemnym motywie tracił obramowanie. Nazwy i sygnatury bez zmian (Z-1).
- **`check:tokens`: 0 pozycji w `packages/ui`** (zostały tylko informacyjne w aplikacji, Z-5).
- **Stories (31 nowych, razem 65):** Card 5, Badge 5, Alert 6, Alert dialog 8, Separator 4,
  Table 4. Dialogi w docs renderują się w osobnych ramkach (`docs.story.inline: false`).
- **Strony dokumentacji:** `card.mdx`, `badge.mdx`, `alert.mdx`, `alert-dialog.mdx`,
  `separator.mdx`, `table.mdx`, każda z 13 sekcjami.
- **Foundations:** Color (rola `scrim`, pary `/10` dla success i warning w obu motywach),
  Shape and depth (tokeny plakietki, scrim, nazwane siatki), Motion (dialog: tylko zanikanie).
- **Testy jednostkowe:** `components/alert-dialog.test.tsx`, uzupełnione
  `form-controls.test.tsx` i `lib/utils.test.ts`.
- **Wyjątki `dark:`:** brak.

### Warianty statusu (B5): źródła

| Wariant | Ekran | Plik specyfikacji |
|---|---|---|
| Badge `success` (*Saved*, *Confirmed*) | `/mentor` | `2026-10-18-mentor-setup.md`, Flow 1 (tabela pozycji), Flow 3 krok 6 `ready` |
| Badge `warning` (*Incomplete*) | `/mentor` | `2026-10-18-mentor-setup.md`, Flow 1, Flow 3 krok 6 `incomplete` |
| Alert `success` („Stripe confirmed your account.”) | `/mentor?stripe=returned` | `2026-10-18-mentor-setup.md`, Flow 3 krok 6 `ready`, UI/UX `/mentor` |
| Alert `warning` („Stripe onboarding isn't finished.”) | `/mentor?stripe=returned` | `2026-10-18-mentor-setup.md`, Flow 3 krok 6 `incomplete` |

Mapowanie stanu na wariant: specyfikacja nie przypisuje kolorów; mapowanie to proposal approved
by Rafał (2026-10-21).

## Etap 2, partia 2: co sprawdzone

- `test:storybook` w obu motywach: 65/65 i 65/65 (play functions i a11y `error`). Testy dialogu
  (fokus na Cancel, Tab w pętli, Escape, powrót fokusu, scrim nie zamyka) przeszły 5 razy z rzędu
  po dodaniu `waitFor` (strażnik fokusu Base UI przenosi fokus asynchronicznie).
- **Vitest naprawdę ustawia szerokość 320 px** (niewiadoma z partii 1 rozstrzygnięta): dzięki
  temu axe wykrył przewijaną tabelę bez dostępu z klawiatury.
- Zbudowany Storybook w Chromium: 6 nowych stron w obu motywach przy 1440 i 320 px (bez
  poziomego przewijania, 0 surowych tabel, brak błędów konsoli); stories dialogu (320 px ciemny,
  1440 px jasny z błędem 409), alertów (ciemny), plakietek (jasny), karty (ciemny).
- `/backend` na zrzutach z testów integracyjnych (`test-results/integration/…/users-*.png`):
  formularz z błędami, tabela, karta, przyciski na nowych tokenach.
- lint, typecheck, test:coverage (100 %), check:tokens (0 w ui), build, test:integration.

## Etap 2, partia 2: czego nie sprawdzono

- `/backend` w ciemnym motywie (aplikacja nie ma przełącznika motywu) i przy 320 px.
- Na zrzucie `/backend` widać jaśniejszy prostokąt tła pod tabelą; to układ strony aplikacji
  (`users-panel.tsx`), poza design systemem. Nie badałem przyczyny.
- Czytnik ekranu na żywo.
- Strony MDX nie przechodzą przez test a11y (etap 5); przykład „Don't” w Badge to kropka
  z `role="img"`.

## Etap 2, partia 2: do decyzji

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 2)”.

- **P-C9** tytuł karty `sm` w roli `text-row-title` (16/600), bo `text-section-title` (18/600)
  w wąskiej karcie pozycji listy jest za duży względem B4.
- **P-C10** plakietka: 1–3 słowa, do ok. 30 znaków; dłuższy stan idzie do tekstu (opisu karty
  lub alertu), bo plakietka się nie zawija.
- **P-C11** AlertDialog `size="sm"` tylko dla krótkiego pytania w jednej linii.
- **P-T4** wartości: `--scrim` 40 % jasny / 70 % ciemny z warm-950; `--spacing-badge-x` 8 px.
- **Mapowanie stanów E02 na warianty** (tabela wyżej): potwierdzenie, że *Saved* i *Confirmed*
  to `success`, *Incomplete* to `warning`, *Blocked* to `destructive`, a stany oczekiwania
  (*Stripe is checking your details*, *Starting Stripe setup*, *Locked*) to `secondary`.
- **Tabela: kontener zawsze w kolejności Tab** (`tabIndex={0}`), także gdy się nie przewija.
  Alternatywa: ustawiać `tabIndex` tylko przy przepełnieniu (wymaga JS i `ResizeObserver`).

## Etap 2, partia 3: co zrobione (2026-10-21)

Komponenty: Skeleton (dodany `ui:add`), Spinner, Empty + `EmptyState`, Error state
(`ErrorMessage`), Loading message (`LoadingMessage`).

- **`ui:add skeleton`:** CLI pisze „Updated globals.css”, ale plik i wszystkie `package.json`
  są bez zmian (sprawdzone sumami md5 przed i po). Dodał tylko `skeleton.tsx`.
- **Skeleton:** `rounded-control`, `bg-muted`, `animate-pulse`; `aria-hidden` domyślnie (P-LD3).
- **Spinner:** `cn` z `lib/utils`, `shrink-0`; API bez zmian (sam: `role="status"` „Loading”).
- **Empty:** do lewej (prompt, What to avoid: „wszystko wyśrodkowane”; R01.1), bez własnej ramki
  (P-E1), tytuł `text-row-title` (P-E2), opis `text-body` `muted-foreground`, odstępy z tokenów.
  API bez zmian (Z-1).
- **ErrorMessage:** ikona `OctagonX` z `aria-hidden` (jak w Alert); reszta bez zmian.
- **LoadingMessage:** do lewej, `gap-in-group py-component text-body` (P-LD4).
- **CrudForm:** `gap-4` → `gap-between-groups`, `gap-2` → `gap-in-group` (te same wartości).
- **DataTable:** `rounded-panel border-border`, odstępy z tokenów, paginacja `text-meta
  tabular-nums`; **panel rysuje obrys fokusu**, gdy kontener tabeli ma fokus z klawiatury:
  `overflow-hidden` panelu ucinał obrys z partii 2, więc w `/backend` fokus tabeli był
  niewidoczny (sprawdzone w Chromium: obrys 2 px solid).
- **Storybook, ciemny motyw docs (dotyczy też partii 1–2):** ramki z przykładami i tabela
  kontrolek miały białe tło Storybooka, a treść jasny tekst z tokenów, więc przykłady były
  nieczytelne. Poprawka w `.storybook/preview.css`: tło `--background` dla `.sbdocs-preview`
  i tabeli argumentów; nadpisania koloru tekstu docs nie dotykają treści stories.
- **Stories (20 nowych, razem 85):** Skeleton 4, Spinner 4, Empty state 4, Error state 4,
  Loading message 4. Tytuły w „Primitives/Signed-in/”.
- **Strony dokumentacji:** `skeleton.mdx`, `spinner.mdx`, `empty.mdx`,
  `backend/feedback/error-state.mdx`, `backend/feedback/loading-message.mdx`, każda z 13 sekcjami;
  `table.mdx` odsyła do tych stron; Foundations/Motion: wiersz o pętlach (spin, pulse).
- **Testy jednostkowe:** `components/loading-and-empty.test.tsx`, uzupełnione `feedback.test.tsx`.
- **Wyjątki `dark:`:** brak.

## Etap 2, partia 3: co sprawdzone

- test:storybook w obu motywach: 85/85 i 85/85 (play functions, a11y `error`).
- lint, typecheck, check:tokens (0 w ui), test:coverage (222 testy, 100%), build Next.js,
  test:integration (4/4).
- Zbudowany Storybook w Chromium: 5 nowych stron × 2 motywy × 320/1440 px: bez poziomego
  przewijania, 0 surowych tabel, 0 błędów konsoli; po poprawce ciemnego motywu ponownie Separator
  i Empty state.
- Obrys fokusu tabeli w panelu `DataTable` (wstrzyknięty do zbudowanego Storybooka, 320 px, ciemny).

## Etap 2, partia 3: czego nie sprawdzono

- `/backend/users` w przeglądarce po zmianie `DataTable`, `LoadingMessage`, `EmptyState` (tylko
  testy integracyjne). `DataTable` nie ma jeszcze story (wzorce w etapie 3).
- Strony partii 1–2 w ciemnym motywie po poprawce `preview.css` obejrzane tylko na przykładzie
  Separator; poprawka jest wspólna dla wszystkich stron.
- Czytnik ekranu na żywo; a11y stron MDX (etap 5).

## Etap 2, partia 3: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 3)”.

- **P-LD1** Kiedy co: Skeleton przy pierwszym ładowaniu listy o znanym kształcie (`/mentor/slots`);
  `LoadingMessage`, gdy kształt nieznany i w `/backend` (`DataTable`); Spinner tylko w kontrolce,
  która uruchomiła pracę.
- **P-LD2** Pętle Tailwinda poza trzema czasami Q4: `animate-pulse` 2 s, `animate-spin` 1 s;
  przy reduced motion stoją.
- **P-LD3** Skeleton ma domyślnie `aria-hidden`; ładowanie ogłasza region `role="status"` +
  `aria-busy` z ukrytą etykietą.
- **P-LD4** `LoadingMessage` do lewej (było wyśrodkowane, `py-10`).
- **P-E1** Pusty stan bez własnej ramki (shadcn: przerywana ramka, środek).
- **P-E2** Tytuł pustego stanu `text-row-title`.
- **P-E3** Przycisk **Retry** bez dopełnienia (wbrew P-C3), bo wspólny komponent nie wie, co
  ładuje. Alternatywa: prop z etykietą.
- **P-E4** `DataTable` nie przekazuje tytułu błędu, więc przy 500 widać „Something went wrong”
  dwa razy (domyślny tytuł i komunikat `apiHandler`). Opcje: (a) nowy prop `errorTitle` w
  `DataTable` (zmiana API, poza planem bez zgody), (b) inny domyślny tytuł w `ErrorMessage`
  (np. „Could not load”), (c) zostawić. Nie zmieniłem nic.

## Decyzje PO z 2026-10-21 (po partii 3)

- **P-LD1, P-LD2, P-LD3, P-LD4, P-E1, P-E2, P-E3:** przyjęte tak, jak zaproponowane; w docs
  oznaczone „proposal approved by Rafał”.
- **P-E4: opcja (b).** Domyślny tytuł `ErrorMessage` to „Couldn't load the data” (był
  „Something went wrong”), API bez zmian. Źródło: zasada treści z lekcji 06 (komunikat błędu
  mówi, co się stało i co zrobić; **Retry** mówi, co zrobić). `CrudForm` dalej podaje swój tytuł
  „Could not save”.
- **Możliwe później (opcja a):** prop `errorTitle` w `DataTable`, żeby lista mówiła, czego nie
  wczytała („Could not load users”). Zmiana API, więc tylko za zgodą PO.

## Etap 2, partia 4: co zrobione (2026-10-21)

Zestaw publiczny (Q1 = a, platform F3) i rdzeń formularzy (F2), zgodnie z planem z etapu 0.

- **F2, `ui/src/forms/`:** `field-errors.ts` (`toFieldErrors`, przeniesione z `CrudForm`) i
  `useSchemaForm.ts` (kontrakt z F2: `values, setValue, fieldErrors, formError, isSubmitting,
  handleSubmit, handleKeyDown`, `onSuccess(data)`, `resetOnSuccess`), plus `handleBlur` i fokus na
  pierwszym błędnym polu po nieudanym wysłaniu (F2, prompt: wzorzec formularza).
- **`CrudForm` korzysta z `useSchemaForm`:** API i wszystkie dotychczasowe testy bez zmian (Z-1).
  Nowe zachowanie: po nieudanym wysłaniu fokus idzie na pierwsze błędne pole (F2 tego wymaga).
  Walidacji przy opuszczeniu pola `CrudForm` nie dostał (bez zmiany zachowania strefy zalogowanej).
- **F3, `ui/src/frontend/`:** `forms/TextField`, `forms/PasswordField`, `forms/SubmitButton`,
  `forms/SchemaForm`, `feedback/Notice`, `actions/LinkButton`. Tylko Tailwind na tych samych
  tokenach co zestaw shadcn; bez importów z `components/*`, `backend/*` (poza typami API) ani
  Base UI. Spinner to ikona lucide (komponent `Spinner` jest z zestawu shadcn).
- **`package.json` (ui):** eksporty `./forms/*` i `./frontend/*` (F2, F3). Bez nowych zależności.
- **`vitest.storybook.config.ts`:** `zod` w `optimizeDeps.include`.
- **Stories (28 nowych, razem 113):** Text field 4, Password field 4, Submit button 4, Notice 4,
  Link button 4, Schema form 8 (klient: błędy i fokus, walidacja przy opuszczeniu pola,
  oczekiwanie, błąd serwera, błąd pola z serwera, brak sieci przy 320 px). Schematy w stories to
  zastępniki `signInSchema`/`signUpSchema` z E01 Phase 2 (reguły z AD6 i tabeli pól).
- **Strony dokumentacji:** 6 stron po 13 sekcji w `src/frontend/**`.
- **Testy jednostkowe:** `forms/useSchemaForm.test.tsx`, `frontend/frontend.test.tsx`.
- **Luka:** lucide nie ma ikon marek, więc **Sign in with GitHub** jest bez logo (wpis do luki
  „zestaw ikon”).
- **Wyjątki `dark:`:** brak.

## Etap 2, partia 4: co sprawdzone

- test:storybook w obu motywach: 113/113 i 113/113 (play functions, a11y `error`).
- lint, typecheck, check:tokens (0 w ui), test:coverage (235 testów, 100%), build Next.js,
  test:integration (4/4).
- Zbudowany Storybook w Chromium: 6 stron × 2 motywy × 320/1440 px: bez poziomego przewijania,
  0 surowych tabel, 0 błędów konsoli.

## Etap 2, partia 4: czego nie sprawdzono

- Zestawu publicznego na prawdziwej stronie aplikacji: strony E01 Phase 2 jeszcze nie istnieją.
- `/backend/users` w przeglądarce po przejściu `CrudForm` na hook (przeszły jednostkowe
  i integracyjne).
- Reguły ESLint z F3 (zakaz shadcn/Base UI w `frontend/`): zgodnie z planem zostają w E01 Phase 2.
- Na stronach docs przykłady Schema form pokazują stan początkowy (play functions działają tylko
  w stories); czytnik ekranu na żywo.

## Etap 2, partia 4: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 4)”.

- **P-F2** Walidacja przy opuszczeniu pola tylko, gdy pole ma wartość albo już pokazuje błąd.
- **P-F3** `SchemaForm` domyślnie zostawia wartości po sukcesie (`resetOnSuccess={false}`), bo
  formularz publiczny przechodzi na inną stronę; hook i `CrudForm` domyślnie czyszczą (F2).
- **P-F4** Przycisk wysyłania w `SchemaForm` zawsze na całą szerokość formularza (`max-w-text`).
- **P-PF1** `PasswordField` ma przycisk pokazania hasła (ikona oka, stała nazwa „Show password”,
  `aria-pressed`). Specyfikacja mówi tylko o podpowiedzi i obsłudze menedżerów haseł.
- **P-LB1** `LinkButton` i `SubmitButton` używają nazw wariantów z `Button` (`default`, `outline`,
  `link`) zamiast własnych.
- **P-N1** Wariant `Notice` dla komunikatów E01: anulowanie przez użytkownika (`github_cancelled`)
  to `info`, awaria to `error`.

## Decyzje PO z 2026-10-21 (po partii 4)

- **P-F2, P-F3, P-F4, P-PF1, P-LB1, P-N1:** przyjęte tak, jak zaproponowane; w docs i komentarzu
  `PasswordField.tsx` oznaczone „proposal approved by PO(Rafał)”.
- **Do zrobienia przy P-PF1:** dopisać „pokaż hasło” do specyfikacji E01 przy Phase 2 (zob. „Do
  zrobienia poza design systemem”).

## Etap 3: partie (plan, 2026-10-21)

1. Komponenty produktu E01 (`components/auth/`): SignInOptions, ConfirmEmailPanel,
   InvitationPanel, AccountSummary, SiteHeader.
2. Komponenty strefy zalogowanej E02: BookableStatusLine, SetupChecklist + SetupItem,
   PayoutStatus, SlotList + SlotRow.
3. Publiczne komponenty E02: MentorProfileHeader, PublicWorkLinks, PriceList, TextOnlyNote,
   NotBookableNotice.
4. Wzorce: Form (MSW: sukces, oczekiwanie, błąd pola, błąd serwera, brak sieci), Detail view,
   Delete confirmation, Setup checklist, Sign-in and return, Provider status.
5. Ekrany E01 i E02 na pełny ekran z mapą stanów.

## Etap 3, partia 1: co zrobione (2026-10-21)

- **`ui/src/components/auth/`** (folder koncepcji, AGENTS.md p. 3): `SignInOptions`,
  `ConfirmEmailPanel`, `InvitationPanel`, `SiteHeader` (tylko zestaw publiczny F3) i
  `AccountSummary` (shadcn, strefa zalogowana). Komponenty są prezentacyjne: dane i wywołania
  `apiCall` przychodzą w propsach (ui bez dostępu do danych). Teksty ze specyfikacji E01.
- **SignInOptions:** GitHub pierwszy (prawdziwy link), banery `github_*`, formularz e-mail z N03
  (Phase 2; bez propsa `email` wariant Phase 1), po `email_not_confirmed` osobny formularz
  **Resend confirmation** z czterema wynikami.
- **ConfirmEmailPanel:** 4 stany linku z Flow 2; hasło i **Confirm** w stanie ważnym.
- **InvitationPanel:** 5 stanów Flow 3; przy niezgodnym koncie brak Accept i brak zaproszonego
  adresu; Accept i Sign out pokazują błąd serwera bez nawigacji.
- **AccountSummary:** karta z formularzem nazwy (`children`), `dl` z e-mailem, rolami (Badge)
  i metodami logowania, powitanie `?welcome=1`.
- **SiteHeader:** Sign in / linki zależne od ról / nazwa / Sign out (POST); prop
  `linkComponent` dla `next/link` (ui nie importuje Next; ESLint Next zabrania `<a href="/">`).
- **Znalezione przez test a11y:** komunikat błędu wylogowania z `role="alert"` na `<li>` łamał
  semantykę listy; przeniesiony pod listę.
- **Stories (36 nowych, razem 149):** każdy komponent ze stanami danych (ładowanie, błąd,
  częściowe dane, dużo danych, długie teksty przy 320 px; pusty stan opisany jako nie dotyczy).
- **Strony dokumentacji:** 5 stron po 13 sekcji z mapą stanów.
- **Testy jednostkowe:** `components/auth/auth.test.tsx`.

## Etap 3, partia 1: co sprawdzone

- test:storybook w obu motywach: 149/149 × 2; lint, typecheck, check:tokens (0 w ui),
  test:coverage (248 testów, 100%), build Next.js, test:integration (4/4).
- Chromium: 5 stron × 2 motywy × 320/1440 px bez poziomego przewijania i błędów konsoli;
  SignInOptions (ciemny, 1440) i SiteHeader (320) obejrzane na zrzutach.

## Etap 3, partia 1: czego nie sprawdzono

- Komponentów na prawdziwych stronach: strony E01 Phase 1/2 nie istnieją w tej gałęzi.
- Schematy w stories to zastępniki `signInSchema`, `accountUpdateSchema` (core ich jeszcze nie ma).
- `CrudForm` nie ma jeszcze propsa `resetOnSuccess` (E01 Phase 1); `AccountSummary` go nie wymaga.
- Czytnik ekranu na żywo.

## Etap 3, partia 1: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 1 etapu 3)”.

- **P-A1** Tekst dla `github_no_verified_email` (spec podaje tylko intencję): „Your GitHub account
  has no verified email.” + „Verify an email on GitHub and try again, or create an account with
  email.”
- **P-A2** Nagłówek sekcji „Sign in with email” na `/sign-in` z linią oddzielającą od GitHub.
- **P-A3** Drugie zdanie przy niezgodnym koncie: „Sign out, then sign in or create an account
  with the invited address.”
- **P-A4** Długa nazwa w nagłówku ucięta wielokropkiem po 12 rem, pełna w `title`. Przy 320 px
  nagłówek z wszystkimi rolami zajmuje cztery linie (zrzut); alternatywa: menu konta (luka
  „Menu” w What is missing).
- **P-A5** Błąd wylogowania: „Could not sign out. Try again.” pod linkami.
- **P-A6** `SiteHeader` przyjmuje `linkComponent` (aplikacja podaje `Link` z Next).
- **P-A7** Zaproszenie bez sesji: **Sign in** jako główna akcja, **Create an account** jako `outline`.
- **P-A8** Warianty Notice dla stanów linku potwierdzającego: wygasły `info`, użyty `success`,
  nieważny `error` (jak P-N1).

## Decyzje PO z 2026-10-21 (po partii 1 etapu 3)

- **P-A1–P-A8:** przyjęte tak, jak zaproponowane; w docs, stories i komentarzu `SignInOptions.tsx`
  oznaczone „proposal approved by Rafał”.
- **P-A4 to rozwiązanie tymczasowe:** po rozwiązaniu luki „Menu” pełna nazwa przechodzi do menu
  konta (wpis przy luce w „What is missing”; oznaczenie w `site-header.mdx` i story).

## Etap 3, partia 2: co zrobione (2026-10-21)

Komponenty strefy zalogowanej E02 (shadcn), w folderach koncepcji (AGENTS.md p. 3):

- **`mentors/BookableStatusLine`:** cztery zdania z E02 Flow 1 (nazywa tylko brakujące
  elementy), przy „bookable” publiczny link (mono, R01.2) i **Copy link** z wynikiem `role="status"`.
- **`mentors/SetupItem` + `mentors/SetupChecklist`:** lista `ol` małych kart; pozycje Profile
  i Slots z mapowaniem stanów E02 Flow 1; pozycja Payouts z `PayoutStatus`. Stan zawsze tekstem
  w plakietce (warianty wg zatwierdzonego mapowania), notatka „Save your profile first.”.
- **`payments/PayoutStatus`:** 9 stanów (aprowizacja przed stanem wypłat, Flow 3/G3), wybór kraju
  z podpowiedzią ze spec, POST przez `apiCall` strony, błąd serwera w `Alert` z dalszą akcją.
- **`availability/SlotList` + `availability/SlotRow`:** gęsta lista z liniami (R01.1, R01.3),
  szkielet przy ładowaniu (P-LD1), pusty stan ze spec, błąd z Retry, wiersze Open/Booked,
  **Remove** z dialogiem potwierdzenia (pytanie z datą, 409 „booked meanwhile” zostawia tylko
  **Close**), zdanie o rezerwacji zamiast przycisku w wierszu zarezerwowanym.
- **Znalezione w przeglądarce i poprawione:** (1) przy 320 px plakietka z długim stanem
  („We need to check an earlier setup attempt”) obok tytułu karty zasłaniała tytuł i była ucięta;
  test przewijania tego nie złapał, bo `overflow-hidden` plakietki chowa nadmiar → plakietka pod
  tytułem, może się łamać (P-M8); (2) długa nazwa strefy czasowej rozpychała wiersz slotu
  w wąskiej ramce docs → `wrap-anywhere` w linii metadanych; (3) test dialogu: widoczność
  sprawdzana w `waitFor` (zanikanie).
- **Stories (33 nowe, razem 182):** każdy komponent ze stanami danych (ładowanie, pusto, błąd,
  częściowe dane, dużo danych, długie teksty przy 320 px; „nie dotyczy” opisane w docs).
- **Strony dokumentacji:** 4 strony po 13 sekcji z mapą stanów.
- **Testy jednostkowe:** `components/mentors/mentor-setup.test.tsx`.

## Etap 3, partia 2: co sprawdzone

- test:storybook w obu motywach: 182/182 × 2; lint, typecheck, check:tokens (0 w ui),
  test:coverage (265 testów, 100%), build Next.js, test:integration (4/4).
- Chromium: 4 strony × 2 motywy × 320/1440 px bez przewijania w bok i błędów konsoli;
  zrzuty: Setup checklist (320 ciemny, 1440 jasny), Slot list „Many” (1440).

## Etap 3, partia 2: czego nie sprawdzono

- Komponentów na prawdziwych stronach: `/mentor` i `/mentor/slots` nie istnieją w tej gałęzi.
- `LocalTime` zostaje w aplikacji (E02 UI/UX); stories podają gotowe sformatowane czasy.
- Czytnik ekranu na żywo.

## Etap 3, partia 2: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 2 etapu 3)”.

- **P-M1** Przycisk **Copy link** i wynik „Copied.” / „Could not copy. Select the link and copy it.”
- **P-M2** Stan `failed` (aprowizacja) jako plakietka „Setup failed” (`destructive`); spec podaje
  tylko akcję.
- **P-M3** Stan przed wyborem kraju jako „Not started” (`secondary`).
- **P-M4** Akcja następnego kroku jako `default`, akcje przy zakończonych pozycjach jako `outline`
  lub link (Edit profile, Manage slots, View public page); Check status jako `secondary`.
- **P-M5** Tytuł błędu ładowania listy slotów: „Couldn't load your slots”.
- **P-M6** Pole kraju: etykieta „Country”, opcja-instrukcja „Choose a country”, kolejność
  alfabetyczna, błąd „Choose a country.”.
- **P-M7** Etykiety oczekiwania: „Starting Stripe setup…”, „Retrying setup…”, „Opening Stripe…”.
- **P-M8** Plakietka stanu pod tytułem pozycji (nie obok) i z łamaniem tekstu.
- **Pytanie:** dokąd prowadzi **Contact the DevMentor team** (adres e-mail? strona?). Spec tego
  nie mówi; komponent przyjmuje `contactHref`, w stories `mailto:team@devmentor.example`.

## Decyzje PO z 2026-10-21 (po partii 2 etapu 3)

- **Contact the DevMentor team:** adres zostaje w propsie `contactHref`; prawdziwy adres trafi do
  specyfikacji E02 przy stronach `/mentor` (wpis w „Do zrobienia poza design systemem”).
- **P-M1–P-M7:** przyjęte; w docs oznaczone „proposal approved by Rafał”.
- **P-M8: odrzucone.** Obowiązuje P-C10: plakietka ma 1–3 słowa i się nie zawija. Plakietka
  wróciła obok tytułu (`CardAction`). Dłuższe stany ze specyfikacji idą do tekstu pod tytułem
  (`note`), a plakietka dostaje krótką etykietę:
  - `reconciliation_required`: plakietka *Setup interrupted*, tekst „We need to check an earlier
    setup attempt.” — **P-S1a, proposal** (w spec nie ma krótkiej etykiety; słowo z Flow 3 krok 3
    „Recover an interrupted attempt”);
  - payout `pending`: plakietka *Pending*, tekst „Stripe is checking your details.” — **P-S1b,
    proposal** (nazwa statusu `pending` z Flow 3 krok 6; w UI spec jej nie pokazuje);
  - pozostałe stany mieszczą się w P-C10 bez zmian (*Starting Stripe setup*, *No upcoming slots*,
    *N upcoming (M booked)* do ok. 30 znaków).
  - **P-S1a i P-S1b zatwierdzone** przez PO 2026-10-21 (po commicie 9fbecd9); w docs oznaczone
    „proposal approved by Rafał” (`badge.mdx`, `payout-status.mdx`, `setup-checklist.mdx`).
  - Przy okazji: story `Badge` „Status with icon” (partia 2 etapu 2) miało plakietkę „Stripe is
    checking your details” wbrew P-C10; teraz *Pending*. Mapowanie w `badge.mdx` poprawione.
  - Lekcja w `.ai/lessons.md` (2026-10-21, „A no-horizontal-scroll check misses clipped text”)
    poprawiona: nie zawijać plakietki, tylko krótka etykieta + zdanie w tekście.

## Etap 3, partia 3: co zrobione (2026-10-21)

Publiczne komponenty E02 dla `/mentors/[id]` (E02 Flow 2 krok 4), tylko zestaw publiczny F3
(bez shadcn i Base UI), w `ui/src/components/mentors/`:

- **`MentorProfileHeader`:** nazwa wyświetlana jako `h1`, plakietka obszaru (wygląd plakietki
  `outline` w czystym Tailwindzie), opis jako zwykły tekst z zachowanymi łamaniami linii
  (`whitespace-pre-line`; Markdown i HTML widać dosłownie). Opis dołożyłem do nagłówka, bo plan
  przewidywał tylko nazwę i obszar, a spec wymaga opisu na stronie i nie miał innego miejsca.
  Eksportuje `Area`, `AREA_LABELS`.
- **`PublicWorkLinks`:** `h2` „Public work”, wiersze z cienką linią (R01.3), etykieta host +
  ścieżka w kroju mono (R01.2), `target="_blank"`, `rel="nofollow noopener ugc"`, ikona
  `ExternalLink` i „(opens in a new tab)” dla czytników (E02 UI/UX). Eksportuje `linkLabel()`.
- **`PriceList`:** „25 min · $40”, „50 min · $70”, zawsze w tej kolejności; kwoty formatuje strona
  przez `formatMoney` z core (P17), bo ui nie importuje core.
- **`TextOnlyNote`:** „Text sessions only” (N01), bez ikony.
- **`NotBookableNotice`:** `Notice` `info` z tytułem „Not taking bookings yet” (MD4), bez akcji.
- **Znalezione przez test a11y i poprawione:** nagłówek profilu jako `<header>` poza `<main>` to
  drugi landmark „banner” obok `SiteHeader` (axe: `landmark-no-duplicate-banner`) → `<div>`;
  `h1` i tak nazywa stronę.
- **Stories (17 nowych, razem 199):** stany danych; pusty stan, ładowanie i błąd opisane w docs
  jako „nie dotyczy” z powodem (pola wymagane, strona renderowana na serwerze, brak profilu = 404).
- **Strony dokumentacji:** 5 stron po 13 sekcji.
- **Testy jednostkowe:** `components/mentors/public-profile.test.tsx`.

## Etap 3, partia 3: co sprawdzone

- lint 0, typecheck 0, check:tokens (0 w ui), test:coverage (271 testów, 100%),
  build-storybook 0, test:storybook w obu motywach 199/199 × 2, build Next.js 0,
  test:integration 4/4. `package.json` bez zmian.
- Chromium: 5 stron × 2 motywy × 320/1440 px bez przewijania w bok, surowych tabel i błędów
  konsoli; zrzuty: nagłówek z długą nazwą (320, ciemny), długi link (320), pięć linków (1440).

## Etap 3, partia 3: czego nie sprawdzono

- Komponentów na prawdziwej stronie: `/mentors/[id]` nie istnieje w tej gałęzi.
- `formatMoney` jeszcze nie ma w core; stories podają gotowe kwoty.
- Czytnik ekranu na żywo.

## Etap 3, partia 3: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 3 etapu 3)”.

- **P-PP1** Plakietka obszaru: wygląd `outline` (ramka, bez koloru), w zestawie publicznym jako
  zwykły `span` (spec mówi tylko „an area badge”).
- **P-PP2** Układ nagłówka: nazwa i plakietka w jednej linii (plakietka schodzi pod nazwę, gdy
  brak miejsca), opis pod spodem w `max-w-text`.
- **P-PP3** Nagłówek sekcji linków: „Public work” (`h2`); termin z briefu „public work link”.
- **P-PP4** Etykieta linku: bez query i fragmentu; sam host, gdy ścieżka to „/”.
- **P-PP5** Lista cen: nazwa „Prices” (`aria-label`), kwota pogrubiona, cyfry tabelaryczne.
- **P-PP6** „Text sessions only” bez ikony, `text-label` w kolorze tekstu.
- **P-PP7** „Not taking bookings yet” jako `Notice` `info` bez treści i bez akcji (luka
  w referencjach: „Ekrany bez referencji”).

## Decyzje PO z 2026-10-21 (po partii 3 etapu 3)

- **P-PP1–P-PP7:** przyjęte tak, jak zaproponowane; w docs oznaczone „proposal approved by Rafał”.
- **Opis w `MentorProfileHeader`:** różnica względem planu przyjęta (uzasadniona specyfikacją E02
  Flow 2 krok 4).
- **Kody P-S1a i P-S1b** zostają bez zmian (mimo podobieństwa do P-S1, reguły cienia).
- **`formatMoney`:** wpis w „Do zrobienia poza design systemem”.

## Etap 3, partia 4: co zrobione (2026-10-21)

Wzorce w `ui/src/patterns/` (story + strona docs każdy, menu „Patterns”), złożone wyłącznie
z komponentów pakietu i `apiCall`; odpowiedzi API symuluje MSW (`parameters.msw`):

- **Form:** zestaw publiczny (`SchemaForm`, `/sign-up`) i zalogowany (`CrudForm`, `/account`).
  MSW: sukces, oczekiwanie (z blokadą podwójnego wysłania: liczba żądań = 1), błąd pola, błąd
  serwera 500 (dokładna treść z `apiHandler`), brak sieci; do tego walidacja po opuszczeniu pola,
  fokus na pierwszym błędzie, długie treści przy 320 px.
- **Detail view:** `/mentors/[id]`: stan „Not taking bookings yet” na górze, od 1024 px ceny
  w bocznej kolumnie, 404 „nie istnieje albo brak dostępu”; test, że status i `h1` są widoczne
  bez przewijania (1440 i 320 px z opisem 2000 znaków).
- **Delete confirmation:** `/mentor/slots` z prawdziwym `DELETE` przez MSW: pytanie z datą,
  Cancel pierwszy, Escape i powrót fokusu, oczekiwanie, 409, ponowienie po braku sieci, pusta
  lista po ostatnim slocie.
- **Setup checklist:** `/mentor` (linia statusu + checklista): test liczy przyciski w stylu
  głównym na każdym etapie.
- **Sign-in and return:** zaproszenie → `/sign-in?returnTo=…` → powrót do zaproszenia (MSW
  `POST /api/auth/sign-in`), zły hasło z zachowanym `returnTo`, powrót do nieważnego zaproszenia.
- **Provider status:** banery `?stripe=returned` / `check_failed` z tekstami ze spec + stan
  pozycji Payouts; start nieudany u dostawcy (502) z **Retry setup**.
- **Znalezione przez złożenie wzorców i poprawione w komponentach:**
  - `SetupItem` miał nagłówek poziomu 3 pod `h1` strony (axe `heading-order`) → poziom 2;
  - `SlotRow` po błędzie przejściowym (brak sieci, 500) zostawiał tylko **Close**, więc nie dało
    się ponowić → **Remove slot** zostaje; tylko 409 i 404 kończą (P-DC1);
  - baner „check failed” powtarzał „Try checking again” jako zdanie i jako przycisk → zostaje
    przycisk.
- **Stories:** 44 nowe (razem 243). **Strony docs:** 6 (struktura 9 sekcji, P-PT1).
- **Testy jednostkowe:** nowy test ponawiania w `mentor-setup.test.tsx`; poziom nagłówka 2.

## Etap 3, partia 4: co sprawdzone

- lint 0, typecheck 0, check:tokens (0 w ui), test:coverage (272 testy, 100%), build-storybook 0,
  test:storybook w obu motywach 243/243 × 2, build Next.js 0, test:integration 4/4.
  `package.json` bez zmian (MSW był w planie i jest zainstalowany od etapu 1).
- Chromium: 6 stron × 2 motywy × 320/1440 px bez przewijania w bok i surowych tabel. Jedyny
  komunikat konsoli to symulowana odpowiedź 409 w osadzonej story *Booked meanwhile* (zamierzona).
- Zrzuty: Detail view (1440 jasny, 320 ciemny), Provider status *Check failed* (1440 ciemny),
  Delete confirmation *Booked meanwhile* (1440).

## Etap 3, partia 4: czego nie sprawdzono

- Wzorców na prawdziwych stronach (strony E01 Phase 2 i E02 nie istnieją w tej gałęzi).
- Schematy `signUpSchema`, `signInSchema`, `accountUpdateSchema` to zastępniki w stories.
- `CrudForm` nie ma `resetOnSuccess` (E01 Phase 1), więc po zapisie wraca do wartości
  początkowych; opisane w docs wzorca Form.
- Treść 502 `provider_unavailable` w *Start failed* to przykład; spec jej nie ustala.
- Wzorzec „lista z filtrami”: zgodnie z Q6 = (a) idzie z E03 (What is missing).
- Czytnik ekranu na żywo.

## Etap 3, partia 4: do decyzji (oznaczone w docs jako proposal)

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 4 etapu 3)”.

- **Q-SC1 (pytanie):** na `/mentor` po zapisaniu profilu są dwie główne akcje naraz
  (**Continue to Stripe** i **Publish slots**): E02 Flow 1 daje każdej pozycji jedną następną
  akcję, R01.6 chce jednej akcji głównej na ekranie. (a) styl główny ma tylko pierwsza
  niezakończona pozycja, reszta `outline` (zmiana w `SetupChecklist`: musi wiedzieć, czy Payouts
  jest zakończone); (b) zostawić dwie.
- **P-PT1** Strona wzorca ma 9 sekcji: problem, gdzie, z czego, reguły (ze źródłem), stany,
  zachowanie, kod, dobrze/źle, powiązane (prompt podaje 13 sekcji tylko dla komponentów).
- **P-FM1** Formularz, który zostaje na stronie, po zapisie pokazuje status „Your display name
  is saved.” (`Alert` `success`, `role="status"`).
- **P-DV1** Status zmieniający to, co gość może zrobić („Not taking bookings yet”), jest nad nazwą.
- **P-DV2** Od 1024 px ceny w bocznej kolumnie (tam E04 doda **Book**); węziej po opisie. Przy
  320 px i długim opisie ceny są pod opisem; E04 musi trzymać **Book** nad zgięciem (What is missing).
- **P-DV3** Strona 404: „Page not found”, „This page doesn't exist, or you don't have access to
  it.”, **Go to the home page**.
- **P-DC1** Błąd przejściowy przy usuwaniu zostawia **Remove slot** (ponowienie); 409 i 404
  zostawiają tylko **Close**.
- **P-PS1** Warianty banerów Stripe wg mapowania statusów (ready `success`, pending `default`,
  incomplete `warning`, blocked i check failed `destructive`), wiadomość `role="status"`,
  problem `role="alert"`; „Try checking again” jako przycisk zamiast powtórzonego zdania.

## Decyzje PO z 2026-10-21 (po partii 4 etapu 3)

- **Q-SC1: opcja (a).** Styl główny ma tylko akcja pierwszej niezakończonej pozycji; pozostałe są
  `outline` (źródło: R01.6, P-M4). Wpisane:
  - `SetupChecklist` sam wyznacza pierwszą niezakończoną pozycję (`firstUnfinished`: profil nie
    zapisany → wypłaty nie `ready` → brak slotów). Prop `payouts` przyjmuje teraz propsy
    `PayoutStatus` (zamiast gotowego elementu), a checklista renderuje `PayoutStatus` z `next`;
  - `PayoutStatus` dostał prop `next` (domyślnie `true`); `false` → przycisk `outline`;
  - u nas po zapisaniu profilu główna jest tylko **Continue to Stripe**; **Publish slots** jest
    `outline`, dopóki wypłaty nie są gotowe (także gdy Stripe sprawdza dane);
  - story komponentu *Profile saved* i wzorca *Step payouts* / *Waiting* sprawdzają liczbę akcji
    głównych; testy jednostkowe `firstUnfinished` i `next={false}`; docs komponentu, `PayoutStatus`
    i wzorca zaktualizowane.
- **Q-SC1, doprecyzowanie (PO 2026-10-21): opcja (2).** Przycisk główny ma **pierwsza niezakończona
  pozycja z akcją**. Pozycja, która tylko czeka (wypłaty, gdy Stripe sprawdza dane: samo **Check
  status**), jest pomijana, więc główny przechodzi np. na **Publish slots**; wszystko inne `outline`.
  Jeden przycisk główny, a zero tylko wtedy, gdy żadna pozycja nie ma akcji. Wpisane:
  - `firstUnfinished` → `firstWithAction` (profil niezapisany → wypłaty z krokiem konfiguracji →
    brak slotów); `payoutHasAction()` w `PayoutStatus`;
  - akcja w wypłatach = krok konfiguracji, który robi mentor: *Not started*, *Starting Stripe setup*,
    *Setup interrupted*, *Incomplete*. Nie liczą się: *Pending* (oczekiwanie), *Setup failed* i
    *Blocked* (kontakt z zespołem zostaje `outline`, P-M4), *Locked*, *Confirmed* — interpretacja
    zmieniona po potwierdzeniu PO, zob. niżej;
  - story wzorca *Waiting* (główny = Publish slots) i nowe *Waiting nothing to do* (zero);
    testy jednostkowe; docs `SetupChecklist`, `PayoutStatus`, wzorca.
- **Q-SC1, potwierdzenie (PO 2026-10-21): opcja (b).** W *Setup failed* i *Blocked* akcją wypłat jest
  **Contact the DevMentor team** (akcja ze spec E02 dla tych stanów); jest przyciskiem głównym, gdy to
  pierwsza niezakończona pozycja z akcją, inaczej `outline`. Link zostaje prawdziwym `<a>`
  z `buttonVariants()` (bez `role="button"`; `ui` nie importuje Next, a `mailto:` i tak jest `<a>`),
  adres w `contactHref`. `failed` i `blocked` dodane do `payoutHasAction()`; stories (*Blocked* w
  komponencie i wzorcu, *Setup failed*, *Blocked not primary*), testy i docs zaktualizowane.
  - przy okazji: import cykliczny `SetupChecklist` ↔ `PayoutStatus` (przez `LOCKED_NOTE`) wywracał
    ładowanie stories w przeglądarce (testy jsdom go nie złapały) → `LOCKED_NOTE` przeniesiony do
    `SetupItem`; `SetupChecklist` dalej go eksportuje.
- **P-PT1, P-FM1, P-DV1–P-DV3, P-DC1, P-PS1:** przyjęte; w docs oznaczone „proposal approved by Rafał”.

## Etap 3, partia 5: co zrobione (2026-10-21)

Ekrany E01 i E02 jako stories na pełny ekran (`src/screens/e01`, `src/screens/e02`, menu
„Screens/E01”, „Screens/E02”), każdy ze stroną docs z **mapą stanów** (stan ekranu → story → źródło):

| Ekran | Trasa | Stories |
|---|---|---|
| Sign in | `/sign-in` | 9 |
| Sign up | `/sign-up` | 8 |
| Check email | `/sign-up/check-email` | 3 |
| Confirm email | `/confirm-email` | 7 |
| Invitation | `/invite/[token]` | 8 |
| Account | `/account` | 7 |
| Mentor setup | `/mentor` | 11 |
| Profile form | `/mentor/profile` | 7 |
| Slots | `/mentor/slots` | 11 |
| Public profile | `/mentors/[id]` | 6 |

- Złożone wyłącznie z komponentów pakietu; API przez prawdziwe `apiCall` + MSW (sukces,
  oczekiwanie, błąd pola, błąd serwera, 401/403/409/429/502 tam, gdzie spec je wymienia).
- **`CrudForm`: pola `textarea` i `select`** (decyzja PO: opcja 1, ściśle addytywnie wg E02 Flow 2;
  istniejące testy bez zmian, nowy test dopisany, 100%). Ekran Profile form używa `CrudForm`.
- **Bloki pomocnicze (tylko Storybook, `.storybook/blocks/`):** `screen.tsx` (rama ekranu
  z prawdziwym `SiteHeader`), `fixtures.ts` (zastępniki schematów i odpowiedzi API),
  `stripe-banner.tsx` (banery Stripe, wspólne dla wzorca Provider status i ekranu Mentor setup),
  `public-profile.tsx` (kompozycja `/mentors/[id]`, wspólna dla wzorca Detail view i ekranu).
- Formularz slotów odtworzony w story z `useSchemaForm` + prymitywów, bo spec trzyma go
  w aplikacji (`mentor/slots/slot-form.tsx`).
- Teksty 429 wg spec: „Too many attempts. Try again later”.

## Etap 3, partia 5: co sprawdzone

- lint 0, typecheck 0, check:tokens (0 w ui), test:coverage (276 testów, 100%), build-storybook 0,
  test:storybook w obu motywach 323/323 × 2, build Next.js 0, test:integration 4/4.
  `package.json` bez zmian.
- Chromium: 10 stron ekranów × 2 motywy × 320/1440 px bez przewijania w bok i surowych tabel;
  jedyne komunikaty konsoli to symulowane 400/409 w osadzonych stories (zamierzone).
- Zrzuty: Mentor setup „Back from Stripe checking” (1440 jasny), Slots „Overlap” (320 ciemny),
  Profile form „Edit” (1440 ciemny), Sign up „From invitation” (320 jasny).

## Etap 3, partia 5: czego nie sprawdzono

- Ekranów w aplikacji: strony E01 Phase 2 i E02 nie istnieją w tej gałęzi.
- Schematy w `fixtures.ts` to zastępniki; komunikaty walidacji ustali core.
- `LocalTime` zostaje w aplikacji; stories podają sformatowane czasy.
- Czytnik ekranu na żywo.

## Etap 3, partia 5: do decyzji

Rozstrzygnięte 2026-10-21, zob. „Decyzje PO z 2026-10-21 (po partii 5 etapu 3)”.

- **Q-CF1 (pytanie):** `CrudForm` nie podpina `handleBlur` (brak walidacji po opuszczeniu pola,
  którą wzorzec Form deklaruje dla obu zestawów) ani `aria-describedby` do komunikatu błędu
  (błąd jest ogłaszany przez `role="alert"`, ale nie jest powiązany z polem). Nie poprawiłem tego,
  bo zmienia zachowanie istniejących pól (decyzja: ściśle addytywnie). (a) poprawić w `CrudForm`
  (dwie linie + testy); (b) zostawić i opisać w docs wzorca Form jako lukę.
- **P-SCR1** Rama ekranu: `SiteHeader` + `main` na siatce nagłówka (`max-w-content`,
  `px-page-gutter`, `py-section`), formularze i komunikaty w `max-w-text`.
- **P-SCR2** Tytuły stron (`h1`): Sign in, Create an account, Check your email, Confirm your email,
  Mentor invitation, Account, Mentor setup, Create your profile / Edit profile, Slots. Część
  z etykiet linków w spec (Create an account, Mentor setup, Create your profile, Edit profile).
- **P-SCR3** Sign up: przy zaproszeniu „Use the email address that received your invitation.”;
  link „Sign in instead”.
- **P-SCR4** Check email, nie wysłano: „Sign in with your email and password to resend the
  confirmation.” i **Sign in** jako główna akcja.
- **P-SCR5** Slots: „Add a slot” nad „Upcoming slots” (główna akcja widoczna bez przewijania przy
  wielu slotach; spec wymienia listę pierwszą).
- **P-SCR6** Profile form: opcja-instrukcja „Choose an area”, przykład w polu linków
  „https://github.com/you/project”.

## Decyzje PO z 2026-10-21 (po partii 5 etapu 3)

- **Q-CF1: opcja (a).** `CrudForm` sprawdza pole po jego opuszczeniu (`handleBlur` z F2, gdy pole
  ma wartość albo błąd) i wiąże komunikat błędu z polem przez `aria-describedby` (+ `id` na
  `FieldError`). Źródło: wzorzec formularza z promptu (etap 3), WCAG 1.3.1 i 3.3.1, zgoda PO wg
  zasady 12. Istniejące testy bez zmian; nowy test i nowa story *Signed in validate on blur*;
  docs wzorca Form i komentarz `CrudForm` opisują stan faktyczny.
  - **Znalezione przez test integracyjny `/backend/users` i poprawione w `useSchemaForm` (F2):** po
    pustym wysłaniu pod polami są błędy; walidacja przy opuszczeniu pola usuwała je dopiero, gdy
    użytkownik klikał przycisk, więc przycisk przesuwał się między wciśnięciem a puszczeniem myszy
    i klik ginął (2 z 4 testów integracyjnych). Teraz pole z widocznym błędem jest sprawdzane przy
    wpisywaniu i błąd znika od razu po poprawce; przy opuszczeniu pola nic się nie przesuwa.
    Dotyczy obu zestawów (`CrudForm`, `SchemaForm`). Istniejące testy bez zmian, nowy test w
    `useSchemaForm.test.tsx`, reguła w docs wzorca Form.
- **P-SCR1, P-SCR2, P-SCR3, P-SCR4, P-SCR6:** przyjęte; w docs „proposal approved by Rafał”.
- **P-SCR5: opcja (a).** „Add a slot” nad listą; przyjęte i oznaczone. Zmiana kolejności
  w specyfikacji E02 w „Do zrobienia poza design systemem”.

## Opis ekranu do testu agentem (etap 5)

**Wykonany 2026-10-21 w dwóch osobnych sesjach, bez historii wcześniejszej pracy.**

**Kandydat:** E01 #28 / E01-S01 #34, publiczna strona `/error?code=internal_error`.
Nie ma jej w Storybooku (sprawdzono indeks 70 stron / 324 stories).
Źródło: `.ai/specs/2026-10-17-accounts-and-roles.md`, „Auth navigation and error
fallback”, UI/UX (wiersz `/error`) i Phase 1 krok 4.

**Prompt do osobnej sesji:**

> Przeczytaj `packages/ui/AGENTS.md` i wskazany tam skrót design systemu,
> następnie potrzebne strony Storybooka i specyfikację E01. Zbuduj lokalny prototyp
> minimalnej publicznej strony `/error?code=internal_error`, której nie ma jeszcze
> w Storybooku. Użyj istniejących komponentów i tokenów zgodnie z dokumentacją.
> Strona i jej nagłówek muszą działać, gdy odczyt sesji lub DB zawodzi: bez principal,
> request scope, odczytu DB i spersonalizowanej nawigacji. Sprawdź najpierw, czy
> gotowy nagłówek nadaje się do tego kontekstu. Nie dodawaj komponentów, wariantów,
> zależności ani nowych reguł produktu. Nieustalone teksty i akcję odzyskania
> zgłoś jako brak albo jawne założenie, zamiast przedstawiać je jako zatwierdzone.
> Sprawdź klawiaturę, oba motywy i szerokości 320, 768 i 1440 px. Nie publikuj
> ani nie wysyłaj do remote. Oddaj listę użytych źródeł i każdego miejsca, w którym
> musiałeś zgadywać; przy każdym podaj, jakiej informacji zabrakło i gdzie jej szukałeś.

**Ocena po teście:** obie niezależne sesje zapisały importy i wybory komponentów,
zgodność z tokenami, obsługę stanów, klawiaturę, motywy, szerokości oraz listę
zgadywanych decyzji. Prototypy powstały wyłącznie w gałęziach
`test/agent-error-screen` i `test/agent-error-app`; nie są częścią tej gałęzi i nie
podlegają scaleniu.

### Wynik testu świeżym agentem (2026-10-21)

- Obie sesje odrzuciły gotowy `SiteHeader`: `account={null}` oznacza użytkownika
  wylogowanego i pokazuje **Sign in**, a podczas awarii rozpoznanie tożsamości jest
  nieznane. Potrzebny jest brand-only, identity-free header bez nawigacji konta.
- `/error` musi pozostać poza layoutem, który odczytuje principal, tworzy request scope
  albo dotyka DB. W repozytorium nie ma jeszcze publicznego szkieletu strony bez takiego
  layoutu dla `(frontend)`.
- Nie ma zatwierdzonej mapy stanów `/error` ani Storybookowej story ekranu. Spec wymienia
  `internal_error` i „known codes”, ale nie definiuje pełnej listy, kodu nieznanego,
  braku `code` ani dokładnej treści i akcji odzyskania.
- Sesje użyły statycznej treści i linku do `/` wyłącznie jako założeń prototypu. Nie są
  one regułą produktu; pytania wpisano do „Do zrobienia poza design systemem”, a propozycje
  do decyzji przedstawiono osobno w odpowiedzi PO.
- Weryfikacja w gałęziach testowych obejmowała lint, typecheck, build, coverage,
  integrację, klawiaturę, oba motywy i szerokości 320/768/1440 px. W tej sesji testu
  nie powtarzano i nie budowano `/error`.


## Etap 4: co wdrożono (2026-10-21)

- 10 nowych stron `src/docs/design-system/`: Start here, Components, How to choose,
  Usage and accessibility, Content, What to avoid, What is missing, Contributing oraz E01/E02.
- Start here: charakter w trzech zdaniach, pięć kroków, tabela 37 rodzin komponentów oraz
  współdzielonych kompozytów (CrudForm, DataTable, EmptyState, SlotRow, SetupItem), importy,
  kiedy używać i alternatywy. Katalog: 37 działających podglądów prawdziwych stories,
  grupa, opis, import i link do API. Części złożone opisane przy rodzinach.
- Przewodniki wyboru obejmują również pominięte kontrolki, zawsze jako brak i z obecną
  alternatywą. Zasady dostępności, treści, antywzorce oraz wkład w system mają źródła.
- Strony epików: przepływy, linki do map stanów ekranów, źródła i praca pozostała w aplikacji.
  What is missing pokrywa wszystkie pozycje backlogu #28–#47; E03–E06 pozostają poza zakresem.
- Skrót dla agentów `packages/ui/docs/design-system.md`, odwołanie w nowym
  `packages/ui/AGENTS.md` (lokalnie w design systemie, zgodnie z zasadą 11).
- Brak nowych komponentów produktu, wariantów, zależności, zmian kodu aplikacji, publikacji
  i wysyłania do remote. Dotychczasowe komponenty, stories, tokeny i strony zachowane.
- Specyfikacją tej pracy pozostaje zatwierdzony prompt + plan i decyzje w POSTEP;
  ten wpis aktualizuje wykonanie etapu 4. Korekty specyfikacji E01/E02 pozostają osobnym zadaniem.

## Etap 4: weryfikacja

- `build-storybook`, lint, typecheck i `check:tokens`: pass; zero naruszeń tokenów w ui.
- `test:coverage`: 278 testów, 100% statements/branches/functions/lines; brak nowego kodu runtime.
- `test:storybook`: 324/324 w jasnym + 324/324 w ciemnym, 53 pliki; a11y w stories jako error.
- Chromium: komplet nowych stron przy 320/768/1440 px i obu motywach, linki zweryfikowane
  względem zbudowanego index.json, brak surowych tabel i poziomego przewijania strony.
- Katalog: sprawdzone widoczne podglądy, fokus solid 2 px, Enter otwiera AlertDialog,
  Escape zamyka i przywraca fokus. Zrzuty oraz wyniki kontroli w `/tmp/devmentor-stage4-*`.
- `npm run build`: **nie przechodzi**, Turbopack przy globals.css zgłasza
  `creating new process → binding to a port → Operation not permitted`, także po ponowieniu
  poza sandboxem. Nie zmieniano aplikacji ani konfiguracji w celu obejścia blokady.
- Docker dostępny; `test:integration:install` pass. `test:integration`: **nie uruchomił scenariuszy**,
  bo global setup wymaga `.next/BUILD_ID`, którego nie ma po nieudanym buildzie.
- Nie wykonano testu świeżym agentem ani całego audytu etapu 5. Brak testu czytnikiem na żywo.
- Wynik: dokumentacja wdrożona, lecz etapu nie oznaczamy jako całkowicie zakończonego,
  dopóki obowiązkowe bramki aplikacji nie przejdą.

- **Końcowa macierz po poprawkach:** 60/60 kontroli renderowania i axe (10 stron × 2 motywy
  × 3 szerokości), zero zgłoszonych naruszeń i błędnych linków. W axe dla dokumentacji pominięto
  regułę `region` (landmarki chromu Storybooka); konfiguracja a11y stories pozostała bez zmian.
  Tabele nowych stron są przewijane klawiaturą (`tabIndex=0`, nazwa i tokenowy fokus).

## Etap 4: propozycje do decyzji (oznaczone w Content)

- **P-DOC1:** globalny zapis daty i godziny: angielskie nazwy dnia/miesiąca, rok oraz zegar
  24-godzinny, np. `Wed, 4 Nov 2026, 18:30`, z nazwą strefy widza. Strefa wynika już z MD6;
  dokładnego globalnego formatu dotąd nie zatwierdzono. Niczego nie zmieniono w komponentach.
- **P-DOC2:** duże liczby poza kwotami: angielskie grupowanie, np. `1,000`, bez skracania
  znaczącej dokładnej liczby do `1k`. To propozycja reguły dokumentacji, bez nowego formattera.

## Etap 4: domknięcie bramek aplikacji przy wznowieniu (2026-10-21)

- `npm run build`: pass (Turbopack); wcześniejsza blokada portu nie wystąpiła.
  Nie zmieniono kodu aplikacji, zależności ani konfiguracji.
- `npm run test:integration:install`: pass, Chromium już zainstalowany.
- `npm run test:integration`: **4/4 pass**, produkcyjna aplikacja z izolowanym
  PostgreSQL Testcontainers i migracjami; testy obejmują strony, walidację,
  trwałość danych, duplikat emaila i idempotentne seedowanie.
  Dowody: `test-results/integration/junit.xml` i katalog
  `test-results/integration/devmentor-integration-420e509d-c6fc-49a5-9e16-bfd875a3c5ab/`.
- Ponowione `lint`, `typecheck`: pass; `test:coverage`: 278/278, 100% wszystkich
  metryk. `check:tokens`: zero naruszeń w ui; 7 znanych wartości w aplikacji
  nadal informacyjnie poza zakresem (Z-5).
- Nie powtarzano builda/testów Storybooka ani macierzy przeglądarkowej: pliki
  implementacji etapu 4 pozostają bez zmian, wcześniejsze wyniki zapisano wyżej.
- P-DOC1–2 nadal propozycjami do decyzji; wysłano pytanie PO. Etap 5 nie rozpoczęty.
- Dziennik wznowienia: `.ai/runs/2026-10-21-storybook-stage4-gates.md`.

## Decyzje PO po etapie 4 (2026-10-21)

- **P-DOC1: proposal approved by Rafał.** Daty z dniem tygodnia, angielską nazwą miesiąca, rokiem, zegarem 24-godzinnym i nazwą strefy widza, np. `Wed, 4 Nov 2026, 18:30` plus strefa. Zapisano w Content; bez zmiany formatterów komponentów.
- **P-DOC2: proposal approved by Rafał.** Liczby poza kwotami w pełnej formie z angielskim grupowaniem, np. `1,000`, bez skracania dokładnych liczb do `1k`. Zapisano w Content; bez nowego formattera.
- PO zatwierdził rozpoczęcie etapu 5; test świeżym agentem wyłącznie przygotować. Etap 4 jest w commicie `47260dd`; bieżące decyzje należą do kolejnego commita.

## Etap 5: sprawdzenie i raport (2026-10-21)

**Wynik:** audyt wykonany, design system nie jest jeszcze w pełni gotowy. Osobne
stories przechodzą a11y, lecz szersza kontrola dokumentacji wykryła problemy.
Test świeżym agentem wykonano później w osobnych gałęziach; wynik i luki zapisano w sekcji
„Wynik testu świeżym agentem”.

### Wdrożono i sprawdzono

- P-DOC1 i P-DOC2 zapisane w Content jako **proposal approved by Rafał**.
  Nie zmieniono istniejących formatterów ani przykładów dat w komponentach.
- `build-storybook`, `lint`, `typecheck`, `build`: pass.
- `test:coverage`: **278/278**, 100% statements, branches, functions, lines.
- `test:integration`: **4/4 pass**, produkcyjna aplikacja, nowy izolowany PostgreSQL,
  migracje i agent-browser; dowody w `test-results/integration/`.
- `test:storybook`: **324/324 × 2 motywy**, 53 pliki; a11y jako `error`, zero naruszeń
  zgłoszonych w osobnych stories. Testy uruchamiają także play functions.
- `check:tokens`: zero naruszeń w `packages/ui`. Siedem znanych wartości w aplikacji
  pozostaje poza zakresem (Z-5); pełna lista plików i linii w dzienniku etapu 5.
- Chromium: **2364 kombinacje** (70 docs + 324 stories × 2 motywy × 320/768/1440),
  zero poziomego przewijania całej strony, surowych tabel Markdown, błędnych linków
  dokumentacji i błędów runtime. Przewijanie tabel wewnątrz kontenera jest celowe.
- Osobna kontrola klawiatury AlertDialog w katalogu: **6/6**; Enter otwiera, Cancel
  dostaje fokus, Tab pozostaje w dialogu, Escape zamyka i przywraca fokus; obrys
  solid 2 px. Portal poza story dziedziczy prawidłowy motyw w każdej szerokości.
- Obejrzano zrzuty dialogu, długich pól, przewijanej tabeli, checklisty, wypłat
  i wąskiego Sign up. Automatyczna macierz nie oznacza ręcznego obejrzenia każdego
  ze wszystkich 2364 stanów.
- Inwentarz: **70 stron docs** = 10 Design system + 7 Foundations + 23 Primitives
  + 14 Product + 6 Patterns + 10 Screens; **37 rodzin komponentów**, dodatkowo
  5 współdzielonych kompozytów; **324 stories**; **202 stories z własnym `play`**.
  Wszystkie 37 stron komponentów mają sekcje 1–13. E03–E06 świadomie poza zakresem.

### Znalezione problemy i propozycje do decyzji

Reguła 12 promptu zabrania samodzielnego przepisywania istniejących stron; poniżej
konkretny zakres proponowanych poprawek. Nie wprowadzono ich przy samym audycie.

- **P-AUD1 — klawiatura i kontrast dokumentacji.** Dodać nazwany, fokusowalny kontener
  do przewijanych tabel (również blok `Table` w `.storybook/blocks/tokens.tsx`) oraz
  tokenowy fokus; uzupełnić `.storybook/preview.css` o kontrast kontrolek Canvas,
  Controls i ArgsTable w ciemnym motywie, bez nadpisywania komponentów stories.
  Źródło: WCAG 2.1.1 i 1.4.3. Przykłady: Foundations/Color przy 320 px;
  Error state docs w ciemnym motywie (wykryty kontrast 3.34:1 i 1.55:1).
- **P-AUD2 — motyw osadzonych przykładów.** Naprawić synchronizację motywu docs z
  osadzonymi przykładami bez wymuszania jasnego motywu. **38/420 kontroli docs,
  13 stron** żąda ciemnego motywu, lecz kończy z jasnym. Przykłady: Alert dialog,
  Slot list, Delete confirmation i wszystkie 10 stron Screens. Potwierdzone także
  po 2 sekundach w osobnej kontroli pięciu reprezentatywnych stron. W katalogu
  z etapu 4 i w osobnych stories motywy działają. Źródło: zasada 9 promptu.
- **P-AUD3 — semantyka kompozycji docs.** Odizolować pełne podglądy, aby nie dublowały
  `main` i nazw regionów; naprawić/zastąpić docs-only inspektor obiektów ArgsTable,
  który emituje `li` bez rodzica listy. Źródło: WCAG 1.3.1. Dotyczy m.in.
  Detail view, Sign in options, Account summary i Bookable status line.
- Łącznie axe w **197/420 kontrolach dokumentacji, na 53 stronach** zgłasza pięć
  reguł: `color-contrast` (135 wystąpień na kombinację), `scrollable-region-focusable`
  (96), `listitem` (12), `landmark-unique` (12), `landmark-no-duplicate-main` (6).
  To liczby reguł na stronę/motyw/szerokość, nie liczba niezależnych błędów produktu.
  Każda dotknięta strona i reguła jest wymieniona w dzienniku, selektory w JSON.
  W docs sprawdzano `.sbdocs-content`, wyłączając wyłącznie `region` dla chromu;
  konfiguracja a11y stories bez zmian. Nie uznano tych naruszeń za zaakceptowane wyjątki.

### Ograniczenia i dowody

- Pierwotny audyt nie obejmował testu świeżym agentem, testu żywym czytnikiem ekranu ani
  testów aplikacyjnych tras E01/E02, których nie ma jeszcze w aplikacji. Test świeżym
  agentem wykonano później w osobnych gałęziach i nie scalono prototypów. Nie dodawano
  pominiętych kontrolek, E03–E06, zależności, wariantów ani nowego ekranu `/error`.
- Nie ujednolicano dawnych przykładów dat bez roku po nowej decyzji P-DOC1;
  reguła Content jest zatwierdzona, lecz starsze fixtures wymagają osobnego przeglądu.
  Natywny `datetime-local` nadal wyświetla format przeglądarki/systemu użytkownika.
- Dzisiejszy audyt rozszerza zakres kontroli dokumentacji poza 10 nowych stron etapu 4;
  wcześniejszych wyników nie usuwamy, ale nie są dowodem poprawności wszystkich docs.
- Pełny raport: `.ai/runs/2026-10-21-storybook-final-audit.md`.
  Dane, selektory, skrypty kontroli, logi i reprezentatywne zrzuty:
  `test-results/design-system-stage5/` (artefakty lokalne, ignorowane przez git).
- Brak commita, push i publikacji. Zmiany decyzji i audytu pozostają po commicie `47260dd`.

## Decyzje PO: poprawki audytu (2026-10-21)

- **P-AUD1, P-AUD2, P-AUD3: proposal approved by Rafał.** Źródła: WCAG 2.1.1,
  1.4.3, 1.3.1 i zasada 9 promptu. Zgoda obejmuje zakres napraw opisany w raporcie
  etapu 5, w tym istniejące strony dokumentacji (zasada 12).
- **Warunki:** P-AUD3 bez nowej zależności; sprawdzić `package.json` po zmianach.
  Powtórzyć axe/motywy na tych samych stronach i podać wyniki przed/po. Każde
  pozostałe zgłoszenie zapisać jako jawny wyjątek ze źródłem, bez cichego pomijania.
  Niczego nie commitować. Test świeżym agentem nie jest częścią tej sesji.

## P-AUD1–3: wykonanie i powtórna weryfikacja (2026-10-21)

**P-AUD1–3: proposal approved by Rafał; wdrożone z jawnymi wyjątkami EX-AUD1–2.**
Źródła: WCAG 2.1.1, 1.4.3, 1.3.1 i zasada 9 promptu. Historyczny raport audytu
powyżej zachowany; bieżące wyniki i następny krok wynikają z tej sekcji.

- Nazwane, fokusowalne tabele Markdown i Foundations oraz kontenery Controls/ArgTypes;
  sprawdzone przewijanie klawiaturą i tokenowy obrys solid 2 px.
- DocsContainer dobiera motyw kontrolek do klasy na `html`; etykiety True/False
  korzystają z tokenu foreground. Style ciemnej dokumentacji nie nadpisują już
  kolorów prawdziwych komponentów w podglądach Unstyled.
- Osadzone ramki dostają `globals=theme:…`; zmiana motywu aktualizuje także ich
  dokumenty. Przyczyna wcześniejszego resetu: ramki bez globals startowały jasne
  i rozsyłały jasny stan do nadrzędnego dokumentu. Nie blokowano zdarzeń kanału.
- Pełne podglądy Detail view i Sign-in options odizolowane w podpisanych ramkach;
  obiektowe/array props w docs Account summary i Public work links jako read-only
  ArgTypes zamiast wadliwego inspektora list. Wszystkie sekcje i API zachowane.
- **Brak nowych zależności.** `package.json` wszystkich workspace'ów, root i lockfile
  sprawdzone po P-AUD3 oraz na koniec: identyczne SHA256 jak przed zmianami.
  Zmiana `optimizeDeps.include` jedynie prebundluje istniejące importy docs/theming,
  aby Vite nie przeładowywał testów w trakcie.

### Te same 70 stron × 2 motywy × 320/768/1440 = 420 kontroli

| Pomiar | Przed | Po |
|---|---:|---:|
| Kontrole z axe findings | 197/420 | 18/420 (jawne wyjątki poniżej) |
| Strony z axe findings | 53/70 | 3/70 |
| Kontrole z błędnym motywem | 38/420 | 0/420 |
| Strony z błędnym motywem | 13/70 | 0/70 |
| `color-contrast` | 135 | 0 |
| `scrollable-region-focusable` | 96 | 0 |
| `listitem` | 12 | 0 |
| `landmark-no-duplicate-main` | 6 | 0 |
| `landmark-unique` | 12 | 18 |
| `landmark-one-main` | 0 | 12 |
| `page-has-heading-one` | 0 | 12 |

Liczby reguł dotyczą wystąpień na kombinację, nie niezależnych usterek. Zestaw
identyfikatorów stron/motywów/szerokości porównany automatycznie z bazą — identyczny.
Nie wyłączono dodatkowych reguł axe; nadal wyłączone tylko wcześniejsze `region`
dla chromu dokumentacji. Po zmianie oczekiwanie na osadzone ramki 700 ms zamiast
180 ms w bazie ujawnia też zgłoszenia ich dokumentów. Surowy audyt **zwraca exit 1**
z powodu poniższych wyjątków; nie opisujemy go jako bezwarunkowo zielonego.

### Jawne wyjątki pozostałe po poprawkach

- **EX-AUD1 — `landmark-unique`, 18 kontroli, 3 strony.** Sign-in options, Slot list
  i Detail view: po dwa niezależne, unikalnie podpisane iframe. Wewnątrz przykładów
  powtarzają się nazwy regionów lub nienazwany main. Każda ramka ma najwyżej jeden
  main i jedną instancję danego regionu; skan całej dokumentacji nadal zgłasza
  powtórzenia między ramkami. To jawne ograniczenie dokumentacji, **nie** twierdzenie,
  że axe się myli. Zachowano semantykę prawdziwych komponentów. Wymaga weryfikacji
  czytnikiem, czy dodatkowe etykiety instancji wyłącznie w docs są potrzebne.
  Źródła: [Deque landmark-unique](https://dequeuniversity.com/rules/axe/4.11/landmark-unique),
  [WAI-ARIA APG Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/).
- **EX-AUD2 — `landmark-one-main` i `page-has-heading-one`, po 12 kontroli, 2 strony.**
  Sign-in options i Slot list są fragmentami komponentów, nie pełnymi ekranami;
  ramki nie dodają do nich sztucznego main ani h1. Zewnętrzna dokumentacja ma
  nagłówek strony, a pełny Detail view ma po jednym widocznym h1 i main w ramce.
  Źródła: [Deque main](https://dequeuniversity.com/rules/axe/4.14/landmark-one-main)
  (ramka może mieć zero lub jeden main),
  [Deque h1](https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one)
  (hierarchia nagłówków dokumentu nadrzędnego i ramek).
- Wszystkie trzy pozostałe reguły mają tag **best-practice** w zainstalowanym axe-core
  4.14, co zapisano w `exception-rules.json`. 42 wystąpienia reguł nakładają się na
  **18 kontroli na 3 stronach**. Nie pominięto ich w JSON ani nie uznano za formalne
  zwolnienie z WCAG. Reguły/selektory/motywy/szerokości są w pełnym raporcie i danych.

### Pozostałe bramki i ograniczenia

- Pass: build-storybook, lint, typecheck, build; unit 278/278 i 100% wszystkich metryk;
  integration 4/4; stories 324/324 w każdym motywie, a11y jako error; check:tokens
  zero w ui (7 dawnych, informacyjnych wartości w aplikacji poza zakresem Z-5).
- Klikanie rzeczywistego przełącznika motywu w managerze: 3/3 zmiany, docs i ramka
  zgodne. Dialog i portal: 6/6 kombinacji klawiatury i motywu. Przewijanie tabel
  Foundations i Controls klawiaturą przy 320 px: 2/2, scrollLeft rośnie o 40 px.
- Brak przewijania całej strony, błędów runtime, błędnych linków i surowych tabel
  w macierzy 420 kontroli. Każdy URL ramki niesie właściwy motyw.
- **Test świeżym agentem wykonany osobno, bez scalania prototypów.** Nadal brak testu
  żywym czytnikiem ekranu; stare fixtures dat, prace aplikacji i pozostałe luki poza
  zakresem pozostają opisane wcześniej.
- Dziennik: `.ai/runs/2026-10-21-storybook-docs-remediation.md`.
  Artefakty lokalne: `test-results/design-system-remediation/` — before/after/comparison,
  wyjątki, metadane reguł, logi, skrypty i zrzuty. Nie commitowano ani nie publikowano.
