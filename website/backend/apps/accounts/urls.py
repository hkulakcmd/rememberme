from django.urls import path

from .views import (
    LoginView,
    LogoutAllView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshView,
    RegisterView,
    SocialAuthView,
)

app_name = "accounts"

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="register"),
    path("auth/login", LoginView.as_view(), name="login"),
    path("auth/refresh", RefreshView.as_view(), name="refresh"),
    path("auth/logout", LogoutView.as_view(), name="logout"),
    path("auth/logout-all", LogoutAllView.as_view(), name="logout-all"),
    path(
        "auth/password/reset",
        PasswordResetRequestView.as_view(),
        name="password-reset",
    ),
    path(
        "auth/password/reset/confirm",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path(
        "auth/social/<str:provider>",
        SocialAuthView.as_view(),
        name="social-auth",
    ),
    path("me", MeView.as_view(), name="me"),
]
