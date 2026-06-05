"""Plagiarism detection: 60% semantic + 40% TF-IDF."""

import logging
import math
import re
from typing import Any, Dict, List, Optional

from app.config import Config
from app.utils.semantic_index import index_exam_answers, query_similar_peers

logger = logging.getLogger(__name__)

__all__ = ["check_plagiarism", "prepare_plagiarism_index", "is_semantic_index_ready"]

_semantic_index_ready: Dict[str, bool] = {}


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase words."""
    return re.findall(r"\w+", text.lower())


def compute_tfidf_similarity(text1: str, text2: str, corpus: List[str]) -> float:
    """TF-IDF cosine similarity between two texts (0.0–1.0)."""
    if text1.strip() == text2.strip():
        return 1.0

    tokens1 = _tokenize(text1)
    tokens2 = _tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0

    # Build corpus with all documents
    tokenized_corpus = [_tokenize(doc) for doc in corpus]
    
    # Calculate document frequency for IDF
    doc_frequency: Dict[str, int] = {}
    for doc in tokenized_corpus:
        for word in set(doc):
            doc_frequency[word] = doc_frequency.get(word, 0) + 1

    num_docs = max(len(corpus), 2)  # Ensure minimum corpus size for meaningful IDF

    def to_tfidf_vector(tokens: List[str]) -> Dict[str, float]:
        tf: Dict[str, int] = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1
        vec: Dict[str, float] = {}
        for token, count in tf.items():
            # IDF with smoothing to handle small corpora
            idf = math.log(1 + num_docs / (1 + doc_frequency.get(token, 0)))
            vec[token] = count * idf
        return vec

    vec1 = to_tfidf_vector(tokens1)
    vec2 = to_tfidf_vector(tokens2)
    
    # Cosine similarity
    dot = sum(vec1.get(w, 0.0) * vec2.get(w, 0.0) for w in set(vec1.keys()) | set(vec2.keys()))
    mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
    
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    
    similarity = dot / (mag1 * mag2)
    return max(0.0, min(1.0, similarity))  # Clamp to [0, 1]


def _combined_score(semantic: float, tfidf: float) -> float:
    """Weighted combination: 60% semantic + 40% TF-IDF."""
    return (Config.SEMANTIC_WEIGHT * semantic) + (Config.TFIDF_WEIGHT * tfidf)


def build_peer_index(submissions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, str]]]:
    """Group text answers by questionId."""
    index: Dict[str, List[Dict[str, str]]] = {}
    for submission in submissions:
        student_id = submission.get("studentId", "")
        for answer in submission.get("answers", []):
            if answer.get("questionType") != "text":
                continue
            text = answer.get("submittedAnswer", "").strip()
            if not text:
                continue
            q_id = answer["questionId"]
            index.setdefault(q_id, []).append({"studentId": student_id, "answer": text})
    return index


def prepare_plagiarism_index(exam_id: str, submissions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, str]]]:
    """Build TF-IDF peer index and ChromaDB semantic index for one exam."""
    peer_index = build_peer_index(submissions)
    _semantic_index_ready[exam_id] = index_exam_answers(exam_id, submissions)
    return peer_index


def is_semantic_index_ready(exam_id: str) -> bool:
    """Check if semantic index is ready for an exam."""
    return _semantic_index_ready.get(exam_id, False)


def _no_peer_result() -> Dict[str, Any]:
    """Default result when no peers found."""
    return {
        "cheatingScore": 0.0,
        "cheatingFlag": False,
        "cheatingDetails": {
            "similarityScore": 0.0,
            "tfidfScore": 0.0,
            "suspectedPeerId": None,
            "message": "No peer comparison available",
        },
    }


def _find_exact_peer_match(submitted_answer: str, peers: List[Dict[str, str]]) -> Optional[Dict[str, str]]:
    """Find exact text match in peer answers."""
    for peer in peers:
        if submitted_answer == peer["answer"]:
            return peer
    return None


def _result_from_match(
    semantic_score: float,
    tfidf_score: float,
    peer_id: str,
    peer_answer: str,
    exact_copy: bool = False,
) -> Dict[str, Any]:
    """Format cheating detection result."""
    if exact_copy:
        semantic_score = 1.0
        tfidf_score = 1.0

    combined = _combined_score(semantic_score, tfidf_score)
    cheating_score = round(combined * 100, 1)
    flagged = cheating_score >= Config.CHEATING_THRESHOLD
    snippet = peer_answer[:100] + ("..." if len(peer_answer) > 100 else "")

    return {
        "cheatingScore": cheating_score,
        "cheatingFlag": flagged,
        "cheatingDetails": {
            "similarityScore": round(semantic_score * 100, 1),
            "tfidfScore": round(tfidf_score * 100, 1),
            "suspectedPeerId": peer_id,
            "suspectedAnswerSnippet": snippet,
            "message": "Suspicious similarity to a peer answer" if flagged else "Similarity is within normal limits",
        },
    }


def _check_with_semantic(
    exam_id: str,
    student_id: str,
    question_id: str,
    submitted_answer: str,
    corpus: List[str],
) -> Dict[str, Any]:
    """Hybrid score: best semantic peer + TF-IDF."""
    semantic_peers = query_similar_peers(exam_id, question_id, student_id, submitted_answer)
    if not semantic_peers:
        return _no_peer_result()

    best = None
    best_combined = -1.0
    for peer in semantic_peers:
        tfidf = compute_tfidf_similarity(submitted_answer, peer["answer"], corpus)
        combined = _combined_score(peer["semanticScore"], tfidf)
        if combined > best_combined:
            best_combined = combined
            best = (peer["semanticScore"], tfidf, peer["studentId"], peer["answer"])

    s, t, pid, ans = best
    return _result_from_match(s, t, pid, ans)


def _check_tfidf_only(submitted_answer: str, peers: List[Dict[str, str]], corpus: List[str]) -> Dict[str, Any]:
    """TF-IDF-only fallback when semantic index is unavailable."""
    best_tfidf = 0.0
    best_peer_id = None
    best_answer = ""

    for peer in peers:
        tfidf = compute_tfidf_similarity(submitted_answer, peer["answer"], corpus)
        if tfidf > best_tfidf:
            best_tfidf = tfidf
            best_peer_id = peer["studentId"]
            best_answer = peer["answer"]

    score = round(best_tfidf * 100, 1)
    flagged = score >= Config.CHEATING_THRESHOLD
    snippet = best_answer[:100] + ("..." if len(best_answer) > 100 else "")

    return {
        "cheatingScore": score,
        "cheatingFlag": flagged,
        "cheatingDetails": {
            "similarityScore": 0.0,
            "tfidfScore": score,
            "suspectedPeerId": best_peer_id,
            "suspectedAnswerSnippet": snippet,
            "message": "Suspicious similarity (TF-IDF only)" if flagged else "Similarity is within normal limits",
        },
    }


def check_plagiarism(
    exam_id: str,
    student_id: str,
    question_id: str,
    submitted_answer: str,
    peer_index: Dict[str, List[Dict[str, str]]],
) -> Dict[str, Any]:
    """Compare one text answer against all peers for the same question."""
    submitted_answer = submitted_answer.strip()
    if not submitted_answer:
        return _no_peer_result()

    peers = [p for p in peer_index.get(question_id, []) if p["studentId"] != student_id]
    if not peers:
        return _no_peer_result()

    corpus = [submitted_answer] + [p["answer"] for p in peers]

    exact = _find_exact_peer_match(submitted_answer, peers)
    if exact:
        return _result_from_match(1.0, 1.0, exact["studentId"], exact["answer"], exact_copy=True)

    if Config.GEMINI_API_KEYS and _semantic_index_ready.get(exam_id):
        result = _check_with_semantic(exam_id, student_id, question_id, submitted_answer, corpus)
        if result["cheatingDetails"]["suspectedPeerId"] is not None:
            return result

    return _check_tfidf_only(submitted_answer, peers, corpus)
