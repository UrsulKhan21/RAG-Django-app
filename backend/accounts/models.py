from django.db import models
from django.contrib.auth.models import User


class GoogleProfile(models.Model):
    """Stores Google OAuth profile data linked to Django User."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="google_profile")
    google_id = models.CharField(max_length=255, unique=True)
    picture = models.URLField(blank=True, default="")
    access_token = models.TextField(blank=True, default="")
    refresh_token = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} (Google)"
