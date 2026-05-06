"""
RAG Service: Handles fetching API data, embedding, and storing in Qdrant.
"""

import hashlib
import json
import math
import requests
import re
import time
from uuid import uuid5, NAMESPACE_URL
from typing import Any

from django.conf import settings
from django.utils import timezone

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from pypdf import PdfReader


# =========================================================
# SINGLETON EMBEDDER CLIENT
# =========================================================

_embedder = None
_last_embed_request_at = 0.0


def get_embedder() -> Any:
    global _embedder
    if _embedder is None:
        if settings.EMBED_PROVIDER == "sentence_transformers":
            from sentence_transformers import SentenceTransformer

            _embedder = SentenceTransformer(
                settings.EMBED_MODEL_NAME,
                device=settings.SENTENCE_TRANSFORMERS_DEVICE,
            )
        else:
            from google import genai

            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not set.")

            _embedder = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _embedder


def normalize_vector(values: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in values))
    if magnitude == 0:
        return values
    return [value / magnitude for value in values]


def get_retry_delay_seconds(exc: Exception, fallback: float) -> float:
    message = str(exc)
    retry_delay_match = re.search(r"'retryDelay':\s*'(\d+(?:\.\d+)?)s'", message)
    if retry_delay_match:
        return float(retry_delay_match.group(1)) + 1

    retry_in_match = re.search(r"retry in (\d+(?:\.\d+)?)s", message, re.IGNORECASE)
    if retry_in_match:
        return float(retry_in_match.group(1)) + 1

    return fallback


def wait_for_embed_slot() -> None:
    global _last_embed_request_at

    delay = max(0, settings.EMBED_REQUEST_DELAY_SECONDS)
    elapsed = time.monotonic() - _last_embed_request_at
    if elapsed < delay:
        time.sleep(delay - elapsed)

    _last_embed_request_at = time.monotonic()


def embed_texts(texts: list[str], task_type: str) -> list[list[float]]:
    if not texts:
        return []

    client = get_embedder()
    vectors: list[list[float]] = []
    batch_size = max(1, settings.EMBED_BATCH_SIZE)
    max_retries = max(1, settings.EMBED_MAX_RETRIES)

    if settings.EMBED_PROVIDER == "sentence_transformers":
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = client.encode(
                batch,
                batch_size=batch_size,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            vectors.extend(embedding.tolist() for embedding in embeddings)
        return vectors

    from google.genai import types

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = None
        for attempt in range(max_retries):
            try:
                wait_for_embed_slot()
                response = client.models.embed_content(
                    model=settings.EMBED_MODEL_NAME,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=settings.EMBED_DIM,
                    ),
                )
                break
            except Exception as exc:
                if attempt == max_retries - 1:
                    raise
                fallback_delay = min(60, 2 * (attempt + 1))
                time.sleep(get_retry_delay_seconds(exc, fallback_delay))

        vectors.extend(
            normalize_vector(list(embedding.values))
            for embedding in response.embeddings
        )

    return vectors


# =========================================================
# QDRANT CLIENT
# =========================================================

_qdrant_client = None


def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )
    return _qdrant_client


# =========================================================
# DATA FETCHING
# =========================================================

def fetch_api_data(api_url: str, api_key: str = "", headers: dict = None, data_path: str = "") -> list[dict]:
    request_headers = headers or {}
    if api_key:
        request_headers["Authorization"] = f"Bearer {api_key}"

    response = requests.get(api_url, headers=request_headers, timeout=60)
    response.raise_for_status()

    data = response.json()

    # Navigate JSON path
    if data_path:
        for key in data_path.split("."):
            key = key.strip()
            if isinstance(data, dict) and key in data:
                data = data[key]
            else:
                raise ValueError(f"Path '{data_path}' not found in API response")

    # Ensure list
    if isinstance(data, dict):
        data = [data]

    if not isinstance(data, list):
        raise ValueError("API response is not a list or object")

    return data


# =========================================================
# NORMALIZATION
# =========================================================

