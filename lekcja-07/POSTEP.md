# Lekcja 07: dziennik postępu

Ostatnia aktualizacja: 2026-10-27. Zapisane są tylko wyniki potwierdzone w repozytorium (artefakty, logi, dzienniki uruchomień); co nie zostało sprawdzone, jest wprost wskazane.

## Stan ćwiczeń

| Ćwiczenie | Stan | Uwagi |
|---|---|---|
| 1. Mapa ekranów Epiku 01 | **Ukończone i zatwierdzone 2026-10-24** | `lekcja-07/mapa-ekranow.md` |
| 2a. Szary prototyp dołączania mentora | **Ukończone** (`revision-001`, `revision-002`) | `.ai/prototypes/discovery/mentor-onboarding/`; podgląd w Storybooku nie jest śledzony w repozytorium (katalog ignorowany) |
| 2b. Klikalny prototyp Epiku 01 z design systemu | **Etapy 0–3 wykonane** | `prototypes/konta-i-role/`; szczegóły w jego `POSTEP.md` |
| 3. Persony przechodzą prototyp (opcjonalne) | **Wykonane, wyniki syntetyczne** | `.ai/specs/research/walkthroughs/2026-10-27-mentor-onboarding-session-001/` |
| Aktualizacja specyfikacji | **Wykonana 2026-10-27** | Dziennik: `.ai/runs/2026-10-27-screen-map-decisions-to-specs.md` |
| Odświeżenie briefu o hipotezy syntetyczne | **Wykonane 2026-10-27** | Dziennik: `.ai/runs/2026-10-27-discover-refresh-synthetic-hypotheses.md` |
| Test z prawdziwą osobą | **POMINIĘTY** | Nikt spoza zespołu nie przeszedł żadnego prototypu; brak kontaktu z listą 50 nazwisk, projekt jest ćwiczeniem kursowym; decyzja PO |

## Ważne ograniczenia (bez zmian)

- **Test z prawdziwą osobą pominięto.** Żadne ustalenie nie ma potwierdzenia u prawdziwego użytkownika.
- **Wyniki person są hipotezami `[SYNTHETIC]`, nie dowodami** i nie spełniają Definition of Ready. Panel: dwie notatki z wywiadów, dwa głosy usłyszane dwa razy; saturacji nie osiągnięto; zgodność z notatką kontrolną 4 z 10 tematów (górna granica, bo główny agent czytał notatkę przy składaniu panelu). Hipotezy H01–H06 w briefie pozostają do sprawdzenia; A04 pozostaje nieprzetestowane, D05 bez zmian.
- Prototypy to symulacje z fikcyjnymi danymi: nie dowodzą popytu ani gotowości produkcyjnej.

## Ćwiczenie 2a: szary prototyp dołączania mentora

- **Artefakty:** `.ai/prototypes/discovery/mentor-onboarding/revision-001/` (zachowana bez zmian) i `revision-002/` (dodany wskaźnik postępu, 7 etapów).
- **Weryfikacja `revision-002` (2026-10-25, `agent-browser`):** 5 przejść skryptowych, 102 asercje, 0 błędów; log `evidence/browser-walk.log`. Ten wynik jest historyczny i dotyczy stanu pliku `index.html` z tamtego dnia.
- **Poprawka 001 (2026-10-27, po raporcie person):** raport person (znalezisko 2) wskazał sprzeczne komunikaty: baner „Stripe is checking your details” zostawał obok „You are bookable.” / „Payouts confirmed” oraz obok „Blocked”. Błąd odtworzono na niezmienionym pliku (3 asercje czerwone), poprawiono wyłącznie prezentację (usunięcie banera po otrzymaniu wyniku sprawdzenia) i sprawdzono przejścia checking → bookable oraz checking → niepowodzenie (blokada): 10 kontroli, wszystkie zielone (Playwright, Chromium). Nie zmieniono D05, definicji bookable, Ready ani kolejności Stripe/Slots. Opis i dowody: `revision-002/fix-001-stripe-status.md`. **Nie** rerunowano historycznych 102 asercji (skrypt `agent-browser` nie jest w repozytorium; żadna z nich nie dotyczy tego banera).
- **Raport person** (`report.md`) pozostaje zapisem historycznym i nie był edytowany: nadal opisuje defekt tak, jak go zaobserwowano.

