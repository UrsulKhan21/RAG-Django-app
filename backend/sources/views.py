import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import parser_classes

from .models import ApiSource
from .serializers import ApiSourceSerializer
from .rag_service import ingest_source, get_qdrant_client
from rag_backend.throttles import SourceWriteRateThrottle

logger = logging.getLogger(__name__)
GENERIC_INGEST_ERROR = "We could not finish indexing this source. Please try again with a smaller file or retry later."
GENERIC_DELETE_ERROR = "We could not delete this source right now. Please try again."


# =========================================================
# LIST + CREATE SOURCES
# =========================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def source_list(request):
    """List all sources or create a new one."""

    if request.method == "GET":
        sources = ApiSource.objects.filter(user=request.user).order_by("-created_at")
        serializer = ApiSourceSerializer(sources, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = ApiSourceSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =========================================================
# GET OR DELETE SINGLE SOURCE
# =========================================================

@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def source_detail(request, pk):
    """Retrieve or delete a source."""

    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response(
            {"error": "Source not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = ApiSourceSerializer(source)
        return Response(serializer.data)

    elif request.method == "DELETE":
        try:
            client = get_qdrant_client()
            collection_name = source.collection_name

            # Get all collections
            collections = client.get_collections().collections
            collection_names = [c.name for c in collections]

            # Delete if exists
            if collection_name in collection_names:
                client.delete_collection(collection_name)

        except Exception:
            logger.exception("Failed to delete source %s for user %s", source.id, request.user.id)
            return Response(
            {"error": GENERIC_DELETE_ERROR},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if source.pdf_file:
        source.pdf_file.delete(save=False)
    source.delete()

    return Response(
        {"message": "Source and Qdrant collection deleted successfully"},
        status=status.HTTP_200_OK,
    )


# =========================================================
# INGEST SOURCE
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([SourceWriteRateThrottle])
def source_ingest(request, pk):
    """Trigger ingestion pipeline."""

    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response(
            {"error": "Source not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        count = ingest_source(source)
        return Response(
            {"status": "ok", "documents_ingested": count},
            status=status.HTTP_200_OK
        )

    except Exception:
        logger.exception("Failed to ingest source %s for user %s", source.id, request.user.id)
        return Response(
            {"error": GENERIC_INGEST_ERROR},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =========================================================
# RE-SYNC SOURCE
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([SourceWriteRateThrottle])
def source_sync(request, pk):
    """Re-run ingestion pipeline."""

    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response(
            {"error": "Source not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        count = ingest_source(source)
        return Response(
            {"status": "ok", "documents_ingested": count},
            status=status.HTTP_200_OK
        )

    except Exception:
        logger.exception("Failed to sync source %s for user %s", source.id, request.user.id)
        return Response(
            {"error": GENERIC_INGEST_ERROR},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
