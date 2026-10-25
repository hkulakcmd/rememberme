"""Notification preferences and Web Push API views (api.md §6-7)."""
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.responses import data_response
from apps.common.throttling import PushTestRateThrottle

from .models import NotificationPreferences, PushSubscription
from .serializers import (
    NotificationPreferencesSerializer,
    PushSubscribeSerializer,
    PushUnsubscribeSerializer,
)
from .tasks import send_test_notification

PUBLIC_KEY_CACHE_KEY = "push:public-key"


def _preferences_for(user):
    preferences, _ = NotificationPreferences.objects.get_or_create(user=user)
    return preferences


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preferences = _preferences_for(request.user)
        return data_response(
            NotificationPreferencesSerializer(preferences).data
        )

    def patch(self, request):
        preferences = _preferences_for(request.user)
        serializer = NotificationPreferencesSerializer(
            preferences, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return data_response(serializer.data)


class PushPublicKeyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        public_key = cache.get(PUBLIC_KEY_CACHE_KEY)
        if public_key is None:
            public_key = settings.VAPID_PUBLIC_KEY
            cache.set(
                PUBLIC_KEY_CACHE_KEY,
                public_key,
                timeout=settings.PUBLIC_KEY_CACHE_TIMEOUT,
            )
        return data_response({"public_key": public_key})


class PushSubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        keys = data["keys"]
        user_agent = data.get("user_agent") or request.META.get(
            "HTTP_USER_AGENT", ""
        )

        subscription = PushSubscription.objects.filter(
            endpoint=data["endpoint"]
        ).first()
        created = subscription is None
        if created:
            subscription = PushSubscription(endpoint=data["endpoint"])
        subscription.user = request.user
        subscription.p256dh = keys["p256dh"]
        subscription.auth = keys["auth"]
        subscription.user_agent = user_agent[:500]
        subscription.failure_count = 0
        subscription.save()

        payload = {
            "id": str(subscription.id),
            "endpoint": subscription.endpoint,
        }
        return data_response(
            payload,
            status=(
                status.HTTP_201_CREATED if created else status.HTTP_200_OK
            ),
        )

    def delete(self, request):
        serializer = PushUnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PushSubscription.objects.filter(
            endpoint=serializer.validated_data["endpoint"],
            user=request.user,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PushTestView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PushTestRateThrottle]

    def post(self, request):
        queued = PushSubscription.objects.filter(
            user=request.user
        ).count()
        if queued:
            send_test_notification.delay(str(request.user.pk))
        return data_response(
            {"queued": queued}, status=status.HTTP_202_ACCEPTED
        )
