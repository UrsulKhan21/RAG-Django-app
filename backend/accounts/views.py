import requests
from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core import signing
from django.shortcuts import redirect
from django.urls import reverse
from django.views import View

from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from django.http import HttpResponseRedirect

from .models import GoogleProfile
from rag_backend.throttles import LoginRateThrottle, RefreshRateThrottle, RegisterRateThrottle


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def normalize_origin(value: str) -> str:
    parts = urlsplit((value or "").strip())
    if not parts.scheme or not parts.netloc:
        return ""
    return f"{parts.scheme}://{parts.netloc}"


def get_safe_frontend_origin(candidate: str) -> str:
    origin = normalize_origin(candidate)
    allowed_origins = set(getattr(settings, "FRONTEND_URLS", [settings.FRONTEND_URL]))
    return origin if origin in allowed_origins else settings.FRONTEND_URL


def get_frontend_origin_from_request(request) -> str:
    frontend_origin = request.GET.get("frontend_origin", "")
    if not frontend_origin:
        frontend_origin = request.META.get("HTTP_REFERER", "")
    return get_safe_frontend_origin(frontend_origin)


def get_frontend_origin_from_state(state: str) -> str:
    if not state:
        return settings.FRONTEND_URL

    try:
        payload = signing.loads(state, max_age=600)
    except signing.BadSignature:
        return settings.FRONTEND_URL

    return get_safe_frontend_origin(payload.get("frontend_origin", ""))


def build_google_redirect_uri(request) -> str:
    return request.build_absolute_uri(reverse("google-callback"))


def find_user_by_email_password(email: str, password: str):
    candidates = User.objects.filter(email=email).order_by("id")

    for candidate in candidates:
        if candidate.check_password(password):
            return candidate

    return None


class GoogleLoginView(View):
    """Redirect user to Google OAuth consent screen."""

    def get(self, request):
        frontend_origin = get_frontend_origin_from_request(request)
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": build_google_redirect_uri(request),
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
            "state": signing.dumps({"frontend_origin": frontend_origin}),
        }
        url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
        return redirect(url)


class GoogleCallbackView(View):
    """Handle Google OAuth callback."""

    def get(self, request):
        code = request.GET.get("code")
        error = request.GET.get("error")
        frontend_origin = get_frontend_origin_from_state(request.GET.get("state", ""))

        if error or not code:
            return redirect(f"{frontend_origin}/login?error=auth_failed")

        # Exchange code for tokens
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": build_google_redirect_uri(request),
            "grant_type": "authorization_code",
        }

        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)

        if not token_response.ok:
            return redirect(f"{frontend_origin}/login?error=token_failed")

        tokens = token_response.json()
        access_token = tokens.get("access_token", "")
        refresh_token = tokens.get("refresh_token", "")

        # Get user info
        headers = {"Authorization": f"Bearer {access_token}"}
        userinfo_response = requests.get(GOOGLE_USERINFO_URL, headers=headers)

        if not userinfo_response.ok:
            return redirect(f"{frontend_origin}/login?error=userinfo_failed")

        userinfo = userinfo_response.json()
        google_id = userinfo.get("id", "")
        email = userinfo.get("email", "")
        name = userinfo.get("name", "")
        picture = userinfo.get("picture", "")

        # Create or update user
        try:
            profile = GoogleProfile.objects.get(google_id=google_id)
            user = profile.user
            user.first_name = name.split()[0] if name else ""
            user.last_name = " ".join(name.split()[1:]) if name else ""
            user.save()
            profile.picture = picture
            profile.access_token = access_token
            if refresh_token:
                profile.refresh_token = refresh_token
            profile.save()
        except GoogleProfile.DoesNotExist:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": name.split()[0] if name else "",
                    "last_name": " ".join(name.split()[1:]) if name else "",
                },
            )
            GoogleProfile.objects.create(
                user=user,
                google_id=google_id,
                picture=picture,
                access_token=access_token,
                refresh_token=refresh_token,
            )

        refresh = RefreshToken.for_user(user)

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = HttpResponseRedirect(f"{frontend_origin}/dashboard")

        set_auth_cookies(response, access_token, refresh_token)

        return response


def set_auth_cookies(response, access_token, refresh_token):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=COOKIE_MAX_AGE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=COOKIE_MAX_AGE,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    name = (request.data.get("name") or "").strip()

    if not email or not password:
        return Response(
            {"detail": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing_users = User.objects.filter(email=email)
    if existing_users.exists():
        has_password_account = any(user.has_usable_password() for user in existing_users)
        detail = (
            "An account with this email already exists. Please log in instead."
            if has_password_account
            else "This email is already linked to a Google account. Please use Google login."
        )
        return Response(
            {"detail": detail},
            status=status.HTTP_400_BAD_REQUEST,
        )

    first_name = name.split(" ")[0] if name else ""
    last_name = " ".join(name.split(" ")[1:]) if name and len(name.split(" ")) > 1 else ""

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    refresh = RefreshToken.for_user(user)
    response = Response(
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name() or user.username,
        },
        status=status.HTTP_201_CREATED,
    )
    set_auth_cookies(response, str(refresh.access_token), str(refresh))
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def email_login_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    user = authenticate(request, username=email, password=password)
    if user is None:
        user = find_user_by_email_password(email, password)

    if user is None:
        existing_users = User.objects.filter(email=email)
        detail = "Invalid email or password."
        if existing_users.exists() and not any(user.has_usable_password() for user in existing_users):
            detail = "This email is linked to Google login only. Please continue with Google."
        return Response(
            {"detail": detail},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)
    response = Response(
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name() or user.username,
        }
    )
    set_auth_cookies(response, str(refresh.access_token), str(refresh))
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RefreshRateThrottle])
def refresh_view(request):
    token = request.COOKIES.get("refresh_token")
    if not token:
        return Response({"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        refresh = RefreshToken(token)
        access_token = str(refresh.access_token)
    except Exception:
        response = Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response

    response = Response({"status": "ok"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=COOKIE_MAX_AGE,
    )
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return current authenticated user info."""
    user = request.user
    picture = ""
    try:
        picture = user.google_profile.picture
    except GoogleProfile.DoesNotExist:
        pass

    return Response(
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name() or user.username,
            "picture": picture,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({"status": "ok"})
    response.delete_cookie(
        "access_token",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        "refresh_token",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
    )
    return response

