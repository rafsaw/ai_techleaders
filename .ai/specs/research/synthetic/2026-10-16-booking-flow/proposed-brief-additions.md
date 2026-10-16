# Propozycja uzupełnień briefu — DevMentor, przepływ „Future state, booking and session (1.0), decided steps"

Status: PROPOZYCJA. Nie zmienia `.ai/specs/product-brief.md` i niczego w nim nie zastępuje. Decyzję o przeniesieniu pozycji do briefu podejmuje człowiek (np. przez `om-discover --refresh`).
Źródło: [report.md](report.md), sesja 001, przebieg 1 z 1, persony P01 i P02.
Rodzaj dowodu: wszystko poniżej to `[SYNTHETIC]`. Przy jednym przebiegu żadna pozycja nie jest ustaleniem (status *Seen once*), nie spełnia Definition of Ready i nie jest dowodem zachowania prawdziwych użytkowników. Język: „by zrobiła”, nie „zrobiła”.

Wspólne założenia scenariusza (dotyczą każdej pozycji):
- Narracyjny przejazd pięciu kroków po opisie, bez ekranów, przeglądarki i transakcji.
- Stanowisko `adversary`: persony szukały powodów, żeby nie kupować.
- Skład panelu przyjęty (brak danych o proporcjach): po jednej personie na segment. P01 = deweloper zablokowany dzień przed wydaniem, pilnie. P02 = deweloper platformowy w dużej firmie, nic się nie pali, ma kanał wewnętrzny.
- Każda persona odpowiadała w jednym przebiegu, nie tura po turze.
- Cena, ceny graniczne, dokładny termin pierwszego slotu i zwrot kosztów przez firmę nie były podane. Persony mówiły „nie wiem” zamiast zgadywać.

## A. Do sekcji *Hypotheses* (propozycja nowych wpisów)

### H-A. Minimalne wyprzedzenie 2 godzin nie spełnia warunku „w ciągu godziny”
[SYNTHETIC] · status: Seen once
- Dotyczy: krok 4; R03, D22; zakwestionowane założenie A04.
- Źródło: P01 i P02, przebieg 1, krok 4 (i pytanie o odpowiedź, która przestała być użyteczna).
- Treść: osoba z pilnym problemem by zarezerwowała tylko wtedy, gdy pierwszy slot wypada przed wydaniem; jeśli po — by wróciła do Stack Overflow, Discorda i obejścia z TODO. Osoba bez pilności przy braku terminu by w ogóle nie rezerwowała.
- Założenia scenariusza: nałożono presję „najwcześniejszy slot jest dalej, niż liczono; ile dalej — wiadomo dopiero po rejestracji”. To presja prowadzącego, nie twierdzenie briefu. Wariant: termin później niż wydanie (P01), brak terminu w ogóle (P02). D22 sam zaznacza, że „w ciągu godziny” nie jest obiecywane.
- Pytanie do prawdziwego użytkownika (deweloper po niedawnej blokadzie przed wydaniem): „Kiedy ostatnio potrzebowałeś odpowiedzi przed wydaniem — do kiedy musiała przyjść i co się stało z pomocą, która przyszła po tym czasie?”. Dodatkowo odczyt mediany czasu od rezerwacji do startu, który zdefiniowało D22.

### H-B. Lista bez sygnału dopasowania zmusza do wyboru „na wyczucie” albo do wyjścia
[SYNTHETIC] · status: Seen once
- Dotyczy: krok 2; D21; zakwestionowane założenie A02.
- Źródło: P01 i P02, przebieg 1, krok 2.
- Treść: obie persony oceniają obcego po widocznej wcześniejszej pracy albo poleceniu; lista uporządkowana wg ostatniej dostępności tego nie daje. P01 by wybrała pierwszą ofertę z TypeScriptem i sama nazwała to hazardem.
- Założenia scenariusza: cierpliwość około pięciu minut; opis briefu nie mówi, co pokazuje karta mentora, więc persony powiedziały, czego brakuje, a nie opisały ekranu.
- Pytanie do prawdziwego użytkownika (deweloper, także taki, który nigdy nie płacił za pomoc): „Pokaż, jak wybierasz kogoś do pomocy z problemem takim jak ostatni. Na co patrzysz, żeby uznać, że to zna? Masz pięć minut.”

### H-C. Wymóg zalogowania przed obejrzeniem czegokolwiek kosztuje przy pilnej potrzebie
[SYNTHETIC] · status: Seen once
- Dotyczy: krok 1; D07.
- Źródło: P01 i P02, przebieg 1, krok 1. Obie by kontynuowały przez GitHub; reakcja: łagodne do umiarkowanego zirytowanie.
- Założenia scenariusza: nałożono presję „logowanie przed widokiem jakiegokolwiek mentora”. Brief nie mówi, czy lista lub profil są widoczne przed logowaniem, więc to luka w opisie, nie sprzeczność.
- Pytanie do prawdziwego użytkownika: „Kiedy ostatnio zakładałeś konto, żeby dostać pilną pomoc? Co było dla Ciebie momentem, w którym przestawałeś próbować?”. Pytanie do zespołu: czy lista i profil są widoczne bez logowania.

