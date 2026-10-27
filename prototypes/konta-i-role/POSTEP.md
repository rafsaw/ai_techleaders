# POSTĘP: klikalny prototyp Epiku 01 (konta i role)

Zadanie: `lekcja-07/prompty/prompt-klikalny-prototyp.md` / `lekcja-07/klikalny-prototyp-devmentor.txt`.
Etapy 0–3, po każdym czekamy na „dalej”. W nowej sesji zacznij od tego pliku.

| Etap | Status | Data |
|---|---|---|
| 0. Plan | **zakończony**, decyzje D1–D3 rozstrzygnięte | 2026-10-25 |
| 1. Szkielet i ścieżka bez błędów | **zakończony** | 2026-10-25 |
| 2. Stany, role i scenariusze | **zakończony** (zapisany 2026-10-25 jako „gotowy, czeka na «dalej»”; opis wykonanych prac niżej w sekcji „Etap 2”) | 2026-10-25 |
| 3. Uczciwość i sprawdzenie | **zakończony** (notatki, README, 82 testy, sprawdzenie w przeglądarce; sekcja „Etap 3”) | najpóźniej 2026-10-26 (commit `a8528f5`) |

Uwaga o historii: do 2026-10-27 tabela miała dwa wiersze „Etap 2” i wiersz „Etap 3: nierozpoczęty”, choć sekcje „Etap 2: co jest zrobione” i „Etap 3: co jest zrobione” opisywały wykonane prace. Tabela została ujednolicona z tymi opisami; treść sekcji i ograniczeń („Nie sprawdzone i ograniczenia”, „Otwarte luki”) nie była zmieniana. Stan potwierdzony 2026-10-27: `npx vitest run` w tym katalogu, 3 pliki, 82 testy przechodzą. Wyników przejść Playwright (axe, kliknięcia, klawiatura) nie powtarzano; ich skryptów nie ma w repozytorium.

## Decyzje (D1–D3, PO)

- **D1.** Źródła w `prototypes/konta-i-role/` (ten katalog). Wynik budowania w
  `packages/ui/.storybook/public/prototypes/konta-i-role/` (ignorowany przez git, nie commitować).
- **D2.** Ten plik śledzi etapy ćwiczenia 2b. `lekcja-07/POSTEP.md` to osobny, ogólny dziennik lekcji: nie ruszać.
- **D3.** Lokalny `package.json`: `npm run dev`, `npm run build` (opis w README).
- Nie commitować. Etapy 2 i 3 dopiero po „dalej”.

## Materiały

Mapa `lekcja-07/mapa-ekranow.md` (zatwierdzona 2026-10-24), szary prototyp
`.ai/prototypes/discovery/mentor-onboarding/revision-002` (najnowszy; brane tylko zaproszenie i logowanie
oraz reguły), spec `.ai/specs/2026-10-17-accounts-and-roles.md` (jedyna spec E01), silnik
`lekcja-07/silnik-przegladu/` (skopiowany do `src/review/`, `prototype.js` bez zmian).

## Etap 1: co jest zrobione

- Vite + React 19 + Tailwind v4, komponenty z `@devmentor/ui`. Alias `zod` na wersję 4 z `packages/ui`
  (w korzeniu repo jest zod 3). Build bez haszy w nazwach i bez czyszczenia katalogu wynikowego.
- Silnik przeglądu: tryb komentarzy, mapa ekranów (Presentation wyłączone), tryb prezentacji (domyślny),
  „Back”; `prototypeId` = `konta-i-role`; mostek kolorów na tokenach DS.
- Pasek przeglądu: oznaczenie „Prototype”, lista ekranów, skrzynka demo, „Scenarios” (tylko c02 tożsamość
  GitHub i c15 reset), przełącznik motywu.
