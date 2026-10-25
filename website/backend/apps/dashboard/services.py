"""Dashboard aggregation with a 60 s per-user cache (api.md §5)."""
from django.conf import settings
from django.core.cache import cache

from apps.common.dates import (
    current_age,
    next_occurrence,
    today_in_timezone,
)

DASHBOARD_CACHE_KEY = "dashboard:user:{user_id}"


def dashboard_cache_key(user_id):
    return DASHBOARD_CACHE_KEY.format(user_id=user_id)


def invalidate_dashboard_cache(user):
    cache.delete(dashboard_cache_key(user.pk))


def compute_dashboard(user):
    today = today_in_timezone(user.timezone)
    birthdays = list(user.birthdays.all())

    today_items = []
    upcoming_items = []
    nearest = None

    for birthday in birthdays:
        occurrence = next_occurrence(
            birthday.birth_month, birthday.birth_day, today
        )
        days_until = (occurrence - today).days

        if days_until == 0:
            today_items.append(
                {
                    "id": str(birthday.id),
                    "full_name": birthday.full_name,
                    "age": current_age(
                        birthday.birth_year,
                        birthday.birth_month,
                        birthday.birth_day,
                        today,
                    ),
                }
            )
        elif 1 <= days_until <= 30:
            upcoming_items.append(
                {
                    "id": str(birthday.id),
                    "full_name": birthday.full_name,
                    "in_days": days_until,
                    "date": occurrence.isoformat(),
                }
            )

        if nearest is None or days_until < nearest[0]:
            nearest = (
                days_until,
                {
                    "id": str(birthday.id),
                    "full_name": birthday.full_name,
                    "in_days": days_until,
                    "date": occurrence.isoformat(),
                },
            )

    today_items.sort(key=lambda item: item["full_name"])
    upcoming_items.sort(key=lambda item: (item["in_days"], item["full_name"]))

    return {
        "today": today_items,
        "upcoming_30d": upcoming_items,
        "next": nearest[1] if nearest else None,
        "total": len(birthdays),
    }


def get_dashboard(user):
    key = dashboard_cache_key(user.pk)
    cached = cache.get(key)
    if cached is not None:
        return cached
    payload = compute_dashboard(user)
    cache.set(key, payload, timeout=settings.DASHBOARD_CACHE_TIMEOUT)
    return payload
