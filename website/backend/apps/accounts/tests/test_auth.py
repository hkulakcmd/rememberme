import pytest
from allauth.socialaccount.models import SocialAccount
from django.core import mail
from django.test import override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.services import ProviderIdentity, resolve_social_user

pytestmark = pytest.mark.django_db

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
LOGOUT_ALL_URL = "/api/v1/auth/logout-all"
RESET_URL = "/api/v1/auth/password/reset"
RESET_CONFIRM_URL = "/api/v1/auth/password/reset/confirm"
ME_URL = "/api/v1/me"


def register_payload(**overrides):
    payload = {
        "email": "Anna@Example.com",
        "password": "Str0ng-Pass!234",
        "first_name": "Anna",
        "last_name": "Kowalska",
        "timezone": "Europe/Warsaw",
    }
    payload.update(overrides)
    return payload


def test_register_creates_user_and_refresh_cookie(api_client):
    response = api_client.post(REGISTER_URL, register_payload(), format="json")

    assert response.status_code == 201
    data = response.data["data"]["user"]
    assert data["email"] == "anna@example.com"
    assert data["first_name"] == "Anna"
    assert "password" not in data
    assert response.cookies["refresh"]["path"] == "/api/v1/auth"
    assert response.cookies["refresh"]["httponly"] is True

    from django.contrib.auth import get_user_model

    user = get_user_model().objects.get(email="anna@example.com")
    assert user.check_password("Str0ng-Pass!234")
    assert user.password.startswith("pbkdf2_")  # test settings hasher


def test_register_duplicate_email_is_case_insensitive(api_client, user):
    response = api_client.post(
        REGISTER_URL, register_payload(email="ANNA@example.com"), format="json"
    )

    assert response.status_code == 409
    assert response.data["code"] == "conflict"


def test_register_rejects_weak_password(api_client):
    response = api_client.post(
        REGISTER_URL, register_payload(password="12345678"), format="json"
    )

    assert response.status_code == 400
    assert response.data["code"] == "validation_error"
    assert "password" in response.data["fields"]


def test_register_rejects_invalid_timezone(api_client):
    response = api_client.post(
        REGISTER_URL, register_payload(timezone="Mars/Olympus"), format="json"
    )

    assert response.status_code == 400
    assert "timezone" in response.data["fields"]


def test_login_returns_access_and_cookie(api_client, user):
    response = api_client.post(
        LOGIN_URL,
        {"email": "ANNA@example.com", "password": "Str0ng-Pass!234"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["data"]["access"]
    assert response.data["data"]["user"]["auth_methods"] == ["password"]
    assert response.data["data"]["user"]["email"] == "anna@example.com"
    assert "refresh" in response.cookies


def test_login_with_wrong_password_returns_401(api_client, user):
    response = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "wrong-password"},
        format="json",
    )

    assert response.status_code == 401
    assert response.data["code"] == "not_authenticated"
    assert response.data["detail"] == "Invalid email or password."


def test_login_is_rate_limited(api_client, user):
    for _ in range(10):
        response = api_client.post(
            LOGIN_URL,
            {"email": user.email, "password": "wrong-password"},
            format="json",
        )
        assert response.status_code == 401

    response = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )

    assert response.status_code == 429
    assert response.data["code"] == "throttled"
    assert response["Retry-After"]


@override_settings(AXES_ENABLED=True)
def test_axes_locks_account_after_five_failures(api_client, user):
    for _ in range(5):
        response = api_client.post(
            LOGIN_URL,
            {"email": user.email, "password": "wrong-password"},
            format="json",
        )
        assert response.status_code == 401

    response = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )

    assert response.status_code == 401


def test_refresh_rotates_token_and_blacklists_old_one(api_client, user):
    login = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )
    old_refresh = login.cookies["refresh"].value

    response = api_client.post(REFRESH_URL)

    assert response.status_code == 200
    assert response.data["data"]["access"]
    new_refresh = response.cookies["refresh"].value
    assert new_refresh != old_refresh

    replay = APIClient()
    replay.cookies["refresh"] = old_refresh
    replay_response = replay.post(REFRESH_URL)
    assert replay_response.status_code == 401
    assert replay_response.data["code"] == "token_invalid"


def test_refresh_without_cookie_returns_401(api_client):
    response = api_client.post(REFRESH_URL)

    assert response.status_code == 401
    assert response.data["code"] == "token_invalid"


def test_logout_clears_cookie_and_blacklists_refresh(api_client, user):
    login = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )
    refresh = login.cookies["refresh"].value

    response = api_client.post(LOGOUT_URL)

    assert response.status_code == 204
    assert response.cookies["refresh"]["max-age"] == 0

    replay = APIClient()
    replay.cookies["refresh"] = refresh
    assert replay.post(REFRESH_URL).status_code == 401


def test_logout_all_blacklists_every_refresh_token(api_client, user):
    login = api_client.post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )
    first_refresh = login.cookies["refresh"].value
    second_login = APIClient().post(
        LOGIN_URL,
        {"email": user.email, "password": "Str0ng-Pass!234"},
        format="json",
    )
    second_refresh = second_login.cookies["refresh"].value

    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access']}"
    )
    response = api_client.post(LOGOUT_ALL_URL)
    assert response.status_code == 204

    for token in (first_refresh, second_refresh):
        client = APIClient()
        client.cookies["refresh"] = token
        assert client.post(REFRESH_URL).status_code == 401


