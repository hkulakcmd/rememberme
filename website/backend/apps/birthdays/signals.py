"""Keep the dashboard cache coherent with birthday writes."""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.dashboard.services import invalidate_dashboard_cache

from .models import Birthday


@receiver(post_save, sender=Birthday)
def _invalidate_on_save(sender, instance, **kwargs):
    invalidate_dashboard_cache(instance.user)


@receiver(post_delete, sender=Birthday)
def _invalidate_on_delete(sender, instance, **kwargs):
    invalidate_dashboard_cache(instance.user)
