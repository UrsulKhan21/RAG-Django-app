import requests
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.views import View

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from django.http import HttpResponseRedirect

from .models import GoogleProfile


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


class GoogleLoginView(View):
    """Redirect user to Google OAuth consent screen."""

    def get(self, request):
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
        return redirect(url)


class GoogleCallbackView(View):
    """Handle Google OAuth callback."""

    def get(self, request):
        code = request.GET.get("code")
        error = request.GET.get("error")

        if error or not code:
            return redirect(f"{settings.FRONTEND_URL}?error=auth_failed")

        # Exchange code for tokens
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)

        if not token_response.ok:
            return redirect(f"{settings.FRONTEND_URL}?error=token_failed")

        tokens = token_response.json()
        access_token = tokens.get("access_token", "")
        refresh_token = tokens.get("refresh_token", "")

        # Get user info
        headers = {"Authorization": f"Bearer {access_token}"}
        userinfo_response = requests.get(GOOGLE_USERINFO_URL, headers=headers)

        if not userinfo_response.ok:
            return redirect(f"{settings.FRONTEND_URL}?error=userinfo_failed")

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

        response = HttpResponseRedirect(f"{settings.FRONTEND_URL}/dashboard")

        set_auth_cookies(response, access_token, refresh_token)

        return response


def set_auth_cookies(response, access_token, refresh_token):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # True in production (HTTPS)
        samesite="Lax",
        max_age=COOKIE_MAX_AGE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=COOKIE_MAX_AGE,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    name = (request.data.get("name") or "").strip()

    if not email or not password:
        return Response(
            {"detail": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {"detail": "An account with this email already exists."},
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
def email_login_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid email or password."},
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
        secure=False,
        samesite="Lax",
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
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response

