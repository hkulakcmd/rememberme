"""Serializers for auth, profile and social login."""
import zoneinfo

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.exceptions import Conflict

from .models import User
from .services import validate_new_password


def _validate_timezone(value):
    try:
        if value not in zoneinfo.available_timezones():
            raise KeyError(value)
        zoneinfo.ZoneInfo(value)
    except (KeyError, ValueError) as exc:
        raise serializers.ValidationError("Unknown timezone.") from exc
    return value


class UserSerializer(serializers.ModelSerializer):
    auth_methods = serializers.ListField(read_only=True)
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "timezone",
            "auth_methods",
            "created_at",
        ]
        read_only_fields = ["id", "email", "auth_methods", "created_at"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    timezone = serializers.CharField(max_length=64)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "timezone"]

    def validate_timezone(self, value):
        return _validate_timezone(value)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, style={"input_type": "password"}
    )
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")
    timezone = serializers.CharField(max_length=64, required=False, default="UTC")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise Conflict("An account with this email already exists.")
        return value

    def validate_timezone(self, value):
        return _validate_timezone(value)

    def validate(self, attrs):
        candidate = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs.get("password"), user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"password": list(exc.messages)}
            ) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, style={"input_type": "password"}
    )

    def validate(self, attrs):
        from django.contrib.auth import authenticate

        request = self.context.get("request")
        user = authenticate(
            request=request,
            username=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None:
            from rest_framework.exceptions import AuthenticationFailed

            raise AuthenticationFailed(
                "Invalid email or password.", code="invalid_credentials"
            )
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, trim_whitespace=False, style={"input_type": "password"}
    )


class SocialAuthSerializer(serializers.Serializer):
    access_token = serializers.CharField(required=False, allow_blank=False)
    id_token = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        if not attrs.get("access_token") and not attrs.get("id_token"):
            raise serializers.ValidationError(
                {"access_token": ["Provide access_token or id_token."]}
            )
        return attrs


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(
        required=False,
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )


__all__ = [
    "DeleteAccountSerializer",
    "LoginSerializer",
    "PasswordResetConfirmSerializer",
    "PasswordResetRequestSerializer",
    "ProfileUpdateSerializer",
    "RegisterSerializer",
    "SocialAuthSerializer",
    "UserSerializer",
    "validate_new_password",
]