### H-D. Brak znanej ceny i ścieżki, kto płaci, kończy przejazd u osoby rozliczanej przez firmę
[SYNTHETIC] · status: Seen once
- Dotyczy: krok 3; R02, D09; zakwestionowane założenie A02.
- Źródło: P02, przebieg 1, krok 3 (decyzja o wyjściu zapadła tutaj); P01 zawahała się, ale kontynuowała.
- Założenia scenariusza: cena niepodana („nie dowiesz się jej do końcowego potwierdzenia”) — to presja prowadzącego, nie opis kroku 3 z briefu. Nie wolno z tego wyprowadzać żadnej kwoty ani tolerancji cenowej.
- Pytanie do prawdziwego użytkownika (deweloper z większej firmy): „Kto ostatnio zapłacił za pomoc z pracy i jak to zatwierdzono? Co by musiało być prawdą, żeby firma to zwróciła?”. Opcjonalnie prośba o dane o ścieżce zakupowej w większej firmie.

### H-E. Niejasne, co wolno wkleić do ekranu sesji
[SYNTHETIC] · status: Seen once
- Dotyczy: krok 5; R04, D27.
- Źródło: P01, przebieg 1, krok 5 (czy kod można wkleić, co widzi mentor, co gdy sesja skończy się bez odpowiedzi); P02, krok 5 (nie wklei kodu firmowego do obcego ekranu bez znajomości zasad — brak fragmentu źródłowego, traktować jako wątek tylko panelu).
- Założenia scenariusza: brief opisuje sesję tylko jako tekstową w ekranie produktu; wszystko ponad to to pytania, nie opis ekranu.
- Pytanie do prawdziwego użytkownika (deweloper proszący o pomoc z kodem firmy): „Co ostatnio wkleiłeś komuś spoza firmy i jakie zasady firmy to regulowały?”.

### H-F. Tam, gdzie nie ma pilności i działa kanał wewnętrzny, oferta nie ma zastosowania
[SYNTHETIC] · status: Seen once (przypadek odstający)
- Dotyczy: zakwestionowane założenie A02.
- Źródło: P02, przebieg 1, kroki 3–4 (wyjście przy braku terminu).
- Założenia scenariusza: P02 to jedyny reprezentant segmentu małej pilności; opiera się na jednej notatce. Nie wiadomo, jak liczny jest ten segment.
- Pytanie do prawdziwego użytkownika (deweloper platformowy w dużej firmie): „Kiedy ostatnio rozwiązałeś coś sam i co by musiało być prawdą, żebyś zapłacił?”. Prośba o dane: wielkość tej grupy w docelowej populacji.

## B. Do sekcji *Key flows* → *Missing cases* (propozycja opisu luk, nie zmiana kroków)

Każda pozycja to `[SYNTHETIC]`, Seen once, i odsyła do hipotezy powyżej.
- Krok 1: nie określono, czy lista i profil są widoczne przed logowaniem (H-C; P01, P02).
- Krok 2: nie określono, co karta mentora pokazuje o dotychczasowej pracy (H-B; P01, P02).
- Krok 3: nie określono momentu, w którym użytkownik widzi cenę, ani czy płatność jest jednorazowa (P01, krok 3; obawa, że ukryta cena oznacza powtarzalny koszt — brief tego nie twierdzi) (H-D).
- Krok 4: nie określono, czy pierwszy dostępny termin jest widoczny przed rejestracją, ani opcji „dostępny teraz” (P01, krok 4) (H-A).
- Krok 5: nie określono wsparcia wklejania kodu, widoczności repozytorium dla mentora ani zachowania, gdy sesja kończy się bez odpowiedzi (H-E).

Założenia scenariusza: persony mówiły, czego brakuje w opisie; żaden ekran nie został opisany ani zaobserwowany.

## C. Do sekcji *Open questions* (pytania na kolejny prawdziwy wywiad, z porównania z notatką odłożoną)

Każde to `[SYNTHETIC]` i pytanie, nie ustalenie. Wynikają z tematów, które podniósł tylko panel, albo których panel nie osiągnął.
- Czy samo logowanie przed przeglądaniem jest barierą (temat tylko panelu; P01, P02, krok 1).
- Jaka jest ścieżka zwrotu kosztów w firmie (tylko panel; P02, krok 3).
- Czy ktokolwiek zapłaci, gdy nie ma terminu naglącego (tylko panel; P02, krok 4).
- Jakie zasady dotyczą wklejania kodu firmowego (tylko panel; P02, krok 5; w prawdziwej notatce padło jako uwaga ankietera, nie wypowiedź rozmówcy).
- Materiał do zebrania (tylko w prawdziwej notatce): wcześniejsze płatne próby na platformach, czas znalezienia osoby, konkretne zadanie jako dowód kompetencji, koszt przesunięcia wydania. Panel był tu ogólnikowy.

Założenia scenariusza: porównanie dotyczy jednej notatki odłożonej, dziewięciu tematów; główny agent znał jej treść przed ułożeniem presji, ale żadna persona jej nie widziała (patrz `calibration.md`).

## Czego ta propozycja nie robi

Nie edytuje briefu ani specyfikacji, nie zmienia kroków przepływu, nie podaje kwot ani udziałów, nie ocenia popytu. Pozycje H-A–H-F są kandydatami na hipotezy do sprawdzenia z ludźmi, nie wynikami.
