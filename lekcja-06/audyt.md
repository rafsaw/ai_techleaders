**Największy problem to niespójność z produktem i niedopracowany widok mobilny.** Nie znalazłem nagromadzenia typowych ozdobników „generycznego landing page’a”. System tokenów zawiera świadome decyzje, ale działająca aplikacja nadal prezentuje techniczny szkielet projektu.

Sprawdziłem trzy podane adresy w Chromium przy **1440, 768 i 320 px**, kod aplikacji, bibliotekę UI, konfigurację i przykłady Storybooka oraz brief produktu. Storybook nie był uruchomiony — jego ocenę ograniczam do kodu. Nie zmieniłem plików projektu ani danych aplikacji podczas audytu.

**1. Najważniejsze znaleziska**

| Znak lub błąd | Gdzie | Co widać | Dlaczego to problem | Czym zastąpić | Pewność |
|---|---|---|---|---|---|
| Poziome przewijanie całej strony | `/backend/users`, 320 px; [users-panel.tsx:68](../packages/app/src/app/backend/users/users-panel.tsx#L68) | Dokument ma **441 px** szerokości. Tabela i formularz wychodzą poza ekran; pola mają 367 px przy dostępnych 272 px. | **UX / dostępność:** także formularz wymaga przewijania w poziomie. | Ograniczyć szerokość elementów siatki; przewijanie zamknąć w tabeli. Formularz powinien mieścić się w ekranie. | Sprawdzone |
| Opis i główna akcja nie odpowiadają produktowi | `/`; [page.tsx:14](../packages/app/src/app/(frontend)/page.tsx#L14), [layout.tsx:13](../packages/app/src/app/layout.tsx#L13) | „A project for tech leaders who use AI…” i jedyne CTA „Open backend”. | **Generyczny wygląd / UX:** brief opisuje płatne sesje tekstowe z mentorami. Strona nie wyjaśnia tej oferty ani nie prowadzi do niej. | Konkretny opis sesji 25/50 minut i wejście do wyboru mentora, kiedy ten przepływ będzie dostępny. | Sprawdzone |
| Lista niedostępna bez JavaScriptu | `/backend/users`; [users-panel.tsx:44](../packages/app/src/app/backend/users/users-panel.tsx#L44) | Przy wyłączonym JS pozostaje „Loading…”, mimo istniejącego rekordu. | **UX:** komunikat sugeruje trwające ładowanie, które nigdy się nie zakończy. | Pierwsze dane renderowane na serwerze albo jawny komunikat o wymaganym JS i dostępna alternatywa. | Sprawdzone |
| Pozostałość identyfikacji szablonu | Favicon; [layout.tsx:14](../packages/app/src/app/layout.tsx#L14) | Kolorowy kwadrat z ikoną i gradientem; SVG zawiera nazwę `sandboxesMark`. | **Generyczny wygląd:** brak uzasadnienia tego znaku w materiale marki DevMentor. | Zatwierdzony znak DevMentor lub prosty favicon wynikający z przyjętej identyfikacji. | Sprawdzone |
| Techniczny ekran zamiast informacji wspierających zadanie | `/backend`; [page.tsx:39](../packages/app/src/app/backend/page.tsx#L39) | „Database”, „PostgreSQL via MikroORM”, „Connected”, liczba użytkowników. | **UX:** ekran opisuje implementację. Jego przydatność dla operatora produktu nie wynika z briefu. | Zdecydować, czy to ekran diagnostyczny, czy start administracji; w drugim przypadku pokazać rzeczywiste zadania operatora. | Sprawdzone |
| Błąd bazy bez instrukcji działania | [backend/page.tsx:26](../packages/app/src/app/backend/page.tsx#L26) i linia 47 | Gałąź błędu wypisuje surowe `error.message`, bez instrukcji i ponowienia. | **UX:** odbiorca musi sam zinterpretować komunikat techniczny. | Zrozumiały opis niedostępności i następny krok; szczegóły techniczne w diagnostyce. | Sprawdzone w kodzie; awarii nie wywoływałem |
| Dwie równoległe palety | [strona główna:7](../packages/app/src/app/(frontend)/page.tsx#L7) i plik tokenów | Home używa `neutral-*` i bieli; panel korzysta z ciepłych szarości semantycznych. | **Generyczny wygląd:** publiczna strona omija istniejący system, bez wskazanego powodu produktowego. | Wspólne role kolorów; ewentualną odmienność publicznej strony opisać jako świadomą zasadę. | Sprawdzone |

**2. Pozostałe znaleziska i pełna lista znaków**

**Kolor**

- Indygo lub fiolet jako kolor akcji — **nie występuje**.
- Gradient w tekście nagłówka — **nie występuje**.
- Gradient w tle albo na przycisku — **nie występuje na stronach**; **występuje w tle faviconu**, wskazanego w tabeli.
- Ciemnogranatowe tło z poświatą — **nie występuje**.

**Kształt i głębia**

- Duże zaokrąglenia i pigułki na większości elementów — **nie występuje**. Promienie mają przypisane role; pigułki służą badge’om.
- Karty z cieniem jako jedyny podział treści — **nie występuje**. Są obramowania, separatory i odstępy; karty nie mają cieni.
- Karta w karcie — **występuje jako odpowiednik w bibliotece**: obramowany `Alert` wewnątrz `AccountSummary` ([AccountSummary.tsx:35](../packages/ui/src/components/auth/AccountSummary.tsx#L35)). To komunikat funkcjonalny, więc samo zagnieżdżenie nie stanowi błędu.
- Półprzezroczyste, rozmyte panele — **nie występuje**.

**Układ**

- Pigułka z nowością albo liczbą nad nagłówkiem — **nie występuje**.
- Wyróżnione kolorem słowo nagłówka — **nie występuje**.
- Para CTA typu „zacznij / demo” lub odpowiednik — **nie występuje**.
- Rząd wielkich liczb — **nie występuje**.
- Trzy identyczne karty z ikoną — **nie występuje**.
- Karty unoszące się nad pierwszym ekranem — **nie występuje**.

**Ozdobniki**

- Logo jako kolorowy kwadrat z ikoną — **występuje w faviconie**.
- Awatary z inicjałami na kolorowym tle — **nie występuje**.
- Emoji zamiast ikon — **nie występuje w interfejsie produktu**.
- Iskierki jako symbol AI — **nie występuje**.
- Ikony na kolorowym tle przy nagłówkach — **występuje w bibliotece w neutralnym wariancie**: `EmptyMedia` i `AlertDialogMedia` korzystają z `bg-muted` ([empty.tsx:37](../packages/ui/src/components/empty.tsx#L37), [alert-dialog.tsx:108](../packages/ui/src/components/alert-dialog.tsx#L108)). Nie występują na trzech badanych trasach; ich rola jest funkcjonalna.

**Tekst i dane**

- Obietnice niewyjaśniające produktu — **występuje odpowiednik**: ogólny opis home nie wyjaśnia oferty z briefu.
- Nieudokumentowane liczby, opinie, oceny i klienci — **nie występuje jako dowód marketingowy w działającej aplikacji**. Liczba użytkowników pochodzi z zapytania do bazy. Storybook zawiera fikcyjne nazwiska i ceny, ale dokumentacja jawnie traktuje je jako przykłady, nie wyniki produktu.

**UX i dostępność**

- **Kontrast tekstu:** nie wykryłem wyniku poniżej wymaganego progu. Minimum na home: **4,51:1**; w podstawowych widokach backendu: **5,01:1**. Pomiar obejmował kolory renderowane przez przeglądarkę i złożenie półprzezroczystych teł.
- **Kontrast kontrolek:** obramowania pól względem powierzchni karty osiągają **3,32:1**. Niski kontrast dekoracyjnych separatorów nie jest sam w sobie błędem.
- **Cele poniżej 24 × 24 px:** link „Users” ma **37 × 20 px**. **Spełnia wyjątek odstępu WCAG 2.5.8** w badanych układach — obszar 24 px wokół jego środka nie koliduje z sąsiednimi celami.
- **Widoczne etykiety:** są. „Name” i „Email” są powiązane z polami; formularz nie polega wyłącznie na placeholderach.
- **Kolor jako jedyny nośnik stanu:** nie wykryłem. Status bazy ma tekst, a błędy formularza komunikaty.
- **Ładowanie, pustka i błąd:** są zaimplementowane. Pustą listę i błąd odczytu potwierdziłem, podmieniając odpowiedź wyłącznie w sesji przeglądarki.
- **Fokus:** widoczny na sprawdzonych linkach, przyciskach, polach i kontenerze tabeli. Po pustym wysłaniu formularza fokus trafia do pierwszego błędnego pola.
- **Linie ponad 75 znaków:** nie wykryłem na badanych stronach przy 1440, 768 ani 320 px.
- **Komunikaty błędów:** walidacja mówi, co poprawić; błąd listy oferuje „Retry”. Wyjątek dashboardu opisano w tabeli.
- **Bez JS:** potwierdzona niedostępność listy użytkowników. Nie wykonywałem zapisu danych.
- **Storybook:** kontrastu, fokusu i responsywności jego ekranów **nie dało się sprawdzić w przeglądarce**, ponieważ nie był uruchomiony. Tryb ciemny aplikacji również nie został zweryfikowany.

**3. Rozrzut wartości**

Kolory i fonty zmierzyłem w podstawowych stanach trzech stron przy **1440 px**. Pominąłem narzędzia deweloperskie Next.js.

| Metryka | Liczba unikalnych wartości | Zakres / wartości |
|---|---:|---|
| Kolory widocznego tekstu | **8** | Home: 4; dashboard: 3; users: 3. Wspólne wartości policzone raz. |
| Rozmiary widocznego tekstu | **5** | **14, 16, 18, 24, 60 px** |
| Promienie używane w kodzie UI | **4** | **8, 10, 12, 9999 px** |
| Promienie zadeklarowane w tokenach | **9** | Dodatkowo nieużywane aliasy: **6, 14, 18, 22, 26 px** |
| Padding, margin i gap w kodzie wykonawczym | **12** | **0, 1, 2, 4, 8, 10, 12, 16, 24, 32, 36, 96 px**, dodatkowo `auto` |
| Odstępy po uwzględnieniu stories | **13** | Stories dodają **48 px** |
| Odstępy spoza siatki 4 px | **3** | **1, 2, 10 px** |
| Kolory wpisane na sztywno poza tokenami | **9** | 5 wartości palety home + 4 kolory zakodowanego SVG faviconu |

Kolory poza tokenami to `neutral-500`, `neutral-600`, `neutral-800`, `neutral-950`, biel oraz `#1B1B1B`, `#B4F372`, `#EEFB63`, `#BC9AFF` w faviconie. Sześć klas na home reprezentuje pięć wartości — `neutral-950` występuje jako tekst i tło.

Wartości policzono po rozwiązaniu aliasów, nie według liczby nazw klas. Wyłączyłem testy i opisowe przykłady klas w MDX. Odstępy 1 i 2 px służą wyrównaniu elementów, a 10 px jest zatwierdzonym tokenem przycisku — **odstępstwo od siatki nie dowodzi automatycznie błędu**.

**4. Pięć decyzji do podjęcia**

1. **Zasada — jedna definicja oferty.** Ustalić, że publiczny interfejs opisuje płatne sesje tekstowe z mentorami: format, obszary pomocy i sposób wyboru terminu. Tę samą definicję stosować w metadanych i CTA.
2. **Komponent — prezentacja mentora oparta na dowodach.** Przyjąć układ pokazujący specjalizację, publiczne prace, czas sesji, cenę i dostępność. To informacje wynikające z produktu, które mogą nadać mu charakter bez fikcyjnych ocen.
3. **Token — docelowa typografia marki.** Zdecydować, czy Geist pozostaje świadomym wyborem. Dokumentacja oznacza go obecnie jako wartość startową; wybrany krój połączyć z istniejącymi rolami typograficznymi.
4. **Zasada — wspólna identyfikacja publicznej strony i panelu.** Ustalić rolę znaku, faviconu i kolorów. Neutralna paleta może zostać; potrzebuje konsekwentnego zastosowania, nie obowiązkowego akcentu.
5. **Komponent — wzorzec listy z formularzem na małym ekranie.** Przyjąć zachowanie, w którym formularz mieści się w 320 px, tabela przewija się lokalnie, a ładowanie, pustka, błąd i brak JS mają jednoznaczne komunikaty.
