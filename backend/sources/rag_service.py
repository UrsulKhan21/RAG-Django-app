"""
RAG Service: Handles fetching API data, embedding, and storing in Qdrant.
"""

import hashlib
import json
import requests
from uuid import uuid5, NAMESPACE_URL

from django.conf import settings
from django.utils import timezone

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct


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


# =========================================================
# INGEST PIPELINE
# =========================================================

def ingest_source(source) -> int:
    source.status = "ingesting"
    source.error_message = ""
    source.save()

    try:
        items = fetch_api_data(
            api_url=source.api_url,
            api_key=source.api_key,
            headers=source.headers,
            data_path=source.data_path,
        )

        if not items:
            source.status = "ready"
            source.document_count = 0
            source.last_synced = timezone.now()
            source.save()
            return 0

        normalized = [normalize_item(item, i) for i, item in enumerate(items)]
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
        source.document_count = len(items)
        source.last_synced = timezone.now()
        source.save()

        return len(items)

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

def query_llm(question: str, contexts: list[str]) -> str:
    from openai import OpenAI

    if not contexts:
        return "No relevant data found in the knowledge base."

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
                    "You are a helpful assistant that answers questions ONLY using "
                    "the provided context. If the answer is not in the context, "
                    "say you don't know. Be clear and concise."
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
