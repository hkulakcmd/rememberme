import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

# freezegun replaces time.time with a plain function; DRF stores it as a class
# attribute, which then binds ``self``. Wrapping it as a staticmethod keeps
# throttles working under frozen clocks.
SimpleRateThrottle.timer = staticmethod(SimpleRateThrottle.timer)

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def password():
    return "Str0ng-Pass!234"


@pytest.fixture
def user(db, password):
    return User.objects.create_user(
        email="anna@example.com",
        password=password,
        first_name="Anna",
        last_name="Kowalska",
        timezone="Europe/Warsaw",
    )


@pytest.fixture
def other_user(db, password):
    return User.objects.create_user(
        email="jan@example.com",
        password=password,
        first_name="Jan",
        last_name="Nowak",
        timezone="Europe/Warsaw",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    # Bypass JWT for data tests: freezegun would otherwise create tokens with
    # an ``iat`` that is in the future relative to the frozen clock.
    client.force_authenticate(user=user)
    return client


def bearer_for(user):
    return f"Bearer {RefreshToken.for_user(user).access_token}"
