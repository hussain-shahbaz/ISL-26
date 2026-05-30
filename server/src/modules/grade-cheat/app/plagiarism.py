"""
Plagiarism detection for text answers.

Compares each student's answer against every other student's answer
for the same question using TF-IDF cosine similarity.
"""

import logging
import math
import re
from typing import Any, Dict, List

from app.config import Config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# TF-IDF helpers
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", text.lower())


def compute_tfidf_similarity(text1: str, text2: str, corpus: List[str]) -> float:
    """Return 0.0–1.0 similarity between two texts within a shared corpus."""
    if text1.strip() == text2.strip():
        return 1.0

    tokens1 = _tokenize(text1)
    tokens2 = _tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0

    tokenized_corpus = [_tokenize(doc) for doc in corpus]
    doc_frequency: Dict[str, int] = {}
    for doc in tokenized_corpus:
        for word in set(doc):
            doc_frequency[word] = doc_frequency.get(word, 0) + 1

    num_docs = len(corpus)

    def to_tfidf_vector(tokens: List[str]) -> Dict[str, float]:
        term_frequency: Dict[str, int] = {}
        for token in tokens:
            term_frequency[token] = term_frequency.get(token, 0) + 1

        vector: Dict[str, float] = {}
        for token, count in term_frequency.items():
            idf = math.log(num_docs / (doc_frequency.get(token, 0) + 1)) if num_docs else 1.0
            vector[token] = count * max(0.0001, idf)
        return vector

    vec1 = to_tfidf_vector(tokens1)
    vec2 = to_tfidf_vector(tokens2)

    dot_product = sum(vec1[word] * vec2.get(word, 0.0) for word in vec1)
    magnitude1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    magnitude2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
    if magnitude1 == 0.0 or magnitude2 == 0.0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


# ---------------------------------------------------------------------------
# Peer index (built once per exam before grading loop)
# ---------------------------------------------------------------------------

def build_peer_index(submissions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, str]]]:
    """
    Group text answers by question.

    Returns: { questionId: [{ "studentId": ..., "answer": ... }, ...] }
    """
    index: Dict[str, List[Dict[str, str]]] = {}

    for submission in submissions:
        student_id = submission.get("studentId", "")
        for answer in submission.get("answers", []):
            if answer.get("questionType") != "text":
                continue

            text = answer.get("submittedAnswer", "").strip()
            if not text:
                continue

            question_id = answer["questionId"]
            index.setdefault(question_id, []).append({
                "studentId": student_id,
                "answer": text,
            })

    return index


# ---------------------------------------------------------------------------
# Plagiarism check (called once per text answer)
# ---------------------------------------------------------------------------

def _no_peer_result() -> Dict[str, Any]:
    return {
        "cheatingScore": 0.0,
        "cheatingFlag": False,
        "cheatingDetails": {
            "similarityScore": 0.0,
            "suspectedPeerId": None,
            "message": "No peer comparison available",
        },
    }


def check_plagiarism(
    student_id: str,
    question_id: str,
    submitted_answer: str,
    peer_index: Dict[str, List[Dict[str, str]]],
) -> Dict[str, Any]:
    """
    Find the most similar peer answer for this question.
    Flag when similarity >= CHEATING_THRESHOLD (default 85%).
    """
    submitted_answer = submitted_answer.strip()
    if not submitted_answer:
        return _no_peer_result()

    peers = [
        peer for peer in peer_index.get(question_id, [])
        if peer["studentId"] != student_id
    ]
    if not peers:
        return _no_peer_result()

    # All answers for this question form the TF-IDF corpus
    corpus = [submitted_answer] + [peer["answer"] for peer in peers]

    best_score = 0.0
    best_peer_id = None
    best_peer_answer = ""

    for peer in peers:
        score = compute_tfidf_similarity(submitted_answer, peer["answer"], corpus)
        if score > best_score:
            best_score = score
            best_peer_id = peer["studentId"]
            best_peer_answer = peer["answer"]

    cheating_score = round(best_score * 100, 1)
    cheating_flag = cheating_score >= Config.CHEATING_THRESHOLD

    logger.info(
        "Plagiarism student=%s question=%s score=%.1f%% flagged=%s peer=%s",
        student_id, question_id, cheating_score, cheating_flag, best_peer_id,
    )

    snippet = best_peer_answer[:100]
    if len(best_peer_answer) > 100:
        snippet += "..."

    return {
        "cheatingScore": cheating_score,
        "cheatingFlag": cheating_flag,
        "cheatingDetails": {
            "similarityScore": cheating_score,
            "suspectedPeerId": best_peer_id,
            "suspectedAnswerSnippet": snippet,
            "message": (
                "Suspicious similarity to a peer answer"
                if cheating_flag
                else "Similarity is within normal limits"
            ),
        },
    }
