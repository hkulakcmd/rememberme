from django.apps import AppConfig


class BirthdaysConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.birthdays"

    def ready(self):
        from . import signals  # noqa: F401
