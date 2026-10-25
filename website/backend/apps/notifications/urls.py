from django.urls import path

from .views import (
    NotificationPreferencesView,
    PushPublicKeyView,
    PushSubscribeView,
    PushTestView,
)

urlpatterns = [
    path(
        "notification-preferences",
        NotificationPreferencesView.as_view(),
        name="notification-preferences",
    ),
    path(
        "push/public-key",
        PushPublicKeyView.as_view(),
        name="push-public-key",
    ),
    path(
        "push/subscribe",
        PushSubscribeView.as_view(),
        name="push-subscribe",
    ),
    path("push/test", PushTestView.as_view(), name="push-test"),
]
