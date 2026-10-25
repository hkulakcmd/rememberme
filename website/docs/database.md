# RememberMe — Database Schema

Status: accepted
Owner: Architect
Database: PostgreSQL 17
Last updated: 2026-10-25

## 1. Zasady

- **Klucze publiczne**: `users.id` i `birthdays.id` to UUID (brak enumeracji).
- **Czas**: `timestamptz` w UTC; strefa użytkownika w `users.timezone`.
- **Daty urodzin**: rozdzielone `birth_month` / `birth_day` / `birth_year` —
  rok opcjonalny, poprawne sortowanie i obsługa 29 lutego.
- **Usuwanie**: `ON DELETE CASCADE` dla danych zależnych od użytkownika.
- **Wyszukiwanie**: `pg_trgm` + indeks GIN na pełnym imieniu i nazwisku.
- **Idempotencja push**: unikalny klucz w `notification_log`.
- Wszystkie tabele Django (migracje, `django_migrations`, `auth_permission`,
  allauth `socialaccount_*`, SimpleJWT blacklist) tworzone przez migracje.

## 2. Diagram relacji

```
users 1───N birthdays
  │ 1───1 notification_preferences
  │ 1───N notification_lead_times
  │ 1───N push_subscriptions
  │ 1───N notification_log ───N──1 birthdays
  │ 1───N socialaccount (allauth)
```

## 3. DDL

### 3.1 Rozszerzenia

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- email bez rozróżniania wielkości
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- wyszukiwanie po nazwisku
```

### 3.2 users

```sql
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext NOT NULL UNIQUE,
    password      varchar(128) NOT NULL,           -- hash Argon2id
    first_name    varchar(150) NOT NULL DEFAULT '',
    last_name     varchar(150) NOT NULL DEFAULT '',
    timezone      varchar(64)  NOT NULL DEFAULT 'UTC',
    is_active     boolean      NOT NULL DEFAULT true,
    is_staff      boolean      NOT NULL DEFAULT false,
    is_superuser  boolean      NOT NULL DEFAULT false,
    date_joined   timestamptz  NOT NULL DEFAULT now(),
    last_login    timestamptz
);

CREATE INDEX users_email_idx ON users (lower(email));
```

Uwagi:
- `email` jest identyfikatorem logowania; normalizacja do lowercase w serwisie.
- `timezone` walidowana przez `zoneinfo` (lista IANA) w serializerze.
- Hasło nigdy nie jest zwracane przez API.

### 3.3 birthdays

```sql
CREATE TABLE birthdays (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    first_name   varchar(100) NOT NULL,
    last_name    varchar(100) NOT NULL DEFAULT '',
    birth_month  smallint NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
    birth_day    smallint NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
    birth_year   smallint CHECK (birth_year BETWEEN 1800 AND 2100),
    relationship varchar(50),
    notes        text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT birthdays_valid_day CHECK (
        NOT (birth_month IN (4, 6, 9, 11) AND birth_day = 31)
        AND NOT (birth_month = 2 AND birth_day > 29)
    )
);

CREATE INDEX birthdays_user_date_idx
    ON birthdays (user_id, birth_month, birth_day);

CREATE INDEX birthdays_search_idx
    ON birthdays USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
```

Uwagi:
- `relationship` — wolny tekst (krótka lista podpowiedzi w UI), brak tabeli słownikowej.
- `birth_year = NULL` → wiek nieznany; UI nie pokazuje wieku.
- Sortowanie „najbliższe” liczone względem bieżącej daty w strefie użytkownika.
- Limit: 5 000 urodzin na użytkownika (walidacja aplikacyjna, ochrona przed abuse).

### 3.4 notification_preferences

```sql
CREATE TABLE notification_preferences (
    user_id      uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    push_enabled boolean NOT NULL DEFAULT true,
    send_at_time time    NOT NULL DEFAULT '09:00',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
```

Rekord tworzony automatycznie przy rejestracji (sygnał/serwis).

### 3.5 notification_lead_times

```sql
CREATE TABLE notification_lead_times (
    id          bigserial PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    days_before smallint NOT NULL CHECK (days_before IN (0, 1, 3, 7)),
    UNIQUE (user_id, days_before)
);
```

Progi zgodne z `project.md`: 0 (w dniu), 1, 3, 7 dni. Domyślnie 0 i 1.

### 3.6 push_subscriptions

```sql
CREATE TABLE push_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint        text NOT NULL UNIQUE,
    p256dh          text NOT NULL,
    auth            text NOT NULL,
    user_agent      text,
    failure_count   integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_used_at    timestamptz,
    last_failure_at timestamptz
);

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);
```

`endpoint` jest globalnie unikalny — ta sama przeglądarka może przejść na inne
konto (upsert po `endpoint`, aktualizacja `user_id`). Subskrypcja usuwana po
`404/410` lub po 3 kolejnych błędach.

### 3.7 notification_log

```sql
CREATE TABLE notification_log (
    id            bigserial PRIMARY KEY,
    user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    birthday_id   uuid NOT NULL REFERENCES birthdays (id) ON DELETE CASCADE,
    days_before   smallint NOT NULL CHECK (days_before IN (0, 1, 3, 7)),
    target_year   smallint NOT NULL,
    status        varchar(16) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    scheduled_for timestamptz NOT NULL,
    sent_at       timestamptz,
    error         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (birthday_id, days_before, target_year)
);

CREATE INDEX notification_log_due_idx
    ON notification_log (status, scheduled_for);
```

`target_year` = rok wystąpienia urodzin (nie rok urodzenia). Unikalny klucz
gwarantuje dokładnie jedno powiadomienie na osobę, próg i rok — nawet przy
restarcie workera lub równoległym beatcie.

Retencja: wpisy starsze niż 2 lata usuwane zadaniem cyklicznym.

## 4. Reguły domenowe

| Reguła | Implementacja |
|---|---|
| 29 lutego w roku nieprzestępnym | Obsłużone 28 lutego (serwis, nie baza) |
| „Dzisiaj” | Data w `users.timezone`, nie UTC |
| Wiek | Tylko gdy `birth_year` znane i rok ≤ bieżący |
| Duplikat osoby | Dozwolony; UI ostrzega przy identycznym imieniu i dacie |
| Uprawnienia | Każde zapytanie filtrowane po `user_id` z tokenu |

## 5. Wydajność

- Zapytania dashboardu: jedno zapytanie z agregacją po `user_id`; indeks
  `birthdays_user_date_idx` pokrywa filtr i sortowanie.
- Wyszukiwanie: `ILIKE '%q%'` wsparte indeksem trigramowym (min. 3 znaki).
- `notification_log` rośnie liniowo z liczbą użytkowników × progów; przy > 10 mln
  wierszy partycjonowanie po `target_year` (bez zmian w API).
- Cache Redis: dashboard 60 s, `public-key` 1 h.

## 6. Migracje

Kolejność: `accounts` (custom User przed pierwszym `migrate`) → `birthdays` →
`notifications` → `dashboard` (brak modeli). Model `User` musi być ustawiony
jako `AUTH_USER_MODEL` **przed** pierwszą migracją.
