"""Birthday serializers with computed date fields (api.md §4)."""
import datetime

from rest_framework import serializers

from apps.common.dates import (
    current_age,
    next_occurrence,
    today_in_timezone,
)

from .models import Birthday

MAX_BIRTHDAYS_PER_USER = 5000


def _today_for_user(user):
    return today_in_timezone(user.timezone)


def validate_birth_date(month, day):
    """Reject dates that never exist (Feb 30, Apr 31, month 13...)."""
    if not 1 <= month <= 12:
        raise serializers.ValidationError(
            {"birth_month": ["Month must be between 1 and 12."]}
        )
    # 2000 is a leap year, so Feb 29 is accepted.
    try:
        datetime.date(2000, month, day)
    except ValueError as exc:
        raise serializers.ValidationError(
            {"birth_day": ["Day is out of range for month."]}
        ) from exc


class BirthdaySerializer(serializers.ModelSerializer):
    next_occurrence = serializers.SerializerMethodField()
    days_until = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Birthday
        fields = [
            "id",
            "first_name",
            "last_name",
            "birth_month",
            "birth_day",
            "birth_year",
            "relationship",
            "notes",
            "next_occurrence",
            "days_until",
            "age",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "birth_month": {"min_value": 1, "max_value": 12},
            "birth_day": {"min_value": 1, "max_value": 31},
            "birth_year": {"min_value": 1800, "max_value": 2100},
            "notes": {"max_length": 2000},
        }

    def validate(self, attrs):
        instance = self.instance
        month = attrs.get(
            "birth_month", getattr(instance, "birth_month", None)
        )
        day = attrs.get("birth_day", getattr(instance, "birth_day", None))
        if month is not None and day is not None:
            validate_birth_date(month, day)

        if "notes" in attrs and len(attrs["notes"] or "") > 2000:
            raise serializers.ValidationError(
                {"notes": ["Ensure this field has no more than 2000 characters."]}
            )

        if instance is None:
            request = self.context.get("request")
            if (
                request
                and Birthday.objects.filter(user=request.user).count()
                >= MAX_BIRTHDAYS_PER_USER
            ):
                raise serializers.ValidationError(
                    "Birthday limit reached (5000)."
                )
        return attrs

    def _today(self):
        if not hasattr(self, "_today_cache"):
            request = self.context.get("request")
            user = request.user if request else self.context["user"]
            self._today_cache = _today_for_user(user)
        return self._today_cache

    def get_next_occurrence(self, obj):
        return next_occurrence(
            obj.birth_month, obj.birth_day, self._today()
        ).isoformat()

    def get_days_until(self, obj):
        today = self._today()
        return (
            next_occurrence(obj.birth_month, obj.birth_day, today) - today
        ).days

    def get_age(self, obj):
        return current_age(
            obj.birth_year,
            obj.birth_month,
            obj.birth_day,
            self._today(),
        )


class BirthdaySearchResultSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Birthday
        fields = ["id", "full_name", "birth_month", "birth_day"]
