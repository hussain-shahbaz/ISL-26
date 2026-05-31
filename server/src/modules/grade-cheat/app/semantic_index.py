"""ChromaDB store for semantic peer similarity."""

import logging
import os
from typing import Any, Dict, List

from app.config import Config
from app.embeddings import embed_documents, embed_query

logger = logging.getLogger(__name__)

COLLECTION = "student_answers"

try:
    import chromadb
    _HAS_CHROMA = True
except ImportError:
    chromadb = None
    _HAS_CHROMA = False


def _client():
    if not _HAS_CHROMA:
        return None
    if Config.CHROMA_MODE == "persistent":
        os.makedirs(Config.CHROMA_PATH, exist_ok=True)
        return chromadb.PersistentClient(path=Config.CHROMA_PATH)
    return chromadb.EphemeralClient()


def _collection():
    client = _client()
    if not client:
        return None
    return client.get_or_create_collection(name=COLLECTION, metadata={"hnsw:space": "cosine"})


def index_exam_answers(exam_id: str, submissions: List[Dict[str, Any]]) -> bool:
    """Index all text answers for an exam in ChromaDB."""
    if not _HAS_CHROMA or not Config.GEMINI_API_KEYS:
        return False

    docs, ids, meta = [], [], []
    for sub in submissions:
        sid = sub.get("studentId", "")
        for ans in sub.get("answers", []):
            if ans.get("questionType") != "text":
                continue
            text = ans.get("submittedAnswer", "").strip()
            if not text:
                continue
            qid = ans["questionId"]
            docs.append(text)
            ids.append(f"{exam_id}_{sid}_{qid}")
            meta.append({"examId": exam_id, "studentId": sid, "questionId": qid})

    if not docs:
        return False

    try:
        col = _collection()
        if not col:
            return False
        try:
            col.delete(where={"examId": exam_id})
        except Exception:
            pass
        col.add(documents=docs, ids=ids, metadatas=meta, embeddings=embed_documents(docs))
        logger.info("Indexed %s answers for exam %s", len(docs), exam_id)
        return True
    except Exception as exc:
        logger.error("ChromaDB index failed: %s", exc)
        return False


def query_similar_peers(
    exam_id: str,
    question_id: str,
    student_id: str,
    submitted_answer: str,
    max_results: int = 10,
) -> List[Dict[str, Any]]:
    """Return semantically similar peer answers for one question."""
    if not _HAS_CHROMA or not Config.GEMINI_API_KEYS:
        return []

    text = submitted_answer.strip()
    if not text:
        return []

    try:
        col = _collection()
        if not col or col.count() == 0:
            return []

        hits = col.query(
            query_embeddings=[embed_query(text)],
            n_results=min(max_results, col.count()),
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
        for doc, dist, m in zip(hits["documents"][0], hits["distances"][0], hits["metadatas"][0]):
            out.append({
                "studentId": m.get("studentId"),
                "answer": doc,
                "semanticScore": max(0.0, min(1.0, 1.0 - dist)),
            })
        return out
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", exc)
        return []
