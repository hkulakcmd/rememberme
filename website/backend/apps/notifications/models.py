"""Notification preferences, push subscriptions and delivery log."""
import uuid
from datetime import time

from django.conf import settings
from django.db import models

LEAD_TIME_CHOICES = [(0, "Same day"), (1, "1 day before"), (3, "3 days before"), (7, "7 days before")]

NOTIFICATION_STATUS = [
    ("pending", "Pending"),
    ("sent", "Sent"),
    ("failed", "Failed"),
    ("skipped", "Skipped"),
]


class NotificationPreferences(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="notification_preferences",
    )
    push_enabled = models.BooleanField(default=True)
    send_at_time = models.TimeField(default=time(9, 0))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notification_preferences"

    def __str__(self):
        return f"Preferences for {self.user_id}"


class NotificationLeadTime(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_lead_times",
    )
    days_before = models.SmallIntegerField(choices=LEAD_TIME_CHOICES)

    class Meta:
        db_table = "notification_lead_times"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "days_before"],
                name="notification_lead_times_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(days_before__in=[0, 1, 3, 7]),
                name="notification_lead_times_valid",
            ),
        ]

    def __str__(self):
        return f"{self.days_before}d before ({self.user_id})"


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.TextField(null=True, blank=True)
    failure_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "push_subscriptions"
        indexes = [
            models.Index(fields=["user"], name="push_subscriptions_user_idx"),
        ]

    def __str__(self):
        return f"Push subscription for {self.user_id}"


class NotificationLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )
    birthday = models.ForeignKey(
        "birthdays.Birthday",
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )
    days_before = models.SmallIntegerField(choices=LEAD_TIME_CHOICES)
    target_year = models.SmallIntegerField()
    status = models.CharField(
        max_length=16, choices=NOTIFICATION_STATUS, default="pending"
    )
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification_log"
        constraints = [
            models.UniqueConstraint(
                fields=["birthday", "days_before", "target_year"],
                name="notification_log_unique_key",
            ),
            models.CheckConstraint(
                condition=models.Q(days_before__in=[0, 1, 3, 7]),
                name="notification_log_valid_days_before",
            ),
        ]
        indexes = [
            models.Index(
                fields=["status", "scheduled_for"],
                name="notification_log_due_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.birthday_id} -{self.days_before}d "
            f"{self.target_year} [{self.status}]"
        )
