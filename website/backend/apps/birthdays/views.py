"""Birthday CRUD, search and ordering (api.md §4)."""
from django.db.models import Case, F, IntegerField, Q, Value, When
from django.db.models.functions import Concat
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.dates import today_in_timezone
from apps.common.responses import data_response
from apps.common.throttling import SearchRateThrottle

from .models import Birthday
from .serializers import BirthdaySearchResultSerializer, BirthdaySerializer

ALLOWED_ORDERINGS = {
    "first_name",
    "-first_name",
    "last_name",
    "-last_name",
    "date",
    "-date",
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
}


def _with_full_name(queryset):
    return queryset.annotate(
        search_name=Concat(
            F("first_name"), Value(" "), F("last_name")
        )
    )


class BirthdayViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BirthdaySerializer

    def get_queryset(self):
        return Birthday.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _filtered_queryset(self):
        queryset = _with_full_name(self.get_queryset())
        search = self.request.query_params.get("search")
        if search is not None:
            search = search.strip()
            if len(search) < 3:
                raise ValidationError(
                    {"search": ["Enter at least 3 characters."]}
                )
            queryset = queryset.filter(search_name__icontains=search)

        ordering = self.request.query_params.get("ordering", "first_name")
        if ordering not in ALLOWED_ORDERINGS:
            raise ValidationError(
                {
                    "ordering": [
                        "Allowed: " + ", ".join(sorted(ALLOWED_ORDERINGS))
                    ]
                }
            )

        if ordering in {"date", "-date"}:
            today = today_in_timezone(self.request.user.timezone)
            queryset = queryset.annotate(
                _date_wrap=Case(
                    When(
                        Q(birth_month__gt=today.month)
                        | Q(
                            birth_month=today.month,
                            birth_day__gte=today.day,
                        ),
                        then=Value(0),
                    ),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            if ordering == "date":
                return queryset.order_by(
                    "_date_wrap", "birth_month", "birth_day", "first_name"
                )
            return queryset.order_by(
                "-_date_wrap", "-birth_month", "-birth_day", "-first_name"
            )

        return queryset.order_by(ordering, "last_name")

    def list(self, request, *args, **kwargs):
        queryset = self._filtered_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return data_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return data_response(self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return data_response(
            serializer.data, status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return data_response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BirthdaySearchView(APIView):
    """Autocomplete alias: max 10 results, min 2 characters."""

    throttle_classes = [SearchRateThrottle]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        if len(query) < 2:
            raise ValidationError(
                {"q": ["Enter at least 2 characters."]}
            )
        queryset = (
            _with_full_name(Birthday.objects.filter(user=request.user))
            .filter(search_name__icontains=query)
            .order_by("first_name", "last_name")[:10]
        )
        serializer = BirthdaySearchResultSerializer(queryset, many=True)
        return data_response(serializer.data)
