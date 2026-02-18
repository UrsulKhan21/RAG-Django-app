from django.db import models
from django.contrib.auth.models import User


class ApiSource(models.Model):
    """An API data source that users can connect and ingest data from."""

    SOURCE_TYPE_CHOICES = [
        ("api", "API"),
        ("pdf", "PDF"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("ingesting", "Ingesting"),
        ("ready", "Ready"),
        ("error", "Error"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_sources")
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPE_CHOICES, default="api")
    name = models.CharField(max_length=255)
    agent_role = models.TextField(
        blank=True,
        default="",
        help_text="Optional custom role/instructions for the AI agent for this source.",
    )
    api_url = models.URLField(max_length=2000, blank=True, default="")
    api_key = models.CharField(max_length=500, blank=True, default="")
    headers = models.JSONField(default=dict, blank=True)
    pdf_file = models.FileField(upload_to="source_pdfs/", blank=True, null=True)
    data_path = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="JSON path to the array of items, e.g. 'products' or 'data.items'",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    document_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    last_synced = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.source_type == "pdf":
            return f"{self.name} (PDF)"
        return f"{self.name} ({self.api_url})"

    @property
    def collection_name(self):
        """Qdrant collection name for this source."""
        return f"source_{self.id}_{self.user.id}"
