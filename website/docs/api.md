# RememberMe — API Specification v1

Status: accepted
Owner: Architect
Base URL: `/api/v1`
Auth: `Authorization: Bearer <access_token>`
Content-Type: `application/json`

## 1. Konwencje

### 1.1 Format odpowiedzi

Lista:

```json
{
  "data": [ ... ],
  "meta": { "count": 42, "page": 1, "page_size": 20, "total_pages": 3 }
}
```

Pojedynczy zasób: `{ "data": { ... } }`.
Sukces bez treści: `204 No Content`.

### 1.2 Błędy

```json
{
  "detail": "Human readable message",
  "code": "validation_error",
  "fields": { "birth_day": ["Day is out of range for month."] }
}
```

| HTTP | `code` | Kiedy |
|---|---|---|
| 400 | `validation_error` | Niepoprawne dane wejściowe |
| 401 | `not_authenticated` / `token_invalid` | Brak/wygasły token |
| 403 | `permission_denied` | Brak dostępu do zasobu |
| 404 | `not_found` | Zasób nie istnieje lub nie należy do użytkownika |
| 409 | `conflict` | Duplikat (np. email) |
| 429 | `throttled` | Przekroczony rate limit |
| 500 | `server_error` | Błąd nieoczekiwany (bez szczegółów) |

### 1.3 Zasady

- Wszystkie zasoby filtrowane po właścicielu; obcy `id` → `404`.
- Daty w API: `YYYY-MM-DD`; znaczniki czasu: ISO 8601 UTC.
- Limity: `page_size` 1–100 (default 20); teksty: imię 100, notatki 2000.
- Idempotencja: `POST /push/subscribe` używa upsert po `endpoint`.

## 2. Uwierzytelnianie

### POST /auth/register

```json
{ "email": "a@b.com", "password": "...", "first_name": "Anna", "last_name": "Kowalska", "timezone": "Europe/Warsaw" }
```

`201` → `{ "data": { "user": { ... } } }` + cookie refresh.
Błędy: `409 conflict` (email zajęty), `400 validation_error`.

### POST /auth/login

```json
{ "email": "a@b.com", "password": "..." }
```

`200`:

```json
{
  "data": {
    "access": "<jwt>",
    "user": {
      "id": "uuid", "email": "a@b.com", "first_name": "Anna",
      "last_name": "Kowalska", "timezone": "Europe/Warsaw",
      "auth_methods": ["password", "google"]
    }
  }
}
```

`Set-Cookie: refresh=...; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=604800`

### POST /auth/refresh

Bez body; czyta cookie `refresh`. `200` → nowy `access`, rotacja cookie.
`401 token_invalid` → frontend czyści stan i przekierowuje na login.

### POST /auth/logout

Blacklist bieżącego refresh + usunięcie cookie. `204`.

### POST /auth/logout-all

Blacklist wszystkich refreshy użytkownika. `204`.

### POST /auth/password/reset

`{ "email": "a@b.com" }` → zawsze `202` (brak enumeracji kont).

### POST /auth/password/reset/confirm

`{ "token": "...", "new_password": "..." }` → `200`; token jednorazowy, 1 h.

### POST /auth/social/{provider}

`provider` ∈ `google` | `facebook`.

```json
{ "access_token": "<provider token>" }
```

`200` → jak login. `400` przy niezweryfikowanym emailu lub konflikcie konta
wymagającym potwierdzenia.

## 3. Profil

### GET /me

```json
{
  "data": {
    "id": "uuid", "email": "a@b.com", "first_name": "Anna",
    "last_name": "Kowalska", "timezone": "Europe/Warsaw",
    "auth_methods": ["password", "google"],
    "created_at": "2026-10-25T12:00:00Z"
  }
}
```

### PATCH /me

Dozwolone: `first_name`, `last_name`, `timezone`. Zmiana emaila poza zakresem v1.
`200` → zaktualizowany profil.

### DELETE /me

`{ "password": "..." }` (lub potwierdzenie OAuth). `204`; kaskadowe usunięcie
danych, anulowanie subskrypcji push.

## 4. Urodziny

### GET /birthdays

Query: `search` (imię/nazwisko, min. 3 znaki), `ordering`
(`first_name|-first_name|date|created_at`), `page`, `page_size`.

