"""HTTP routes for grading, progress, results, and analytics."""

import logging
from datetime import datetime

from flask import Blueprint, jsonify, request

from app.data_provider import DataProvider
from app.models import ExamResultRepository
from app.services import ExamAnalysisService, ExamTaskAlreadyRunning, TaskTracker
from app.tasks.grading_tasks import grade_exam_task

logger = logging.getLogger(__name__)

grading_bp = Blueprint("grading", __name__, url_prefix="/api")

analysis_service = ExamAnalysisService()
task_tracker = TaskTracker()
result_repo = ExamResultRepository()

VALID_MODES = ("strict", "lenient", "medium")


@grading_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "exam-grader"}), 200


@grading_bp.route("/results", methods=["GET"])
def get_results():
    """Return stored grading results for an exam."""
    exam_id = request.args.get("examId")
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400

    results = result_repo.find_by_exam(exam_id)
    if not results:
        return jsonify({"success": False, "error": f"No results for exam {exam_id}"}), 404

    return jsonify({
        "success": True,
        "data": {"examId": exam_id, "resultsCount": len(results), "results": results},
    }), 200


@grading_bp.route("/analytics", methods=["GET"])
def get_analytics():
    """Return class analytics for a graded exam."""
    exam_id = request.args.get("examId")
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400

    data = analysis_service.get_analysis(exam_id)
    if not data:
        return jsonify({"success": False, "error": "Analytics not found"}), 404

    return jsonify({"success": True, "data": data}), 200


@grading_bp.route("/grade/async", methods=["POST"])
def grade_exam_async():
    """Start async grading + plagiarism (one active task per examId)."""
    exam_id = request.args.get("examId")
    mode = request.args.get("mode", "medium")
    instructions = request.args.get("instructions")

    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    if mode not in VALID_MODES:
        return jsonify({"error": "Invalid mode"}), 400

    try:
        provider = DataProvider()
        questions = provider.get_exam_questions(exam_id)
        submissions = provider.get_exam_submissions(exam_id)
        if not questions or not submissions:
            return jsonify({"error": f"No data found for exam {exam_id}"}), 404

        if result_repo.exists_for_exam(exam_id):
            return jsonify({
                "error": "Exam has already been graded",
                "examId": exam_id,
                "resultsUrl": f"/api/results?examId={exam_id}",
            }), 409

        total = len(questions) * len(submissions)
        task_id = task_tracker.create_task(
            exam_id, mode, total, questions=questions, submissions=submissions,
        )
        grade_exam_task.delay(exam_id, mode, task_id, instructions)

        return jsonify({
            "success": True,
            "taskId": task_id,
            "progressUrl": f"/api/grade/progress?taskId={task_id}",
            "estimatedQuestions": total,
        }), 202

    except ExamTaskAlreadyRunning as exc:
        return jsonify({
            "error": "A grading task is already running for this exam",
            "examId": exc.exam_id,
            "taskId": exc.task_id,
            "progressUrl": f"/api/grade/progress?taskId={exc.task_id}",
        }), 409

    except Exception as exc:
        logger.error("Failed to start grading: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500


@grading_bp.route("/grade/progress", methods=["GET"])
def get_grading_progress():
    """Poll task status by taskId."""
    task_id = request.args.get("taskId")
    if not task_id:
        return jsonify({"error": "taskId parameter required"}), 400

    try:
        progress = task_tracker.get_task_progress(task_id)
        if not progress:
            return jsonify({"error": "Task not found"}), 404

        created = datetime.fromisoformat(progress["created_at"])
        resp = {
            "status": progress["status"],
            "progress": progress.get("progress", {}),
            "elapsed": round((datetime.now() - created).total_seconds(), 1),
        }
        if progress["status"] == "completed" and progress.get("result"):
            resp["result"] = progress["result"]
        if progress["status"] == "failed" and progress.get("error"):
            resp["error"] = progress["error"]
        return jsonify(resp), 200

    except Exception as exc:
        logger.error("Failed to read progress: %s", exc)
        return jsonify({"error": str(exc)}), 500


@grading_bp.route("/grade/cleanup", methods=["DELETE"])
def cleanup_grading_task():
    """Delete a task record and release exam lock if held."""
    task_id = request.args.get("taskId")
    if not task_id:
        return jsonify({"error": "taskId parameter required"}), 400

    try:
        task_tracker.delete_task(task_id)
        return jsonify({"success": True, "message": f"Task {task_id} deleted"}), 200
    except Exception as exc:
        logger.error("Failed to delete task: %s", exc)
        return jsonify({"error": str(exc)}), 500


@grading_bp.route("/tasks", methods=["GET"])
def get_tasks():
    """List all grading tasks for an exam."""
    exam_id = request.args.get("examId")
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400

    try:
        tasks = task_tracker.get_tasks_by_exam(exam_id)
        return jsonify({
            "success": True,
            "data": {"examId": exam_id, "tasksCount": len(tasks), "tasks": tasks},
        }), 200
    except Exception as exc:
        logger.error("Failed to fetch tasks: %s", exc)
        return jsonify({"error": str(exc)}), 500
