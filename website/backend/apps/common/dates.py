"""Domain helpers shared across apps."""
from datetime import date
from zoneinfo import ZoneInfo, available_timezones

from django.core.exceptions import ValidationError
from django.utils import timezone


def today_in_timezone(tz_name):
    """Current local date for an IANA timezone."""
    return timezone.now().astimezone(ZoneInfo(tz_name)).date()


def validate_timezone(value):
    """Validate an IANA timezone name."""
    try:
        ZoneInfo(value)
    except Exception as exc:  # noqa: BLE001 - zoneinfo raises several types
        raise ValidationError("Unknown timezone.") from exc
    if value not in available_timezones():
        raise ValidationError("Unknown timezone.")
    return value


def is_leap_year(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def occurrence_in_year(birth_month, birth_day, year):
    """Birthday occurrence in ``year``; Feb 29 falls back to Feb 28."""
    if birth_month == 2 and birth_day == 29 and not is_leap_year(year):
        return date(year, 2, 28)
    return date(year, birth_month, birth_day)


def next_occurrence(birth_month, birth_day, today):
    """First occurrence on or after ``today`` (year wrap included)."""
    candidate = occurrence_in_year(birth_month, birth_day, today.year)
    if candidate < today:
        candidate = occurrence_in_year(birth_month, birth_day, today.year + 1)
    return candidate


def current_age(birth_year, birth_month, birth_day, today):
    """Age as of ``today``; None when the birth year is unknown."""
    if not birth_year:
        return None
    if birth_year > today.year:
        return None
    age = today.year - birth_year
    try:
        had_birthday = (today.month, today.day) >= (
            birth_month,
            birth_day,
        )
    except TypeError:  # pragma: no cover - defensive
        had_birthday = True
    if birth_month == 2 and birth_day == 29 and not is_leap_year(today.year):
        had_birthday = (today.month, today.day) >= (2, 28)
    if not had_birthday:
        age -= 1
    return max(age, 0)
