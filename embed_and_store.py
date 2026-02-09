from sentence_transformers import SentenceTransformer
from uuid import uuid5, NAMESPACE_URL

from api_source import fetch_api_data
from normalize import normalize_api_data
from vector_db import QdrantStorage

# =========================================================
# EMBEDDING MODEL
# =========================================================

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
EMBED_DIM = 384

print("Loading embedding model...")
embedder = SentenceTransformer(EMBED_MODEL_NAME)

# Warm-up
embedder.encode(["warmup"], show_progress_bar=False)

# =========================================================
# MAIN PIPELINE
# =========================================================

def embed_and_store():
    print("\n[1/4] Fetching API data...")
    items = fetch_api_data()

    if not items:
        print("⚠️ No items received from API")
        return

    print(f"Fetched {len(items)} items")

    print("\n[2/4] Normalizing data...")
    normalized = normalize_api_data(items)

    texts = [obj["text"] for obj in normalized]

    # ✅ FIX: generate stable UUIDs
    ids = [
        str(uuid5(NAMESPACE_URL, f"dummyjson:{obj['id']}"))
        for obj in normalized
    ]

    payloads = [
        {
            "text": obj["text"],
            "source": "dummyjson_api",
            "raw_id": obj["id"],
        }
        for obj in normalized
    ]

    print("\n[3/4] Generating embeddings...")
    vectors = embedder.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    print("\n[4/4] Upserting vectors into Qdrant...")
    store = QdrantStorage()
    store.upsert(ids, vectors.tolist(), payloads)

    print(f"\n✅ Successfully indexed {len(ids)} items into Qdrant\n")


if __name__ == "__main__":
    embed_and_store()
