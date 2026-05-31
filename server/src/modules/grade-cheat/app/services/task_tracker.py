"""Async grading task state in Redis (live) + MongoDB (history)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from app.cache import redis_client
from app.models import GradingTaskRepository

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = ("pending", "processing")


class ExamTaskAlreadyRunning(Exception):
    def __init__(self, exam_id: str, task_id: str):
        self.exam_id = exam_id
        self.task_id = task_id
        super().__init__(f"Exam {exam_id} already has active task {task_id}")


class TaskTracker:
    def __init__(self):
        self.task_repo = GradingTaskRepository()

    def get_active_exam_task(self, exam_id: str) -> Optional[str]:
        """Return task_id if this exam has a pending/processing job, else None."""
        task_id = redis_client.get_exam_lock_task_id(exam_id)
        if not task_id:
            return None

        progress = self.get_task_progress(task_id)
        if progress and progress.get("status") in ACTIVE_STATUSES:
            return task_id

        redis_client.release_exam_lock(exam_id)
        return None

    def create_task(
        self,
        exam_id: str,
        grading_mode: str,
        total_questions: int,
        questions: Optional[list] = None,
        submissions: Optional[list] = None,
    ) -> str:
        """Create task record and acquire Redis exam lock."""
        existing = self.get_active_exam_task(exam_id)
        if existing:
            raise ExamTaskAlreadyRunning(exam_id, existing)

        task_id = str(uuid4())
        now = datetime.now().isoformat()
        progress = {
            "task_id": task_id,
            "exam_id": exam_id,
            "grading_mode": grading_mode,
            "status": "pending",
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "total_questions": total_questions,
            "questions_graded": 0,
            "questions_failed": 0,
            "progress": {"current": 0, "total": total_questions, "percentage": 0.0},
            "result": None,
            "error": None,
            "questions": questions,
            "submissions": submissions,
        }

        if not redis_client.acquire_exam_lock(exam_id, task_id):
            locked = redis_client.get_exam_lock_task_id(exam_id)
            raise ExamTaskAlreadyRunning(exam_id, locked or "unknown")

        try:
            redis_client.set_task_progress(task_id, progress)
            self.task_repo.insert_task(progress.copy())
        except Exception:
            redis_client.release_exam_lock(exam_id)
            raise
        logger.info("Created task %s for exam %s", task_id, exam_id)
        return task_id

    def start_task(self, task_id: str) -> bool:
        progress = redis_client.get_task_progress(task_id)
        if not progress:
            return False

        now = datetime.now().isoformat()
        progress["status"] = "processing"
        progress["started_at"] = now
        redis_client.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {"status": "processing", "started_at": now})
        return True

    def update_progress(self, task_id: str, questions_graded: int, failed: int = 0) -> bool:
        progress = redis_client.get_task_progress(task_id)
        if not progress:
            return False

        total = progress["total_questions"]
        progress["questions_graded"] = questions_graded
        progress["questions_failed"] += failed
        pct = (questions_graded / total * 100) if total else 0
        progress["progress"] = {
            "current": questions_graded,
            "total": total,
            "percentage": round(pct, 1),
        }

        redis_client.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "questions_graded": progress["questions_graded"],
            "questions_failed": progress["questions_failed"],
            "progress": progress["progress"],
        })
        return True

    def complete_task(self, task_id: str, result: Dict[str, Any]) -> bool:
        progress = redis_client.get_task_progress(task_id)
        if not progress:
            return False

        now = datetime.now().isoformat()
        progress["status"] = "completed"
        progress["completed_at"] = now
        progress["result"] = result
        progress["progress"]["percentage"] = 100.0
        progress["progress"]["current"] = progress["total_questions"]

        redis_client.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "status": "completed",
            "completed_at": now,
            "result": result,
            "progress": progress["progress"],
        })
        redis_client.release_exam_lock(progress["exam_id"])
        return True

    def fail_task(self, task_id: str, error: str) -> bool:
        progress = redis_client.get_task_progress(task_id)
        if not progress:
            return False

        now = datetime.now().isoformat()
        progress["status"] = "failed"
        progress["completed_at"] = now
        progress["error"] = error

        redis_client.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "status": "failed",
            "completed_at": now,
            "error": error,
        })
        redis_client.release_exam_lock(progress["exam_id"])
        return True

    def get_task_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        progress = redis_client.get_task_progress(task_id)
        if progress:
            return progress

        db_task = self.task_repo.find_by_task_id(task_id)
        if db_task:
            return db_task
        return None

    def get_tasks_by_exam(self, exam_id: str):
        return self.task_repo.find_by_exam(exam_id)

    def delete_task(self, task_id: str) -> bool:
        progress = redis_client.get_task_progress(task_id)
        exam_id = progress.get("exam_id") if progress else None

        redis_client.delete_task_progress(task_id)
        self.task_repo.delete_task(task_id)

        if exam_id:
            if redis_client.get_exam_lock_task_id(exam_id) == task_id:
                redis_client.release_exam_lock(exam_id)
        return True
