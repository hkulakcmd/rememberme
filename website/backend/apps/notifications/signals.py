"""Default notification preferences for every new account."""
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import NotificationLeadTime, NotificationPreferences

User = get_user_model()


@receiver(post_save, sender=User)
def create_notification_defaults(sender, instance, created, raw=False, **kwargs):
    if raw or not created:
        return
    NotificationPreferences.objects.get_or_create(user=instance)
    NotificationLeadTime.objects.bulk_create(
        [
            NotificationLeadTime(user=instance, days_before=0),
            NotificationLeadTime(user=instance, days_before=1),
        ],
        ignore_conflicts=True,
    )
