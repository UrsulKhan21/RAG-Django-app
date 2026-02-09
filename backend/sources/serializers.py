from rest_framework import serializers
from .models import ApiSource


class ApiSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiSource
        fields = [
            "id",
            "name",
            "api_url",
            "api_key",
            "headers",
            "data_path",
            "status",
            "document_count",
            "error_message",
            "last_synced",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "document_count", "error_message", "last_synced", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
