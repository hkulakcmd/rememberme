"""Small response helpers to keep the envelope consistent."""
from rest_framework.response import Response


def data_response(data, status=200, headers=None):
    return Response({"data": data}, status=status, headers=headers)


def detail_response(detail, status=200, headers=None):
    return data_response({"detail": detail}, status=status, headers=headers)
