# RAG Backend

## Hugging Face Spaces Docker Settings

Create a Docker Space and point it at this `backend` directory. Set these Space secrets or variables:

```text
DEBUG=False
DJANGO_SECRET_KEY=<strong-secret>
ALLOWED_HOSTS=<your-space-subdomain>.hf.space
FRONTEND_URLS=https://<your-frontend-domain>
FRONTEND_URL=https://<your-frontend-domain>
COOKIE_SECURE=True
COOKIE_SAMESITE=None
SECURE_SSL_REDIRECT=False

DATABASE_URL=<postgres-url>
DB_SSL_REQUIRE=True

QDRANT_URL=<qdrant-cloud-url>
QDRANT_API_KEY=<qdrant-api-key>

EMBED_PROVIDER=sentence_transformers
EMBED_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBED_DIM=384
EMBED_BATCH_SIZE=32
SENTENCE_TRANSFORMERS_DEVICE=cpu

GROQ_API_KEY=<groq-api-key>
LLM_MODEL=llama-3.3-70b-versatile
```

After switching from Gemini `768` dimensions to SentenceTransformers `384`, delete old Qdrant collections and re-ingest all sources.

## Reset Data

To clear vectors plus source/chat rows while keeping user accounts:

```bash
python manage.py reset_rag_data --yes
```

To clear vectors, source/chat rows, and users:

```bash
python manage.py reset_rag_data --yes --include-users
```

Run this from an environment that has the same `DATABASE_URL`, `QDRANT_URL`, and `QDRANT_API_KEY` as production.
