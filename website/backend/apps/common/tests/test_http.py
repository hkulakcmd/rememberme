import pytest

pytestmark = pytest.mark.django_db


def test_unknown_api_route_returns_json_404(api_client):
    response = api_client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response["Content-Type"].startswith("application/json")
    assert response.json() == {
        "detail": "Not found.",
        "code": "not_found",
        "fields": {},
    }


def test_security_headers(api_client):
    response = api_client.get("/api/v1/push/public-key")

    assert response.status_code == 200
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["Referrer-Policy"] == "same-origin"
    assert response["X-Frame-Options"] == "DENY"
