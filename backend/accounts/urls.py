from django.urls import path
from . import views

urlpatterns = [
    path("google/login/", views.GoogleLoginView.as_view(), name="google-login"),
    path("google/callback/", views.GoogleCallbackView.as_view(), name="google-callback"),
    path("register/", views.register_view, name="register"),
    path("login/", views.email_login_view, name="email-login"),
    path("refresh/", views.refresh_view, name="token-refresh"),
    path("user/", views.current_user, name="current-user"),
    path("logout/", views.logout_view, name="logout"),
]
