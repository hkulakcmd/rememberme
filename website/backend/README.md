# RememberMe — Backend

Django 5.2 + Django REST Framework API for RememberMe. Contract:
[`../docs/api.md`](../docs/api.md). Architecture and schema decisions:
[`../docs/architecture.md`](../docs/architecture.md),
[`../docs/database.md`](../docs/database.md).

## Stack

- Python 3.12, Django 5.2, DRF
- PostgreSQL 17 (`citext`, `pg_trgm`)
- SimpleJWT (15 min access, 7-day rotating refresh in an HttpOnly cookie)
- django-allauth (Google/Facebook token verification), django-axes
- Celery + Redis + VAPID/`pywebpush` (reminders every 15 minutes)
- pytest / pytest-django / ruff

## Local setup

PostgreSQL is the agent-memory stack in [`../../db/docker-compose.yml`](../../db/docker-compose.yml).
Create a dedicated role and database once:

```bash
docker exec -i postgres psql -U agent -d postgres <<'SQL'
CREATE ROLE rememberme LOGIN CREATEDB PASSWORD 'change-me';
CREATE DATABASE rememberme OWNER rememberme;
SQL
```

Then:

```bash
cd website/backend
cp .env.example .env
# set DJANGO_SECRET_KEY and DATABASE_URL (password from above)
docker compose build
docker compose up -d          # backend :8000 + redis :6379
docker compose run --rm backend python manage.py migrate
```

The dev server is available at `http://localhost:8000`. The Next.js frontend
proxies `/api/v1/*` to it, so browser requests stay same-origin.

### Environment variables

All secrets live in `.env` (git-ignored). Required: `DJANGO_SECRET_KEY`,
`DATABASE_URL`. OAuth and push keys are optional in development:

```bash
python -c "from py_vapid import Vapid; Vapid().generate_keys()"
```

`GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`, `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, SMTP settings (`EMAIL_*`).

## Tests and quality

```bash
docker compose run --rm backend pytest
docker compose run --rm backend pytest --cov=apps --cov-report=term-missing
docker compose run --rm backend ruff check .
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check
```

Current suite: 90+ tests, ~93% line coverage.

Fixtures and factories live in `apps/conftest.py`. Tests use `locmem` cache,
eager Celery, PBKDF2 (for speed) and a dedicated test database created by
pytest-django (the `rememberme` role has `CREATEDB`).

## Celery

```bash
docker compose run --rm backend celery -A config worker -Q default,push -l info
docker compose run --rm backend celery -A config beat -l info
```

Beat runs `dispatch_due_reminders` every 15 minutes. Each reminder is keyed by
`(birthday, days_before, target_year)` in `notification_log`, so restarts or
parallel beats cannot send duplicates. Failed deliveries retry up to three
times; expired subscriptions (`404/410`) are deleted.

## Implemented phases

- **Phase 1** — custom email/UUID user, Argon2, JWT + blacklist, refresh
  cookie, register/login/refresh/logout/logout-all, password reset, profile,
  Google/Facebook token login, throttling, Axes lockout, security headers.
- **Phase 2** — birthday CRUD/search/ordering, dashboard aggregation with a
  60 s cache, timezone and 29-February rules.
- **Phase 5** — notification preferences, push subscriptions (upsert), VAPID
  public key, test push, Celery dispatch/delivery, retention.

## Layout

```
config/settings/{base,dev,prod,test}.py
apps/accounts/       # User, auth, profile, OAuth
apps/birthdays/      # Birthday model, CRUD, search
apps/dashboard/      # aggregation + cache
apps/notifications/  # preferences, push, Celery tasks
apps/common/         # error envelope, pagination, throttles, dates
```

Business logic lives in `services.py` / `tasks.py`; serializers only validate
and shape data. No secret is stored in source code.
