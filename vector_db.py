import requests
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import os

class QdrantStorage:
    def __init__(
        self,
        url: str = "http://localhost:6333",
        collection: str = "api_products",
        dim: int = 384,
    ):
        self.url = url.rstrip("/")
        self.collection = collection

        # Still use client ONLY for create/upsert (these work fine)
        self.client = QdrantClient(url=self.url)

        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=dim,
                    distance=Distance.COSINE,
                ),
            )

    # ---------------- UPSERT ---------------- #

    def upsert(self, ids, vectors, payloads):
        points = [
            PointStruct(
                id=ids[i],
                vector=vectors[i],
                payload=payloads[i],
            )
            for i in range(len(ids))
        ]

        self.client.upsert(
            collection_name=self.collection,
            points=points,
        )

    # ---------------- SEARCH (REST – ALWAYS WORKS) ---------------- #

    def search(self, query_vector, top_k: int = 5):
        endpoint = f"{self.url}/collections/{self.collection}/points/search"

        # ✅ FIX: convert numpy array → Python list
        if hasattr(query_vector, "tolist"):
            query_vector = query_vector.tolist()

        payload = {
            "vector": query_vector,
            "limit": top_k,
            "with_payload": True,
        }

        response = requests.post(endpoint, json=payload, timeout=30)
        response.raise_for_status()

        results = response.json().get("result", [])

        contexts = []
        sources = set()

        for r in results:
            payload = r.get("payload", {}) or {}
            if "text" in payload:
                contexts.append(payload["text"])
            if "source" in payload:
                sources.add(payload["source"])

        return {
            "contexts": contexts,
            "sources": list(sources),
        }
QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)
