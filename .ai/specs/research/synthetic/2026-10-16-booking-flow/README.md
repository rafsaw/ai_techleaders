# Symulacja syntetycznych użytkowników: przepływ rezerwacji (M01L04, krok 4)

Wynik ćwiczenia z lekcji 04 (16.10.2026), skill `om-synthetic-users`.

**Uwaga o wsadzie:** symulacja działała na SKRÓCONYM briefie demonstracyjnym
z zestawu kursu (`lekcja-04-syntetyczni-uzytkownicy.zip`), nie na briefie tego
repo. Demo-brief pomija m.in. płatności i notatkę po sesji. Część hipotez jest
więc już rozstrzygnięta w naszym briefie (np. widoczność ceny: R04, faktury
pracodawcy: D07).

- Parametry: `--flow "Future state, booking and session (1.0), decided steps"
  --stance adversary --panel 2 --runs 1 --hold-out .../2026-09-01-interview-backend-dev-fintech.md`
- Wszystkie pozycje mają status [SYNTHETIC] / Seen once: hipotezy, nie fakty.
- `proposed-brief-additions.md`: 6 hipotez (H-A–H-F), 5 luk w przepływie,
  5 pytań otwartych. Do briefu wyłącznie przez `om-discover --refresh`
  po decyzji product ownera.
- Najistotniejszy temat: próg 2h rezerwacji vs pilna potrzeba (dotyczy D03/D22);
  do sprawdzenia wywiadem o ostatniej pilnej blokadzie (A04).
