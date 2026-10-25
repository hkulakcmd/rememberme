import pytest
from freezegun import freeze_time

from apps.birthdays.models import Birthday
from apps.dashboard.services import get_dashboard, invalidate_dashboard_cache

pytestmark = pytest.mark.django_db

DASHBOARD_URL = "/api/v1/dashboard"


def make_birthday(user, name, month, day, year=None):
    return Birthday.objects.create(
        user=user,
        first_name=name,
        birth_month=month,
        birth_day=day,
        birth_year=year,
    )


@freeze_time("2026-10-25 10:00:00")
def test_dashboard_today_upcoming_next_and_total(auth_client, user):
    make_birthday(user, "Today", 10, 25, 1990)
    make_birthday(user, "Soon", 10, 28)
    make_birthday(user, "Far", 11, 30)

    response = auth_client.get(DASHBOARD_URL)

    assert response.status_code == 200
    data = response.data["data"]
    assert [item["full_name"] for item in data["today"]] == ["Today"]
    assert data["today"][0]["age"] == 36
    assert [item["full_name"] for item in data["upcoming_30d"]] == ["Soon"]
    assert data["upcoming_30d"][0]["in_days"] == 3
    assert data["upcoming_30d"][0]["date"] == "2026-10-28"
    assert data["next"]["full_name"] == "Today"
    assert data["next"]["in_days"] == 0
    assert data["total"] == 3


def test_dashboard_empty(auth_client):
    response = auth_client.get(DASHBOARD_URL)

    assert response.status_code == 200
    assert response.data["data"] == {
        "today": [],
        "upcoming_30d": [],
        "next": None,
        "total": 0,
    }


@freeze_time("2026-12-30 10:00:00")
def test_dashboard_year_wrap(user):
    make_birthday(user, "January", 1, 2)

    data = get_dashboard(user)

    assert data["next"] == {
        "id": str(user.birthdays.get().id),
        "full_name": "January",
        "in_days": 3,
        "date": "2027-01-02",
    }


@freeze_time("2027-02-27 10:00:00")
def test_dashboard_treats_feb_29_as_feb_28_in_non_leap_year(user):
    make_birthday(user, "Leap", 2, 29, 2000)

    data = get_dashboard(user)

    assert data["next"]["date"] == "2027-02-28"
    assert data["next"]["in_days"] == 1


@freeze_time("2027-02-28 10:00:00")
def test_feb_29_reminder_on_feb_28_is_today(user):
    make_birthday(user, "Leap", 2, 29)

    data = get_dashboard(user)

    assert [item["full_name"] for item in data["today"]] == ["Leap"]


@freeze_time("2026-10-25 23:30:00")
def test_dashboard_uses_user_timezone(user):
    user.timezone = "Pacific/Kiritimati"  # UTC+14 -> already Oct 26
    user.save(update_fields=["timezone"])
    make_birthday(user, "LocalToday", 10, 26)

    data = get_dashboard(user)

    assert [item["full_name"] for item in data["today"]] == ["LocalToday"]


@freeze_time("2026-10-25 10:00:00")
def test_dashboard_cache_is_used_and_invalidated(user):
    birthday = make_birthday(user, "Cached", 4, 12)

    first = get_dashboard(user)
    assert first["total"] == 1

    # Raw update bypasses signals, so the cached payload must still be served.
    Birthday.objects.filter(pk=birthday.pk).update(first_name="Changed")
    cached = get_dashboard(user)
    assert cached["next"]["full_name"] == "Cached"

    invalidate_dashboard_cache(user)
    fresh = get_dashboard(user)
    assert fresh["next"]["full_name"] == "Changed"


@freeze_time("2026-10-25 10:00:00")
def test_creating_birthday_invalidates_dashboard_cache(auth_client, user):
    assert get_dashboard(user)["total"] == 0

    auth_client.post(
        "/api/v1/birthdays",
        {"first_name": "New", "birth_month": 10, "birth_day": 28},
        format="json",
    )

    assert get_dashboard(user)["total"] == 1


@freeze_time("2026-10-25 10:00:00")
def test_next_is_nearest_future_birthday(user):
    make_birthday(user, "Later", 4, 12)
    make_birthday(user, "Sooner", 12, 1)

    data = get_dashboard(user)

    assert data["next"]["full_name"] == "Sooner"
