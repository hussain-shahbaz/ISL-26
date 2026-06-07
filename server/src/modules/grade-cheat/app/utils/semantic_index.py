"""ChromaDB store for semantic peer similarity.

Critical fixes vs original:
1. Singleton client — EphemeralClient was recreated on every call, wiping in-memory data.
2. n_results capped to actual matching-doc count — ChromaDB raises if you request more
   results than exist after the where-filter; we pre-count per (exam, question).
3. Upsert instead of add — handles re-indexing the same exam without duplicate-ID errors.
4. Graceful degradation — every public function returns a safe default if Chroma/Gemini
   is unavailable, so TF-IDF fallback always kicks in cleanly.
"""

import logging
import os
from typing import Any, Dict, List, Optional

from app.config import Config
from .embeddings import embed_documents, embed_query

logger = logging.getLogger(__name__)

COLLECTION = "student_answers"

try:
    import chromadb
    _HAS_CHROMA = True
except ImportError:
    chromadb = None  # type: ignore[assignment]
    _HAS_CHROMA = False


# ── Singleton client (one per process) ──────────────────────────────────────
# Bug fix: original code called _client() / _collection() on every operation,
# which created a fresh EphemeralClient each time — wiping all indexed data.
_chroma_client: Optional[Any] = None
_chroma_collection: Optional[Any] = None


def _get_client() -> Optional[Any]:
    global _chroma_client
    if not _HAS_CHROMA:
        return None
    if _chroma_client is None:
        mode = getattr(Config, "CHROMA_MODE", "ephemeral")
        if mode == "http":
            # Distributed: talk to a standalone ChromaDB server container.
            host = getattr(Config, "CHROMA_HOST", "localhost")
            port = getattr(Config, "CHROMA_PORT", 8000)
            _chroma_client = chromadb.HttpClient(host=host, port=port)
            logger.info("ChromaDB: HttpClient at %s:%s", host, port)
        elif mode == "persistent":
            path = getattr(Config, "CHROMA_PATH", "./chroma_data")
            os.makedirs(path, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=path)
            logger.info("ChromaDB: PersistentClient at %s", path)
        else:
            _chroma_client = chromadb.EphemeralClient()
            logger.info("ChromaDB: EphemeralClient (in-memory)")
    return _chroma_client


