"""Serializers for notification settings and Web Push subscriptions."""
import base64
import binascii

from rest_framework import serializers

from .models import NotificationPreferences

ALLOWED_LEAD_TIMES = {0, 1, 3, 7}


def _decode_key(value, expected_bytes, field_name):
    padded = value + "=" * (-len(value) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    except (binascii.Error, ValueError, UnicodeEncodeError) as exc:
        raise serializers.ValidationError(
            "Invalid base64url key."
        ) from exc
    if len(raw) != expected_bytes:
        raise serializers.ValidationError(
            f"Key must decode to {expected_bytes} bytes."
        )
    return value


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    send_at_time = serializers.TimeField(format="%H:%M", required=False)
    lead_times = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )

    class Meta:
        model = NotificationPreferences
        fields = ["push_enabled", "send_at_time", "lead_times"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["lead_times"] = sorted(
            instance.user.notification_lead_times.values_list(
                "days_before", flat=True
            )
        )
        return data

    def validate_lead_times(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Lead times must be unique.")
        if not set(value).issubset(ALLOWED_LEAD_TIMES):
            raise serializers.ValidationError(
                "Allowed lead times: 0, 1, 3, 7."
            )
        if len(value) > 4:
            raise serializers.ValidationError("At most four lead times.")
        return sorted(value)

    def update(self, instance, validated_data):
        lead_times = validated_data.pop("lead_times", None)
        instance = super().update(instance, validated_data)
        if lead_times is not None:
            from .models import NotificationLeadTime

            instance.user.notification_lead_times.all().delete()
            NotificationLeadTime.objects.bulk_create(
                [
                    NotificationLeadTime(
                        user=instance.user, days_before=days
                    )
                    for days in lead_times
                ]
            )
        return instance


class PushKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField()
    auth = serializers.CharField()

    def validate_p256dh(self, value):
        return _decode_key(value, 65, "p256dh")

    def validate_auth(self, value):
        return _decode_key(value, 16, "auth")


class PushSubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=500)
    keys = PushKeysSerializer()
    user_agent = serializers.CharField(
        max_length=500, required=False, allow_blank=True
    )


class PushUnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=500)
