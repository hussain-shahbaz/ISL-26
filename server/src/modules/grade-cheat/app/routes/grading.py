"""HTTP routes for grading, progress, results, and analytics."""

import logging
from datetime import datetime

from flask import Blueprint, jsonify, request

from app.data_provider import DataProvider
from app.models import ExamResultRepository
from app.services import ExamAnalysisService
from app.services.task_tracker import TaskTracker
from app.tasks.grading_tasks import grade_exam_task

logger = logging.getLogger(__name__)

grading_bp = Blueprint("grading", __name__, url_prefix="/api")

analysis_service = ExamAnalysisService()
task_tracker = TaskTracker()
result_repo = ExamResultRepository()
data_provider = DataProvider()

VALID_MODES = ("strict", "lenient", "medium")


@grading_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "exam-grader"}), 200


@grading_bp.route("/results", methods=["GET"])
def get_results():
    """GET /api/results?examId=exam_001"""
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
    """GET /api/analytics?examId=exam_001"""
    exam_id = request.args.get("examId")
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400

    analysis = analysis_service.get_analysis(exam_id)
    if not analysis:
        return jsonify({"success": False, "error": "Analytics not found"}), 404

    return jsonify({"success": True, "data": analysis}), 200


@grading_bp.route("/grade/async", methods=["POST"])
def grade_exam_async():
    """
    Start async grading.

    Query params: examId (required), mode (strict|lenient|medium), instructions (optional)
    """
    exam_id = request.args.get("examId")
    mode = request.args.get("mode", "medium")
    instructions = request.args.get("instructions")

    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    if mode not in VALID_MODES:
        return jsonify({"error": "Invalid mode"}), 400

    try:
        questions = data_provider.get_exam_questions(exam_id)
        submissions = data_provider.get_exam_submissions(exam_id)
        if not questions or not submissions:
            return jsonify({"error": f"No data found for exam {exam_id}"}), 404

        total_answers = len(questions) * len(submissions)
        task_id = task_tracker.create_task(exam_id, mode, total_answers)
        grade_exam_task.delay(exam_id, mode, task_id, instructions)

        logger.info("Started grading task %s for exam %s", task_id, exam_id)
        return jsonify({
            "success": True,
            "taskId": task_id,
            "progressUrl": f"/api/grade/progress?taskId={task_id}",
            "estimatedQuestions": total_answers,
        }), 202

    except Exception as exc:
        logger.error("Failed to start grading: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500


@grading_bp.route("/grade/progress", methods=["GET"])
def get_grading_progress():
    """GET /api/grade/progress?taskId=<uuid>"""
    task_id = request.args.get("taskId")
    if not task_id:
        return jsonify({"error": "taskId parameter required"}), 400

    try:
        progress = task_tracker.get_task_progress(task_id)
        if not progress:
            return jsonify({"error": "Task not found"}), 404

        created_at = datetime.fromisoformat(progress["created_at"])
        response = {
            "status": progress["status"],
            "progress": progress.get("progress", {}),
            "elapsed": round((datetime.now() - created_at).total_seconds(), 1),
        }

        if progress["status"] == "completed" and progress.get("result"):
            response["result"] = progress["result"]
        if progress["status"] == "failed" and progress.get("error"):
            response["error"] = progress["error"]

        return jsonify(response), 200

    except Exception as exc:
        logger.error("Failed to read progress: %s", exc)
        return jsonify({"error": str(exc)}), 500


@grading_bp.route("/grade/cleanup", methods=["DELETE"])
def cleanup_grading_task():
    """DELETE /api/grade/cleanup?taskId=<uuid>"""
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
    """GET /api/tasks?examId=exam_001 — grading task history from MongoDB."""
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
