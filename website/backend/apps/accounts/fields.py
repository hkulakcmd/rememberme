"""PostgreSQL ``citext`` email field.

Django 5.2 removed the public ``CITextField`` (kept only for historical
migrations), but ``database.md`` specifies a case-insensitive ``citext``
column. This small subclass keeps that schema without the removed API.
"""
from django.db import models


class CIEmailField(models.TextField):
    description = "Case-insensitive email address (PostgreSQL citext)"

    def db_type(self, connection):
        if connection.vendor == "postgresql":
            return "citext"
        return super().db_type(connection)

    def get_internal_type(self):
        return "TextField"
