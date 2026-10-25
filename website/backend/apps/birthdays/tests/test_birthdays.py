
import pytest
from freezegun import freeze_time

from apps.birthdays.models import Birthday

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/birthdays"
SEARCH_URL = "/api/v1/birthdays/search"


def birthday_payload(**overrides):
    payload = {
        "first_name": "Anna",
        "last_name": "Kowalska",
        "birth_month": 4,
        "birth_day": 12,
        "birth_year": 1990,
        "relationship": "sister",
        "notes": "",
    }
    payload.update(overrides)
    return payload


@freeze_time("2026-10-25 10:00:00")
def test_create_birthday_returns_computed_fields(auth_client):
    response = auth_client.post(LIST_URL, birthday_payload(), format="json")

    assert response.status_code == 201
    data = response.data["data"]
    assert data["first_name"] == "Anna"
    assert data["next_occurrence"] == "2027-04-12"
    assert data["days_until"] == 169
    assert data["age"] == 36
    assert data["id"]


def test_create_birthday_requires_only_name_and_date(auth_client):
    response = auth_client.post(
        LIST_URL,
        {"first_name": "Jan", "birth_month": 1, "birth_day": 1},
        format="json",
    )

    assert response.status_code == 201
    data = response.data["data"]
    assert data["last_name"] == ""
    assert data["birth_year"] is None
    assert data["age"] is None


@pytest.mark.parametrize(
    "month,day",
    [(4, 31), (2, 30), (2, 31), (6, 31), (9, 31), (11, 31), (13, 1), (1, 0)],
)
def test_create_birthday_rejects_impossible_dates(auth_client, month, day):
    response = auth_client.post(
        LIST_URL,
        birthday_payload(birth_month=month, birth_day=day),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["code"] == "validation_error"


def test_feb_29_is_accepted(auth_client):
    response = auth_client.post(
        LIST_URL,
        birthday_payload(birth_month=2, birth_day=29, birth_year=2000),
        format="json",
    )

    assert response.status_code == 201


def test_birth_year_out_of_range_is_rejected(auth_client):
    response = auth_client.post(
        LIST_URL, birthday_payload(birth_year=2101), format="json"
    )

    assert response.status_code == 400
    assert "birth_year" in response.data["fields"]


def test_notes_length_is_limited(auth_client):
    response = auth_client.post(
        LIST_URL, birthday_payload(notes="x" * 2001), format="json"
    )

    assert response.status_code == 400
    assert "notes" in response.data["fields"]


def test_list_is_isolated_per_user(auth_client, user, other_user):
    Birthday.objects.create(
        user=user,
        first_name="Own",
        birth_month=1,
        birth_day=1,
    )
    Birthday.objects.create(
        user=other_user,
        first_name="Foreign",
        birth_month=1,
        birth_day=1,
    )

    response = auth_client.get(LIST_URL)

    assert response.status_code == 200
    assert response.data["meta"]["count"] == 1
    assert response.data["data"][0]["first_name"] == "Own"


def test_retrieve_foreign_birthday_returns_404(auth_client, other_user):
    foreign = Birthday.objects.create(
        user=other_user,
        first_name="Foreign",
        birth_month=1,
        birth_day=1,
    )

    response = auth_client.get(f"{LIST_URL}/{foreign.id}")

    assert response.status_code == 404
    assert response.data["code"] == "not_found"


def test_patch_and_delete_birthday(auth_client, user):
    birthday = Birthday.objects.create(
        user=user, first_name="Anna", birth_month=4, birth_day=12
    )

    response = auth_client.patch(
        f"{LIST_URL}/{birthday.id}",
        {"first_name": "Ania", "relationship": "friend"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["data"]["first_name"] == "Ania"
    assert response.data["data"]["relationship"] == "friend"

    response = auth_client.delete(f"{LIST_URL}/{birthday.id}")
    assert response.status_code == 204
    assert not Birthday.objects.filter(pk=birthday.pk).exists()


def test_patch_with_invalid_date_combination(auth_client, user):
    birthday = Birthday.objects.create(
        user=user, first_name="Anna", birth_month=4, birth_day=12
    )

    response = auth_client.patch(
        f"{LIST_URL}/{birthday.id}", {"birth_day": 31}, format="json"
    )

    assert response.status_code == 400
    assert "birth_day" in response.data["fields"]


def test_pagination_meta(auth_client, user):
    for index in range(3):
        Birthday.objects.create(
            user=user,
            first_name=f"Person{index}",
            birth_month=1,
            birth_day=index + 1,
        )

    response = auth_client.get(LIST_URL, {"page": 1, "page_size": 2})

    assert response.status_code == 200
    assert len(response.data["data"]) == 2
    assert response.data["meta"] == {
        "count": 3,
        "page": 1,
        "page_size": 2,
        "total_pages": 2,
    }


def test_search_requires_three_characters(auth_client):
    response = auth_client.get(LIST_URL, {"search": "an"})

    assert response.status_code == 400
    assert "search" in response.data["fields"]


def test_search_matches_first_or_last_name(auth_client, user):
    Birthday.objects.create(
        user=user, first_name="Anna", last_name="Kowalska", birth_month=4, birth_day=12
    )
    Birthday.objects.create(
        user=user, first_name="Jan", last_name="Nowak", birth_month=5, birth_day=2
    )

    response = auth_client.get(LIST_URL, {"search": "kow"})

    assert response.status_code == 200
    assert response.data["meta"]["count"] == 1
    assert response.data["data"][0]["first_name"] == "Anna"


@freeze_time("2026-12-30 10:00:00")
def test_date_ordering_wraps_year(auth_client, user):
    for month, day, name in [
        (6, 1, "June"),
        (1, 2, "January"),
        (12, 31, "December"),
    ]:
        Birthday.objects.create(
            user=user, first_name=name, birth_month=month, birth_day=day
        )

    response = auth_client.get(LIST_URL, {"ordering": "date"})

    assert [item["first_name"] for item in response.data["data"]] == [
        "December",
        "January",
        "June",
    ]


def test_invalid_ordering_is_rejected(auth_client):
    response = auth_client.get(LIST_URL, {"ordering": "user__password"})

    assert response.status_code == 400
    assert "ordering" in response.data["fields"]


def test_search_alias_returns_ten_results_max(auth_client, user):
    for index in range(12):
        Birthday.objects.create(
            user=user,
            first_name=f"Anna{index}",
            birth_month=1,
            birth_day=1,
        )

    response = auth_client.get(SEARCH_URL, {"q": "an"})

    assert response.status_code == 200
    assert len(response.data["data"]) == 10
    assert set(response.data["data"][0]) == {
        "id",
        "full_name",
        "birth_month",
        "birth_day",
    }


def test_search_alias_requires_two_characters(auth_client):
    response = auth_client.get(SEARCH_URL, {"q": "a"})

    assert response.status_code == 400


def test_birthday_limit(auth_client, user, monkeypatch):
    from apps.birthdays import serializers as birthday_serializers

    Birthday.objects.create(
        user=user, first_name="Existing", birth_month=1, birth_day=1
    )
    monkeypatch.setattr(birthday_serializers, "MAX_BIRTHDAYS_PER_USER", 1)

    response = auth_client.post(LIST_URL, birthday_payload(), format="json")

    assert response.status_code == 400
    assert response.data["code"] == "validation_error"
    assert not Birthday.objects.filter(first_name="Anna").exists()


def test_model_full_name_property():
    birthday = Birthday(first_name="Anna", last_name="Kowalska")
    assert birthday.full_name == "Anna Kowalska"
    assert str(birthday) == "Anna Kowalska"
