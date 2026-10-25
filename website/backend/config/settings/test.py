"""Test settings: fast, deterministic, no external services."""
from .dev import *  # noqa: F401,F403

DEBUG = env.bool("TEST_DEBUG", default=False)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
AXES_ENABLED = False
REFRESH_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
# freezegun replaces time.time with a zero-arg callable, which breaks DRF's
# SimpleRateThrottle.timer class attribute. Default throttles are disabled in
# tests; scoped throttles (auth/search/push) are still exercised explicitly.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "rememberme-tests",
    }
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.PBKDF2PasswordHasher"]
