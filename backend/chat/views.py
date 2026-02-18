from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from sources.models import ApiSource
from sources.rag_service import search_source, query_llm


# =========================================================
# SESSION LIST + CREATE
# =========================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def session_list(request):
    """List chat sessions or create a new one."""

    if request.method == "GET":
        source_id = request.query_params.get("source")

        sessions = ChatSession.objects.filter(user=request.user).order_by("-updated_at")

        if source_id:
            sessions = sessions.filter(api_source_id=source_id)

        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        source_id = request.data.get("api_source")

        if not source_id:
            return Response(
                {"error": "api_source is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ApiSource.objects.get(pk=source_id, user=request.user)
        except ApiSource.DoesNotExist:
            return Response(
                {"error": "API source not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ChatSessionSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =========================================================
# SESSION DETAIL
# =========================================================

@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def session_detail(request, pk):
    """Retrieve or delete a chat session."""

    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {"error": "Session not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)

    elif request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =========================================================
# SESSION MESSAGES
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_messages(request, pk):
    """Return all messages in a session."""

    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {"error": "Session not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    messages = session.messages.all().order_by("created_at")
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)


# =========================================================
# QUERY SESSION (RAG + LLM)
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_query(request, pk):
    """Send a question and receive AI response."""

    try:
        session = ChatSession.objects.get(pk=pk, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {"error": "Session not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    question = request.data.get("question", "").strip()
    top_k = int(request.data.get("top_k", 5))

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
        source = session.api_source

        # 🔍 Search vector DB
        results = search_source(source, question, top_k=top_k)

        contexts = results.get("contexts", [])
        sources_used = results.get("sources", [])

        if not contexts:
            answer = "I couldn't find relevant information in your indexed data."
        else:
            # 🤖 Query LLM
            answer = query_llm(question, contexts, agent_role=source.agent_role)

        # Save assistant message
        assistant_msg = ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=answer,
            sources=sources_used,
        )

        # Update title on first user message
        if session.messages.filter(role="user").count() == 1:
            session.title = question[:100]
            session.save()

        serializer = ChatMessageSerializer(assistant_msg)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        error_message = f"Error: {str(e)}"

        error_msg = ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=error_message,
        )

        serializer = ChatMessageSerializer(error_msg)
        return Response(serializer.data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
