"""Gemini embeddings via google-genai with key rotation."""

from typing import List

from google import genai
from google.genai import types

from app.config import Config
from app.gemini_keys import run_with_retry
from app.services.rate_limiter import call_with_limit


def _embed(api_key: str, texts: List[str], task_type: str) -> List[List[float]]:
    client = genai.Client(api_key=api_key)
    result = client.models.embed_content(
        model=Config.GEMINI_EMBEDDING_MODEL,
        contents=texts if len(texts) > 1 else texts[0],
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=Config.EMBEDDING_DIMENSIONS,
        ),
    )
    return [e.values for e in result.embeddings]


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed stored answers for ChromaDB indexing."""
    if not texts:
        return []
    return run_with_retry(
        lambda key: call_with_limit(lambda: _embed(key, texts, "RETRIEVAL_DOCUMENT")),
        label="embed-doc",
    )


def embed_query(text: str) -> List[float]:
    """Embed a query answer for similarity search."""
    vecs = run_with_retry(
        lambda key: call_with_limit(lambda: _embed(key, [text], "RETRIEVAL_QUERY")),
        label="embed-query",
    )
    return vecs[0]
