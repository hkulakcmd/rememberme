from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import BirthdaySearchView, BirthdayViewSet

router = SimpleRouter(trailing_slash=False)
router.register("birthdays", BirthdayViewSet, basename="birthday")

urlpatterns = [
    path("birthdays/search", BirthdaySearchView.as_view(), name="birthday-search"),
    *router.urls,
]
