from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "sources", "created_at"]
        read_only_fields = ["id", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    api_source_name = serializers.CharField(source="api_source.name", read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "title", "api_source", "api_source_name", "created_at", "updated_at"]
        read_only_fields = ["id", "api_source_name", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
