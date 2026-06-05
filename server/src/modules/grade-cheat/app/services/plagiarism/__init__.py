"""Plagiarism detection service: semantic + TF-IDF hybrid."""

from app.services.plagiarism.detector import (
    build_peer_index,
    check_plagiarism,
    compute_tfidf_similarity,
    is_semantic_index_ready,
    prepare_plagiarism_index,
)

__all__ = [
    "check_plagiarism",
    "prepare_plagiarism_index",
    "is_semantic_index_ready",
    "compute_tfidf_similarity",
    "build_peer_index",
]