def normalize_item(item: dict, index: int) -> dict:
    lines = []
    for key, value in item.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value, ensure_ascii=False)
        lines.append(f"{key}: {value}")

    text = "\n".join(lines)
    item_id = str(item.get("id", index))
    item_hash = hashlib.sha256(json.dumps(item, sort_keys=True).encode()).hexdigest()

    return {
        "id": item_id,
        "text": text,
        "hash": item_hash,
    }


def chunk_normalized_record(record: dict, max_chars: int = 1200, overlap: int = 200) -> list[dict]:
    text = record["text"]
    if len(text) <= max_chars:
        return [record]

    chunks = []
    start = 0
    chunk_idx = 0

    while start < len(text):
        end = min(start + max_chars, len(text))
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunk_idx += 1
            chunk_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
            chunks.append(
                {
                    "id": f"{record['id']}_chunk_{chunk_idx}",
                    "text": chunk_text,
                    "hash": chunk_hash,
                }
            )
        if end == len(text):
            break
        start = max(end - overlap, 0)

    return chunks


def normalize_pdf_chunks(pdf_path: str) -> list[dict]:
    reader = PdfReader(pdf_path)
    normalized = []

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue

        chunk_size = 1200
        overlap = 200
        start = 0
        chunk_idx = 0

        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunk_idx += 1
                chunk_id = f"page_{page_index}_chunk_{chunk_idx}"
                chunk_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
                normalized.append(
                    {
                        "id": chunk_id,
                        "text": f"Page {page_index}: {chunk_text}",
                        "hash": chunk_hash,
                    }
                )
            if end == len(text):
                break
            start = max(end - overlap, 0)

    return normalized


# =========================================================
# INGEST PIPELINE
# =========================================================

def ingest_source(source) -> int:
    source.status = "ingesting"
    source.error_message = ""
    source.save()

    try:
        if source.source_type == "pdf":
            if not source.pdf_file:
                raise ValueError("PDF source has no file attached.")
            normalized = normalize_pdf_chunks(source.pdf_file.path)
        else:
            items = fetch_api_data(
                api_url=source.api_url,
                api_key=source.api_key,
                headers=source.headers,
                data_path=source.data_path,
            )
            normalized = []
            for i, item in enumerate(items):
                normalized.extend(chunk_normalized_record(normalize_item(item, i)))

        if not normalized:
            source.status = "ready"
            source.document_count = 0
            source.last_synced = timezone.now()
            source.save()
            return 0

        client = get_qdrant_client()
        collection_name = source.collection_name

        # Check if collection exists
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]

        if collection_name in collection_names:
            client.delete_collection(collection_name)

        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=settings.EMBED_DIM,
                distance=Distance.COSINE,
            ),
        )

        indexed_count = 0
        batch_size = max(1, settings.EMBED_BATCH_SIZE)
        for i in range(0, len(normalized), batch_size):
            batch_records = normalized[i : i + batch_size]
            batch_vectors = embed_texts(
                [obj["text"] for obj in batch_records],
                task_type="RETRIEVAL_DOCUMENT",
            )
            points = [
                PointStruct(
                    id=str(uuid5(NAMESPACE_URL, f"{source.id}:{obj['id']}")),
                    vector=batch_vectors[index],
                    payload={
                        "text": obj["text"],
                        "source_id": source.id,
                        "source_name": source.name,
                        "source_type": source.source_type,
                        "raw_id": obj["id"],
                        "hash": obj["hash"],
                    },
                )
                for index, obj in enumerate(batch_records)
            ]
            client.upsert(collection_name=collection_name, points=points)
            indexed_count += len(batch_records)

        source.status = "ready"
        source.document_count = indexed_count
        source.last_synced = timezone.now()
        source.save()

        return len(normalized)

    except Exception as e:
        source.status = "error"
        source.error_message = "Indexing failed. Please retry or use a smaller source."
        source.save()
        raise


# =========================================================
# SEARCH
# =========================================================

