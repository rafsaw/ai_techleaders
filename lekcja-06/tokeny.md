# Tokeny: DevMentor

- Data: 2026-10-20. Zatwierdził: PO (founder A), propozycje T1–T8. T4 PO zmienił.
- Źródło decyzji: `lekcja-06/referencje.md`.
- Plik tokenów: `packages/ui/src/styles/globals.css`, bo `packages/ui/src/tokens.css` nie istnieje. Ma nazwy shadcn, które opisują przeznaczenie, więc decyzje mapujemy na nie, a nowe tokeny dodajemy tylko tam, gdzie żadna istniejąca nazwa nie pasuje.
- Motywy: jasny (`:root`) i ciemny (`.dark`). Klasa `.dark` jest zdefiniowana, ale nic jej dziś nie włącza. Oba motywy sprawdzone.
- Odcienie `warm-*` to wartości startowe. PO może je poprawić po obejrzeniu w Storybooku. Każda zmiana koloru wymaga ponownego przeliczenia kontrastu.

## Tokeny

| token | warstwa | wartość | pochodzenie | gdzie używać | gdzie nie używać |
|---|---|---|---|---|---|
| `--warm-0` … `--warm-950` (13 stopni) | surowa | oklch, odcień 70°, nasycenie 0,003–0,013. L: 0 = 0.995, 50 = 0.982, 100 = 0.962, 200 = 0.925, 300 = 0.87, 400 = 0.71, 450 = 0.64, 500 = 0.53, 600 = 0.45, 700 = 0.37, 800 = 0.27, 900 = 0.205, 950 = 0.145 (#fffdfb … #0b0a08) | R01.4. Wartości startowe (T1) | tylko w `globals.css` | w klasach komponentów i stron |
| `--spacing` | surowa | 0.25rem (domyślna Tailwinda). Skala 4, 8, 12, 16, 24, 32, 48 px | istniejąca | tylko jako podstawa skali | — |
| `--background` | znaczeniowa (tło strony) | jasny: warm-50; ciemny: warm-950 | R01.4 | tło strony | tło karty i panelu |
| `--card`, `--popover` | znaczeniowa (powierzchnia panelu) | jasny: warm-0; ciemny: warm-900 | R01.4 | panele, lista, rozwijane menu | tło każdego wiersza osobno (R01.3) |
| `--foreground` (+ `--card-foreground`, `--popover-foreground`) | znaczeniowa (tekst główny) | jasny: warm-950; ciemny: warm-50 | R01.4 | tytuły, treść, wiadomości | metadane |
| `--muted-foreground` | znaczeniowa (tekst przygaszony) | jasny: warm-500; ciemny: warm-400 | R01.5 | metadane wiersza, godzina wiadomości, „odświeżono o …” | tytuły, treść wiadomości, tekst przycisków |
| `--muted` | znaczeniowa (powierzchnia drugorzędna) | jasny: warm-100; ciemny: warm-800 | R01.2, R01.4 | tło bloków kodu, wyłączone pola | tło strony |
| `--primary` / `--primary-foreground` | znaczeniowa (akcja główna) | jasny: warm-900 / warm-50; ciemny: warm-200 / warm-900 | R01.6. Bez koloru akcentu, bo to luka | jedna akcja główna na ekranie | drugi i kolejny przycisk na ekranie, wyróżnianie tekstu |
| `--secondary`, `--accent` (+ `-foreground`) | znaczeniowa (akcja drugorzędna, powierzchnia hover) | jasny: warm-100 / warm-900; ciemny: warm-800 / warm-50 | R01.4 | przyciski drugorzędne, hover wiersza | jako kolor marki („accent” w shadcn oznacza tło hover, nie akcent) |
| `--border` | znaczeniowa (separator) | jasny: warm-200; ciemny: warm-700 | R01.3. Wyjątek od 3 : 1 (T7) | linia między wierszami, krawędź panelu | obrys pól formularza |
| `--input` | znaczeniowa (obrys pola) | jasny: warm-450; ciemny: warm-500 | poprawka kontrastu (T5; było 1,26 : 1) | obrys `Input` i pól | separatory |
| `--ring` | znaczeniowa (fokus) | jasny: warm-500; ciemny: warm-450 | poprawka kontrastu (T5; było 2,59 : 1) | obrys fokusu | dekoracja |
| `--destructive` | znaczeniowa (błąd, akcja nieodwracalna) | jasny: `oklch(0.52 0.2 27.3)` (było 0.577 0.245 27.325); ciemny: `oklch(0.704 0.191 22.216)`, bez zmian | poprawka kontrastu (T5) | błędy, akcje usuwające | ostrzeżenia, wyróżnienia |
| `--sidebar-*` | znaczeniowa | aliasy: `sidebar` = background, `sidebar-foreground` = foreground, `sidebar-primary` = primary, `sidebar-accent` = accent, `sidebar-border` = border, `sidebar-ring` = ring. Usuwamy ciemny fiolet `oklch(0.488 0.243 264.376)` | R02.9, A01 (T8) | panel `/backend` | ekran sesji (R02.6) |
| `--font-sans` | znaczeniowa | Geist (istniejący, bez zmian) | stan istniejący. Krój główny to luka | cały interfejs | kod |
| `--font-mono` | znaczeniowa, **nowy** | Geist Mono. **Propozycja**, wybór kroju to luka (T2) | R01.2 | kod, nazwy plików, ścieżki, konfiguracja | nagłówki, metadane, etykiety |
| `--text-row-title` | znaczeniowa, **nowy** | 1rem / 1.5rem, grubość 600 | R01.5 (T3) | tytuł wiersza listy (mentor, sesja) | treść wiadomości |
| `--text-meta` | znaczeniowa, **nowy** | 0.875rem / 1.25rem, grubość 400 | R01.5 (T3) | metadane wiersza, godzina wiadomości, „odświeżono o …” | tytuły, przyciski |
| `--spacing-in-group` | znaczeniowa, **nowy** | 8px | R01.1 (T4) | odstęp w grupie: etykieta i pole, ikona i tekst, imię i godzina | między grupami |
| `--spacing-between-groups` | znaczeniowa, **nowy** | 16px | R01.1, R02.1 (T4) | między grupami pól, między kolejnymi wiadomościami | w grupie |
| `--spacing-panel` | znaczeniowa, **nowy** | 24px | T4 (zmiana PO) | wewnętrzny margines panelu | między wierszami listy (tam działają tokeny wiersza) |
| `--spacing-component` | znaczeniowa, **nowy** | 32px | T4 (zmiana PO) | między sąsiednimi komponentami na stronie (np. panel i lista) | wewnątrz komponentu |
| `--spacing-section` | znaczeniowa, **nowy** | 48px | R01.6, T4 (zmiana PO) | między sekcjami strony | wewnątrz panelu i komponentu |
| `--radius` | znaczeniowa | 0.625rem, bez zmian | stan istniejący. Wartość to luka | wg istniejących komponentów | — |
| `--list-row-py` | komponentowa, **nowy** | 12px | R01.1, K2 (gęsto tylko na listach) | pionowy margines wiersza listy | inne komponenty |
| `--list-row-gap` | komponentowa, **nowy** | 4px | R01.1, R01.5 | między tytułem a metadanymi wiersza i między nagłówkiem a treścią wiadomości | między wierszami |

Wszystkie stopnie skali odstępów mają przypisaną relację:
- 4: wiersz, w środku,
- 8: w grupie,
- 12: wiersz, pionowo,
- 16: między grupami,
- 24: panel,
- 32: między komponentami,
- 48: między sekcjami.

## Pary kolorów i kontrast

Policzone z oklch na sRGB według wzoru WCAG. Tło półprzezroczyste nakładano na powierzchnię pod spodem. Zmiana T4 nie dotyczy kolorów, więc wyniki nie wymagają ponownego przeliczenia.

| para | jasny | ciemny | próg | wynik |
|---|---|---|---|---|
| foreground / background | 18,79 | 18,79 | 4,5 | ✓ |
| foreground / card | 19,51 | 17,01 | 4,5 | ✓ |
| foreground / muted | 17,72 | 14,31 | 4,5 | ✓ |
| muted-foreground / background | 5,02 | 7,68 | 4,5 | ✓ |
| muted-foreground / card | 5,21 | 6,95 | 4,5 | ✓ |
| muted-foreground / muted | 4,73 | 5,85 | 4,5 | ✓ |
| primary-foreground / primary | 17,01 | 14,35 | 4,5 | ✓ |
| secondary-foreground / secondary | 16,04 | 14,31 | 4,5 | ✓ |
| accent-foreground / accent | 16,04 | 14,31 | 4,5 | ✓ |
| destructive / background | 5,80 | 6,85 | 4,5 | ✓ |
| destructive / card | 6,02 | 6,20 | 4,5 | ✓ |
| destructive / tło przycisku na background (jasny /10, ciemny /20) | 4,91 | 5,29 | 4,5 | ✓ |
| destructive / tło przycisku na card (ciemny /20) | — | 4,61 | 4,5 | ✓ |
| destructive / tło hover (jasny /20, ciemny /30) | 4,12 | 4,35 | 4,5 | ✗. Rozwiązane przez C7: hover nie zmienia tła |
| primary / background (kształt przycisku) | 17,01 | 15,85 | 3 | ✓ |
| input / background | 3,20 | 3,74 | 3 | ✓ |
| input / card | 3,32 | 3,39 | 3 | ✓ |
| ring / background | 5,02 | 5,88 | 3 | ✓ |
| ring / card | 5,21 | 5,32 | 3 | ✓ |
| border / background (separator) | 1,19 | 1,31 | 3 | ✗. Wyjątek T7: separator dekoracyjny, wiersz rozpoznaje się po tekście (WCAG 1.4.11) |
| border / card (separator) | 1,23 | 1,72 | 3 | ✗. Wyjątek T7 |

Stan przed zmianą, dla porównania:
- muted-foreground 0.556 na bieli: 4,73 ✓. Po zmianie odcienia na ciepły spadał do 4,42, dlatego warm-500 ma L 0.53.
- ring: 2,59 ✗.
- input: 1,26 ✗.
- destructive na swoim tle /10: 3,94 ✗.

## Decyzje, które nie są tokenami

### Zasady

- **Z1 (R01.6):** na ekranie jest jeden przycisk w wariancie `primary`.
- **Z2 (R01.5):** hierarchię robimy rozmiarem i grubością tekstu, nigdy kolorem.
- **Z3 (R01.2):** `font-mono` tylko dla kodu, nazw plików, ścieżek i konfiguracji.
- **Z4 (R01.3):** wiersze oddziela `divide-y` / `border-border`. Bez cienia i bez karty na każdy wiersz.
- **Z5 (A01):** bez gradientów, `backdrop-blur`, półprzezroczystych powierzchni i ikony `Sparkles`. `rounded-2xl` i większe nie trafiają na panele ani karty, kształt pigułki zostaje tylko dla plakietek.
- **Z6:** surowe kolory (`warm-*`, a także `neutral-*` z Tailwinda) tylko w pliku tokenów, strony używają klas znaczeniowych. `(frontend)/page.tsx` ma dziś `neutral-*`. Przeniesienie zostaje na później, poza tym krokiem.
- **Z7 (K2):** wzorzec R01 dotyczy list i stron, wzorzec R02 tylko ekranu sesji. Gęsto jest tylko na listach, przez tokeny wiersza.
- **Z8 (A02–A08):** na przeglądzie sprawdzamy podpisy antyreferencji: `Star`, `Progress` jako postęp nauki, `Video`/`Camera`/`Mic`, plany „/month”, „instant”, „Senior at …”.

### Cechy komponentów

- **C1, wiersz listy (R01.1, R01.5):**
  - tytuł ma `text-row-title`,
  - pod nim jest jedna linia metadanych w `text-meta` i `muted-foreground`,
  - pionowy margines to `--list-row-py`, a odstęp tytuł–metadane to `--list-row-gap`.
- **C2, wiadomość (R02.2, R02.5, R02.8):**
  - nagłówek ma nazwę wyświetlaną (grubość 600) i godzinę w `text-meta` i `muted-foreground`,
  - rozmowa jest jedna i liniowa, bez wątków i reakcji.
- **C3, pole pisania (R02.1, R02.3):** przypięte na dole ekranu sesji. Własna wiadomość pojawia się od razu po wysłaniu.
- **C4 (R02.3, K3):** przy wiadomościach rozmówcy widać „odświeżono o …” w `text-meta`. D10 zostaje bez zmian.
- **C5, ekran sesji (R02.6, R02.7):**
  - nie ma bocznego paska, jest link powrotny do listy sesji,
  - nie ma wskaźników obecności ani „pisze…”.
- **C6 (R02.4):** nie ma plakietek z liczbą powiadomień.
- **C7, przycisk destructive (T6):** hover zmienia obramowanie (`hover:border-destructive/50`), a nie nasycenie tła.
- **C8, karta i profil mentora (R01.7, N02):** linki do publicznej pracy i opis zamiast liczników i ocen.

### Luki (bez tokenu)

- **Kolor akcentu:** nie ma referencji.
- **Krój główny:** Geist zostaje jako stan istniejący, nie jako decyzja.
- **Krój mono:** Geist Mono to propozycja.
- **Inne:**
  - czasy animacji,
  - wartość promienia,
  - kolory wykresów (`chart-*` bez zmian),
  - ton wypowiedzi, który ma status propozycji.
