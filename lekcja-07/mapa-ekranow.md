# Mapa ekranów: Epik 01, konta i role

- Status: **Zatwierdzona — 2026-10-24**. Zawiera decyzje Product Ownera z 2026-10-24 (dwie rundy: zakres i luki L01–L22, potem O3, O5, O8, O9 i L12) oraz nieblokujące follow-upy z sekcji 4. Niczego nie zbudowano.
- Brief: `.ai/specs/product-brief.md` (odświeżony 2026-10-17). Specyfikacja: `.ai/specs/2026-10-17-accounts-and-roles.md` (szkic do przeglądu, 2026-10-18).
- Język: mapa po polsku, teksty ekranów po angielsku, tak jak w design systemie.
- Zakres zmian w tej wersji: tylko ten plik. Brief, specyfikacja, GitHub Issues, design system i kod nie były zmieniane. Rzeczy do późniejszej synchronizacji są zebrane w sekcji 4.

## Jak czytać tabelę

- `▸` otwiera jeden stan ekranu. Tag w nawiasach mówi, co z nim robimy w prototypie:
  - **[K]** klikalny: prototyp go symuluje.
  - **[D]** udokumentowany: wymaganie zostaje, ale nie ma osobnej symulacji (ten sam wzorzec co gdzie indziej albo wymaga prawdziwego wyścigu).
  - **[X]** wyłączony z prototypu Epiku 01 decyzją PO. Wymaganie zostaje w specyfikacji (innego epiku albo istniejące strony).
- Po tagu stoi opis stanu, a po myślniku jego źródło: numer kryterium (`#34-AC1`), sekcja specyfikacji (`Spec Flow 2`, `AD7`), decyzja z briefu (`D13`, `N03`), konwencja design systemu (`DS`) albo **decyzja PO** z numerem luki (`PO L05`).
- Role: **W** wizytor niezalogowany, **Mt** mentee, **Mr** mentor, **Op** operator. Konto mentora ma zawsze także rolę mentee, więc występują cztery kombinacje: mentee, mentee+mentor, mentee+operator, mentee+mentor+operator.
- `L..` to luki w specyfikacji (sekcja 4), `LD..` to luki w design systemie (sekcja 5).
- Identyfikatory ekranów s01–s14 są stałe. Wyłączenie s09 i s10 z prototypu niczego nie przenumerowuje.

## 0. Zakres i wypisane historie

