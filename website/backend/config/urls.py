from django.urls import include, path

handler404 = "apps.common.views.api_not_found"
handler500 = "apps.common.views.api_server_error"

urlpatterns = [
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.birthdays.urls")),
    path("api/v1/", include("apps.dashboard.urls")),
    path("api/v1/", include("apps.notifications.urls")),
]
