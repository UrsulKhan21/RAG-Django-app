import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

from data_loader import embed_texts
from vector_db import QdrantStorage

load_dotenv()

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="RAG API", version="1.0")

# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]

# =========================================================
# QUERY ENDPOINT
# =========================================================

@app.post("/query", response_model=QueryResponse)
async def query_rag(req: QueryRequest):
    # 1️⃣ Embed the user question
    query_vec = embed_texts([req.question])[0]

    # 2️⃣ Search Qdrant
    store = QdrantStorage()
    found = store.search(query_vec, req.top_k)

    contexts = found["contexts"]

    # ✅ SAFETY: no data found
    if not contexts:
        return {
            "answer": "No relevant data found in the knowledge base.",
            "sources": [],
        }

    context = "\n\n".join(contexts)

    # 3️⃣ Call Groq (OpenAI-compatible client)
    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer ONLY using the provided context. "
                    "If the answer is not in the context, say you don't know."
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {req.question}",
            },
        ],
        temperature=0.2,
        max_tokens=512,
    )

    answer = completion.choices[0].message.content.strip()

    return {
        "answer": answer,
        "sources": found["sources"],
    }

# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {"status": "ok"}