- Ekrany: s01–s08, s11, s13, s14. Ścieżki bez błędów: GitHub (Kuba, nowa osoba → `/account?welcome=1`),
  rejestracja e-mailem → s03 → s13 → s04 → zalogowany, zaproszenie (Bartek, Celina, Wiktor) → Accept → `/`.
  Dodatkowo, żeby nie było martwych linków: s08 i s11 (cel linku „Backend” dla operatora), przekierowania
  zalogowanych z s01/s02 i niezalogowanych z s06/s08.
- Luki w DS oznaczone w kodzie: LD14 (SiteHeader pokazuje „Mentor setup” każdemu mentorowi; przekazujemy role
  bez `mentor`), LD12, LD04, LD02, LD09, LD10.

## Etap 2: co jest zrobione

- **Kontrolki** (pasek „Scenarios”, grupy): c01–c09, c11–c16 oraz przełącznik konta demo. c10 jest opisana w panelu
  jako „documented only”, bez kontrolki (decyzja PO). c08 i c11 działają na następne żądanie, reszta do zmiany.
  c06 i c07 to listy, które otwierają ekran z danym linkiem, c16 to trzy przyciski. c15 ma też „Clear inbox”
  (stan „pusta skrzynka” ze s13).
- **Stany z mapy [K]:** s01 (błąd, konto tylko-GitHub, niepotwierdzony + ponowna wysyłka, nie wysłano, 429, cztery
  banery GitHuba, baner wygasłej sesji z `returnTo`), s02 (walidacja 15 znaków / 72 B / popularne, konflikt,
  brak sieci), s03 (wysłano, nie wysłano), s04 (ważny, błędne hasło, wygasły, użyty, zastąpiony, po przejęciu przez
  GitHub), s05 (nieważne, niezalogowany, inny adres, już mentor, gotowe, błędy 403/404/409), s06 (domyślny,
  welcome raz, wiele ról i metod, „Name saved”, błędy pola, wygasła sesja), s07 (cztery nagłówki), s08, s11, s12, s13
  (także pusta skrzynka), s14 (także „GitHub unavailable”).
- **Bramki:** niezalogowany → s01 z `returnTo`; zalogowany bez roli na `/backend` → neutralne 404 (s11);
  zalogowany na s01/s02 → `/` lub `returnTo`.
- **Dane po błędzie:** formularze design systemu trzymają wpisane wartości (sprawdzone na s01, s02, s06).
- **Zegar (c13):** +25 h wygasza link potwierdzający, +15 dni zaproszenia, +31 dni sesję przy następnym żądaniu.
- Sprawdzenie: skrypt Playwright przechodzi 62 asercje stanów, bez błędów strony.

## Luki w DS znalezione w Etapie 2 (oprócz tych z mapy)

- **LD15:** `ConfirmEmailPanel` w stanie „invalid” mówi „use the link in the most recent email”, a PO L11
  chce neutralnego komunikatu. Prototyp rysuje własny `Notice` (to samo co O6 w mapie).
- **LD08 (uzupełnienie):** spec Epiku 01 wymaga `CrudForm resetOnSuccess={false}`, a `CrudForm` tej prop nie
  ma i po zapisie przywraca stare pole. Obejście: `key` po zapisanej nazwie.
- **LD13 (uzupełnienie):** neutralny tekst „We couldn't send the email. Please try again later.” przy ponownej
  wysyłce idzie jako błąd, bo `SignInOptions` ma własny tekst dla `emailSent: false`.
- Teksty walidacji hasła (72 B, popularne) i listę popularnych haseł wymyśliłem na potrzeby symulacji.

## Etap 3: co jest zrobione

- **Notatki** przy każdym ekranie (`src/notes.ts`, widoczne w mapie ekranów): numery historii, co jest symulacją,
  czego prototyp nie rozstrzyga.
- **README:** uruchomienie (`dev`, `build`, `test`, `typecheck`), konta demo, 15 kontrolek scenariuszy (c10 opisana
  jako nieobecna), gdzie jest każdy stan, „Simulation limits”, luki i pytania do specyfikacji.
