"""Production settings."""
from .base import *  # noqa: F401,F403

DEBUG = False

# TLS terminates at the reverse proxy (DevOps, phase 7).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Refresh cookie must be Secure in production (architecture.md §8).
REFRESH_COOKIE_SECURE = True
