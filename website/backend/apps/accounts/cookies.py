"""Refresh-token cookie helpers (api.md §2, architecture.md §5.1)."""
from django.conf import settings


def set_refresh_cookie(response, refresh_token):
    lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=getattr(settings, "REFRESH_COOKIE_SECURE", not settings.DEBUG),
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )
    return response
