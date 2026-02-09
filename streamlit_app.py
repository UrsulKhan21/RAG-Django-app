import streamlit as st
import requests
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# CONFIG
# =========================================================

API_BASE = "http://127.0.0.1:8000"  # FastAPI backend

st.set_page_config(
    page_title="RAG Chatbot",
    page_icon="🤖",
    layout="centered",
)

# =========================================================
# UI — HEADER
# =========================================================

st.title("🤖 RAG Chatbot")
st.caption("Ask questions based on live API data stored in Qdrant")

st.divider()

# =========================================================
# UI — QUERY
# =========================================================

question = st.text_input(
    "Ask a question",
    placeholder="e.g. Which products are suitable for photography?",
)

top_k = st.slider(
    "Number of results to retrieve",
    min_value=1,
    max_value=20,
    value=5,
)

if st.button("Ask") and question.strip():
    with st.spinner("Thinking..."):
        response = requests.post(
            f"{API_BASE}/query",
            json={
                "question": question.strip(),
                "top_k": top_k,
            },
            timeout=60,
        )

        response.raise_for_status()
        data = response.json()

    st.subheader("Answer")
    st.write(data.get("answer", "(No answer returned)"))

    sources = data.get("sources", [])
    if sources:
        st.divider()
        st.caption("Sources")
        for src in sources:
            st.write(f"- `{src}`")

# =========================================================
# FOOTER
# =========================================================

st.divider()
st.caption("Powered by FastAPI • Qdrant • SentenceTransformers • LLaMA-3")
