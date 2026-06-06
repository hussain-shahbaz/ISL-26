"""Exam analytics and statistics."""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.utils.data_provider import DataProvider
from app.models import ExamAnalysisRepository, ExamResultRepository

logger = logging.getLogger(__name__)

__all__ = ["ExamAnalysisService"]


class ExamAnalysisService:
    """Calculate and store exam analytics."""

    def __init__(self):
        self.analysis_repo = ExamAnalysisRepository()
        self.result_repo = ExamResultRepository()
        self.data_provider = DataProvider()

    def calculate_analysis(self, exam_id: str, grading_mode: str) -> Optional[Dict[str, Any]]:
        """Calculate complete analysis for an exam."""
        try:
            # Fetch results and questions
            results = self.result_repo.find_by_exam(exam_id)
            questions = self.data_provider.get_exam_questions(exam_id)

            if not results or not questions:
                logger.error(f"Missing data for exam {exam_id}")
                return None

            # Calculate overall stats
            total_students = len(results)
            scores = [r["totalScore"] for r in results]
            max_marks = [r["totalMarks"] for r in results]

            avg_score = sum(scores) / total_students if total_students > 0 else 0
            total_marks = max_marks[0] if max_marks else 0

            # Top 3 students
            top_students = sorted(
                [{"studentId": r["studentId"], "score": r["totalScore"]} for r in results],
                key=lambda x: x["score"],
                reverse=True,
            )[:3]

            # Analyze per-question performance
            q_performance = defaultdict(lambda: {"correct": 0, "total": 0, "topic": "", "marks": 0})
            q_mapping = {q.get("_id") or q.get("id"): q for q in questions}

            for result in results:
                for q_result in result.get("results", []):
                    if "questionId" not in q_result:
                        continue
                    q_id = q_result["questionId"]
                    q_data = q_mapping.get(q_id, {})

                    q_performance[q_id]["total"] += 1
                    q_performance[q_id]["topic"] = q_data.get("topic", "")
                    q_performance[q_id]["marks"] = q_data.get("marks", 0)

                    if q_result.get("isCorrect", False):
                        q_performance[q_id]["correct"] += 1

            # Identify strong/weak concepts
            strong_concepts = []
            weak_concepts = []

            for q_id, perf in q_performance.items():
                if perf["total"] > 0:
                    correct_pct = (perf["correct"] / perf["total"]) * 100
                    concept = {
                        "questionId": q_id,
                        "topic": perf["topic"],
                        "correctPercentage": round(correct_pct, 1),
                        "marks": perf["marks"],
                    }

                    if correct_pct >= 75:
                        strong_concepts.append(concept)
                    elif correct_pct <= 50:
                        weak_concepts.append(concept)

            # Sort by percentage
            strong_concepts = sorted(strong_concepts, key=lambda x: x["correctPercentage"], reverse=True)
            weak_concepts = sorted(weak_concepts, key=lambda x: x["correctPercentage"])

            # Build analysis document
            analysis = {
                "examId": exam_id,
                "gradingMode": grading_mode,
                "totalStudents": total_students,
                "avgScore": round(avg_score, 2),
                "totalMarks": total_marks,
                "topStudents": top_students,
                "strongConcepts": strong_concepts,
                "weakConcepts": weak_concepts,
                "generatedAt": datetime.now(),
            }

            # Save to database
            self.analysis_repo.insert_analysis(analysis)

            logger.info(f"Calculated analysis for exam {exam_id}")
            return analysis

        except Exception as e:
            logger.error(f"Error calculating analysis: {e}")
            return None

    def get_analysis(self, exam_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve analysis for an exam."""
        try:
            analysis = self.analysis_repo.find_by_exam(exam_id)
            return analysis
        except Exception as e:
            logger.error(f"Error retrieving analysis: {e}")
            return None