- **Testy** (`npm test`, Vitest + jsdom, 82 testy w 3 plikach): trasy i bramki (`routes.test.ts`), reguły symulacji
  (`sim.test.ts`: rejestracja i potwierdzenie, GitHub, zaproszenia, sesja, zegar, kontrolki), klikanie po
  wyrenderowanych ekranach (`App.test.tsx`, m.in. że każdy link produktu na każdym ekranie, dla czterech rodzajów
  odwiedzających, prowadzi do istniejącego ekranu). Poza bramką pokrycia repozytorium (root Vitest zbiera tylko
  `packages/*`).
- **Sprawdzenie w przeglądarce** (Playwright, Chromium, build serwowany statycznie):
  - axe-core (WCAG 2.0/2.1 A i AA oraz best-practice) na 25 stanach ekranów × 320 i 1440 px × jasny i ciemny motyw:
    100 przebiegów, 0 naruszeń, 0 przepełnień poziomych. (Cały dokument razem z paskiem: jedno ostrzeżenie
    best-practice `region`, poza ekranami produktu.)
  - 84 kliknięcia we wszystkie linki i przyciski ekranów produktu: każde coś zmienia, poza 8, które prowadzą na
    stronę, na której już jesteśmy (logo, nazwa konta, własny link w nagłówku, pierwszy mail na liście).
  - 54 wartości w 14 listach scenariuszy: każda się utrzymuje, a listy otwierające ekrany zmieniają ekran; trzy
    przyciski c16, „Reset demo” i „Clear inbox” działają.
  - Przyciski paska i silnika: Clickable, Comment, hotspoty, Presentation, Threads, pinezki, motyw, Back, lista ekranów
    (12 wpisów, żaden nie prowadzi do złego ekranu), skrzynka demo.
  - Klawiatura (oba motywy): kolejność Tab (pasek, nagłówek, treść), widoczny pierścień fokusu na każdym przystanku,
    Enter na linkach i w formularzu, Spacja na przyciskach, menu `Screens` i `Scenarios` otwierane Enterem, fokus
    na nagłówku po zmianie ekranu (silnik). Żadnej pułapki fokusu.
  - Skrypty Playwright z Etapów 1 i 2 (62 asercje stanów) nadal przechodzą.
- **Poprawki z tego etapu:** menu paska zamyka się po wyborze ekranu i po kliknięciu obok; link „DevMentor” na s12
  przez `LinkButton` (reguła lintu); `npx eslint prototypes/konta-i-role` bez uwag.

## Nie sprawdzone i ograniczenia

- Tylko Chromium; Firefox i Safari nie. Brak czytnika ekranu (sprawdzone axe i kolejność fokusa, nie słuchanie).
- Skrypty przeglądarkowe leżą w katalogu roboczym sesji, nie w repozytorium; w repozytorium są testy Vitest.
  Zamknięcie menu Escape nie jest zaimplementowane (menu to natywne `<details>`; zamyka je Enter, wybór ekranu i
  kliknięcie obok).
- Nie testowałem wizualnie każdego stanu na 320 px poza kontrolą przepełnienia i axe.
- Silnik przeglądu (`prototype.js`) niezmieniony; jego panel komentarzy nie był audytowany pod kątem dostępności
  (poza zakresem tego ćwiczenia).

## Otwarte luki

Luki w DS: z mapy LD01–LD13 (LD11 zamknięta) plus LD14 (SiteHeader „Mentor setup”), LD15 (ConfirmEmailPanel „most
recent email”), uzupełnienia LD08 (CrudForm resetOnSuccess, „Name saved”, wygasła sesja) i LD13 (tekst „not sent”).
Pytania do specyfikacji: sformułowania walidacji hasła (72 B, popularne), dosłowny tekst komunikatu o publicznej
nazwie na stronie zaproszenia, stan zaproszenia po nieudanej wysyłce maila (L14, O2), mechanizm „pokaż raz” (O5).
Specyfikacja, design system i kod aplikacji nie były zmieniane.
