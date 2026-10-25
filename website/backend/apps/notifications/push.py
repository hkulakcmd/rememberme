"""Web Push delivery with subscription hygiene (architecture.md §6)."""
import json
import logging

from django.conf import settings
from django.utils import timezone as django_timezone
from pywebpush import WebPushException, webpush

logger = logging.getLogger(__name__)

MAX_FAILURES = 3


class PushDeliveryError(Exception):
    """Transient delivery failure (eligible for a retry)."""


def send_web_push(subscription, payload):
    """Deliver one push. Returns True on success, False for gone endpoints.

    Raises ``PushDeliveryError`` for transient errors.
    """
    if not settings.VAPID_PRIVATE_KEY:
        raise PushDeliveryError("VAPID keys are not configured.")

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_ADMIN_EMAIL},
            timeout=10,
        )
    except WebPushException as exc:
        status_code = getattr(
            getattr(exc, "response", None), "status_code", None
        )
        if status_code in (404, 410):
            subscription.delete()
            return False
        _record_failure(subscription)
        raise PushDeliveryError("Push service rejected the request.") from exc
    except Exception as exc:  # noqa: BLE001 - network/encoding failures
        _record_failure(subscription)
        raise PushDeliveryError("Push delivery failed.") from exc

    subscription.failure_count = 0
    subscription.last_used_at = django_timezone.now()
    subscription.save(
        update_fields=["failure_count", "last_used_at"]
    )
    return True


def _record_failure(subscription):
    subscription.failure_count += 1
    subscription.last_failure_at = django_timezone.now()
    if subscription.failure_count >= MAX_FAILURES:
        subscription.delete()
        return
    subscription.save(
        update_fields=["failure_count", "last_failure_at"]
    )


def build_reminder_payload(log):
    days = log.days_before
    name = log.birthday.full_name
    if days == 0:
        body = f"{name}'s birthday is today."
    elif days == 1:
        body = f"{name}'s birthday is tomorrow."
    else:
        body = f"{name}'s birthday is in {days} days."
    return {
        "title": "Birthday reminder",
        "body": body,
        "url": "/birthdays",
        "tag": f"birthday-{log.birthday_id}-{log.target_year}",
    }
