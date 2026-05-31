"""MongoDB repositories."""

from app.models.database import (
    ExamAnalysisRepository,
    ExamResultRepository,
    GradingTaskRepository,
    MongoDBClient,
)

__all__ = [
    "MongoDBClient",
    "ExamResultRepository",
    "ExamAnalysisRepository",
    "GradingTaskRepository",
]
