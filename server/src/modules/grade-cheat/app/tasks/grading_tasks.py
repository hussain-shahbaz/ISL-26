"""
Celery task: grade one full exam.

Steps:
  1. Load questions + submissions
  2. Build peer index for plagiarism
  3. Grade each answer (MCQ locally, text via Gemini)
  4. Run plagiarism check on text answers
  5. Save results and analytics
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.celery_app import celery_app
from app.data_provider import DataProvider
from app.grader import grade_question
from app.models import ExamResultRepository
from app.plagiarism import build_peer_index, check_plagiarism
from app.services.analysis_service import ExamAnalysisService
from app.services.gemini_service import GeminiGradingService
from app.services.task_tracker import TaskTracker

logger = logging.getLogger(__name__)


def _build_result_entry(
    question_id: str,
    grade_result: Dict[str, Any],
    plagiarism_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    plagiarism = plagiarism_result or {}
    plagiarism_fields = {
        "cheatingScore": plagiarism.get("cheatingScore", 0.0),
        "cheatingFlag": plagiarism.get("cheatingFlag", False),
        "cheatingDetails": plagiarism.get("cheatingDetails"),
    }

    if not grade_result["success"]:
        return {"questionId": question_id, "error": grade_result.get("error"), **plagiarism_fields}

    data = grade_result["data"]
    return {
        "questionId": question_id,
        "score": data["score"],
        "maxMarks": data["maxMarks"],
        "isCorrect": data["isCorrect"],
        "feedback": data["feedback"],
        "reasoning": data["reasoning"],
        **plagiarism_fields,
    }


@celery_app.task(bind=True, name="app.tasks.grading_tasks.grade_exam_task")
def grade_exam_task(self, exam_id, grading_mode, task_id, additional_instructions=None):
    tracker = TaskTracker()
    gemini = GeminiGradingService()
    analysis_service = ExamAnalysisService()
    result_repo = ExamResultRepository()
    data = DataProvider()

    try:
        tracker.start_task(task_id)
        logger.info("Grading task %s started for exam %s", task_id, exam_id)

        # 1. Load exam data
        questions = data.get_exam_questions(exam_id)
        submissions = data.get_exam_submissions(exam_id)
        if not questions or not submissions:
            error = f"Missing questions or submissions for exam {exam_id}"
            tracker.fail_task(task_id, error)
            return {"success": False, "error": error}

        questions_by_id = {q["questionId"]: q for q in questions}
        peer_index = build_peer_index(submissions)
        total_answers = len(questions) * len(submissions)
        graded_count = 0
        exam_results = []

        # 2. Grade each student submission
        for submission in submissions:
            student_id = submission["studentId"]
            per_question_results = []
            total_score = 0
            total_marks = 0

            for answer in submission["answers"]:
                question_id = answer["questionId"]
                question = questions_by_id.get(question_id)
                if not question:
                    logger.warning("Unknown question %s — skipped", question_id)
                    continue

                # 3. Grade (MCQ or text)
                grade_result = grade_question(
                    question=question,
                    answer=answer,
                    mode=grading_mode,
                    gemini_service=gemini,
                    additional_instructions=additional_instructions,
                )

                # 4. Plagiarism check (text questions only)
                plagiarism_result = None
                if question.get("type") == "text":
                    plagiarism_result = check_plagiarism(
                        student_id=student_id,
                        question_id=question_id,
                        submitted_answer=answer.get("submittedAnswer", ""),
                        peer_index=peer_index,
                    )

                per_question_results.append(
                    _build_result_entry(question_id, grade_result, plagiarism_result)
                )

                if grade_result["success"]:
                    total_score += grade_result["data"]["score"]
                    total_marks += grade_result["data"]["maxMarks"]

                graded_count += 1
                tracker.update_progress(task_id, graded_count)
                logger.info("Task %s: %s / %s answers graded", task_id, graded_count, total_answers)

            percentage = (total_score / total_marks * 100) if total_marks else 0
            exam_results.append({
                "examId": exam_id,
                "studentId": student_id,
                "totalScore": total_score,
                "totalMarks": total_marks,
                "percentage": percentage,
                "results": per_question_results,
                "gradedAt": datetime.now(),
                "gradingMode": grading_mode,
            })

        # 5. Persist results and analytics
        saved_count = result_repo.insert_many(exam_results)
        analysis = analysis_service.calculate_analysis(exam_id, grading_mode)

        summary = {
            "examId": exam_id,
            "totalGraded": saved_count,
            "avgScore": analysis["avgScore"] if analysis else 0,
            "message": "Grading and analysis complete",
        }
        tracker.complete_task(task_id, summary)
        logger.info("Grading task %s completed", task_id)
        return {"success": True, "data": summary}

    except Exception as exc:
        error = f"Error in grading task: {exc}"
        logger.error(error, exc_info=True)
        tracker.fail_task(task_id, error)
        return {"success": False, "error": error}
