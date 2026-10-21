# Lekcja 06: materiały do ćwiczeń

Rozpakuj ten ZIP w katalogu głównym projektu, tak żeby powstał folder `lekcja-06`. Agenta uruchamiasz w katalogu głównym projektu. Wyniki ćwiczeń zapisujesz w tym samym folderze, więc zostaw go do końca zadania domowego.

Przed każdym ćwiczeniem zacznij nową rozmowę z agentem (w Claude Code wpisz `/clear`). Prompt z pliku kopiujesz w całości i wklejasz.

## Ćwiczenie 1: wykrywacz generycznego wyglądu

- `wykrywacz-strona-z-eksperymentu.txt`: prompt „Wykrywacz na stronie z eksperymentu”. Sprawdza `02-rekrutacja.html`, czyli stronę platformy rekrutacyjnej z eksperymentu. Niczego nie zmienia, oddaje raport.
- `wykrywacz-aplikacja-devmentor.txt`: prompt „Wykrywacz na aplikacji DevMentora”. Ten sam wykrywacz z blokiem „Co sprawdzasz” wypełnionym dla uruchomionej aplikacji DevMentora.
- `02-rekrutacja.html`: strona zbudowana przez agenta z jednego zdania polecenia, bez wskazówek o wyglądzie. Produkt, liczby, opinie i lista firm są zmyślone.
- Wynik: raport w rozmowie. Zapisz go poleceniem: „Zapisz ten raport do lekcja-06/audyt.md. Niczego poza tym plikiem nie zmieniaj.”

## Ćwiczenie 2: od referencji do tokenów

- `od-opinii-do-decyzji-devmentor.txt`: prompt „Od opinii do decyzji dla DevMentora”, czyli z kartami R01 (GitHub), R02 (Slack) i A01. Agent zadaje pytania, zanim cokolwiek zapisze. Każdą jego propozycję przyjmij albo odrzuć osobno.
- Wynik: `lekcja-06/referencje.md`.
- `od-decyzji-do-tokenow-devmentor.txt`: prompt „Od decyzji do tokenów dla DevMentora”. Wklejasz go w tej samej rozmowie. Agent pokazuje propozycję i czeka na zatwierdzenie.
- Wynik: `lekcja-06/tokeny.md`.

## Ćwiczenie 3: Storybook

- `storybook-devmentor.txt`: prompt „Storybook design systemu DevMentora”. Skopiuj go do `lekcja-06/prompt-storybook.md`. Potem w nowej rozmowie napisz: „Przeczytaj lekcja-06/prompt-storybook.md i wykonaj go od etapu 0.”
- Na lekcji robisz etap 0 (plan) i etap 1 (fundamenty). Etapy 2–5 to zadanie domowe.
- Wynik w DevMentorze: Storybook w `packages/ui/.storybook`, postęp w `packages/ui/POSTEP.md`.
- W każdej nowej sesji wklej: „Przeczytaj lekcja-06/prompt-storybook.md i POSTEP.md w katalogu design systemu. Kontynuuj od kroku, który POSTEP.md wskazuje jako następny. Zasady z promptu obowiązują dalej.”

## Test agentem

- `test-agentem-devmentor.txt`: prompt „Test agentem na DevMentorze”. Agent sam znajduje pliki design systemu w repozytorium, a pliki pełnego design systemu z nagrania (`align-tokens.css`, `foundations.css`, `Guidelines.mdx`) są w prompcie tylko przykładem. Na własnym projekcie podmień w bloku „Kontekst” ekran i ścieżki na swoje.
- Uruchamiasz go w zadaniu domowym, po etapie 5, w nowej rozmowie, a nie w tej, w której powstawała dokumentacja.

## Prompty do własnego produktu

Wersje do uzupełnienia są w lekcji 06, przy każdym ćwiczeniu.
