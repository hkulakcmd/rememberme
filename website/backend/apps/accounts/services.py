"""Business logic for accounts: tokens, password reset, social login."""
import logging
from dataclasses import dataclass
from urllib.parse import quote

import requests
from allauth.socialaccount.models import EmailAddress, SocialAccount, SocialApp
from allauth.socialaccount.providers.facebook.provider import FacebookProvider
from allauth.socialaccount.providers.google.provider import GoogleProvider
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from .models import User

logger = logging.getLogger(__name__)

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
def blacklist_all_user_tokens(user):
    """Blacklist every outstanding refresh token for ``user``."""
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------
def make_password_reset_token(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{uid}.{token}"


def parse_password_reset_token(token):
    try:
        uidb64, django_token = token.split(".", 1)
        user_id = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=user_id, is_active=True)
    except (ValueError, TypeError, UnicodeDecodeError, User.DoesNotExist):
        raise ValidationError({"token": ["Invalid or expired token."]}) from None
    if not default_token_generator.check_token(user, django_token):
        raise ValidationError({"token": ["Invalid or expired token."]})
    return user


def send_password_reset_email(user):
    token = make_password_reset_token(user)
    link = f"{settings.FRONTEND_URL}/password-reset/confirm?token={quote(token)}"
    send_mail(
        subject="Reset your RememberMe password",
        message=(
            "Use the link below to set a new password. "
            "The link is valid for one hour.\n\n"
            f"{link}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


# ---------------------------------------------------------------------------
# OAuth (Google / Facebook) via allauth provider token verification
# ---------------------------------------------------------------------------
@dataclass
class ProviderIdentity:
    uid: str
    email: str
    email_verified: bool
    first_name: str = ""
    last_name: str = ""


def _social_app(provider):
    if provider == "google":
        return SocialApp(
            provider="google",
            name="Google",
            client_id=settings.GOOGLE_CLIENT_ID,
            secret=settings.GOOGLE_CLIENT_SECRET,
        )
    return SocialApp(
        provider="facebook",
        name="Facebook",
        client_id=settings.FACEBOOK_APP_ID,
        secret=settings.FACEBOOK_APP_SECRET,
    )


def _google_identity(request, access_token=None, id_token=None):
    app = _social_app("google")
    if id_token:
        provider = GoogleProvider(request, app=app)
        try:
            login = provider.verify_token(request, {"id_token": id_token})
        except Exception as exc:  # allauth raises adapter/requests errors
            raise ValidationError(
                {"access_token": ["Invalid Google token."]}
            ) from exc
        data = login.account.extra_data
        return ProviderIdentity(
            uid=provider.extract_uid(data),
            email=(data.get("email") or "").lower(),
            email_verified=bool(
                data.get("email_verified") or data.get("verified_email")
            ),
            first_name=data.get("given_name") or "",
            last_name=data.get("family_name") or "",
        )

    if not access_token:
        raise ValidationError({"access_token": ["This field is required."]})

    try:
        response = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ValidationError(
            {"access_token": ["Invalid Google token."]}
        ) from exc

    if not data.get("sub"):
        raise ValidationError({"access_token": ["Invalid Google token."]})
    return ProviderIdentity(
        uid=str(data["sub"]),
        email=(data.get("email") or "").lower(),
        email_verified=bool(data.get("email_verified")),
        first_name=data.get("given_name") or "",
        last_name=data.get("family_name") or "",
    )


def _facebook_identity(request, access_token=None, id_token=None):
    if not access_token and not id_token:
        raise ValidationError({"access_token": ["This field is required."]})

    app = _social_app("facebook")
    provider = FacebookProvider(request, app=app)
    token_payload = {}
    if access_token:
        token_payload["access_token"] = access_token
    if id_token:
        token_payload["id_token"] = id_token
    try:
        login = provider.verify_token(request, token_payload)
    except Exception as exc:  # allauth raises adapter/requests errors
        raise ValidationError(
            {"access_token": ["Invalid Facebook token."]}
        ) from exc

    data = login.account.extra_data
    email = (data.get("email") or "").lower()
    return ProviderIdentity(
        uid=str(provider.extract_uid(data)),
        email=email,
        # Meta-verified account email; allauth marks it unverified because
        # Facebook does not expose a per-email verified flag via Graph API.
        email_verified=bool(email),
        first_name=data.get("first_name") or "",
        last_name=data.get("last_name") or "",
    )


def verify_provider_token(request, provider, access_token=None, id_token=None):
    if provider == "google":
        return _google_identity(request, access_token, id_token)
    if provider == "facebook":
        return _facebook_identity(request, access_token, id_token)
    raise ValidationError({"provider": ["Unsupported provider."]})


def resolve_social_user(identity, provider, extra_data=None):
    """Create/link the local user for a verified provider identity."""
    if not identity.uid:
        raise ValidationError({"access_token": ["Invalid provider identity."]})

    with transaction.atomic():
        account = (
            SocialAccount.objects.select_related("user")
            .filter(provider=provider, uid=identity.uid)
            .first()
        )
        if account:
            if not account.user.is_active:
                raise AuthenticationFailed("User account is disabled.")
            return account.user

        if not identity.email:
            raise ValidationError(
                {
                    "access_token": [
                        "The provider did not return an email address."
                    ]
                }
            )
        if not identity.email_verified:
            raise ValidationError(
                {
                    "access_token": [
                        "The provider email address is not verified."
                    ]
                }
            )

        user = User.objects.filter(email__iexact=identity.email).first()
        if user is None:
            try:
                user = User.objects.create_user(
                    email=identity.email,
                    password=None,
                    first_name=identity.first_name[:150],
                    last_name=identity.last_name[:150],
                )
            except IntegrityError as exc:  # concurrent creation
                raise ValidationError(
                    {"access_token": ["Could not create the account."]}
                ) from exc
        elif not user.is_active:
            raise AuthenticationFailed("User account is disabled.")

        try:
            SocialAccount.objects.create(
                user=user,
                provider=provider,
                uid=identity.uid,
                extra_data=extra_data or {},
            )
        except IntegrityError:
            # Linked by a parallel request; use the existing account.
            account = SocialAccount.objects.select_related("user").get(
                provider=provider, uid=identity.uid
            )
            return account.user

        EmailAddress.objects.update_or_create(
            user=user,
            email=user.email,
            defaults={"verified": True, "primary": True},
        )
        return user


def authenticate_social_user(
    request, provider, access_token=None, id_token=None
):
    identity = verify_provider_token(
        request, provider, access_token=access_token, id_token=id_token
    )
    extra_data = {
        "uid": identity.uid,
        "email": identity.email,
        "email_verified": identity.email_verified,
        "first_name": identity.first_name,
        "last_name": identity.last_name,
    }
    return resolve_social_user(identity, provider, extra_data=extra_data)


def validate_new_password(password, user):
    from django.contrib.auth.password_validation import validate_password

    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise ValidationError({"new_password": list(exc.messages)}) from exc
