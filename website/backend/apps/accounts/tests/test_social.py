import pytest
from rest_framework.exceptions import ValidationError

from apps.accounts import services
from apps.accounts.services import verify_provider_token

pytestmark = pytest.mark.django_db


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise services.requests.HTTPError("bad")

    def json(self):
        return self._payload


def test_google_access_token_identity(monkeypatch):
    monkeypatch.setattr(
        services.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(
            {
                "sub": "12345",
                "email": "USER@example.com",
                "email_verified": True,
                "given_name": "Anna",
                "family_name": "Kowalska",
            }
        ),
    )

    identity = verify_provider_token(None, "google", access_token="token")

    assert identity.uid == "12345"
    assert identity.email == "user@example.com"
    assert identity.email_verified is True
    assert identity.first_name == "Anna"
    assert identity.last_name == "Kowalska"


def test_google_rejects_invalid_access_token(monkeypatch):
    def boom(*args, **kwargs):
        raise services.requests.ConnectionError("nope")

    monkeypatch.setattr(services.requests, "get", boom)

    with pytest.raises(ValidationError):
        verify_provider_token(None, "google", access_token="token")


def test_google_requires_a_token():
    with pytest.raises(ValidationError):
        verify_provider_token(None, "google")


def test_unsupported_provider_is_rejected():
    with pytest.raises(ValidationError):
        verify_provider_token(None, "instagram", access_token="token")


def test_social_auth_requires_a_token(api_client):
    response = api_client.post(
        "/api/v1/auth/social/google", {}, format="json"
    )
    assert response.status_code == 400
    assert "access_token" in response.data["fields"]


def test_social_unverified_email_is_rejected(api_client, monkeypatch):
    monkeypatch.setattr(
        "apps.accounts.views.authenticate_social_user",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            ValidationError(
                {"access_token": ["The provider email is not verified."]}
            )
        ),
    )

    response = api_client.post(
        "/api/v1/auth/social/facebook",
        {"access_token": "token"},
        format="json",
    )
    assert response.status_code == 400