def test_me_get_and_patch(auth_client, user):
    response = auth_client.get(ME_URL)
    assert response.status_code == 200
    assert response.data["data"]["id"] == str(user.id)

    response = auth_client.patch(
        ME_URL, {"first_name": "Ania", "timezone": "Europe/London"}, format="json"
    )
    assert response.status_code == 200
    assert response.data["data"]["first_name"] == "Ania"
    assert response.data["data"]["timezone"] == "Europe/London"

    invalid = auth_client.patch(
        ME_URL, {"timezone": "Not/AZone"}, format="json"
    )
    assert invalid.status_code == 400
    assert "timezone" in invalid.data["fields"]


def test_me_patch_cannot_change_email(auth_client, user):
    response = auth_client.patch(
        ME_URL, {"email": "hacker@example.com"}, format="json"
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email == "anna@example.com"


def test_me_requires_authentication(api_client):
    response = api_client.get(ME_URL)
    assert response.status_code == 401
    assert response.data["code"] == "not_authenticated"


def test_delete_account_requires_password(auth_client, user):
    response = auth_client.delete(ME_URL, {}, format="json")
    assert response.status_code == 400
    assert "password" in response.data["fields"]

    response = auth_client.delete(
        ME_URL, {"password": "wrong"}, format="json"
    )
    assert response.status_code == 400

    response = auth_client.delete(
        ME_URL, {"password": "Str0ng-Pass!234"}, format="json"
    )
    assert response.status_code == 204
    assert not type(user).objects.filter(pk=user.pk).exists()


def test_password_reset_request_does_not_enumerate_accounts(api_client):
    response = api_client.post(
        RESET_URL, {"email": "nobody@example.com"}, format="json"
    )
    assert response.status_code == 202
    assert mail.outbox == []


def test_password_reset_full_flow(api_client, user):
    response = api_client.post(RESET_URL, {"email": user.email}, format="json")
    assert response.status_code == 202
    assert len(mail.outbox) == 1
    assert "password-reset/confirm?token=" in mail.outbox[0].body

    token = mail.outbox[0].body.split("password-reset/confirm?token=")[1].split()[0]

    weak = api_client.post(
        RESET_CONFIRM_URL,
        {"token": token, "new_password": "12345678"},
        format="json",
    )
    assert weak.status_code == 400
    assert "new_password" in weak.data["fields"]

    response = api_client.post(
        RESET_CONFIRM_URL,
        {"token": token, "new_password": "N3w-Str0ng-Pass!"},
        format="json",
    )
    assert response.status_code == 200

    login = APIClient().post(
        LOGIN_URL,
        {"email": user.email, "password": "N3w-Str0ng-Pass!"},
        format="json",
    )
    assert login.status_code == 200

    reused = api_client.post(
        RESET_CONFIRM_URL,
        {"token": token, "new_password": "Another-Pass!234"},
        format="json",
    )
    assert reused.status_code == 400


def test_password_reset_rejects_invalid_token(api_client):
    response = api_client.post(
        RESET_CONFIRM_URL,
        {"token": "garbage", "new_password": "N3w-Str0ng-Pass!"},
        format="json",
    )
    assert response.status_code == 400
    assert "token" in response.data["fields"]


def test_social_login_creates_user(api_client, monkeypatch):
    from django.contrib.auth import get_user_model

    from apps.accounts import views as account_views

    monkeypatch.setattr(
        account_views,
        "authenticate_social_user",
        lambda request, provider, access_token=None, id_token=None: (
            get_user_model().objects.create_user(
                email="social@example.com",
                password=None,
                first_name="Social",
                last_name="User",
            )
        ),
    )

    response = api_client.post(
        "/api/v1/auth/social/google",
        {"access_token": "token"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["data"]["user"]["email"] == "social@example.com"
    assert "refresh" in response.cookies


def test_social_login_rejects_unknown_provider(api_client):
    response = api_client.post(
        "/api/v1/auth/social/instagram",
        {"access_token": "token"},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["code"] == "validation_error"


def test_resolve_social_user_links_existing_email(user):
    identity = ProviderIdentity(
        uid="google-123",
        email="ANNA@example.com",
        email_verified=True,
        first_name="Anna",
        last_name="Kowalska",
    )

    resolved = resolve_social_user(identity, "google")

    assert resolved.pk == user.pk
    account = SocialAccount.objects.get(provider="google", uid="google-123")
    assert account.user_id == user.pk
    assert "google" in resolved.auth_methods


def test_resolve_social_user_creates_new_user_without_password():
    identity = ProviderIdentity(
        uid="fb-1",
        email="fb@example.com",
        email_verified=True,
        first_name="Fb",
        last_name="User",
    )

    resolved = resolve_social_user(identity, "facebook")

    assert resolved.email == "fb@example.com"
    assert resolved.has_usable_password() is False
    assert resolved.auth_methods == ["facebook"]


def test_resolve_social_user_rejects_unverified_email():
    identity = ProviderIdentity(
        uid="fb-2",
        email="unverified@example.com",
        email_verified=False,
    )

    with pytest.raises(ValidationError):
        resolve_social_user(identity, "facebook")
