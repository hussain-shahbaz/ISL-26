"""Exam grading routes"""

from flask import Blueprint, request, jsonify
import logging
from app.services import ExamCheckingService, ExamAnalysisService
from app.services.task_tracker import TaskTracker
from app.tasks.grading_tasks import grade_exam_task
from app.data_provider import DataProvider

logger = logging.getLogger(__name__)

grading_bp = Blueprint('grading', __name__, url_prefix='/api')

exam_service = ExamCheckingService()
analysis_service = ExamAnalysisService()
task_tracker = TaskTracker()
data_provider = DataProvider()


@grading_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "exam-grader"
    }), 200


@grading_bp.route('/grade', methods=['POST'])
def grade_exam():
    """
    Grade an exam by ID
    
    Query parameters:
    - examId: The exam ID to grade (required)
    - mode: Grading mode - 'strict', 'lenient', or 'medium' (default: 'medium')
    - instructions: Optional custom grading instructions (URL-encoded)
    
    Example: 
    POST /api/grade?examId=exam_001&mode=strict&instructions=Focus%20on%20technical%20accuracy
    """
    
    exam_id = request.args.get('examId')
    mode = request.args.get('mode', 'medium')
    instructions = request.args.get('instructions')
    
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    
    if mode not in ['strict', 'lenient', 'medium']:
        return jsonify({"error": "Invalid mode"}), 400
    
    logger.info(f"Grading exam: {exam_id}, mode: {mode}")
    if instructions:
        logger.info(f"Using custom instructions: {instructions[:50]}...")
    
    result = exam_service.check_exam(exam_id, mode, instructions)
    
    if result['success']:
        return jsonify({"success": True, "data": result['data']}), 200
    else:
        return jsonify({"success": False, "error": result['error']}), 500


@grading_bp.route('/results', methods=['GET'])
def get_results():
    """
    Get grading results for an exam
    
    Query parameters:
    - examId: The exam ID (required)
    
    Example: GET /api/results?examId=exam_001
    """
    
    exam_id = request.args.get('examId')
    
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    
    logger.info(f"Fetching results for exam: {exam_id}")
    
    result = exam_service.get_exam_results(exam_id)
    
    if result['success']:
        return jsonify({"success": True, "data": result['data']}), 200
    else:
        return jsonify({"success": False, "error": result['error']}), 404


@grading_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """
    Get exam analytics (average score, top students, strong/weak concepts)
    
    Query parameters:
    - examId: The exam ID (required)
    
    Example: GET /api/analytics?examId=exam_001
    """
    
    exam_id = request.args.get('examId')
    
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    
    logger.info(f"Fetching analytics for exam: {exam_id}")
    
    analysis = analysis_service.get_analysis(exam_id)
    
    if analysis:
        return jsonify({"success": True, "data": analysis}), 200
    else:
        return jsonify({"success": False, "error": "Analytics not found"}), 404


# ============================================================================
# ASYNC ENDPOINTS (NEW) - Redis-backed progress tracking
# ============================================================================

@grading_bp.route('/grade/async', methods=['POST'])
def grade_exam_async():
    """
    Start an asynchronous grading task with progress tracking
    
    Query parameters:
    - examId: The exam ID to grade (required)
    - mode: Grading mode - 'strict', 'lenient', or 'medium' (default: 'medium')
    - instructions: Optional custom grading instructions (URL-encoded)
    
    Returns:
    {
        "success": true,
        "taskId": "uuid-string",
        "message": "Grading task started",
        "checkProgressUrl": "/api/grade/progress?taskId=uuid-string"
    }
    
    Example: 
    POST /api/grade/async?examId=exam_001&mode=strict
    """
    
    exam_id = request.args.get('examId')
    mode = request.args.get('mode', 'medium')
    instructions = request.args.get('instructions')
    
    if not exam_id:
        return jsonify({"error": "examId parameter required"}), 400
    
    if mode not in ['strict', 'lenient', 'medium']:
        return jsonify({"error": "Invalid mode"}), 400
    
    try:
        # Get total questions for progress tracking
        questions = data_provider.get_exam_questions(exam_id)
        submissions = data_provider.get_exam_submissions(exam_id)
        
        if not questions or not submissions:
            return jsonify({"error": f"No data found for exam {exam_id}"}), 404
        
        total_questions = len(questions) * len(submissions)
        
        # Create task tracking entry in Redis
        task_id = task_tracker.create_task(exam_id, mode, total_questions)
        
        # Submit async task to Celery
        grade_exam_task.delay(exam_id, mode, task_id, instructions)
        
        logger.info(f"Started async grading task {task_id} for exam {exam_id}")
        
        return jsonify({
            "success": True,
            "taskId": task_id,
            "message": "Grading task started",
            "checkProgressUrl": f"/api/grade/progress?taskId={task_id}",
            "estimatedQuestions": total_questions
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting async grading: {e}")
        return jsonify({"error": str(e)}), 500


@grading_bp.route('/grade/progress', methods=['GET'])
def get_grading_progress():
    """
    Get progress of an async grading task
    
    Query parameters:
    - taskId: The task ID returned from /api/grade/async (required)
    
    Returns when processing:
    {
        "status": "processing",
        "progress": {
            "current": 7,
            "total": 15,
            "percentage": 46.7
        },
        "elapsed": 2.5
    }
    
    Returns when completed:
    {
        "status": "completed",
        "result": {
            "examId": "exam_001",
            "totalGraded": 3,
            "avgScore": 14.5,
            "message": "Grading and analysis complete"
        },
        "elapsed": 12.3
    }
    
    Returns on error:
    {
        "status": "failed",
        "error": "Error message",
        "elapsed": 5.2
    }
    
    Example: GET /api/grade/progress?taskId=550e8400-e29b-41d4-a716-446655440000
    """
    
    task_id = request.args.get('taskId')
    
    if not task_id:
        return jsonify({"error": "taskId parameter required"}), 400
    
    try:
        progress_data = task_tracker.get_task_progress(task_id)
        
        if not progress_data:
            return jsonify({"error": "Task not found"}), 404
        
        # Calculate elapsed time
        from datetime import datetime
        created_at = datetime.fromisoformat(progress_data['created_at'])
        elapsed = (datetime.now() - created_at).total_seconds()
        
        response = {
            "status": progress_data['status'],
            "progress": progress_data.get('progress', {}),
            "elapsed": round(elapsed, 1)
        }
        
        # Add result if completed
        if progress_data['status'] == 'completed' and progress_data.get('result'):
            response['result'] = progress_data['result']
        
        # Add error if failed
        if progress_data['status'] == 'failed' and progress_data.get('error'):
            response['error'] = progress_data['error']
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        return jsonify({"error": str(e)}), 500


@grading_bp.route('/grade/cleanup', methods=['DELETE'])
def cleanup_grading_task():
    """
    Delete a completed grading task from Redis cache
    
    Query parameters:
    - taskId: The task ID to delete (required)
    
    Example: DELETE /api/grade/cleanup?taskId=uuid-string
    """
    
    task_id = request.args.get('taskId')
    
    if not task_id:
        return jsonify({"error": "taskId parameter required"}), 400
    
    try:
        task_tracker.delete_task(task_id)
        logger.info(f"Deleted task {task_id}")
        return jsonify({"success": True, "message": f"Task {task_id} deleted"}), 200
        
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        return jsonify({"error": str(e)}), 500
