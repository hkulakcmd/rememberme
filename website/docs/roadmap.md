# RememberMe — Implementation Roadmap

Status: accepted
Owner: Architect
Last updated: 2026-10-25

## Zasady

- Każda faza kończy się działającym, przetestowanym przyrostem.
- Kontrakt API (`api.md`) jest zamrożony przed startem faz 1–4; zmiany wymagają
  aktualizacji dokumentu i wpisu w `memories`.
- Backend i frontend mogą iść równolegle po fazie 0.
- Definition of Done: testy przechodzą, brak krytycznych findings z review,
  dokumentacja zaktualizowana, wpis w `tasks` i `memories`.

## Faza 0 — Architektura i pamięć agentów

**Agenci:** Architect
**Zakres:**
- `website/docs/architecture.md`, `database.md`, `api.md`, `roadmap.md`
- schemat bazy pamięci agentów (`projects`, `tasks`, `memories`)
- seed projektu `RememberMe`, zapis decyzji architektonicznych

**Done:** dokumenty zaakceptowane, tabele pamięci istnieją, decyzje zapisane.

## Faza 1 — Fundament backendu

**Agenci:** BackDev
**Zakres:**
- projekt Django + DRF, settings `base/dev/prod`, 12-factor (`django-environ`)
- custom `User` (UUID, email jako login), Argon2
- SimpleJWT: access 15 min, refresh 7 dni, rotacja, blacklist
- rejestracja, login, refresh, logout, reset hasła
- throttling, `django-axes`, nagłówki bezpieczeństwa
- testy: rejestracja, login, refresh, blacklist, walidacja haseł

**Done:** `pytest` zielony, endpointy auth zgodne z `api.md`, brak sekretów w repo.
**Blokuje:** fazę 2 i 3.

## Faza 2 — Urodziny i dashboard API

**Agenci:** BackDev
**Zakres:**
- model `Birthday` + migracje (m/c/d, rok opcjonalny, constrainty)
- CRUD + wyszukiwanie trigramowe + sortowanie
- `GET /dashboard` z cache Redis 60 s i inwalidacją
- logika 29 lutego i stref czasowych
- testy: CRUD izolacja per user, wyszukiwanie, „najbliższe” przez przełom roku

**Done:** wszystkie endpointy z sekcji 4–5 `api.md`, pokrycie testami ≥ 85%.
**Może iść równolegle:** faza 3.

## Faza 3 — Fundament frontendu

**Agenci:** FrontDev
**Zakres:**
- Next.js App Router, JavaScript, Tailwind, design tokens
- klient API (`lib/api.js`) z auto-refresh i kolejką żądań
- layout, nawigacja mobile-first, dostępność (focus, kontrast, aria)
- ekrany: rejestracja, logowanie, reset hasła, Google/Facebook
- ochrona tras (middleware + stan auth)

**Done:** pełny flow auth działa na desktopie i mobile; brak `fetch` poza `lib/`.
**Może iść równolegle:** faza 2.

## Faza 4 — UI urodzin, dashboard, profil

**Agenci:** FrontDev
**Zakres:**
- lista + wyszukiwanie + sortowanie
- formularz „imię → data → zapisz” (pola opcjonalne zwinięte)
- edycja/usuwanie z potwierdzeniem
- dashboard: dzisiaj, 30 dni, następne, licznik
- profil: dane, strefa czasowa, preferencje powiadomień

**Done:** success criteria 1, 3, 5 z `project.md`; Lighthouse mobile ≥ 90
(Performance/Accessibility).

## Faza 5 — PWA i powiadomienia push

**Agenci:** BackDev + FrontDev
**Zakres backend:**
- Celery + Redis, kolejki `default`/`push`, beat co 15 min
- VAPID, `pywebpush`, subskrypcje, retry z backoffem, czyszczenie 404/410
- `notification_log` z idempotencją, `POST /push/test`
- testy: strefy czasowe, DST, 29 lutego, brak duplikatów przy równoległym beatcie

**Zakres frontend:**
- manifest, ikony, Serwist, ekran „Zainstaluj aplikację”
- rejestracja SW, zgoda na push, obsługa `pushsubscriptionchange`
- ustawienia progów 0/1/3/7 i godziny wysyłki

**Done:** push dociera na Chrome/Android i zainstalowanej PWA na iOS 16.4+;
success criterion 4.

## Faza 6 — Security i review

**Agenci:** Security, Reviewer
**Zakres:**
- OWASP ASVS level 1: auth, sesje, walidacja, nagłówki, rate limiting
- testy penetracyjne IDOR (dostępy do cudzych `birthdays`), XSS w `notes`
- weryfikacja sekretów, CSP, cookies, CORS/CSRF
- code review zgodności z `architecture.md`
- raport findings + priorytety

**Done:** brak otwartych krytycznych/wysokich; średnie zaplanowane w `tasks`.

## Faza 7 — Deployment (OVHcloud)

**Agenci:** DevOps
**Zakres:**
- VPS, reverse proxy, TLS, backup PostgreSQL, monitoring, logi
- CI/CD z GitHub Actions, migracje, sekrety, rollback
- health checks, alerty o błędach Celery

**Done:** produkcja pod domeną, backup przetestowany, monitoring aktywny.
**Uwaga:** strategia deploymentu nie jest częścią architektury.

## Zależności

```
Faza 0 ──► Faza 1 ──► Faza 2 ──┐
        └─► Faza 3 ──► Faza 4 ──┴─► Faza 5 ──► Faza 6 ──► Faza 7
```

## Kryteria sukcesu (mapowanie `project.md`)

| # | Kryterium | Faza |
|---|---|---|
| 1 | Rejestracja konta | 1, 3 |
| 2 | Logowanie Google/Facebook | 1, 3 |
| 3 | Szybkie dodawanie urodzin | 2, 4 |
| 4 | Powiadomienia push | 5 |
| 5 | Dashboard z najbliższymi urodzinami | 2, 4 |
| 6 | Komfort na desktopie i mobile | 3, 4 |

## Ryzyka harmonogramu

- Facebook Login (app review) może opóźnić kryterium 2 — Google i email
  dostarczane wcześniej.
- iOS push wymaga instalacji PWA — przewidziane w fazie 5, wymaga testu na
  fizycznym urządzeniu.
- Zmiany kontraktu API po fazie 3 wymagają synchronizacji obu zespołów.
