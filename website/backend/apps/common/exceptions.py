"""Uniform API error envelope: {"detail", "code", "fields"} (api.md §1.2)."""
import logging
from math import ceil

from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Resource already exists."
    default_code = "conflict"


logger = logging.getLogger(__name__)


def _flatten_validation_detail(detail, prefix=""):
    """Flatten DRF validation detail into {field: [messages]}."""
    fields = {}
    if isinstance(detail, dict):
        for key, value in detail.items():
            name = f"{prefix}.{key}" if prefix else str(key)
            fields.update(_flatten_validation_detail(value, name))
    elif isinstance(detail, (list, tuple)):
        messages = []
        for item in detail:
            if isinstance(item, (dict, list, tuple)):
                fields.update(_flatten_validation_detail(item, prefix))
            else:
                messages.append(str(item))
        if messages and prefix:
            fields.setdefault(prefix, []).extend(messages)
    else:
        fields[prefix or "non_field_errors"] = [str(detail)]
    return fields


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unexpected exception: never leak internals. Let Django render the
        # technical 500 page while DEBUG is on.
        logger.exception("Unhandled API exception")
        if settings.DEBUG:
            return None
        return Response(
            {
                "detail": "Internal server error.",
                "code": "server_error",
                "fields": {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    detail = "Request failed."
    code = "error"
    fields = {}

    if isinstance(exc, ValidationError):
        detail = "Validation failed."
        code = "validation_error"
        fields = _flatten_validation_detail(exc.detail)
    elif isinstance(exc, AuthenticationFailed):
        raw_detail = exc.detail
        if isinstance(raw_detail, dict):
            detail = str(raw_detail.get("detail", "Authentication failed."))
            exc_code = str(raw_detail.get("code", ""))
        else:
            detail = str(raw_detail)
            exc_code = getattr(raw_detail, "code", None)
        code = "token_invalid" if exc_code in {
            "token_not_valid",
            "token_invalid",
        } else "not_authenticated"
        if exc_code == "invalid_credentials":
            code = "not_authenticated"
            detail = "Invalid email or password."
    elif isinstance(exc, NotAuthenticated):
        detail = "Authentication credentials were not provided."
        code = "not_authenticated"
    elif isinstance(exc, PermissionDenied):
        detail = "You do not have permission to perform this action."
        code = "permission_denied"
    elif isinstance(exc, (NotFound, Http404)):
        detail = "Not found."
        code = "not_found"
    elif isinstance(exc, Throttled):
        detail = f"Request was throttled. Try again in {ceil(exc.wait or 0)} seconds."
        code = "throttled"
        response["Retry-After"] = str(ceil(exc.wait or 0))
    elif isinstance(exc, Conflict):
        detail = str(exc.detail)
        code = "conflict"
    elif isinstance(exc, APIException):
        detail = str(exc.detail)
        code = getattr(exc, "default_code", "error")

    response.data = {"detail": detail, "code": code, "fields": fields}
    return response
