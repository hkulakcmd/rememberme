"""Birthday model (database.md §3.3)."""
import uuid

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex, OpClass
from django.db import models
from django.db.models import F, Q, Value
from django.db.models.functions import Concat


class Birthday(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="birthdays",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default="")
    birth_month = models.PositiveSmallIntegerField()
    birth_day = models.PositiveSmallIntegerField()
    birth_year = models.SmallIntegerField(null=True, blank=True)
    relationship = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "birthdays"
        ordering = ["first_name", "last_name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(birth_month__gte=1, birth_month__lte=12),
                name="birthdays_valid_month",
            ),
            models.CheckConstraint(
                condition=Q(birth_day__gte=1, birth_day__lte=31),
                name="birthdays_valid_day_number",
            ),
            models.CheckConstraint(
                condition=Q(birth_year__isnull=True)
                | Q(birth_year__gte=1800, birth_year__lte=2100),
                name="birthdays_valid_year",
            ),
            models.CheckConstraint(
                condition=~Q(birth_month__in=[4, 6, 9, 11], birth_day=31)
                & ~Q(birth_month=2, birth_day__gt=29),
                name="birthdays_valid_day",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "birth_month", "birth_day"],
                name="birthdays_user_date_idx",
            ),
            GinIndex(
                OpClass(
                    Concat(
                        F("first_name"), Value(" "), F("last_name")
                    ),
                    name="gin_trgm_ops",
                ),
                name="birthdays_search_idx",
            ),
        ]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
