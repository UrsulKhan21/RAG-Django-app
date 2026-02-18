"""
RAG Service: Handles fetching API data, embedding, and storing in Qdrant.
"""

import hashlib
import json
import requests
import re
from uuid import uuid5, NAMESPACE_URL

from django.conf import settings
from django.utils import timezone

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from pypdf import PdfReader


# =========================================================
# SINGLETON EMBEDDER
# =========================================================

_embedder = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(settings.EMBED_MODEL_NAME)
        _embedder.encode(["warmup"], show_progress_bar=False)
    return _embedder


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
            normalized = [normalize_item(item, i) for i, item in enumerate(items)]

        if not normalized:
            source.status = "ready"
            source.document_count = 0
            source.last_synced = timezone.now()
            source.save()
            return 0

        texts = [obj["text"] for obj in normalized]

        embedder = get_embedder()
        vectors = embedder.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

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

        ids = [
            str(uuid5(NAMESPACE_URL, f"{source.id}:{obj['id']}"))
            for obj in normalized
        ]

        payloads = [
            {
                "text": obj["text"],
                "source_id": source.id,
                "source_name": source.name,
                "source_type": source.source_type,
                "raw_id": obj["id"],
                "hash": obj["hash"],
            }
            for obj in normalized
        ]

        points = [
            PointStruct(id=ids[i], vector=vectors[i].tolist(), payload=payloads[i])
            for i in range(len(ids))
        ]

        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            client.upsert(collection_name=collection_name, points=batch)

        source.status = "ready"
        source.document_count = len(normalized)
        source.last_synced = timezone.now()
        source.save()

        return len(normalized)

    except Exception as e:
        source.status = "error"
        source.error_message = str(e)[:500]
        source.save()
        raise


# =========================================================
# SEARCH
# =========================================================

def search_source(source, query: str, top_k: int = 5) -> dict:
    embedder = get_embedder()
    query_vector = embedder.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )[0].tolist()

    client = get_qdrant_client()
    collection_name = source.collection_name

    # Check collection exists
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if collection_name not in collection_names:
        return {"contexts": [], "sources": []}

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

def query_llm(question: str, contexts: list[str], agent_role: str = "") -> str:
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

    context_block = "\n\n".join(f"- {c}" for c in contexts)

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
                    "If answer is not in context, explicitly say you do not know.\n\n"
                    f"{structure_block}"
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context_block}\n\nQuestion: {question}",
            },
        ],
        temperature=0.2,
        max_tokens=1024,
    )

    return response.choices[0].message.content.strip()
