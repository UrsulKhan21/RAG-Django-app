import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from vector_db import QdrantStorage

load_dotenv()

# ---------------- EMBEDDING MODEL ---------------- #

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
EMBED_DIM = 384

embedder = SentenceTransformer(EMBED_MODEL_NAME)

# ---------------- LLM CONFIG (Groq) ---------------- #

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set in .env")

# Groq is OpenAI-compatible
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# ---------------- RAG QUERY ---------------- #

def rag_query(question: str, top_k: int = 5) -> dict:
    """
    Perform RAG:
    - embed question
    - search Qdrant
    - build context
    - query LLM
    """

    # 1️⃣ Embed the question
    query_vector = embedder.encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )[0]

    # 2️⃣ Search Qdrant
    store = QdrantStorage()
    results = store.search(query_vector, top_k=top_k)

    contexts = results["contexts"]
    sources = results["sources"]

    if not contexts:
        return {
            "answer": "I could not find relevant information.",
            "sources": [],
        }

    # 3️⃣ Build context block
    context_block = "\n\n".join(
        f"- {c}" for c in contexts
    )

    # 4️⃣ Build prompt
    prompt = f"""
You are an assistant that answers questions ONLY using the provided context.

Context:
{context_block}

Question:
{question}

Answer clearly and concisely.
"""

    # 5️⃣ Call Groq (OpenAI-compatible API)
    from openai import OpenAI

    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url=GROQ_BASE_URL,
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You answer using only the given context."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=512,
    )

    answer = response.choices[0].message.content.strip()

    return {
        "answer": answer,
        "sources": sources,
    }



if __name__ == "__main__":
    result = rag_query(
        "Which smartphones are mentioned",
        top_k=5,
    )

    print("\nANSWER:\n")
    print(result["answer"])

    if result["sources"]:
        print("\nSOURCES:")
        for s in result["sources"]:
            print("-", s)