## Ćwiczenie 2b: klikalny prototyp Epiku 01

- **Artefakt:** `prototypes/konta-i-role/` (Vite + React 19 + Tailwind v4, komponenty `@devmentor/ui`).
- **Zapis historyczny (z `prototypes/konta-i-role/POSTEP.md`, 2026-10-25):** etapy 0–3; 82 testy Vitest; przejścia Playwright (Chromium): axe-core na 25 stanach × 320/1440 px × 2 motywy (100 przebiegów, 0 naruszeń), 84 kliknięcia, kontrola klawiatury. Skrypty Playwright nie są w repozytorium.
- **Potwierdzone ponownie 2026-10-27:** `npx vitest run` w `prototypes/konta-i-role`: 3 pliki, 82 testy, wszystkie przechodzą. Tabela statusów w tamtym `POSTEP.md` była niespójna z opisem wykonanych Etapów 2 i 3 (etap 2 jako „czeka na dalej”, etap 3 jako „nierozpoczęty”); 2026-10-27 ujednolicono ją z opisem etapów, bez zmiany ograniczeń.
- **Ograniczenia:** tylko Chromium, brak czytnika ekranu, brak Escape dla menu, panel komentarzy silnika nieaudytowany; testy poza bramką pokrycia repozytorium.

## Ćwiczenie 3: persony (syntetyczne)

- 2 przebiegi × 2 persony na `revision-002`, 21 zrzutów stanów, transkrypty w folderze sesji; `personas.md` i `calibration.md` w `.ai/specs/research/`.
- Wszystkie ustalenia oznaczone `[SYNTHETIC]`. Pominięte: ścieżki alternatywne (rejestracja e-mailem, zły adres, nieprawidłowy link, wąski ekran) i strona publiczna mentora z perspektywy mentee.

## Aktualizacja specyfikacji (2026-10-27)

- Zmienione tylko `2026-10-17-accounts-and-roles.md` (kryteria SM-AC…, pytania `[SYNTHETIC]`) i `2026-10-18-mentor-setup.md` (otwarte pytania, defekt banera Stripe zapisany jako obserwacja prototypu, nie hipoteza person). Decyzje PO: AC15, AC16, AC17 odrzucone; pozostałe zgodnie z dziennikiem uruchomienia. Brak zmian w kodzie produktu.

## Ćwiczenie 1: mapa ekranów Epiku 01 (zapis historyczny)

- **Artefakt:** `lekcja-07/mapa-ekranow.md` (status w nagłówku: „Zatwierdzona — 2026-10-24”).
- **Zakres:** 12 ekranów prototypu (s01–s12). Mapa zawiera łącznie 14 ekranów, bo s13 (skrzynka demo) i s14 (symulowany GitHub) są elementami prototypu.
- **Stany:** 85, z czego 62 klikalne, 15 udokumentowanych i 8 wyłączonych z prototypu (s09, s10). Podział: sekcja 1 i sekcja 6 mapy.
- **Decyzje PO:** zapisane w mapie, sekcja 4 (kolumna „Decyzja PO”, luki L01–L22) i sekcja 4, lista zbiorcza (O3, O5, O8, O9). Treści maili zatwierdzone na potrzeby prototypu: sekcja 3a.
- **Nieblokujące follow-upy:** sekcja 4, lista zbiorcza (O1, O2, O4, O6, O7, O10 oraz synchronizacje przy O3 i O5). Luki w design systemie: sekcja 5.
- Nic nie blokuje prototypu.

## Następny krok

1. Oczekiwanie na przegląd i scalenie PR #54 (nie scalać bez zgody PO).
2. Opcjonalnie: prawdziwe sprawdzenie z mentorami (H01, A04); nieplanowane i bez terminu.
3. Poprawka kontrolki c03 w mapie i prototypie (zapisana jako follow-up w specyfikacji Epiku 01).
