"""JSON fallbacks for non-DRF 404/500 responses."""
from django.http import JsonResponse


def api_not_found(request, exception=None):
    return JsonResponse(
        {"detail": "Not found.", "code": "not_found", "fields": {}},
        status=404,
    )


def api_server_error(request):  # pragma: no cover - only used in production
    return JsonResponse(
        {
            "detail": "Internal server error.",
            "code": "server_error",
            "fields": {},
        },
        status=500,
    )
