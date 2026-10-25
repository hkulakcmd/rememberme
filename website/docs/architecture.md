# RememberMe — Architecture Overview

Status: accepted
Owner: Architect
Last updated: 2026-10-25

## 1. Cel i zakres

RememberMe to aplikacja webowa (PWA) przypominająca o urodzinach bliskich.
Zakres architektury: komponenty systemu, komunikacja frontend↔backend, model danych,
kontrakt API, struktura katalogów, roadmapa.

Poza zakresem: implementacja funkcji, strategia deploymentu (DevOps), review kodu.

Wymagania źródłowe: `agentmd/project.md`.

## 2. Stack

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| Frontend | Next.js (App Router), JavaScript, Tailwind CSS | SSR dla dashboardu, PWA, mobile-first, szybki TTFB |
| Backend | Python 3.12, Django 5, Django REST Framework | Dojrzały ekosystem auth, admin, ORM |
| Baza | PostgreSQL 17 | Relacyjne dane, `pg_trgm`, pełna zgodność z Django |
| Kolejka | Celery + Redis | Harmonogram powiadomień, retry, skalowanie workerów |
| Push | Web Push (VAPID) + Service Worker | Web i PWA bez zewnętrznego dostawcy |
| Auth | SimpleJWT + django-allauth + dj-rest-auth | JWT + Google/Facebook OAuth |
| Hosting | OVHcloud VPS | Decyzja DevOps, poza zakresem tego dokumentu |

## 3. Widok komponentów

```
┌──────────────────────────────────────────────────────────┐
│ Browser / PWA                                            │
│  Next.js App Router (SSR + client components)            │
│  Service Worker (Serwist) ── Web Push ──┐                │
└───────────────┬──────────────────────────┼───────────────┘
                │ same-origin /api/*       │
                │ (Next rewrites → Django) │
┌───────────────▼──────────────────────────┼───────────────┐
│ Next.js server (node)                    │               │
└───────────────┬──────────────────────────┼───────────────┘
                │ HTTP, JSON, JWT Bearer   │
┌───────────────▼──────────────────────────┼───────────────┐
│ Django + DRF  /api/v1                    │               │
│  apps: accounts, birthdays, dashboard,   │               │
│        notifications                     │               │
└───┬───────────────────┬──────────────────┼───────────────┘
    │                   │                  │
┌───▼─────┐      ┌──────▼──────┐    ┌──────▼──────────────┐
│PostgreSQL│      │Redis (broker│    │Celery worker + beat │
│  app DB  │      │  + cache)   │    │ push dispatch       │
└──────────┘      └─────────────┘    └──────┬──────────────┘
                                             │ VAPID
                                      Web Push service
                                    (FCM / Mozilla / Apple)
```

## 4. Komunikacja frontend ↔ backend

- **Same-origin**: przeglądarka woła `/api/v1/...`; Next.js `rewrites` przekazuje
  ruch do Django. Eliminuje CORS, upraszcza cookies i CSRF.
- **Kontrakt**: REST + JSON, wersjonowany prefiksem `/api/v1`. Specyfikacja:
  `api.md`.
- **Błędy**: jednolity format `{ "detail", "code", "fields" }`.
- **SSR**: serwer Next.js pobiera dane z Django tym samym kontraktem; refresh
  cookie jest przekazywane dalej, dostęp odświeżany po stronie serwera.

## 5. Uwierzytelnianie

### 5.1 Email + hasło

1. `POST /api/v1/auth/register` → utworzenie konta, hasło hashowane
   (Argon2, fallback PBKDF2).
