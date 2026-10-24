# Referencje: DevMentor

- Data: 2026-10-20
- Kto wybierał: PO (founder A)
- Zrzuty: brak. Każda obserwacja to parafraza opisu z karty, oznaczona „parafraza, bez zrzutu”.
- Słowa charakteru (potwierdzone): **konkretny, gęsty, czytelny, ciepły, rozmowny**
- Antycharakter (potwierdzony): **generyczny, efekciarski, hałaśliwy, chłodny, sprzedażowy**

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym
kroku, z tego pliku, i PO zatwierdza każdą z nich osobno.

## Referencje

Wiersze z „Bierzemy: —” to cechy, które z referencji odrzucamy. Kolumna „Robimy zamiast tego” mówi, co wtedy robimy.

| # | Referencja | Źródło | Kto wybrał | Obserwacja | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status (propozycja / przyjęte) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.1 | GitHub: lista pull requestów | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Lista wierszy jeden pod drugim. Każdy wiersz ma tytuł, a pod nim jedną linię metadanych (numer, autor, czas). Bez przewijania widać wiele wierszy. Tekst da się czytać mimo gęstości. | gęsta lista wierszy z tytułem i jedną linią metadanych | zob. R01.4–R01.7 | — | Listing mentorów (D04) i prywatna lista sesji (D15) to listy, które developer skanuje, żeby szybko znaleźć jedną pozycję („jak booking trwa więcej niż pięć minut to robię rollback”). | kompozycja i gęstość | musi być | przyjęte |
| R01.2 | GitHub: strona repozytorium i lista PR | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Kod i nazwy plików są w foncie o stałej szerokości, reszta tekstu w innym foncie. | osobny krój o stałej szerokości dla kodu, nazw plików, ścieżek i fragmentów konfiguracji | zob. R01.4–R01.7 | — | W sesji tekstowej (D10) mentee wkleja kod i konfigurację („tekst. wkleję yamla”), a mentor odpowiada kodem. | typografia | musi być | przyjęte |
| R01.3 | GitHub: lista pull requestów | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Wiersze oddzielają cienkie poziome linie. Nie są osobnymi kartami. | cienka linia jako separator wierszy listy | zob. R01.4–R01.7 | — | Pozwala utrzymać gęstość list z R01.1 bez kart i cieni, które zajmują miejsce. | komponenty | musi być | przyjęte |
| R01.4 | GitHub: strona repozytorium i lista PR | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Tło, linie i tekst są w szarościach odbieranych jako chłodne („wszystko szare, mało ciepła”). | — | chłodnych szarości | ciepłe szarości tła, linii i tekstu. Ta karta nie wyznacza koloru akcentu (zob. Luki). | Produkt łączy ludzi w rozmowie, nie jest narzędziem infrastruktury. „Ciepło” jest tu decyzją PO o odcieniu neutralnych kolorów, nie wnioskiem z badań. | kolor | musi być | przyjęte |
| R01.5 | GitHub: lista pull requestów | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Przy dużej gęstości trudno ustalić, co jest najważniejsze („trudno się zorientować, co jest najważniejsze”). | — | gęstości bez narzędzi hierarchii | tytuł wiersza wyróżniony rozmiarem i grubością, metadane mniejsze i przygaszone. Hierarchię budujemy typografią, nie kolorem akcentu. | Na listach mentorów i sesji developer ma od razu wiedzieć, kto to jest i kiedy, a dopiero potem czytać szczegóły. | typografia | musi być | przyjęte |
| R01.6 | GitHub: strona repozytorium i lista PR | karta R01 | PO (founder A) | Parafraza, bez zrzutu. Na ekranie jest wiele równorzędnych akcji. Ta obserwacja wynika z „trudno się zorientować, co jest najważniejsze”. | — | wielu równorzędnych akcji na jednym ekranie | jedna akcja główna na ekranie (np. rezerwacja na profilu, wysłanie wiadomości w sesji) | Ścieżka mentee ma być krótka: profil, slot, płatność (A05). | kompozycja i gęstość | musi być | przyjęte |
| R01.7 | GitHub: strona repozytorium | propozycja agenta P02 | PO (founder A) | Parafraza, bez zrzutu, z wiedzy agenta, nie z karty. Strona repozytorium pokazuje liczniki gwiazdek i obserwujących jako sygnał popularności. | — | liczników gwiazdek i obserwujących jako sygnału zaufania | linki do publicznej pracy i zwykły opis (N02) | Ludzie wybierają po tym, co ktoś zbudował (41 z 54 w ankiecie), a nie po ocenach (12 z 54). | komponenty | musi być | przyjęte |
| R02.1 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. Rozmowa zajmuje środek ekranu. Wiadomości idą chronologicznie od góry do dołu, pole pisania jest przypięte na dole. | rozmowa w centrum, pole pisania na dole | zob. R02.4–R02.9 | — | Ekran sesji (D10) to rozmowa tekstowa dwóch osób w zarezerwowanym oknie czasu. Inne układy dotyczą list, zob. konflikt K2. | kompozycja i gęstość | warto | przyjęte |
| R02.2 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. Nad każdą wiadomością jest nagłówek: imię autora (wyróżnione) i godzina (mniejsza, przygaszona). | nagłówek wiadomości: nazwa wyświetlana i godzina | zob. R02.4–R02.9 | — | W sesji są dokładnie dwie osoby z nazwami wyświetlanymi (D15), a okno czasu jest ograniczone (D10), więc godzina ma znaczenie. | komponenty | warto | przyjęte |
| R02.3 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. „Szybko się pisze i odpisuje”. | własna wiadomość pojawia się od razu po wysłaniu | wiadomości rozmówcy w czasie rzeczywistym (D10 tego nie wymaga) | przy wiadomościach rozmówcy widać „odświeżono o …”. D10 zostaje bez zmian. | Developer w sesji ma poczuć szybkość pisania (wywiady: „tekst, szybciej”), a produkt nie potrzebuje czasu rzeczywistego (D10). | ruch i reakcja | warto | przyjęte |
| R02.4 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. „Za dużo powiadomień”. | — | powiadomień i liczników nieprzeczytanych | jedna informacja o rezerwacji w produkcie i mailem (D15) | Sesja jest jednorazowa i umówiona, nie ma ciągłej rozmowy do śledzenia. | komponenty | warto | przyjęte |
| R02.5 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. „Emoji wszędzie”. | — | reakcji emoji i emoji w interfejsie | sam tekst, bez reakcji | Sesja służy do rozwiązania jednego konkretnego problemu („kogoś kto sprawdzi jedną rzecz”), nie do budowania społeczności. | komponenty | warto | przyjęte |
| R02.6 | Slack: widok kanału z wątkiem | karta R02 | PO (founder A) | Parafraza, bez zrzutu. „Bałagan w bocznym pasku”. | — | bocznego paska z kanałami i listami | ekran sesji bez bocznego paska, z linkiem powrotnym do listy sesji (D15) | Uczestnik ma jedną sesję naraz. Do innych sesji wraca przez listę, nie przez nawigację obok rozmowy. | kompozycja i gęstość | warto | przyjęte |
| R02.7 | Slack: widok kanału | propozycja agenta P04 | PO (founder A) | Parafraza, bez zrzutu, z wiedzy agenta, nie z karty. Slack pokazuje, kto jest dostępny i kto właśnie pisze. | — | wskaźników obecności i „pisze…” | brak sygnałów dostępności poza zarezerwowanym slotem | Mentorzy chcą kontrolować swój czas („nie pisz do mnie w weekend”, „mogę między spotkaniami”). Sesja odbywa się w umówionym oknie (D03, D10). | ruch i reakcja | warto | przyjęte |
| R02.8 | Slack: wątek | propozycja agenta P05 | PO (founder A) | Parafraza, bez zrzutu. Odpowiedzi do wiadomości otwierają osobny wątek obok kanału. | — | wątków w wątku | sesja to jedna liniowa rozmowa | D10 opisuje jedną wymianę wiadomości dwóch osób w jednym oknie czasu. | kompozycja i gęstość | warto | przyjęte |
| R02.9 | Slack: boczny pasek | propozycja agenta P06 | PO (founder A) | Parafraza, bez zrzutu, z wiedzy agenta o domyślnym motywie, nie z karty. Domyślny boczny pasek Slacka jest bakłażanowo-fioletowy. | — | kolorów Slacka | kolorystykę wyprowadzamy z R01.4 i z luk kolorystycznych | Fiolet zderza się z antyreferencją A01. | kolor | warto | przyjęte |

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło (gust / badania / propozycja) |
|---|---|---|---|---|
| A01 | Typowa strona startupu AI, połączona z „generycznym wyglądem AI” | „wygląda jak wszystko inne” | Na ekranie: fioletowy gradient, szklane półprzezroczyste karty, ikony iskierek, tekst nagłówka wypełniony gradientem, duże zaokrąglenia na wszystkim, rząd trzech kart z ikonami, emoji w nagłówkach, ściana logo firm z liczbami. W kodzie: `bg-gradient-to-*` z `from-purple-*`/`via-indigo-*`/`to-*`, `backdrop-blur` z `bg-white/10`, `bg-clip-text text-transparent`, `rounded-2xl` jako domyślne zaokrąglenie, ikona `Sparkles`, siatka `grid-cols-3` z kartami cech. | gust (karta A01) i propozycja P01 (przyjęta) |
| A02 | Kurs i ścieżka nauki | „I don't want a course, I want an answer”, „nie chcę się uczyć helma, chcę żeby ingress wstał”, „jakaś mentorship journey lol” | Na ekranie: paski postępu, „% ukończone”, certyfikaty, odznaki, poziomy, ścieżka lub „journey”, lekcje i moduły. W kodzie: `Progress`, `Badge` jako nagroda, słowa `certificate`, `level`, `journey`, `path`, `streak`. | badania, propozycja P07 (przyjęta) |
| A03 | Gwiazdki i opinie | N02, „każdy ma pięć gwiazdek”, „każdy ma 4.9”, „i nie róbcie ocen. serio”, „byłam oceniana. nie robię tego drugi raz” | Na ekranie: gwiazdki, średnie typu 4.9, liczba opinii, testimoniale, „Trusted by…”. W kodzie: ikona `Star`, znak `★`, pola `rating` i `reviewCount`, koncept i trasy `reviews`. Zob. konflikt K4. | badania, propozycja P08 (przyjęta, K4 rozstrzygnięty: obowiązuje N02) |
| A04 | Społeczność | „community” odrzucone przez dewelopera z fintechu i freelancera | Na ekranie: feed, polubienia, obserwujący, publiczne komentarze, liczniki aktywności. W kodzie: ikony `Heart`, `ThumbsUp`, słowa `followers`, `likes`, `feed`. | badania, propozycja P09 (przyjęta) |
| A05 | Abonament | „jak to subskrypcja, to nie otworzę drugi raz”, „I'd pay for speed, not for a subscription” | Na ekranie: tabela planów Free/Pro/Premium, plakietka „Most popular”, ceny „/month”, „Subscribe”. W kodzie: komponent cennika z planami, słowa `plan`, `tier`, `subscribe`. | badania, propozycja P10 (przyjęta) |
| A06 | Rozmowa wideo | N01 (sesja jest tekstowa i produkt mówi to na każdym ekranie sesji), „text is fine, faster” | Na ekranie: ikony kamery i mikrofonu, „Join call”, „Start video”, kafle z twarzami uczestników. W kodzie: ikony `Video`, `Camera`, `Mic`. | badania, propozycja P11 (przyjęta) |
| A07 | Sprzedaż i pośpiech | D16 (produkt nie obiecuje szybkiego startu), D03, „to jest coś sprzedażowego?” | Na ekranie: odliczanie, „Zostały 2 sloty”, „Odpowiedź w minutę”, „instant”, wykrzykniki w przyciskach. W kodzie: komponenty timera promocyjnego, słowa `instant`, `hurry`, `limited`. | badania, propozycja P12 (przyjęta) |
| A08 | Tytuły zamiast pracy | „nie senior engineer tylko robiłem upgrade ingress-nginx na 1.28”, „nie 10 lat reacta bo to każdy ma”, N02 | Na ekranie: „Senior at Google”, logo pracodawców, „10+ years”, „Ex-FAANG”, „Top 1%” jako główny sygnał na karcie mentora. W kodzie: pola typu `company` lub `yearsOfExperience` eksponowane zamiast linków do publicznej pracy. | badania, propozycja P13 (przyjęta) |

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| K1. Gęstość („dużo informacji na ekranie”) kontra brak orientacji („trudno się zorientować, co najważniejsze”, „bałagan”) | R01.1, R01.5, R01.6, R02.6 | Gęsto w listach, z hierarchią typograficzną (R01.5) i jedną akcją główną na ekranie (R01.6). | PO (P16) |
| K2. Dwa różne układy: gęsta lista (GitHub) i rozmowa (Slack) | R01, R02 | R01 obowiązuje dla list i stron (listing, profil, lista sesji), R02 tylko dla ekranu sesji. | PO (P17) |
| K3. „Szybko się odpisuje” kontra D10 (odświeżanie wystarczy, bez czasu rzeczywistego) | R02.3, D10 | Własna wiadomość pojawia się od razu, przy wiadomościach rozmówcy widać „odświeżono o …”. D10 bez zmian. | PO |
| K4. Antyreferencja „gwiazdki i opinie” kontra dokumenty, które nadal przewidują opinie. Backlog (`.ai/specs/backlog.md`), specyfikacje E01/E02 i zgłoszenia #37 i #40 wykluczają oceny (N02). Wcześniejszy `.ai/specs/implemented/2026-09-01-engineering-standards.md` wymienia jednak koncept `reviews`, trasę `api/reviews/route.ts`, ekran `mentor/reviews/page.tsx` (M06) i „reviews” jako przykład dla `DataTable`. `AGENTS.md` wymienia `reviews` na liście konceptów. W kodzie `packages/*/src` nie ma ocen. | A03, N02 | Obowiązuje N02, antyreferencja A03 (P08) przyjęta. `AGENTS.md` i standard inżynierski zostają w tym ćwiczeniu bez zmian. PO usunie `reviews` z tych dokumentów osobno, poza tym ćwiczeniem. | PO |

