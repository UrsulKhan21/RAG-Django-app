import torch
from sentence_transformers import SentenceTransformer

torch.set_num_threads(1)

embedder = SentenceTransformer(
    "all-MiniLM-L6-v2",
    device="cpu"
)

embedder.encode(["warmup"], show_progress_bar=False)




def embed_texts(texts: list[str]) -> list[list[float]]:
    embeddings = embedder.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.tolist()