2. `POST /api/v1/auth/login` → `{ access, user }`; `refresh` ustawiany jako
   cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`.
3. Access token (15 min) trzymany **w pamięci** procesu JS — nigdy w
   `localStorage`.
4. `POST /api/v1/auth/refresh` → nowy access + rotacja refresh (stary trafia do
   blacklisty SimpleJWT).
5. `POST /api/v1/auth/logout` → blacklist refresh + usunięcie cookie.

### 5.2 OAuth (Google, Facebook)

- Frontend używa Google Identity Services / Facebook JS SDK i otrzymuje
  `access_token` dostawcy.
- `POST /api/v1/auth/social/{provider}` z `{ access_token }` → allauth weryfikuje
  token, tworzy/łączy konto, zwraca tę samą parę tokenów co login.
- Konta łączone po zweryfikowanym emailu. Użytkownik może mieć wiele metod
  logowania (email + Google + Facebook).
- Instagram: poza zakresem do czasu zatwierdzenia przez Meta; model allauth
  pozwala dodać providera bez zmian schematu.

### 5.3 Reset hasła i sesje

- Reset: token jednorazowy Django, ważny 1 h, link przez email (backend
  transakcyjny wybiera DevOps).
- Sesje: bezstanowe JWT; unieważnienie przez blacklistę refresh tokenów.
  Wylogowanie „ze wszystkich urządzeń” = blacklist wszystkich refreshy użytkownika.
- Ochrona logowania: `django-axes` (blokada po 5 nieudanych próbach) + DRF
  throttling.

## 6. Powiadomienia push

1. Frontend rejestruje Service Worker i pobiera klucz publiczny VAPID
   (`GET /api/v1/push/public-key`).
2. Po zgodzie użytkownika `PushManager.subscribe()` → subskrypcja wysyłana do
   `POST /api/v1/push/subscribe` (endpoint, `p256dh`, `auth`).
3. **Celery Beat co 15 minut** uruchamia `dispatch_due_reminders`:
   - dla każdego użytkownika z `push_enabled` wylicza dzisiejszą datę w jego
     strefie czasowej,
   - sprawdza progi z `notification_lead_times` (0/1/3/7 dni),
   - tworzy/weryfikuje wpis w `notification_log` (klucz idempotencji),
   - wysyła push przez `pywebpush`.
4. Wysyłka planowana na `notification_preferences.send_at_time` (domyślnie
   09:00 czasu użytkownika); beat uruchamia się częściej, ale zadanie pomija
   przypomnienia jeszcze nie należne.
5. Subskrypcje wygasłe (`404/410`) są usuwane; błędy przejściowe → retry z
   backoffem (max 3).
6. 29 lutego: w latach nieprzestępnych przypomnienie obsługiwane 28 lutego
   (reguła w warstwie domenowej, nie w bazie).

Ograniczenia platformowe: iOS wymaga instalacji PWA (iOS 16.4+) i zgody
użytkownika; brak wsparcia = fallback na powiadomienia w aplikacji.

## 7. Dashboard

`GET /api/v1/dashboard` zwraca jedną agregację, aby uniknąć wielu round-tripów:

- `today[]` — urodziny dzisiaj,
- `upcoming_30d[]` — kolejne 30 dni (z zawijaniem roku),
- `next` — najbliższe urodziny,
- `total` — liczba zapisanych osób.

Obliczenia w PostgreSQL (funkcja dat) lub w serwisie Django; cache Redis 60 s
per użytkownik, unieważniany przy zapisie urodzin.

## 8. Bezpieczeństwo

- Hasła: Argon2id, walidatory siły hasła Django.
- JWT: krótki access, rotowany refresh, blacklist, `jti`.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF dla żądań zmieniających
  stan, jeśli uwierzytelnianie opiera się na cookie.
- Walidacja wejścia: serializery DRF + limity długości pól.
- Rate limiting: anonimowi 20/min, zalogowani 120/min, auth 10/min.
- Sekrety wyłącznie w zmiennych środowiskowych; `.env` poza repozytorium.
- Nagłówki bezpieczeństwa: HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  CSP ustawiane w Next.js.
- Logi bez danych osobowych; `notes` i treść push nie trafiają do logów.

## 9. Skalowalność

- Backend bezstanowy → poziome skalowanie za load balancerem.
- PostgreSQL: indeksy per użytkownik, `pg_trgm` dla wyszukiwania; przy wzroście
  partycjonowanie `notification_log` po `target_year`.
- Celery: osobne kolejki `default` i `push`; beat jako pojedyncza instancja.
- Frontend: ISR/SSR na VPS; statyczne assety z CDN.
- Rozszerzenia bez zmian schematu: nowe kanały (email), nowi providerzy OAuth,
  przyszła aplikacja mobilna korzystająca z tego samego API.

## 10. Struktura katalogów

```
website/
├── backend/
│   ├── config/
│   │   ├── settings/          # base.py, dev.py, prod.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py / asgi.py
│   ├── apps/
│   │   ├── accounts/          # User, auth, OAuth, profil
│   │   ├── birthdays/         # Birthday, CRUD, search
│   │   ├── dashboard/         # agregacje
│   │   └── notifications/     # preferencje, subskrypcje, taski
│   ├── requirements/          # base.txt, dev.txt, prod.txt
│   └── manage.py
├── frontend/
│   ├── app/
│   │   ├── (auth)/login, register, password-reset
│   │   ├── (app)/dashboard, birthdays, settings
│   │   └── layout.js, page.js
│   ├── components/            # ui/, birthdays/, layout/
│   ├── lib/                   # api.js, auth.js, dates.js, push.js
│   ├── public/                # manifest.webmanifest, ikony, sw
│   └── next.config.js         # rewrites /api → Django
└── docs/                      # architecture, database, api, roadmap
```

Zasady: logika domenowa w `apps/*/services.py`, brak logiki w serializerach poza
walidacją; komponenty frontendu bez bezpośrednich `fetch` (tylko `lib/api.js`).

## 11. Decyzje architektoniczne (ADR skrót)

| ID | Decyzja | Uzasadnienie |
|---|---|---|
| AD-01 | Django + DRF zamiast FastAPI | Spójne z `project.md` i `architect.md`; allauth, admin, ORM |
| AD-02 | Same-origin przez Next rewrites | Brak CORS, bezpieczniejsze cookies, prostszy CSRF |
| AD-03 | Refresh w HttpOnly cookie, access w pamięci | Odporność na XSS; JWT pozostaje bezstanowy |
| AD-04 | Rok urodzenia opcjonalny, data jako m/c/d | Użytkownicy często nie znają roku; poprawne 29 lutego |
| AD-05 | OAuth przez token z JS SDK | Prostsze dla SPA/PWA niż redirect flow |
| AD-06 | Celery + Redis | Retry, idempotencja, skalowanie; cron niewystarczający |
| AD-07 | `notification_log` z unikalnym kluczem | Dokładnie jedno powiadomienie na próg i rok |
| AD-08 | Serwist zamiast next-pwa | Aktywnie utrzymywany, wsparcie App Router |
| AD-09 | Tailwind CSS | Spójne tokeny designu, szybkie, mobile-first |

## 12. Ryzyka

| Ryzyko | Wpływ | Mitygacja |
|---|---|---|
| Ograniczenia push na iOS | Brak powiadomień | Wymóg instalacji PWA, komunikat w UI, fallback in-app |
| Facebook Login wymaga app review | Brak logowania FB | Google + email na start; FB po zatwierdzeniu |
| Strefy czasowe i DST | Błędny dzień wysyłki | Przeliczanie w `zoneinfo` per użytkownik, testy DST |
| Duplikaty push przy restarcie workera | Spam | Unikalny klucz w `notification_log`, transakcja |
| Wyciek refresh cookie | Przejęcie sesji | `HttpOnly`, rotacja, blacklist, krótki access |