Przepływ: **Epik 01 „Accounts and access” (#28)**: logowanie GitHubem, rejestracja i logowanie e-mailem z potwierdzeniem adresu, zaproszenie mentora, konto, nagłówek zależny od logowania i brak dostępu.

Numery historii: prompt i `lekcja-07/README.md` podają #12–#14, ale `.ai/specs/backlog.md` i GitHub mają #34–#36. Użyto numerów z backlogu. Specyfikacja Epiku 01 to `2026-10-17-accounts-and-roles.md`. Pliku `personas.md` nie ma, więc role pochodzą z grupy docelowej w briefie.

| Historia | Tytuł | Kryteria akceptacji (skrót) |
|---|---|---|
| **#34 E01-S01** | Wizytor loguje się GitHubem i dostaje konto z nazwą wyświetlaną | **AC1** autoryzacja → konto utworzone lub użyte, zalogowany. **AC2** pierwsze logowanie → nazwa z GitHuba, edytowalna. **AC3** to samo konto GitHub ponownie → bez duplikatu. **AC4** (negatywne) anulowanie lub odmowa → niezalogowany, komunikat z opcją e-mail. |
| **#35 E01-S02** | Osoba bez GitHuba rejestruje się e-mailem i hasłem i potwierdza adres | **AC1** rejestracja (nazwa, e-mail, hasło) → konto, które nie zaloguje się przed potwierdzeniem. **AC2** otwarcie linku z maila → adres potwierdzony, można się zalogować. **AC3** (negatywne) logowanie na niepotwierdzone konto → odmowa z ofertą ponownej wysyłki. **AC4** (negatywne) link wygasły lub użyty → nic nie potwierdza i mówi dlaczego. |
| **#36 E01-S03** | Zaproszony inżynier otwiera jednorazowy link i dostaje rolę mentora | **AC1** ważny link + zalogowany lub nowo zarejestrowany → rola mentora, zaproszenie zużyte. **AC2** (negatywne) link użyty, nieważny lub podrobiony → rola nie nadana, komunikat „zaproszenie nieważne”. **AC3** mentee przyjmuje zaproszenie → jedno konto, dwie role. **AC4** (negatywne) bez zaproszenia → nie istnieje otwarta rejestracja mentora. Weryfikacja: test braku publicznej ścieżki (PO L03), bez ekranu. |
| **#46 E01-S03-T01** | Operator tworzy jednorazowe zaproszenie bez UI | „Done when”: dokumentowany skrypt lub CLI, test jednorazowości. **Bez ekranu** (D12, PO 2026-10-17: CLI, bez strony admina). W prototypie istnieje tylko jego skutek: mail z zaproszeniem w skrzynce demo (s13). |

Decyzje, na których stoi przepływ: D13, D14, N03, D12, D15. Ze spec: AD2 (sesje w bazie, role czytane na żywo), AD3 (łączenie z GitHubem po zweryfikowanym głównym e-mailu), AD4 (`/backend` i `/api/users` tylko dla operatora), AD5 (zaproszenie przypięte do e-maila), AD6 (hasło ≥ 15 znaków), AD7 (potwierdzenie linkiem i hasłem).

Poza zakresem prototypu: listing mentorów (E03), rezerwacja i płatność (E04), sesja tekstowa (E05), konfiguracja mentora `/mentor` (E02), slot rezerwacji. Wymaganie `returnTo` zostaje, ale przepływów innych epików nie prototypujemy (PO L20).

## 1. Mapa ekranów

| ID | Ekran | Rola | Stany | Historia lub kryterium | Komponenty DS |
|---|---|---|---|---|---|
| **s01** | Logowanie `/sign-in` | **Widzi:** W. **Zalogowani:** przekierowanie na `/` albo bezpieczne `returnTo` (PO L06) | ▸ [K] domyślny: GitHub pierwszy, formularz e-mail, notka N03 — #34-AC1, #35-AC3<br>▸ [D] ładowanie: wysyłanie formularza e-mail — DS<br>▸ [K] błąd: zły e-mail lub hasło, także konto tylko-GitHub — Spec Flow 2<br>▸ [K] e-mail niepotwierdzony + „Resend confirmation” — #35-AC3<br>▸ [K] ponowna wysyłka: wysłano — Spec API resend<br>▸ [K] ponowna wysyłka: nie wysłano (SMTP padł): neutralne „We couldn't send the email. Please try again later.” — Spec Flow 2, wynik usługi zewnętrznej, PO O3<br>▸ [D] ponowna wysyłka: adres już potwierdzony — Spec API resend<br>▸ [D] ponowna wysyłka: 429 — Spec rate limits<br>▸ [K] 429 przy logowaniu (reprezentatywny stan wzorca błędów formularza) — Spec rate limits, PO L21<br>▸ [K] GitHub anulowany lub odmowa — #34-AC4<br>▸ [K] GitHub niedostępny, błąd wymiany tokenu, wygasły stan OAuth (`github_failed`) — Spec Flow 1, wynik usługi zewnętrznej<br>▸ [K] GitHub bez zweryfikowanego e-maila — Spec Flow 1, D15<br>▸ [K] konflikt: e-mail powiązany z innym kontem GitHub — Spec Flow 1<br>▸ [K] z `returnTo` (zaproszenie): banery i linki niosą powrót — D13, Spec Flow 1<br>▸ [K] wygasła sesja: baner „Your session expired. Sign in again.”, bezpieczne `returnTo` zachowane — PO L07<br>▸ [K] wejście osoby zalogowanej: przekierowanie na `/` lub bezpieczne `returnTo` — PO L06 | #34-AC1, #34-AC4<br>#35-AC3<br>D13, N03 | `SiteHeader`, `SignInOptions` (`Notice`, `SchemaForm`, `PasswordField`, `SubmitButton`, `LinkButton`). Luki: LD06 |
| **s02** | Rejestracja `/sign-up` | **Widzi:** W. **Zalogowani:** przekierowanie jak w s01 (PO L06) | ▸ [K] domyślny: notka N03 i reguła 15 znaków przed wpisywaniem — #35-AC1, AD6, N03<br>▸ [K] z zaproszenia: „użyj adresu, który dostał zaproszenie”, `returnTo` zachowany — #36-AC1, Spec UI/UX<br>▸ [K] walidacja: pusta nazwa, zły e-mail, hasło krótsze niż 15 znaków, dłuższe niż 72 B lub popularne — #35-AC1, AD6<br>▸ [D] ładowanie: tworzenie konta — DS<br>▸ [K] sukces → s03 — #35-AC1<br>▸ [K] konflikt: e-mail już istnieje. Ekran bez zmian, ta sama odpowiedź i s03; różnica tylko w mailu (s13) — Spec Flow 2<br>▸ [D] 429 (limit rejestracji na IP) — Spec rate limits<br>▸ [K] brak sieci (reprezentatywny stan wzorca błędów formularza) — DS, PO L21<br>▸ [K] wejście osoby zalogowanej: przekierowanie na `/` lub bezpieczne `returnTo` — PO L06 | #35-AC1<br>#36-AC1 (rejestracja z zaproszenia)<br>N03, AD6 | `SiteHeader`, `Notice`, `SchemaForm`, `TextField`, `PasswordField`, `SubmitButton`, `LinkButton` |
| **s03** | Sprawdź skrzynkę `/sign-up/check-email` | **Widzi:** W (po rejestracji) | ▸ [K] wysłano: „Check your inbox at …”, wygasa po 24 h — #35-AC1, Spec UI/UX<br>▸ [K] nie wysłano (SMTP padł albo limit adresu wyczerpany): „We couldn't send the email. Please try again later.” + powrót do rejestracji; bez ujawniania przyczyny i bez odliczania — PO L09, O3, wynik usługi zewnętrznej<br>▸ [K] wejście bez parametru `email`: przekierowanie na `/sign-up` — PO L22 | #35-AC1 | `SiteHeader`, `Notice`, `LinkButton` |
| **s04** | Potwierdzenie adresu `/confirm-email?token=…` | **Widzi:** W i każdy, kto ma link (także zalogowany) | ▸ [K] ważny link: pole hasła + „Confirm” — #35-AC2, AD7<br>▸ [D] ładowanie: potwierdzanie — DS<br>▸ [K] sukces: adres potwierdzony, zalogowany, przejście do `returnTo` — #35-AC2<br>▸ [K] błędne hasło (401), adres pozostaje niepotwierdzony — Spec Flow 2<br>▸ [D] 429 — Spec rate limits<br>▸ [K] link wygasły (24 h) — #35-AC4<br>▸ [K] link użyty, adres już potwierdzony — #35-AC4<br>▸ [K] link nieważny lub zastąpiony nowszym: neutralny komunikat + przejście do logowania — Spec Flow 2, PO L11<br>▸ [D] wyścig: inna karta potwierdziła pierwsza (404 z powodem) — Spec API<br>▸ [K] link po przejęciu niepotwierdzonego konta przez GitHub: ten sam neutralny komunikat + logowanie — AD3, PO L11 | #35-AC2, #35-AC4<br>AD7 | `SiteHeader`, `ConfirmEmailPanel` (`PasswordField`, `SubmitButton`, `Notice`). Luki: LD05 |
| **s05** | Zaproszenie `/invite/[token]` | **Widzi:** W (stan „niezalogowany”), Mt, Mr (stan „już mentor”). Operator jak zwykłe konto | ▸ [K] nieważne: użyte, odwołane, zastąpione, wygasłe lub podrobione — jeden komunikat — #36-AC2<br>▸ [K] niezalogowany: zaloguj się lub załóż konto adresem z zaproszenia — Spec Flow 3, #36-AC1<br>▸ [K] zalogowany kontem z innym adresem: bez przycisku Accept, wylogowanie, „poproś o ponowne zaproszenie” albo świadomie osobne konto; bez łączenia kont — AD5, PO L15<br>▸ [K] zalogowany, już mentor — Spec Flow 3<br>▸ [K] gotowe: „Accept as <nazwa> (<e-mail>)” — #36-AC1, #36-AC3<br>▸ [K] po pierwszym logowaniu GitHubem: jednorazowy `Notice` „nazwa jest publiczna, zmienisz ją w Account settings”, także przy `returnTo`; nie wraca po odświeżeniu ani po kolejnym logowaniu w tej symulacji — PO L16, O5<br>▸ [D] ładowanie: przyjmowanie — DS<br>▸ [K] sukces: rola nadana, pełna nawigacja na `/` z komunikatem (s07) — #36-AC1, #36-AC3, PO L01<br>▸ [K] błąd przyjęcia: 403, 404 (wyścig) lub 409 (jedna reprezentatywna prezentacja, wariant z c08) — Spec API<br>▸ [D] nieudane wylogowanie przy zmianie konta, komunikat z DS — PO L08 | #36-AC1, #36-AC2, #36-AC3<br>#36-AC4 bez ekranu (test braku ścieżki, PO L03)<br>D14 | `SiteHeader`, `InvitationPanel`, `Notice`. Luki: LD07, LD12 |
| **s06** | Konto `/account` | **Widzi:** Mt, Mr, Op (każde zalogowane). **W:** przekierowanie do s01 z `returnTo=/account` | ▸ [K] domyślny: nazwa edytowalna, e-mail, role, metody — #34-AC2<br>▸ [K] powitanie `?welcome=1` po pierwszym logowaniu GitHubem bez `returnTo`: ten sam jednorazowy `Notice` co w s05, wyświetlony raz, bez drugiego identycznego komunikatu — #34-AC2, PO O5<br>▸ [K] odświeżenie albo kolejne logowanie w tej samej symulacji: `Notice` nie wraca — PO O5<br>▸ [K] wiele ról i obie metody logowania — #36-AC3<br>▸ [D] zapis w toku — DS<br>▸ [K] zapisano: pole zachowuje nazwę, komunikat „Name saved” — PO L10<br>▸ [K] błąd pola (pusta nazwa, > 100 znaków) — #34-AC2<br>▸ [D] błąd serwera — DS<br>▸ [K] niezalogowany → s01 z `returnTo` — Spec guards<br>▸ [K] wygasła sesja przy zapisie: komunikat „Your session expired. Sign in again.”; niezapisane zmiany przepadają — PO L07 | #34-AC2, #34-AC3 (konto się nie dubluje, widać po drugim logowaniu)<br>#36-AC3<br>D15 | `SiteHeader`, `AccountSummary` (`Card`, `Badge`), `CrudForm`. Luki: LD08 |
| **s07** | Strona główna `/` | **Widzi:** W, Mt, Mr, Op (wspólna, publiczna). Różni się nagłówkiem. Bez dashboardu i bez zaślepki listingu (PO L02) | ▸ [K] niezalogowany: nagłówek z „Sign in” — Spec UI/UX<br>▸ [K] zalogowany mentee: nazwa (link do s06) i „Sign out” — Spec UI/UX<br>▸ [K] zalogowany mentor: nagłówek jak mentee, bez linku „Mentor setup”; link ukryty tylko w prototypie E01, design system i zakres E02 bez zmian — PO L01, L20, O8<br>▸ [K] zalogowany operator: dodatkowo „Backend” — AD4<br>▸ [K] po przyjęciu zaproszenia: komunikat „Invitation accepted. You're now a mentor.” — PO L01<br>▸ [D] wylogowanie nieudane, komunikat z DS — PO L08 | brak kryterium; #36-AC1 (komunikat po przyjęciu); D13 | `SiteHeader`, `Notice`. Luka: LD01 |
| **s08** | Backend: zaślepka kontroli dostępu `/backend` | **Widzi:** Op. **Mt/Mr:** s11. **W:** s01 z `returnTo=/backend` | ▸ [K] operator: minimalna zaślepka „Backend (existing, not prototyped)” — AD4, PO (backend)<br>▸ [K] mentee lub mentor bez roli operatora: s11 — AD4, PO L05<br>▸ [K] niezalogowany → s01 — Spec guards, PO L05<br>▸ [D] rola operatora odebrana w trakcie sesji: następne żądanie daje s11, osoba nadal zalogowana — Spec edge<br>▸ [D] rola operatora nadana w trakcie sesji: dostęp od następnego żądania — Spec edge | brak kryterium; AD4 | zaślepka prototypu. Luka: LD04 |
| **s09** | Backend: użytkownicy `/backend/users` | **Poza prototypem Epiku 01** | ▸ [X] lista użytkowników + formularz tworzenia — AD4, istniejący przykład<br>▸ [X] ładowanie — DS<br>▸ [X] błąd ładowania (401/403/500 z API) — DS, AD4<br>▸ [X] brak dostępu → s11 lub s01 — AD4 (pokazuje to s08)<br>▸ [X] konto utworzone przez operatora, bez metody logowania — dokumentacja implementacyjna (PO L17) | brak kryterium; AD4 | `DataTable`, `CrudForm`, `Card`, `LoadingMessage`, `ErrorMessage` (istniejące). Luka: LD04 |
| **s10** | Konfiguracja mentora `/mentor` | **Poza prototypem Epiku 01** (należy do E02) | ▸ [X] mentor: ekran konfiguracji — Spec E02 Flow 1<br>▸ [X] mentee bez roli mentora: 404 — E02 `requireRole("mentor")`<br>▸ [X] niezalogowany → s01 — E02 | PO L01, L20: brak `/mentor` w E01 | należy do E02 |
| **s11** | Brak dostępu (neutralne 404) | **Widzi:** zalogowany bez wymaganej roli | ▸ [K] neutralne 404 z linkiem do `/` po wejściu na zabroniony adres (`/backend`); autoryzacja API niezależna od UI — AD4, PO L05 | brak kryterium; PO L05 | brak. Luka: LD02 |
| **s12** | Błąd `/error` | **Widzi:** każdy. Bez tożsamości, bez bazy | ▸ [K] ogólny błąd (`?code=internal_error`): nieznany błąd, brak konfiguracji GitHub, baza niedostępna — Spec UI/UX, Spec edge | brak kryterium | `Notice`, `LinkButton` (propozycja). Luka: LD03 |
| **s13** | Skrzynka demo (tylko prototyp) | **Widzi:** ten, kto prowadzi demo | ▸ [K] mail potwierdzający: link ważny 24 h — #35-AC2, #35-AC4<br>▸ [K] mail „masz już konto, zaloguj się GitHubem lub hasłem” (konflikt przy rejestracji) — Spec Flow 2<br>▸ [K] mail z zaproszeniem na przypięty adres, z datą wygaśnięcia wziętą z konkretnego zaproszenia — Spec Flow 3, #46, PO L12, L14<br>▸ [K] pusta skrzynka — prototyp | #35-AC2, #35-AC4, #36-AC1 | poza design systemem (powłoka prototypu). Luka: LD09. Treści zatwierdzone na potrzeby prototypu: sekcja 3a |
| **s14** | GitHub: autoryzacja (zewnętrzny, symulowany) | **Widzi:** W oraz każdy, kto kliknie „Sign in with GitHub” | ▸ [K] ekran „Authorize / Deny” z wybraną tożsamością demo — #34-AC1, #34-AC4<br>▸ [K] GitHub niedostępny — Spec Flow 1 (powrót do s01 `github_failed`) | #34-AC1, #34-AC4 | poza design systemem. Luka: LD10 |

### Widoczność według ról

| Ekran | W | Mt | Mr | Op |
|---|---|---|---|---|
| s01, s02 | widzi | → `/` lub `returnTo` | → `/` lub `returnTo` | → `/` lub `returnTo` |
| s03 | widzi | widzi (link bezpośredni) | j.w. | j.w. |
| s04 | widzi | widzi | widzi | widzi |
| s05 | stan „niezalogowany” | stan zależny od adresu | stan „już mentor” albo zależny od adresu | jak Mt |
| s06 | → s01 z `returnTo` | widzi | widzi | widzi |
| s07 | widzi | widzi | widzi (bez „Mentor setup”) | widzi, plus „Backend” |
| s08 | → s01 z `returnTo` | s11 | s11 | widzi zaślepkę |
| s09, s10 | poza prototypem | poza prototypem | poza prototypem | poza prototypem |
| s11, s12 | widzi | widzi | widzi | widzi |

Stan „zalogowany, adres niezweryfikowany” z `/invite` jest w praktyce nieosiągalny (sesję dostaje się po potwierdzeniu adresu). W prototypie łączę go ze stanem „inny adres”.

## 2. Scenariusze do przełączania w prototypie

To kontrolki prototypu (pasek przeglądu), nie funkcje produktu. Wzorzec błędów formularza (429, brak sieci, błąd serwera) jest jeden i pokazujemy go reprezentatywnie (s01: 429, s02: brak sieci). Pozostałe wystąpienia są [D].

| ID | Kontrolka | Wartości | Wpływ | Źródło |
|---|---|---|---|---|
| c01 | Wynik GitHuba | autoryzuj · anuluj/odmów · GitHub niedostępny · stan OAuth wygasły (>10 min) · tożsamość bez zweryfikowanego e-maila · e-mail powiązany z innym GitHubem | s14 → s01 (banery), s06 | #34-AC1, #34-AC4, Spec Flow 1 |
| c02 | Tożsamość GitHub | nowa osoba (Kuba) · Ola (istniejąca; drugie logowanie nie dubluje) · Wiktor (zaproszony, nowy w GitHubie) · Bartek (zaproszony, ma konto) · Jan (operator) | s06 `?welcome=1` albo s05 z `Notice` (jednorazowo, nigdy oba naraz), brak duplikatu konta | #34-AC2, #34-AC3, PO L16 |
| c03 | Wysyłka maila | OK · SMTP padł · limit adresu (3 na godzinę) wyczerpany | s03 i ponowna wysyłka w s01 (oba błędy i oba miejsca dają ten sam neutralny komunikat), s13 | #35-AC1, Spec Flow 2, PO L09 |
| c04 | Adres przy rejestracji | nowy · niepotwierdzony (Ewa) · potwierdzony (Tomek) | ta sama s03, inny mail w s13 | Spec Flow 2 |
| c05 | Wzorzec 429 | wyłączony · włączony (s01) | s01; reszta [D] | Spec rate limits, PO L21 |
| c06 | Link potwierdzający | ważny · wygasły · użyty · zastąpiony nowszym · po przejęciu konta przez GitHub | s04 | #35-AC2, #35-AC4, PO L11 |
| c07 | Link zaproszenia | ważny · wygasły · odwołany · użyty · podrobiony | s05 (wszystkie nieważne dają jeden komunikat) | #36-AC1, #36-AC2 |
| c08 | Przyjęcie zaproszenia | OK · wyścig przegrany (404) · już mentor (409) · wymuszony inny adres (403) | s05 | Spec API |
| c09 | Sesja | aktywna · wygasła w bazie (ciasteczko jest) | s01 (baner), s06 | Spec edge, PO L07 |
| c10 | Role na żywo | operator nadany · operator odebrany | **wyłączona z prototypu** (tylko dokumentacja, s08 [D]) | Spec edge |
| c11 | Zapis nazwy | OK · błąd pola | s06 | #34-AC2, PO L10 |
| c12 | Sieć i serwer | OK · brak sieci (s02) · baza niedostępna → s12 | s02, s12 | DS, Spec edge, PO L21 |
| c13 | Zegar demo | stały „teraz” · +25 h · +15 dni · +31 dni | wygaśnięcie linku (24 h), zaproszenia (14 dni), sesji (30 dni) | Spec Flow 2, Flow 3, AD2 |
| c14 | Powrót (`returnTo`) | brak · zaproszenie | s01–s05 | D13, PO L20 |
| c15 | Reset demo | wyczyść konta, sesje, skrzynkę | całość | prototyp |
| c16 | Otwórz adres (zatwierdzona, PO O9) | `/backend` jako zalogowany bez roli, jako niezalogowany i jako operator | s08, s11. Służy wyłącznie do symulowania kontroli dostępu do istniejącego `/backend` | PO L05, O9 |

Razem 16 kontrolek: 15 aktywnych i jedna (c10) wyłączona.

## 3. Konta i dane demo (wszystko fikcyjne)

**Stały „teraz” zegara demo:** poniedziałek **2026-11-02 10:00:00 UTC**. Czas pokazywany w strefie przeglądarki z nazwą strefy (reguła DS). Ekrany Epiku 01 prawie nie pokazują czasu; „teraz” liczy się przy wygasaniu (24 h, 14 dni, 30 dni).

### Konta i tożsamości

| ID | Nazwa wyświetlana | E-mail | Role | Metoda logowania | Po co |
|---|---|---|---|---|---|
| a1 | Ola Nowak | ola.nowak@example.test | mentee | GitHub (`ola-nowak`) | domyślna mentee, drugie logowanie bez duplikatu, „inny adres” na zaproszeniu |
| a2 | Tomek Wiśniewski | tomek.wisniewski@example.test | mentee | e-mail + hasło, potwierdzony | logowanie hasłem, „konto już istnieje” |
| a3 | Ewa Lis | ewa.lis@example.test | mentee | e-mail + hasło, **niepotwierdzony**; link wysłany 2026-11-02 09:40 UTC | #35-AC3, ponowna wysyłka, link ważny do 2026-11-03 09:40 UTC |
| a4 | Marta Zielińska | marta.zielinska@example.test | mentee + mentor | GitHub (`marta-z`) | „już mentor”, komunikat roli |
| a5 | Jan Kruk | jan.kruk@example.test | mentee + operator | GitHub (`jan-kruk`) | zaślepka backendu |
| a6 | Zofia Maj | zofia.maj@example.test | mentee + mentor + operator | e-mail + hasło, potwierdzony | wszystkie role |
| a7 | Piotr Sowa | piotr.sowa@example.test | mentee | GitHub (`piotr-sowa`) **i** hasło | `/account` z obiema metodami (AD3) |
| i1 | Bartek Dąb | bartek.dab@example.test | mentee | GitHub (`bartek-dab`), główny e-mail pasuje do zaproszenia | przyjęcie zaproszenia kontem istniejącym (#36-AC1, #36-AC3) |
| i2 | Celina Rak | celina.rak@example.test | brak konta | zaproszona, rejestruje się e-mailem | „nowo zarejestrowana osoba” (#36-AC1) |
| g1 | Kuba Lis | kuba.lis@example.test | brak konta | tożsamość GitHub (`kuba-lis`), nazwa „Jakub Lis” | pierwsze logowanie bez `returnTo`, `?welcome=1` (#34-AC2) |
| g2 | (bez nazwy) | brak zweryfikowanego e-maila | brak konta | tożsamość GitHub (`brak-maila`) | `github_no_verified_email` |
| g3 | Ola z innego GitHuba | ola.nowak@example.test | — | inny `githubId` niż a1 | `github_email_taken` |
| g4 | Wiktor Bor | wiktor.bor@example.test | brak konta | tożsamość GitHub (`wiktor-bor`), zaproszony | pierwsze logowanie z `returnTo` zaproszenia: `Notice` o publicznej nazwie (PO L16) |

Razem 13 pozycji: 8 istniejących kont (a1–a7, i1) i 5 pozycji bez konta (i2, g1–g4).

Hasła demo (≥ 15 znaków, fikcyjne): a2 `zielona-lampa-nad-rzeka`, a3 `kamienna-brama-2026-x`, a6 `maly-statek-na-jeziorze`, a7 `stara-mapa-z-poddasza`. Dla i2 prototyp przyjmuje dowolne hasło zgodne z regułami.

### Dane z briefu i spec

- Produkt: DevMentor, płatna pomoc tekstowa, sesje 25 i 50 minut (R01), obszary TypeScript, React, Python (D04), brak wideo (N01), brak ocen (N02).
- Reguły widoczne w Epiku 01: hasło ≥ 15 znaków i ≤ 72 B, link potwierdzający ważny 24 h, zaproszenie ważne 14 dni, sesja 30 dni od ostatniej wizyty, pięć prób logowania na adres w 15 minut, trzy maile potwierdzające na adres w godzinę.
- Ceny, terminy rezerwacji i slot: Epik 01 ich nie pokazuje i nie wymyślamy ich (PO L20).
- Adres zespołu w tekstach: `team@example.test`, tylko w prototypie (PO L04).

### Zaproszenia i linki

| ID | Adres | Utworzone | Ważne do | Stan | Ścieżka demo |
|---|---|---|---|---|---|
| inv1 | bartek.dab@example.test | 2026-10-30 10:00 UTC | 2026-11-13 10:00 UTC | ważne | `/invite/demo-bartek` |
| inv2 | celina.rak@example.test | 2026-11-01 10:00 UTC | 2026-11-15 10:00 UTC | ważne | `/invite/demo-celina` |
| inv3 | ola.nowak@example.test | 2026-10-14 10:00 UTC | 2026-10-28 10:00 UTC | wygasłe | `/invite/demo-wygasle` |
| inv4 | piotr.sowa@example.test | 2026-10-31 10:00 UTC | 2026-11-14 10:00 UTC | odwołane | `/invite/demo-odwolane` |
| inv5 | marta.zielinska@example.test | 2026-10-18 10:00 UTC | 2026-11-01 10:00 UTC | użyte 2026-10-20 | `/invite/demo-uzyte` |
| inv6 | wiktor.bor@example.test | 2026-11-01 10:00 UTC | 2026-11-15 10:00 UTC | ważne | `/invite/demo-wiktor` |
| — | — | — | — | podrobione | `/invite/demo-zly-token` |

Linki potwierdzające: ważny (Ewa, wysłany 09:40 UTC), wygasły (wysłany 2026-10-30), użyty (Tomek), zastąpiony (Ewa, starszy mail).

### 3a. Treści maili (zatwierdzone na potrzeby prototypu, PO L12)

Teksty obowiązują tylko w skrzynce demo. **Nie są ostatecznymi szablonami produkcyjnymi.** Link w prototypie jest fikcyjny. Data wygaśnięcia zaproszenia pochodzi z konkretnego zaproszenia (kolumna „Ważne do” w tabeli zaproszeń), nie jest wpisana na stałe. Zmiana zegara demo (c13) ani inne zaproszenie nie wymaga zmiany szablonu.

**Mail potwierdzający** (po rejestracji)
- Temat: `Confirm your DevMentor email address`
- Treść: „Hi {display name}, open the link below and enter the password you chose to confirm {email}. The link expires in 24 hours. {link} If you didn't create a DevMentor account, ignore this email.”

**Mail „masz już konto”** (rejestracja na potwierdzony adres)
- Temat: `You already have a DevMentor account`
- Treść: „Someone tried to create a DevMentor account with this address. You can sign in with GitHub or with your password. Password reset is not available in version 1.0. If this wasn't you, ignore this email.”

**Mail z zaproszeniem** (CLI operatora)
- Temat: `You're invited to mentor on DevMentor`
- Treść: „We'd like you to join DevMentor as a mentor. Open the link, sign in or create an account with this email address ({email}), and choose Accept invitation. The link works once and expires on {expires_at, UTC}. {link} If you weren't expecting this, ignore this email.”
- Przykład dla inv1: „expires on 13 November 2026, 10:00 UTC”. Dla inv2 i inv6: „15 November 2026, 10:00 UTC”.

Data jest podana w UTC z nazwaną strefą, bo mail nie zna strefy odbiorcy.

## 4. Luki w specyfikacji i decyzje PO

Typy: **[K]** kryterium bez ekranu lub stanu. **[S]** stan bez kryterium. **[X]** sprzeczność. **[N]** decyzja, której nikt nie podjął. Decyzje z 2026-10-24 są wpisane w kolumnie „Decyzja PO”. Dokumentów źródłowych nie zmieniałem. Kolumna „Dalej” pokazuje, co zostaje.

| ID | Typ | Luka | Decyzja PO (2026-10-24) | Dalej |
|---|---|---|---|---|
| **L01** | [X][N] | Dokąd trafia mentor po przyjęciu zaproszenia | `/` z komunikatem „Invitation accepted. You're now a mentor.” Nie tworzymy `/mentor` w E01. | Zamknięta. Story `Valid` w DS wskazuje `/mentor`: synchronizacja DS (LD07) |
| **L02** | [N] | Strony startowe ról | `/` to wspólna publiczna strona, nagłówek zależy od logowania. Bez dashboardu mentee i bez zaślepki listingu. | Zamknięta |
| **L03** | [K] | #36-AC4 bez ekranu | Nie tworzymy publicznej rejestracji mentora. Kryterium weryfikuje test braku publicznej ścieżki (spec Phase 3 krok 4: „No page/route/CLI offers open mentor registration”). | Zamknięta |
| **L04** | [N] | Kontakt „DevMentor team” | `team@example.test` tylko w prototypie. | Zamknięta dla prototypu. **Q13 otwarte przed wydaniem** |
| **L05** | [S][N] | „Brak dostępu” jako ekran | Zalogowany bez roli: neutralne 404 z linkiem do `/`. Niezalogowany: przekierowanie do logowania. Autoryzacja API niezależna od UI. | Zamknięta |
| **L06** | [S] | Zalogowany na `/sign-in`, `/sign-up` | Przekierowanie na `/` albo bezpieczne `returnTo`. | Do dopisania w spec (jedno zdanie) |
| **L07** | [S] | Wygasła sesja | Baner „Your session expired. Sign in again.”, ponowne logowanie z bezpiecznym `returnTo`. Niezapisane zmiany przepadają. | Do dopisania w spec |
| **L08** | [S] | Wylogowanie zawiodło | Istniejący komunikat błędu z DS. | Zamknięta |
| **L09** | [S] | Ślepy zaułek po wyczerpanym limicie adresu | Limity i kolejność operacji bez zmian. Przy niewysłanym mailu: „We couldn't send the email. Please try again later.” i powrót do rejestracji. Bez ujawniania konta i przyczyny, bez odliczania, bez nowego retry. | Prototyp używa tego komunikatu w s03 i przy nieudanej ponownej wysyłce w s01 (PO O3). Logika wysyłki i limity bez zmian. Do synchronizacji, bez blokowania prototypu: spec (Flow 2 i edge o „resend through sign-in”) oraz tekst P-SCR4 w DS (LD13) |
| **L10** | [S] | Potwierdzenie zapisu nazwy | „Name saved”. | Zamknięta |
| **L11** | [S] | Link potwierdzający po przejęciu konta | Nieważny link: neutralny komunikat i przejście do logowania. | Do synchronizacji: spec Flow 2 mówi „use the most recent email” |
| **L12** | [S] | Treści maili | Propozycje zatwierdzone na potrzeby prototypu (sekcja 3a), data wygaśnięcia z konkretnego zaproszenia. Nie są szablonami produkcyjnymi. | Zamknięta dla prototypu. Produkcyjne szablony poza zakresem |
| **L13** | [X] | Kryteria w trackerze starsze niż spec | Prototyp odzwierciedla aktualną spec (hasło + Confirm, Accept). | Follow-up: synchronizacja kryteriów w Issues **#34, #35 i #36** ze spec (O1) |
| **L14** | [X] | Brief D14 vs spec (zaproszenie) | Operator uruchamia CLI, system generuje jednorazowy link przypisany do adresu i wysyła mail. CLI zgłasza błąd wysyłki, bez fałszywego sukcesu. | **Otwarta (technicznie):** stan zaproszenia po nieudanej wysyłce. Kontrakt CLI bez zmian bez osobnej decyzji (O2). Synchronizacja D14 w briefie |
| **L15** | [N] | Zaproszenie a konto z innym adresem | Akceptacja tylko kontem ze zweryfikowanym, zgodnym adresem. Bez automatycznego łączenia kont. Można poprosić o ponowne zaproszenie albo założyć osobne konto. | Zamknięta |
| **L16** | [S] | Widoczność, że nazwa jest publiczna | Po pierwszym logowaniu GitHubem jednorazowy `Notice`, że nazwa jest publiczna i zmienia się w Account settings. Także przy `returnTo`, bez nowego ekranu. Nie wraca po odświeżeniu ani kolejnym logowaniu w tej samej symulacji i nie dubluje się z `/account?welcome=1`. | Prototyp: `Notice` raz, bez dubla z `?welcome=1`, nie wraca (PO O5). Do synchronizacji: spec Flow 1 pkt 5. Mechanizm zapamiętywania przy implementacji |
| **L17** | [N] | Formularz tworzenia użytkownika w backendzie | Nie prototypujemy zawartości backendu. | Dokumentacja implementacyjna |
| **L18** | [X] | Nagłówek backendu | Nie prototypujemy backendu. | Dokumentacja implementacyjna |
| **L19** | [K] | #34-AC3 i #36-AC3 bez własnych stanów | Bez osobnych ekranów i komunikatów. Pokazują to scenariusze c02 i `/account`. | Zamknięta |
| **L20** | [N] | Cele spoza zakresu E01 | Bez zaślepek `/mentor` i slotu. Wymaganie `returnTo` zostaje, przepływy innych epików nie są prototypowane. | Zamknięta |
| **L21** | [S] | Techniczne błędy formularzy | Jeden wspólny wzorzec, bez duplikowania symulacji. | Zamknięta |
| **L22** | [S] | `/sign-up/check-email` bez parametru | Przekierowanie na `/sign-up`. | Zamknięta |

Podsumowanie statusów (22 luki):

| Status | Luki |
|---|---|
| Zamknięta, nic dalej | L02, L03, L05, L08, L10, L15, L19, L20, L21, L22 (10) |
| Zamknięta, wymaga późniejszej synchronizacji dokumentów | L01, L06, L07, L09, L11, L13, L16 (7) |
| Zamknięta jako dokumentacja implementacyjna | L17, L18 (2) |
| Zamknięta dla prototypu, otwarta przed wydaniem (Q13, treści produkcyjne) | L04, L12 (2) |
| Otwarta (technicznie) | L14 (1) |

### Otwarte kwestie i synchronizacje (lista zbiorcza)

| ID | Kwestia | Status | Blokuje prototyp? |
|---|---|---|---|
| O1 | Synchronizacja kryteriów (L13): poprawić kryteria w GitHub Issues **#34, #35 i #36** zgodnie z aktualną spec (#34-AC1 i AC4, #35-AC2, #36-AC1). Prototyp już odzwierciedla spec. | otwarty follow-up | nie |
| O2 | Stan zaproszenia po nieudanej wysyłce maila (L14). Spec (Flow 3 pkt 1) mówi dziś: skrót zostaje, CLI kończy się kodem niezerowym, operator uruchamia `resend`, surowy token nie jest przechowywany. Kontraktu CLI nie zmieniamy bez osobnej decyzji. Synchronizacja D14 w briefie. | otwarta kwestia techniczna | nie |
| O3 | Neutralne „We couldn't send the email. Please try again later.” w s03 i przy nieudanej ponownej wysyłce w s01. Logika i limity bez zmian. Follow-up: spec (Flow 2, edge SMTP) i tekst P-SCR4 w DS (LD13). | rozstrzygnięta dla prototypu | nie |
| O4 | Spec: dopisać zachowanie osoby zalogowanej na stronach logowania (L06) i komunikat wygasłej sesji (L07). | otwarty follow-up | nie |
| O5 | Jednorazowy `Notice` o publicznej nazwie: raz, także przy `returnTo`, bez dubla z `?welcome=1`, nie wraca. Mechanizm produkcyjnego zapamiętywania do ustalenia przy implementacji. Follow-up: spec Flow 1 pkt 5. | rozstrzygnięta dla prototypu | nie |
| O6 | Spec: zmienić tekst „use the most recent email” na neutralny (L11). | otwarty follow-up | nie |
| O7 | DS: story `Valid` zaproszenia wskazuje `/mentor`, decyzja L01 mówi `/` (LD07). | otwarty follow-up | nie |
| O8 | Link „Mentor setup” nie jest pokazywany w prototypie E01. Design system i zakres E02 bez zmian. | **zamknięta** (PO) | nie |
| O9 | Kontrolka c16 „otwórz adres” zatwierdzona, wyłącznie do symulowania kontroli dostępu do istniejącego `/backend`. | **zamknięta** (PO) | nie |
| O10 | Przed wydaniem: Q13 (adres operatora) i Q05 nadal otwarte w briefie. | otwarte, poza prototypem | nie |

Żadna kwestia nie blokuje prototypu.

## 5. Luki w design systemie

Design system ma zatwierdzony zakres tylko dla E01 (konta) i E02. Ekrany `screens/e01/` pokrywają s01–s06.

| ID | Co brakuje | Ekran / stan | Powiązanie | Status |
|---|---|---|---|---|
| **LD01** | Story dla `/` z komunikatem po przyjęciu zaproszenia (wzorca całej strony głównej już nie potrzebujemy) | s07 | L01, L02 | otwarta |
| **LD02** | Story dla neutralnego 404 z linkiem do `/` | s11 | L05 | otwarta |
| **LD03** | Ekran `/error` (bez tożsamości) | s12 | — | otwarta |
| **LD04** | Zaślepka backendu (bez stories). Pełne ekrany backendu poza prototypem | s08 (s09 poza prototypem) | L17, L18 | otwarta, zawężona |
| **LD05** | Stany strony potwierdzenia: 429 oraz wyścig „inna karta wygrała” | s04 | — | otwarta ([D] w prototypie) |
| **LD06** | Story dla banerów `github_failed`, `github_no_verified_email`, wyników ponownej wysyłki i baneru „sesja wygasła” | s01 | L07 | otwarta |
| **LD07** | Rozróżnienie błędów przyjęcia zaproszenia (403, 404, 409) i sukces po przyjęciu zgodny z L01 (`/`, nie `/mentor`) | s05, s07 | L01 | otwarta |
| **LD08** | Stan „Name saved” i stan „sesja wygasła” na koncie | s06 | L07, L10 | otwarta |
| **LD09** | Powłoka skrzynki pocztowej do pokazu maili (nie komponent produktu) | s13 | L12 | otwarta |
| **LD10** | Ekran symulacji GitHuba (nie komponent produktu) | s14 | — | otwarta |
| **LD11** | Story dla s03 bez parametru `email` | s03 | L22 | **zamknięta** decyzją L22 (przekierowanie, brak ekranu) |
| **LD12** | Story dla jednorazowego `Notice` o publicznej nazwie po pierwszym logowaniu (także wariant „nie wraca”) | s05, s06 | L16, O5 | otwarta |
| **LD13** | Tekst „not sent” (P-SCR4) i tekst nieudanej ponownej wysyłki w `SignInOptions` różnią się od neutralnego z L09 i O3. Prototyp używa neutralnego, DS bez zmian | s03, s01 | L09 | otwarta (synchronizacja DS, nie blokuje) |

## 6. Liczby

Liczby policzone skryptem z tabeli w sekcji 1 (tagi `[K]`, `[D]`, `[X]`).

- **Ekrany:** 14 (12 ekranów produktu: s01–s12; 2 tylko do prototypu: s13, s14). W prototypie Epiku 01: 12 (bez s09 i s10).
- **Stany łącznie:** 85.
- **Stany według sposobu obsługi:** 62 klikalnych [K], 15 udokumentowanych [D], 8 wyłączonych z prototypu [X] (s09: 5, s10: 3). Żadne wymaganie nie zostało usunięte.
- **Źródło stanów:** 22 z kryterium akceptacji #34–#36, 24 z decyzji PO (bez kryterium), 39 ze specyfikacji, briefu lub konwencji DS.
- **Scenariusze do przełączania:** 16 kontrolek (c01–c16), z czego 15 aktywnych i 1 wyłączona (c10).
- **Konta i tożsamości demo:** 13 (8 istniejących kont, 5 pozycji bez konta), 6 zaproszeń plus link podrobiony.
- **Luki w specyfikacji:** 22. Statusy: 10 zamkniętych bez dalszych kroków, 7 zamkniętych z późniejszą synchronizacją dokumentów, 2 zamknięte jako dokumentacja implementacyjna, 2 zamknięte dla prototypu z otwartym wydaniem (L04: Q13; L12: treści produkcyjne), 1 otwarta technicznie (L14). Tagi typów: K 2, S 11, X 4, N 7 (L01 i L05 mają po dwa tagi).
- **Luki w design systemie:** 13, z czego 12 otwartych i 1 zamknięta (LD11).
- **Otwarte kwestie zbiorcze:** 10 (O1–O10): 2 zamknięte (O8, O9), 2 rozstrzygnięte dla prototypu z follow-upem (O3, O5), 6 otwartych follow-upów (O1, O2, O4, O6, O7, O10). **Blokujących prototyp: 0.**

Zatrzymuję się przed ćwiczeniem 2a.
