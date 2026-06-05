"""Services: grading, plagiarism detection, analytics, and task management."""

from app.services.analytics import ExamAnalysisService
from app.services.grading import GeminiGradingService, GroqGradingService, grade_mcq, grade_question
from app.services.plagiarism import (
    build_peer_index,
    check_plagiarism,
    compute_tfidf_similarity,
    prepare_plagiarism_index,
)
from app.services.task_management import ExamTaskAlreadyRunning, TaskTracker

__all__ = [
    # Grading
    "grade_mcq",
    "grade_question",
    "GeminiGradingService",
    "GroqGradingService",
    # Plagiarism
    "check_plagiarism",
    "prepare_plagiarism_index",
    "compute_tfidf_similarity",
    "build_peer_index",
    # Analytics
    "ExamAnalysisService",
    # Task Management
    "TaskTracker",
    "ExamTaskAlreadyRunning",
]