def search_source(source, query: str, top_k: int = 5) -> dict:
    top_k = max(1, min(top_k, settings.RAG_MAX_TOP_K))
    query_vector = embed_texts([query], task_type="RETRIEVAL_QUERY")[0]

    client = get_qdrant_client()
    collection_name = source.collection_name

    # Check collection exists
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if collection_name not in collection_names:
        return {"contexts": [], "sources": []}

    if hasattr(client, "query_points"):
        response = client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=top_k,
            with_payload=True,
        )
        results = response.points
    else:
        results = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_k,
            with_payload=True,
        )

    contexts = []
    sources_set = set()

    for r in results:
        payload = r.payload or {}
        if "text" in payload:
            contexts.append(payload["text"])
        if "source_name" in payload:
            sources_set.add(payload["source_name"])

    return {
        "contexts": contexts,
        "sources": list(sources_set),
    }


# =========================================================
# LLM QUERY
# =========================================================

def trim_text(value: str, max_chars: int) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= max_chars:
        return value
    return value[:max_chars].rsplit(" ", 1)[0].strip()


def build_context_block(contexts: list[str]) -> str:
    max_total = settings.LLM_MAX_CONTEXT_CHARS
    max_chunk = settings.LLM_MAX_CONTEXT_CHARS_PER_CHUNK
    remaining = max_total
    trimmed_contexts = []

    for context in contexts:
        if remaining <= 0:
            break

        chunk = trim_text(context, min(max_chunk, remaining))
        if not chunk:
            continue

        trimmed_contexts.append(f"- {chunk}")
        remaining -= len(chunk)

    return "\n\n".join(trimmed_contexts)


def build_history_block(history: list[dict]) -> str:
    max_total = settings.LLM_MAX_HISTORY_CHARS
    remaining = max_total
    lines = []

    for msg in reversed(history):
        content = trim_text(msg.get("content", ""), remaining)
        if not content:
            continue

        role = msg.get("role", "message").capitalize()
        line = f"{role}: {content}"
        lines.append(line)
        remaining -= len(line)

        if remaining <= 0:
            break

    lines.reverse()
    return "\n".join(lines)


def query_llm(
    question: str,
    contexts: list[str],
    agent_role: str = "",
    history: list[dict] | None = None,
) -> str:
    from openai import OpenAI

    role_block = agent_role.strip() if agent_role else (
        "You are a helpful assistant that answers questions using only the provided context."
    )

    structure_block = (
        "Return the answer in this markdown structure:\n"
        "## Answer\n"
        "- 2 to 5 concise bullet points with direct answer.\n"
        "## Key Facts from Data\n"
        "- Bullet list of concrete facts found in context.\n"
        "## Sources Used\n"
        "- Short bullet list of evidence snippets.\n"
        "If data is missing, say it clearly in '## Answer' and keep other sections brief."
    )

    if not contexts:
        return (
            "## Answer\n"
            "- I could not find relevant information in your indexed data.\n"
            "## Key Facts from Data\n"
            "- No matching context was retrieved.\n"
            "## Sources Used\n"
            "- None"
        )

    context_block = build_context_block(contexts)
    history = history or []
    history_block = build_history_block(history)

    user_prompt_parts = []
    if history_block:
        user_prompt_parts.append(
            "Recent conversation history from this same chat session:\n"
            f"{history_block}"
        )
    user_prompt_parts.append(f"Context:\n{context_block}")
    user_prompt_parts.append(f"Question: {question}")
    user_prompt = "\n\n".join(user_prompt_parts)

    client = OpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )

    response = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"{role_block}\n\n"
                    "You must answer ONLY using provided context. "
                    "Use recent conversation history only to resolve references such as pronouns, ellipsis, and follow-up questions. "
                    "Never treat chat history as factual evidence unless the same point is supported by the provided context. "
                    "If answer is not in context, explicitly say you do not know.\n\n"
                    f"{structure_block}"
                ),
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        temperature=0.2,
        max_tokens=settings.LLM_MAX_TOKENS,
    )

    return response.choices[0].message.content.strip()
