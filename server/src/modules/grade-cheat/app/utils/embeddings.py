"""Gemini text embeddings via google-genai with key rotation + batch safety.

Free-tier model: text-embedding-004 (768 dims, 2048 token limit per text).
Embedding API limits on AI Studio free tier: 1500 RPD / 5 RPM.

Batching: Gemini embed_content accepts a list but processes sequentially server-side.
We chunk large doc sets into batches of Config.EMBEDDING_BATCH_SIZE (default 20)
to avoid hitting per-request token limits and to get better error isolation.
"""

import logging
from typing import List

from google import genai
from google.genai import types

from app.config import Config
from .gemini_keys import QuotaExhaustedError, run_with_retry
from app.services.grading.rate_limiter import call_with_limit

logger = logging.getLogger(__name__)

_BATCH_SIZE = getattr(Config, "EMBEDDING_BATCH_SIZE", 20)


def _embed_batch(api_key: str, texts: List[str], task_type: str) -> List[List[float]]:
    """Call Gemini embed_content for one batch. Returns list of embedding vectors."""
    client = genai.Client(api_key=api_key)
    # Gemini API: pass single string or list of strings
    contents = texts[0] if len(texts) == 1 else texts
    result = client.models.embed_content(
        model=Config.GEMINI_EMBEDDING_MODEL,
        contents=contents,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=getattr(Config, "EMBEDDING_DIMENSIONS", 768),
        ),
    )
    vectors = [e.values for e in result.embeddings]
    if len(vectors) != len(texts):
        raise ValueError(
            f"Gemini returned {len(vectors)} embeddings for {len(texts)} texts"
        )
    return vectors


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed a list of answer texts for ChromaDB storage.

    Splits into batches to respect per-request token limits.
    Returns [] and logs on quota exhaustion so indexing degrades gracefully.
    """
    if not texts:
        return []

    all_vectors: List[List[float]] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i: i + _BATCH_SIZE]
        try:
            vectors = run_with_retry(
                lambda key, b=batch: call_with_limit(
                    lambda: _embed_batch(key, b, "RETRIEVAL_DOCUMENT")
                ),
                label="embed-doc",
            )
            all_vectors.extend(vectors)
        except QuotaExhaustedError:
            logger.error(
                "Gemini embedding quota exhausted at batch %d/%d — "
                "semantic index will be incomplete",
                i // _BATCH_SIZE + 1,
                (len(texts) + _BATCH_SIZE - 1) // _BATCH_SIZE,
            )
            # Return what we have so far; caller checks len(embeddings) == len(docs)
            return all_vectors
        except Exception as exc:
            logger.error("embed_documents batch %d failed: %s", i // _BATCH_SIZE + 1, exc)
            return all_vectors

    logger.debug("Embedded %d documents in %d batch(es)", len(texts), (len(texts) + _BATCH_SIZE - 1) // _BATCH_SIZE)
    return all_vectors


def embed_query(text: str) -> List[float]:
    """Embed a single query text for similarity search.

    Raises on failure — caller (query_similar_peers) catches and returns [].
    """
    vecs = run_with_retry(
        lambda key: call_with_limit(
            lambda: _embed_batch(key, [text], "RETRIEVAL_QUERY")
        ),
        label="embed-query",
    )
    return vecs[0]