"""Celery tasks: reminder dispatch, delivery and log retention."""
import logging
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone as django_timezone

from apps.common.dates import occurrence_in_year

from .models import NotificationLog, PushSubscription
from .push import (
    PushDeliveryError,
    build_reminder_payload,
    send_web_push,
)

logger = logging.getLogger(__name__)
DEFAULT_SEND_AT = time(9, 0)


@shared_task
def dispatch_due_reminders():
    """Create one pending log per due (birthday, lead time, occurrence year)."""
    now = django_timezone.now()
    users = (
        get_user_model()
        .objects.filter(
            is_active=True,
            notification_preferences__push_enabled=True,
        )
        .select_related("notification_preferences")
        .prefetch_related("notification_lead_times", "birthdays")
    )

    queued = 0
    for user in users:
        prefs = user.notification_preferences
        tz = ZoneInfo(user.timezone)
        local_now = now.astimezone(tz)
        today = local_now.date()
        send_at = prefs.send_at_time or DEFAULT_SEND_AT

        scheduled_local = datetime.combine(today, send_at, tzinfo=tz)
        scheduled_for = scheduled_local.astimezone(UTC)
        if scheduled_for > now:
            continue  # not due yet today

        lead_times = list(
            user.notification_lead_times.values_list("days_before", flat=True)
        )
        birthdays = list(user.birthdays.all())

        for days_before in lead_times:
            target_date = today + timedelta(days=days_before)
            for birthday in birthdays:
                occurrence = occurrence_in_year(
                    birthday.birth_month, birthday.birth_day, target_date.year
                )
                if occurrence != target_date:
                    continue

                log, created = NotificationLog.objects.get_or_create(
                    birthday=birthday,
                    days_before=days_before,
                    target_year=target_date.year,
                    defaults={
                        "user": user,
                        "status": "pending",
                        "scheduled_for": scheduled_for,
                    },
                )
                if created:
                    send_birthday_reminder.delay(log.pk)
                    queued += 1

    return queued


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_birthday_reminder(self, log_id):
    """Deliver a reminder. Log stays pending while retries are in flight."""
    log = (
        NotificationLog.objects.select_related("birthday", "user")
        .filter(pk=log_id)
        .first()
    )
    if log is None or log.status != "pending":
        return log.status if log else None

    subscriptions = list(
        PushSubscription.objects.filter(user=log.user)
    )
    if not subscriptions:
        log.status = "skipped"
        log.error = "No push subscriptions."
        log.save(update_fields=["status", "error"])
        return log.status

    payload = build_reminder_payload(log)
    delivered = 0
    transient_failure = False
    for subscription in subscriptions:
        try:
            if send_web_push(subscription, payload):
                delivered += 1
        except PushDeliveryError:
            transient_failure = True
            continue

    if delivered:
        log.status = "sent"
        log.sent_at = django_timezone.now()
        log.error = ""
        log.save(update_fields=["status", "sent_at", "error"])
        return log.status

    if transient_failure and self.request.retries < self.max_retries:
        raise self.retry()

    log.status = "failed"
    log.error = "Push delivery failed."
    log.save(update_fields=["status", "error"])
    return log.status


@shared_task
def send_test_notification(user_id):
    """Send a test push to every subscription of a user."""
    subscriptions = list(PushSubscription.objects.filter(user_id=user_id))
    payload = {
        "title": "RememberMe test notification",
        "body": "Push notifications are working.",
        "url": "/settings",
    }
    delivered = 0
    for subscription in subscriptions:
        try:
            if send_web_push(subscription, payload):
                delivered += 1
        except PushDeliveryError:
            continue
    return delivered


@shared_task
def purge_old_notification_log():
    """Retention: remove log entries older than two years."""
    cutoff = django_timezone.now() - timedelta(days=730)
    deleted, _ = NotificationLog.objects.filter(created_at__lt=cutoff).delete()
    return deleted