```json
{
  "data": [
    {
      "id": "uuid", "first_name": "Anna", "last_name": "Kowalska",
      "birth_month": 4, "birth_day": 12, "birth_year": 1990,
      "relationship": "sister", "notes": "",
      "next_occurrence": "2027-04-12", "days_until": 169,
      "age": 36, "created_at": "...", "updated_at": "..."
    }
  ],
  "meta": { "count": 1, "page": 1, "page_size": 20, "total_pages": 1 }
}
```

### POST /birthdays

```json
{ "first_name": "Anna", "last_name": "Kowalska", "birth_month": 4, "birth_day": 12, "birth_year": 1990, "relationship": "sister", "notes": "" }
```

Wymagane: `first_name`, `birth_month`, `birth_day`. `201` → zasób.
Flow UI: imię → data → zapisz (bez pól opcjonalnych na pierwszym ekranie).

### GET /birthdays/{id}

`200` → zasób; `404` gdy nie należy do użytkownika.

### PATCH /birthdays/{id}

Częściowa aktualizacja dowolnego pola edytowalnego. `200` → zasób.

### DELETE /birthdays/{id}

`204`. Kaskadowo usuwa wpisy `notification_log`, ale **nie** historię wysłanych
powiadomień w logach systemowych.

### GET /birthdays/search?q=

Alias zoptymalizowany pod autouzupełnianie; zwraca max 10 wyników
`{ id, full_name, birth_month, birth_day }`, min. 2 znaki.

## 5. Dashboard

### GET /dashboard

```json
{
  "data": {
    "today": [ { "id": "uuid", "full_name": "Jan", "age": 30 } ],
    "upcoming_30d": [ { "id": "uuid", "full_name": "Anna", "in_days": 3, "date": "2026-10-28" } ],
    "next": { "id": "uuid", "full_name": "Anna", "in_days": 3, "date": "2026-10-28" },
    "total": 42
  }
}
```

Cache 60 s per użytkownik; unieważniany po zapisie urodzin. Zakres „30 dni”
liczony w strefie użytkownika.

## 6. Preferencje powiadomień

### GET /notification-preferences

```json
{
  "data": {
    "push_enabled": true,
    "send_at_time": "09:00",
    "lead_times": [0, 1, 3]
  }
}
```

### PATCH /notification-preferences

`{ "push_enabled": true, "send_at_time": "08:30", "lead_times": [0, 1, 7] }`
`lead_times` ⊆ {0, 1, 3, 7}, unikalne, max 4. `200` → zaktualizowane.

## 7. Push

### GET /push/public-key

`200` → `{ "data": { "public_key": "<VAPID public key>" } }` (cache 1 h).

### POST /push/subscribe

```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "user_agent": "Mozilla/5.0 ..."
}
```

`201` (nowa) / `200` (istniejąca, upsert). `400 validation_error` przy
niepoprawnym kluczu.

### DELETE /push/subscribe

`{ "endpoint": "..." }` → `204`. Wymagane przy wylogowaniu na urządzeniu
współdzielonym.

### POST /push/test

Wysyła powiadomienie testowe do wszystkich subskrypcji użytkownika.
`202` → `{ "data": { "queued": 2 } }`; limit 3/h.

## 8. Rate limiting

| Zakres | Limit |
|---|---|
| `POST /auth/login`, `/auth/register`, `/auth/password/reset` | 10/min/IP |
| `POST /auth/refresh` | 30/min/IP |
| `GET /birthdays/search` | 60/min/user |
| `POST /push/test` | 3/h/user |
| Pozostałe (zalogowani) | 120/min/user |
| Pozostałe (anonimowi) | 20/min/IP |

`429` z nagłówkiem `Retry-After`.

## 9. Wersjonowanie i kompatybilność

- Nowe pola odpowiedzi są addytywne (bez breaking changes w v1).
- Usunięcie/zmiana znaczenia pola → `/api/v2`.
- Deprecjacja ogłaszana nagłówkiem `Deprecation` i min. 90 dni wsparcia.

## 10. Poza zakresem v1

- Zmiana adresu email.
- Eksport/import danych (CSV).
- Powiadomienia email i SMS.
- Współdzielenie list urodzin między użytkownikami.
- Publiczne API i klucze API dla third-party.
