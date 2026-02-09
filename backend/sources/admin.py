from django.contrib import admin
from .models import ApiSource


@admin.register(ApiSource)
class ApiSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "status", "document_count", "last_synced", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "api_url", "user__email")
