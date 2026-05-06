# System Architecture Diagram

```mermaid
flowchart TB
    user["User<br/>Student / Admin"]
    frontend["Next.js Frontend<br/>React + TypeScript + Tailwind CSS<br/>Login, Dashboard, Add Source, Chat UI"]
    client["Frontend API Client<br/>HTTPS requests with cookies<br/>Token refresh handling"]

    subgraph backend["Django REST Backend"]
        accounts["Accounts API<br/>Email Login + Google OAuth<br/>Cookie JWT Authentication"]
        sources["Sources API<br/>PDF/API Source Management<br/>Status, Sync, Metadata"]
        rag["RAG Service<br/>Chunking, Embedding, Retrieval<br/>Prompt Orchestration"]
        chat["Chat API<br/>Sessions, Messages<br/>Grounded Answer Response"]
    end

    postgres[("PostgreSQL<br/>Users, Sources, Chat Sessions, Messages")]
    qdrant[("Qdrant Vector DB<br/>Embeddings + Payload Context")]
    files["Uploaded PDF Files<br/>Extracted and Chunked Text"]
    rest["External REST APIs<br/>JSON Source Data"]
    gemini["Gemini Embeddings<br/>gemini-embedding-001"]
    groq["Groq LLM API<br/>OpenAI-Compatible Chat Completion"]

    user --> frontend --> client
    client --> accounts
    client --> sources
    client --> chat

    accounts --> postgres
    sources --> postgres
    chat --> postgres

    sources --> files
    rest --> sources
    sources --> rag
    chat --> rag

    rag --> gemini
    gemini --> qdrant
    rag --> qdrant
    rag --> groq
    groq --> chat

    classDef ui fill:#eaf3ff,stroke:#4f9ae8,color:#102033
    classDef api fill:#ecfbf5,stroke:#22a879,color:#102033
    classDef db fill:#fff4dc,stroke:#d99822,color:#102033
    classDef vector fill:#f0eaff,stroke:#8a5bd7,color:#102033
    classDef ai fill:#fff0f4,stroke:#d94870,color:#102033
    classDef source fill:#f1f5f9,stroke:#7c8da1,color:#102033

    class user,frontend,client ui
    class accounts,sources,rag,chat api
    class postgres db
    class qdrant vector
    class gemini,groq ai
    class files,rest source
```

## RAG Query Flow

1. User asks a question from a selected source.
2. Backend creates a Gemini query embedding.
3. Qdrant returns the most relevant source chunks.
4. Retrieved context is sent to the Groq LLM with grounding instructions.
5. The generated answer is saved in chat history and returned to the frontend.
