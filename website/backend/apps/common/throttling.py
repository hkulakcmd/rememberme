"""Per-scope throttles matching api.md §8."""
from rest_framework.throttling import SimpleRateThrottle


class _ScopedThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AuthRateThrottle(_ScopedThrottle):
    """10/min/IP for login, register and password reset."""

    scope = "auth"


class RefreshRateThrottle(_ScopedThrottle):
    """30/min/IP for token refresh."""

    scope = "refresh"


class SearchRateThrottle(SimpleRateThrottle):
    """60/min/user for the birthday search endpoint."""

    scope = "search"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        else:
            ident = f"ip:{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PushTestRateThrottle(SimpleRateThrottle):
    """3/hour/user for test notifications."""

    scope = "push_test"

    def get_cache_key(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": f"user:{request.user.pk}",
        }
