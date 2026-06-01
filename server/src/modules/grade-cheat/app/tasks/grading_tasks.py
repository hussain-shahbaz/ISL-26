"""Celery task: grade exam + run plagiarism checks in one pass."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.celery_app import celery_app
from app.data_provider import DataProvider
from app.grader import grade_question
from app.models import ExamResultRepository
from app.plagiarism import check_plagiarism, prepare_plagiarism_index
from app.services.analysis_service import ExamAnalysisService
from app.services.gemini_service import GeminiGradingService
from app.services.task_tracker import TaskTracker

logger = logging.getLogger(__name__)


def _build_result_entry(
    question_id: str,
    grade_result: Dict[str, Any],
    plagiarism_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Merge grade output with optional plagiarism fields."""
    pl = plagiarism_result or {}
    fields = {
        "cheatingScore": pl.get("cheatingScore", 0.0),
        "cheatingFlag": pl.get("cheatingFlag", False),
        "cheatingDetails": pl.get("cheatingDetails"),
    }
    if not grade_result["success"]:
        return {"questionId": question_id, "error": grade_result.get("error"), **fields}

    d = grade_result["data"]
    return {
        "questionId": question_id,
        "score": d["score"],
        "maxMarks": d["maxMarks"],
        "isCorrect": d["isCorrect"],
        "feedback": d["feedback"],
        "reasoning": d["reasoning"],
        **fields,
    }


@celery_app.task(bind=True, name="app.tasks.grading_tasks.grade_exam_task")
def grade_exam_task(self, exam_id, grading_mode, task_id, additional_instructions=None):
    """Grade all submissions, check plagiarism on text answers, save results."""
    tracker = TaskTracker()
    grader = GeminiGradingService()
    analysis = ExamAnalysisService()
    result_repo = ExamResultRepository()

    try:
        tracker.start_task(task_id)

        progress = tracker.get_task_progress(task_id) or {}
        questions = progress.get("questions")
        submissions = progress.get("submissions")

        if not questions or not submissions:
            data = DataProvider()
            questions = questions or data.get_exam_questions(exam_id)
            submissions = submissions or data.get_exam_submissions(exam_id)

        if not questions or not submissions:
            msg = (
                f"No exam data for {exam_id}: {len(questions or [])} questions, "
                f"{len(submissions or [])} submissions."
            )
            tracker.fail_task(task_id, msg)
            return {"success": False, "error": msg}

        questions_by_id = {q["questionId"]: q for q in questions}
        peer_index = prepare_plagiarism_index(exam_id, submissions)
        total = len(questions) * len(submissions)
        done = 0
        exam_results = []

        for submission in submissions:
            student_id = submission["studentId"]
            per_q = []
            score_sum = 0
            marks_sum = 0

            for answer in submission["answers"]:
                q_id = answer["questionId"]
                question = questions_by_id.get(q_id)
                if not question:
                    continue

                grade_result = grade_question(
                    question, answer, grading_mode, grader, additional_instructions,
                )

                plagiarism_result = None
                if question.get("type") == "text":
                    plagiarism_result = check_plagiarism(
                        exam_id, student_id, q_id,
                        answer.get("submittedAnswer", ""), peer_index,
                    )

                per_q.append(_build_result_entry(q_id, grade_result, plagiarism_result))
                if grade_result["success"]:
                    score_sum += grade_result["data"]["score"]
                    marks_sum += grade_result["data"]["maxMarks"]

                done += 1
                tracker.update_progress(task_id, done)

            pct = (score_sum / marks_sum * 100) if marks_sum else 0
            exam_results.append({
                "examId": exam_id,
                "studentId": student_id,
                "totalScore": score_sum,
                "totalMarks": marks_sum,
                "percentage": pct,
                "results": per_q,
                "gradedAt": datetime.now(),
                "gradingMode": grading_mode,
            })

        saved = result_repo.insert_many(exam_results)
        stats = analysis.calculate_analysis(exam_id, grading_mode)
        summary = {
            "examId": exam_id,
            "totalGraded": saved,
            "avgScore": stats["avgScore"] if stats else 0,
            "message": "Grading and plagiarism check complete",
        }
        tracker.complete_task(task_id, summary)
        return {"success": True, "data": summary}

    except Exception as exc:
        msg = f"Error in grading task: {exc}"
        logger.error(msg, exc_info=True)
        tracker.fail_task(task_id, msg)
        return {"success": False, "error": msg}
