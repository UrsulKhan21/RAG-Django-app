from django.contrib import admin
from .models import GoogleProfile


@admin.register(GoogleProfile)
class GoogleProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "google_id", "created_at")
    search_fields = ("user__email", "google_id")
