from django.contrib import admin

from .models import (
    NotificationLeadTime,
    NotificationLog,
    NotificationPreferences,
    PushSubscription,
)


@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ["user", "push_enabled", "send_at_time"]
    search_fields = ["user__email"]


@admin.register(NotificationLeadTime)
class NotificationLeadTimeAdmin(admin.ModelAdmin):
    list_display = ["user", "days_before"]


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "endpoint", "failure_count", "last_used_at"]
    search_fields = ["user__email", "endpoint"]
    readonly_fields = ["endpoint", "p256dh", "auth"]


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "birthday",
        "days_before",
        "target_year",
        "status",
        "scheduled_for",
    ]
    list_filter = ["status", "days_before", "target_year"]