def _get_collection() -> Optional[Any]:
    global _chroma_collection
    client = _get_client()
    if client is None:
        return None
    if _chroma_collection is None:
        _chroma_collection = client.get_or_create_collection(
            name=COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    return _chroma_collection


def reset_client() -> None:
    """Force a new client/collection on next access. Call after manual DB wipes."""
    global _chroma_client, _chroma_collection
    _chroma_client = None
    _chroma_collection = None


# ── Public API ───────────────────────────────────────────────────────────────

def index_exam_answers(exam_id: str, submissions: List[Dict[str, Any]]) -> bool:
    """Index all text answers for an exam in ChromaDB.

    Uses upsert so re-indexing the same exam is safe (no duplicate-ID crash).
    Returns True if at least one answer was indexed.
    """
    if not _HAS_CHROMA or not getattr(Config, "GEMINI_API_KEYS", None):
        logger.debug("Skipping semantic index (chroma=%s, keys=%s)", _HAS_CHROMA, bool(getattr(Config, "GEMINI_API_KEYS", None)))
        return False

    docs, ids, meta = [], [], []
    logger.debug(f"Indexing answers for exam {exam_id}")
    
    for sub in submissions:
        sid = sub.get("studentId", "")
        logger.debug(f"Processing submission from student {sid}")
        
        for ans in sub.get("answers", []):
            text = ans.get("submittedAnswer", "").strip()
            if not text:
                logger.debug(f"Skipping empty answer for student {sid}")
                continue
            
            qid = ans.get("questionId") or ans.get("_id")
            if not qid:
                logger.warning(f"Answer missing questionId and _id for student {sid}")
                continue
            
            logger.debug(f"Indexing text answer: exam={exam_id}, student={sid}, question={qid}")
            docs.append(text)
            ids.append(f"{exam_id}__{sid}__{qid}")
            meta.append({"examId": exam_id, "studentId": sid, "questionId": qid})

    if not docs:
        logger.warning("No text answers to index for exam %s", exam_id)
        return False

    try:
        col = _get_collection()
        if col is None:
            logger.error("Failed to get ChromaDB collection")
            return False

        logger.debug(f"Embedding {len(docs)} documents for exam {exam_id}")
        embeddings = embed_documents(docs)
        if not embeddings or len(embeddings) != len(docs):
            logger.error("Embedding count mismatch: got %d for %d docs", len(embeddings) if embeddings else 0, len(docs))
            return False

        logger.debug(f"Upserting {len(docs)} documents to ChromaDB")
        col.upsert(documents=docs, ids=ids, metadatas=meta, embeddings=embeddings)
        logger.info("Indexed %d answers for exam %s (collection total: %d)", len(docs), exam_id, col.count())
        return True

    except Exception as exc:
        logger.error("ChromaDB index failed for exam %s: %s", exam_id, exc)
        return False


def query_similar_peers(
    exam_id: str,
    question_id: str,
    student_id: str,
    submitted_answer: str,
    max_results: int = 10,
) -> List[Dict[str, Any]]:
    """Return semantically similar peer answers for one question.

    Scores are in [0, 1] where 1 = identical meaning.
    Returns [] on any error so TF-IDF fallback takes over automatically.
    """
    if not _HAS_CHROMA or not getattr(Config, "GEMINI_API_KEYS", None):
        return []

    text = submitted_answer.strip()
    if not text:
        return []

    try:
        col = _get_collection()
        if col is None or col.count() == 0:
            return []

        # ── Count how many docs actually match this (exam, question, not-self) filter ──
        # Bug fix: n_results must not exceed the number of matching documents or
        # ChromaDB raises InvalidArgumentError. We count first, then query.
        try:
            matching = col.get(
                where={
                    "$and": [
                        {"examId": {"$eq": exam_id}},
                        {"questionId": {"$eq": question_id}},
                        {"studentId": {"$ne": student_id}},
                    ]
                }
            )
            n_matching = len(matching.get("ids", []))
        except Exception:
            n_matching = col.count()  # safe fallback

        if n_matching == 0:
            logger.debug("No peers found for exam=%s q=%s student=%s", exam_id, question_id, student_id)
            return []

        n_results = min(max_results, n_matching)

        query_embedding = embed_query(text)
        hits = col.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where={
                "$and": [
                    {"examId": {"$eq": exam_id}},
                    {"questionId": {"$eq": question_id}},
                    {"studentId": {"$ne": student_id}},
                ]
            },
        )

        if not hits.get("documents") or not hits["documents"][0]:
            return []

        out = []
        for doc, dist, m in zip(
            hits["documents"][0],
            hits["distances"][0],
            hits["metadatas"][0],
        ):
            # ChromaDB cosine space: distance ∈ [0, 2]; score = 1 - distance clipped to [0,1]
            score = max(0.0, min(1.0, 1.0 - dist))
            out.append({
                "studentId": m.get("studentId"),
                "answer": doc,
                "semanticScore": round(score, 4),
            })

        # Sort highest similarity first
        out.sort(key=lambda x: x["semanticScore"], reverse=True)
        logger.debug(
            "Semantic query exam=%s q=%s: %d peers, top score=%.3f",
            exam_id, question_id, len(out), out[0]["semanticScore"] if out else 0,
        )
        return out

    except Exception as exc:
        logger.error("ChromaDB query failed (exam=%s q=%s): %s", exam_id, question_id, exc)
        return []


def delete_exam_index(exam_id: str) -> bool:
    """Remove all indexed answers for one exam. Returns True on success."""
    try:
        col = _get_collection()
        if col is None:
            return False
        before = col.count()
        col.delete(where={"examId": {"$eq": exam_id}})
        after = col.count()
        logger.info("Deleted exam %s from index (%d → %d docs)", exam_id, before, after)
        return True
    except Exception as exc:
        logger.error("Failed to delete exam %s from index: %s", exam_id, exc)
        return False


def get_collection_stats() -> Dict[str, Any]:
    """Return diagnostic stats about the ChromaDB collection."""
    try:
        col = _get_collection()
        if col is None:
            return {"available": False, "reason": "ChromaDB not installed or client failed"}

        total = col.count()
        if total == 0:
            return {"available": True, "total_docs": 0, "exams": {}}

        all_meta = col.get(include=["metadatas"])["metadatas"]
        exams: Dict[str, Dict[str, int]] = {}
        for m in all_meta:
            eid = m.get("examId", "unknown")
            qid = m.get("questionId", "unknown")
            exams.setdefault(eid, {})
            exams[eid][qid] = exams[eid].get(qid, 0) + 1

        return {
            "available": True,
            "total_docs": total,
            "mode": getattr(Config, "CHROMA_MODE", "ephemeral"),
            "exams": exams,
        }
    except Exception as exc:
        return {"available": False, "reason": str(exc)}