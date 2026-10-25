"""Authentication, profile and account-management API views."""
from contextlib import suppress

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.exceptions import Conflict
from apps.common.responses import data_response, detail_response
from apps.common.throttling import AuthRateThrottle, RefreshRateThrottle

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .serializers import (
    DeleteAccountSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    SocialAuthSerializer,
    UserSerializer,
    validate_new_password,
)
from .services import (
    authenticate_social_user,
    blacklist_all_user_tokens,
    parse_password_reset_token,
    send_password_reset_email,
)

User = get_user_model()


def _login_response(user, refresh, status_code=status.HTTP_200_OK):
    response = Response(
        {
            "data": {
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
            }
        },
        status=status_code,
    )
    set_refresh_cookie(response, refresh)
    return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError as exc:
            raise Conflict("An account with this email already exists.") from exc

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"data": {"user": UserSerializer(user).data}},
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh)
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return _login_response(user, refresh)


class RefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RefreshRateThrottle]

    def post(self, request):
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not token:
            raise AuthenticationFailed(
                "Refresh token is missing.", code="token_invalid"
            )
        serializer = TokenRefreshSerializer(data={"refresh": token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(
                {
                    "detail": "Token is invalid or expired.",
                    "code": "token_not_valid",
                }
            ) from exc
        data = serializer.validated_data

        response = data_response({"access": data["access"]})
        new_refresh = data.get("refresh")
        if new_refresh:
            set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if token:
            with suppress(TokenError):
                RefreshToken(token).blacklist()
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if token:
            with suppress(TokenError):
                RefreshToken(token).blacklist()
        blacklist_all_user_tokens(request.user)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            send_password_reset_email(user)
        # Always 202 to avoid account enumeration (api.md §2).
        return detail_response(
            "If an account with that email exists, a reset link was sent.",
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = parse_password_reset_token(serializer.validated_data["token"])
        validate_new_password(serializer.validated_data["new_password"], user)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        blacklist_all_user_tokens(user)
        return detail_response("Password has been updated.")


class SocialAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request, provider):
        if provider not in {"google", "facebook"}:
            return Response(
                {
                    "detail": "Unsupported provider.",
                    "code": "validation_error",
                    "fields": {"provider": ["Unsupported provider."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate_social_user(
            request,
            provider,
            access_token=serializer.validated_data.get("access_token"),
            id_token=serializer.validated_data.get("id_token"),
        )
        refresh = RefreshToken.for_user(user)
        return _login_response(user, refresh)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return data_response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if "timezone" in serializer.validated_data:
            from apps.dashboard.services import invalidate_dashboard_cache

            invalidate_dashboard_cache(request.user)
        return data_response(UserSerializer(request.user).data)

    def delete(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.validated_data.get("password")

        if request.user.has_usable_password():
            if not password:
                return Response(
                    {
                        "detail": "Validation failed.",
                        "code": "validation_error",
                        "fields": {"password": ["Password is required."]},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not request.user.check_password(password):
                return Response(
                    {
                        "detail": "Validation failed.",
                        "code": "validation_error",
                        "fields": {"password": ["Incorrect password."]},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user = request.user
        blacklist_all_user_tokens(user)
        user.delete()
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)
