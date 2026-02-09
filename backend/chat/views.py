from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from sources.models import ApiSource
from sources.rag_service import search_source, query_llm


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def session_list(request):
    """List chat sessions or create a new one."""
    if request.method == "GET":
        source_id = request.query_params.get("source")
        sessions = ChatSession.objects.filter(user=request.user)
        if source_id:
            sessions = sessions.filter(api_source_id=source_id)
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        # Validate source belongs to user
        source_id = request.data.get("api_source")
        try:
            ApiSource.objects.get(pk=source_id, user=request.user)
        except ApiSource.DoesNotExist:
            return Response(
                {"error": "API source not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ChatSessionSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def session_detail(request, pk):
    """Get or delete a chat session."""
    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)

    elif request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_messages(request, pk):
    """Get all messages in a chat session."""
    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    messages = session.messages.all()
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_query(request, pk):
    """Send a question in a chat session and get an AI response."""
    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    question = request.data.get("question", "").strip()
    top_k = request.data.get("top_k", 5)

    if not question:
        return Response(
            {"error": "Question is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save user message
    ChatMessage.objects.create(
        session=session,
        role="user",
        content=question,
    )

    try:
        # Search vector store
        source = session.api_source
        results = search_source(source, question, top_k=top_k)

        # Query LLM
        answer = query_llm(question, results["contexts"])

        # Save assistant message
        assistant_msg = ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=answer,
            sources=results["sources"],
        )

        # Update session title if first message
        if session.messages.filter(role="user").count() == 1:
            session.title = question[:100]
            session.save()

        serializer = ChatMessageSerializer(assistant_msg)
        return Response(serializer.data)

    except Exception as e:
        # Save error as assistant message
        error_msg = ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=f"Error: {str(e)}",
        )
        serializer = ChatMessageSerializer(error_msg)
        return Response(serializer.data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
