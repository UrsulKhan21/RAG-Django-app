from rest_framework import serializers
from .models import ApiSource


class ApiSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiSource
        fields = [
            "id",
            "source_type",
            "name",
            "agent_role",
            "api_url",
            "api_key",
            "headers",
            "pdf_file",
            "data_path",
            "status",
            "document_count",
            "error_message",
            "last_synced",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "document_count", "error_message", "last_synced", "created_at", "updated_at"]

    def validate(self, attrs):
        source_type = attrs.get(
            "source_type",
            self.instance.source_type if self.instance else "api",
        )
        api_url = attrs.get("api_url")
        pdf_file = attrs.get("pdf_file")

        if source_type == "api" and not api_url:
            raise serializers.ValidationError({"api_url": "API URL is required for API sources."})

        if source_type == "pdf":
            if not self.instance and not pdf_file:
                raise serializers.ValidationError({"pdf_file": "PDF file is required for PDF sources."})
            if pdf_file and not str(pdf_file.name).lower().endswith(".pdf"):
                raise serializers.ValidationError({"pdf_file": "Only PDF files are supported."})

        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