## Luki

- **Kolor akcentu:** nie ma żadnej referencji. R01.4 wyznacza tylko ciepłe szarości, a R02.9 odrzuca kolory Slacka. Otwarte pytanie: czy A01 wyklucza tylko fioletowy gradient, czy fiolet w ogóle, także jako jednolity akcent?
- **Krój fontu głównego:** wiadomo tylko, że kod ma osobny krój o stałej szerokości (R01.2). Głównego kroju nie wybrano.
- **Ruch:** poza R02.3 i R02.7 nie ma referencji dla przejść, animacji ani stanów ładowania.
- **Ton wypowiedzi:** nie ma referencji. Propozycja: „bezpośredni, bez marketingu, jak w wywiadach”. Status: propozycja, przyjęta przez PO jako propozycja, do potwierdzenia w kroku zasad.
- **Zrzuty:** wszystkie obserwacje są parafrazą. Dwie osoby mogą je narysować różnie, dopóki nie ma zrzutów.
- **Ekrany bez referencji:** licznik albo wskaźnik okna sesji (D10) i oznaczenie „sesja tekstowa” na każdym ekranie sesji (N01). Do tego wybór slotu i płatność (D03, D16), stan „Not taking bookings yet” na profilu (E02) oraz formularze mentora (profil, cena, sloty).
- **Wartości ciepłych szarości:** ten plik ich nie ustala. Powstaną w kroku tokenów.

## Obrazy

Brak plików, bo PO zdecydował się pracować bez zrzutów. Gdyby zrzuty doszły, mają tu takie nazwy:

- `R01-github-lista-pr.png`
- `R01-github-repozytorium.png`
- `R02-slack-kanal-z-watkiem.png`
