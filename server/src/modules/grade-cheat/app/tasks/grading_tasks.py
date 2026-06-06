"""Celery task: grade exam + run plagiarism checks in one pass."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.celery_app import celery_app
from app.utils.data_provider import DataProvider
from app.models import ExamResultRepository
from app.services import (
    ExamAnalysisService,
    GeminiGradingService,
    TaskTracker,
    check_plagiarism,
    grade_question,
    prepare_plagiarism_index,
)

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
    if not grade_result.get("success"):
        return {"questionId": question_id, "error": grade_result.get("error"), **fields}

    d = grade_result.get("data", {})
    return {
        "questionId": question_id,
        "score": d.get("score", 0),
        "maxMarks": d.get("maxMarks", 0),
        "isCorrect": d.get("isCorrect", False),
        "feedback": d.get("feedback", ""),
        "reasoning": d.get("reasoning", ""),
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
        logger.info(f"🚀 Starting grading task - exam_id={exam_id}, grading_mode={grading_mode}, task_id={task_id}")
        tracker.start_task(task_id)

        progress = tracker.get_task_progress(task_id) or {}
        questions = progress.get("questions")
        submissions = progress.get("submissions")
        logger.debug(f"Retrieved from progress: questions={len(questions or [])}, submissions={len(submissions or [])}")

        if not questions or not submissions:
            data = DataProvider()
            logger.info(f"Fetching exam data from DataProvider for exam_id={exam_id}")
            questions = questions or data.get_exam_questions(exam_id)
            submissions = submissions or data.get_exam_submissions(exam_id)
            logger.debug(f"Fetched: {len(questions or [])} questions, {len(submissions or [])} submissions")

        if not questions or not submissions:
            msg = (
                f"No exam data for {exam_id}: {len(questions or [])} questions, "
                f"{len(submissions or [])} submissions."
            )
            logger.error(f"❌ {msg}")
            tracker.fail_task(task_id, msg)
            return {"success": False, "error": msg}

        logger.debug(f"Questions structure (first question): {questions[0] if questions else 'NONE'}")
        logger.debug(f"Submission structure (first answer): {submissions[0]['answers'][0] if submissions and submissions[0].get('answers') else 'NONE'}")

        # Build questions index using _id (that's what submissions reference)
        questions_by_id = {
            q.get("_id"): q
            for q in questions
        }
        logger.info(f"✅ Built questions_by_id with {len(questions_by_id)} questions")
        logger.debug(f"Question IDs in index: {list(questions_by_id.keys())}")

        logger.info(f"⏱️ Preparing plagiarism index...")
        peer_index = prepare_plagiarism_index(exam_id, submissions)
        logger.info(f"✅ Plagiarism index ready: {len(peer_index)} question groups")
        logger.debug(f"Peer index keys: {list(peer_index.keys())}")

        total = len(questions) * len(submissions)
        done = 0
        exam_results = []
        logger.info(f"📊 Starting to grade {total} total answers ({len(questions)} questions × {len(submissions)} students)")

        for submission in submissions:
            student_id = submission.get("studentId") or submission.get("_id")
            if not student_id:
                logger.warning("Submission missing studentId, skipping")
                continue

            logger.debug(f"Processing student: {student_id}")
            answers = submission.get("answers") or []
            if not answers:
                logger.warning("Submission %s has no answers", student_id)
                continue

            per_q = []
            score_sum = 0
            marks_sum = 0

            for answer in answers:
                q_id = answer.get("questionId") or answer.get("_id")
                if not q_id:
                    logger.warning(f"Answer missing questionId for student {student_id}, skipping")
                    done += 1
                    tracker.update_progress(task_id, done)
                    continue

                logger.debug(f"Grading q_id={q_id} for student={student_id}")
                question = questions_by_id.get(q_id)
                if not question:
                    logger.warning(f"❌ Question {q_id} not found in questions_by_id for answer")
                    logger.debug(f"Available question IDs: {list(questions_by_id.keys())}")
                    done += 1
                    tracker.update_progress(task_id, done)
                    continue

                logger.debug(f"Found question: type={question.get('type')}, marks={question.get('marks')}")
                grade_result = grade_question(
                    question, answer, grading_mode, grader, additional_instructions,
                )
                logger.debug(f"Grade result: success={grade_result.get('success')}")

                plagiarism_result = None
                if question.get("type") == "text":
                    logger.debug(f"Running plagiarism check for text answer")
                    plagiarism_result = check_plagiarism(
                        exam_id, student_id, q_id,
                        answer.get("submittedAnswer", ""), peer_index,
                    )
                    logger.debug(f"Plagiarism score: {plagiarism_result.get('cheatingScore') if plagiarism_result else 'N/A'}")

                per_q.append(_build_result_entry(q_id, grade_result, plagiarism_result))

                if grade_result.get("success"):
                    d = grade_result.get("data", {})
                    score_sum += d.get("score", 0)
                    marks_sum += d.get("maxMarks", 0)

                done += 1
                tracker.update_progress(task_id, done)

            pct = (score_sum / marks_sum * 100) if marks_sum else 0
            logger.info(f"Student {student_id}: {score_sum}/{marks_sum} ({pct:.1f}%)")
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

        logger.info(f"💾 Saving {len(exam_results)} exam results...")
        saved = result_repo.insert_many(exam_results)
        logger.info(f"✅ Saved {saved} results")
        
        stats = analysis.calculate_analysis(exam_id, grading_mode)
        summary = {
            "examId": exam_id,
            "totalGraded": saved,
            "avgScore": stats.get("avgScore", 0) if stats else 0,
            "message": "Grading and plagiarism check complete",
        }
        tracker.complete_task(task_id, summary)
        logger.info(f"🎉 Grading task completed successfully!")
        return {"success": True, "data": summary}

    except Exception as exc:
        msg = f"Error in grading task: {exc}"
        logger.error(msg, exc_info=True)
        tracker.fail_task(task_id, msg)
        return {"success": False, "error": msg}