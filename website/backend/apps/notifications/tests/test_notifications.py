import base64
from datetime import UTC, datetime, time, timedelta
from types import SimpleNamespace

import pytest
from freezegun import freeze_time
from pywebpush import WebPushException

from apps.birthdays.models import Birthday
from apps.notifications import push as push_module
from apps.notifications import tasks
from apps.notifications.models import (
    NotificationLeadTime,
    NotificationLog,
    PushSubscription,
)

pytestmark = pytest.mark.django_db

PREFS_URL = "/api/v1/notification-preferences"
SUBSCRIBE_URL = "/api/v1/push/subscribe"
PUBLIC_KEY_URL = "/api/v1/push/public-key"
TEST_PUSH_URL = "/api/v1/push/test"


def b64(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


P256DH = b64(b"p" * 65)
AUTH = b64(b"a" * 16)


def subscribe_payload(endpoint="https://fcm.googleapis.com/fcm/send/abc"):
    return {
        "endpoint": endpoint,
        "keys": {"p256dh": P256DH, "auth": AUTH},
        "user_agent": "pytest",
    }


def create_log(user, days_before=0, target_year=2026, status="pending"):
    birthday = Birthday.objects.create(
        user=user,
        first_name="Log",
        birth_month=10,
        birth_day=25,
    )
    return NotificationLog.objects.create(
        user=user,
        birthday=birthday,
        days_before=days_before,
        target_year=target_year,
        status=status,
        scheduled_for=datetime.now(tz=UTC),
    )


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------
def test_default_preferences_created_with_user(user):
    preferences = user.notification_preferences
    assert preferences.push_enabled is True
    assert preferences.send_at_time.strftime("%H:%M") == "09:00"
    assert sorted(
        user.notification_lead_times.values_list("days_before", flat=True)
    ) == [0, 1]


def test_get_preferences(auth_client):
    response = auth_client.get(PREFS_URL)

    assert response.status_code == 200
    assert response.data["data"] == {
        "push_enabled": True,
        "send_at_time": "09:00",
        "lead_times": [0, 1],
    }


def test_patch_preferences(auth_client, user):
    response = auth_client.patch(
        PREFS_URL,
        {
            "push_enabled": False,
            "send_at_time": "08:30",
            "lead_times": [7, 0, 3],
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["data"]["push_enabled"] is False
    assert response.data["data"]["send_at_time"] == "08:30"
    assert response.data["data"]["lead_times"] == [0, 3, 7]
    assert sorted(
        user.notification_lead_times.values_list("days_before", flat=True)
    ) == [0, 3, 7]


@pytest.mark.parametrize("lead_times", [[2], [0, 0], [0, 1, 3, 7, 5]])
def test_patch_preferences_rejects_invalid_lead_times(
    auth_client, lead_times
):
    response = auth_client.patch(
        PREFS_URL, {"lead_times": lead_times}, format="json"
    )

    assert response.status_code == 400
    assert "lead_times" in response.data["fields"]


# ---------------------------------------------------------------------------
# Push subscriptions
# ---------------------------------------------------------------------------
def test_public_key(auth_client, settings):
    settings.VAPID_PUBLIC_KEY = "test-public-key"

    response = auth_client.get(PUBLIC_KEY_URL)

    assert response.status_code == 200
    assert response.data["data"]["public_key"] == "test-public-key"


def test_subscribe_and_unsubscribe(auth_client, user):
    response = auth_client.post(
        SUBSCRIBE_URL, subscribe_payload(), format="json"
    )

    assert response.status_code == 201
    subscription = PushSubscription.objects.get(endpoint=subscribe_payload()["endpoint"])
    assert subscription.user == user
    assert subscription.p256dh == P256DH

    response = auth_client.post(
        SUBSCRIBE_URL, subscribe_payload(), format="json"
    )
    assert response.status_code == 200

    response = auth_client.delete(
        SUBSCRIBE_URL,
        {"endpoint": subscribe_payload()["endpoint"]},
        format="json",
    )
    assert response.status_code == 204
    assert not PushSubscription.objects.exists()


def test_subscribe_upserts_endpoint_across_users(auth_client, other_user):
    auth_client.post(SUBSCRIBE_URL, subscribe_payload(), format="json")

    from rest_framework.test import APIClient

    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    response = other_client.post(
        SUBSCRIBE_URL, subscribe_payload(), format="json"
    )

    assert response.status_code == 200
    assert PushSubscription.objects.count() == 1
    assert PushSubscription.objects.get().user == other_user


def test_subscribe_rejects_invalid_keys(auth_client):
    payload = subscribe_payload()
    payload["keys"]["p256dh"] = b64(b"short")

    response = auth_client.post(SUBSCRIBE_URL, payload, format="json")

    assert response.status_code == 400
    assert "keys.p256dh" in response.data["fields"]


def test_push_test_queues_for_each_subscription(
    auth_client, user, monkeypatch
):
    PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/abc",
        p256dh=P256DH,
        auth=AUTH,
    )
    calls = []
    monkeypatch.setattr(
        "apps.notifications.views.send_test_notification.delay",
        lambda user_id: calls.append(user_id),
    )

    response = auth_client.post(TEST_PUSH_URL)

    assert response.status_code == 202
    assert response.data["data"]["queued"] == 1
    assert calls == [str(user.pk)]


def test_push_test_without_subscriptions(auth_client):
    response = auth_client.post(TEST_PUSH_URL)

    assert response.status_code == 202
    assert response.data["data"]["queued"] == 0


def test_push_test_is_throttled(auth_client, user, monkeypatch):
    monkeypatch.setattr(
        "apps.notifications.views.send_test_notification.delay",
        lambda user_id: None,
    )

    statuses = [auth_client.post(TEST_PUSH_URL).status_code for _ in range(4)]

    assert statuses == [202, 202, 202, 429]
    response = auth_client.post(TEST_PUSH_URL)
    assert response.data["code"] == "throttled"
    assert response["Retry-After"]


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
@freeze_time("2026-10-25 09:00:00")
def test_dispatch_creates_one_log_and_is_idempotent(user, monkeypatch):
    Birthday.objects.create(
        user=user, first_name="Today", birth_month=10, birth_day=25
    )
    calls = []
    monkeypatch.setattr(
        tasks.send_birthday_reminder,
        "delay",
        lambda log_id: calls.append(log_id),
    )

    assert tasks.dispatch_due_reminders() == 1
    assert tasks.dispatch_due_reminders() == 0

    log = NotificationLog.objects.get()
    assert log.days_before == 0
    assert log.target_year == 2026
    assert log.status == "pending"
    assert log.scheduled_for <= datetime.now(tz=UTC)
    assert len(calls) == 1


@freeze_time("2026-10-25 09:00:00")
def test_dispatch_skips_when_send_time_not_reached(user, monkeypatch):
    preferences = user.notification_preferences
    preferences.send_at_time = time(23, 59)
    preferences.save(update_fields=["send_at_time"])
    Birthday.objects.create(
        user=user, first_name="Today", birth_month=10, birth_day=25
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 0
    assert not NotificationLog.objects.exists()


@freeze_time("2026-10-25 09:00:00")
def test_dispatch_skips_when_push_disabled(user, monkeypatch):
    preferences = user.notification_preferences
    preferences.push_enabled = False
    preferences.save(update_fields=["push_enabled"])
    Birthday.objects.create(
        user=user, first_name="Today", birth_month=10, birth_day=25
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 0


@freeze_time("2026-10-25 20:00:00")
def test_dispatch_uses_user_timezone(user, monkeypatch):
    user.timezone = "Pacific/Kiritimati"  # UTC+14 -> Oct 26 10:00 local
    user.save(update_fields=["timezone"])
    Birthday.objects.create(
        user=user, first_name="LocalToday", birth_month=10, birth_day=26
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 1
    log = NotificationLog.objects.get()
    assert log.target_year == 2026


@freeze_time("2027-02-28 10:00:00")
def test_dispatch_handles_feb_29_in_non_leap_year(user, monkeypatch):
    Birthday.objects.create(
        user=user, first_name="Leap", birth_month=2, birth_day=29
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 1
    log = NotificationLog.objects.get()
    assert log.target_year == 2027
    assert log.days_before == 0


@freeze_time("2026-03-29 07:30:00")
def test_dispatch_handles_dst_transition(user, monkeypatch):
    Birthday.objects.create(
        user=user, first_name="Dst", birth_month=3, birth_day=29
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 1


@freeze_time("2026-10-24 10:00:00")
def test_dispatch_respects_lead_times(user, monkeypatch):
    user.notification_lead_times.all().delete()
    NotificationLeadTime.objects.create(user=user, days_before=3)
    Birthday.objects.create(
        user=user, first_name="Soon", birth_month=10, birth_day=27
    )
    monkeypatch.setattr(
        tasks.send_birthday_reminder, "delay", lambda log_id: None
    )

    assert tasks.dispatch_due_reminders() == 1
    log = NotificationLog.objects.get()
    assert log.days_before == 3


# ---------------------------------------------------------------------------
# Delivery
# ---------------------------------------------------------------------------
@freeze_time("2026-10-25 09:00:00")
def test_reminder_without_subscriptions_is_skipped(user):
    log = create_log(user)

    tasks.send_birthday_reminder.delay(log.pk)

    log.refresh_from_db()
    assert log.status == "skipped"
    assert "No push subscriptions" in log.error


@freeze_time("2026-10-25 09:00:00")
def test_reminder_marks_sent_when_delivery_succeeds(user, monkeypatch):
    log = create_log(user)
    PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/abc",
        p256dh=P256DH,
        auth=AUTH,
    )
    monkeypatch.setattr(tasks, "send_web_push", lambda sub, payload: True)

    tasks.send_birthday_reminder.delay(log.pk)

    log.refresh_from_db()
    assert log.status == "sent"
    assert log.sent_at is not None
    assert log.error == ""


@freeze_time("2026-10-25 09:00:00")
def test_reminder_marks_failed_after_retries_exhausted(user, monkeypatch):
    log = create_log(user)
    PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/abc",
        p256dh=P256DH,
        auth=AUTH,
    )

    def fail(sub, payload):
        raise tasks.PushDeliveryError("transient")

    monkeypatch.setattr(tasks, "send_web_push", fail)
    monkeypatch.setattr(tasks.send_birthday_reminder, "max_retries", 0)

    tasks.send_birthday_reminder.delay(log.pk)

    log.refresh_from_db()
    assert log.status == "failed"


def test_send_web_push_deletes_gone_subscription(monkeypatch, user, settings):
    settings.VAPID_PRIVATE_KEY = "private-key"
    subscription = PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/gone",
        p256dh=P256DH,
        auth=AUTH,
    )

    def gone(**kwargs):
        raise WebPushException(
            "gone", response=SimpleNamespace(status_code=410)
        )

    monkeypatch.setattr(push_module, "webpush", gone)

    assert push_module.send_web_push(subscription, {}) is False
    assert not PushSubscription.objects.filter(pk=subscription.pk).exists()


def test_send_web_push_removes_after_three_failures(monkeypatch, user, settings):
    settings.VAPID_PRIVATE_KEY = "private-key"
    subscription = PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/failing",
        p256dh=P256DH,
        auth=AUTH,
    )

    def failing(**kwargs):
        raise WebPushException(
            "error", response=SimpleNamespace(status_code=500)
        )

    monkeypatch.setattr(push_module, "webpush", failing)

    for _ in range(2):
        with pytest.raises(push_module.PushDeliveryError):
            push_module.send_web_push(subscription, {})
        subscription.refresh_from_db()

    assert subscription.failure_count == 2
    with pytest.raises(push_module.PushDeliveryError):
        push_module.send_web_push(subscription, {})
    assert not PushSubscription.objects.filter(pk=subscription.pk).exists()


def test_send_web_push_requires_vapid_key(settings, user):
    settings.VAPID_PRIVATE_KEY = ""
    subscription = PushSubscription.objects.create(
        user=user,
        endpoint="https://fcm.googleapis.com/fcm/send/nokey",
        p256dh=P256DH,
        auth=AUTH,
    )

    with pytest.raises(push_module.PushDeliveryError):
        push_module.send_web_push(subscription, {})


def test_purge_old_notification_log(user):
    old = create_log(user)
    NotificationLog.objects.filter(pk=old.pk).update(
        created_at=datetime.now(tz=UTC) - timedelta(days=800)
    )
    recent = create_log(user, target_year=2027)

    tasks.purge_old_notification_log()

    assert not NotificationLog.objects.filter(pk=old.pk).exists()
    assert NotificationLog.objects.filter(pk=recent.pk).exists()


def test_reminder_payload_messages(user):
    birthday = Birthday.objects.create(
        user=user, first_name="Anna", birth_month=10, birth_day=25
    )
    log = NotificationLog(
        user=user,
        birthday=birthday,
        days_before=0,
        target_year=2026,
    )
    assert "today" in push_module.build_reminder_payload(log)["body"]
    log.days_before = 1
    assert "tomorrow" in push_module.build_reminder_payload(log)["body"]
    log.days_before = 3
    assert "in 3 days" in push_module.build_reminder_payload(log)["body"]
