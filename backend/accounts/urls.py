from django.urls import path
from . import views

urlpatterns = [
    path("google/login/", views.GoogleLoginView.as_view(), name="google-login"),
    path("google/callback/", views.GoogleCallbackView.as_view(), name="google-callback"),
    path("user/", views.current_user, name="current-user"),
    path("logout/", views.logout_view, name="logout"),
]
