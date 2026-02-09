from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ApiSource
from .serializers import ApiSourceSerializer
from .rag_service import ingest_source


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def source_list(request):
    """List all sources or create a new one."""
    if request.method == "GET":
        sources = ApiSource.objects.filter(user=request.user)
        serializer = ApiSourceSerializer(sources, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = ApiSourceSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def source_detail(request, pk):
    """Get or delete a source."""
    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response({"error": "Source not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = ApiSourceSerializer(source)
        return Response(serializer.data)

    elif request.method == "DELETE":
        # Also delete the Qdrant collection
        try:
            from .rag_service import get_qdrant_client
            client = get_qdrant_client()
            collection_name = source.collection_name
            if client.collection_exists(collection_name):
                client.delete_collection(collection_name)
        except Exception:
            pass

        source.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def source_ingest(request, pk):
    """Trigger data ingestion for a source."""
    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response({"error": "Source not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        count = ingest_source(source)
        return Response({"status": "ok", "documents_ingested": count})
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def source_sync(request, pk):
    """Re-sync (re-ingest) data for a source."""
    try:
        source = ApiSource.objects.get(pk=pk, user=request.user)
    except ApiSource.DoesNotExist:
        return Response({"error": "Source not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        count = ingest_source(source)
        return Response({"status": "ok", "documents_ingested": count})
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
