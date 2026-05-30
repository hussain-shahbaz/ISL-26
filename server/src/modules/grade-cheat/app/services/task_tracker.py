"""Task progress tracking using Redis + MongoDB persistence"""

import logging
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, Optional
from app.cache.redis_client import RedisClient
from app.models import GradingTaskRepository

logger = logging.getLogger(__name__)


class TaskTracker:
    """Track async grading task progress (Redis for speed, MongoDB for persistence)"""
    
    def __init__(self):
        """Initialize task tracker with Redis and MongoDB"""
        self.redis = RedisClient()
        self.task_repo = GradingTaskRepository()
    
    def create_task(self, exam_id: str, grading_mode: str, total_questions: int) -> str:
        """
        Create a new grading task and store in both Redis and MongoDB
        
        Args:
            exam_id: The exam being graded
            grading_mode: Grading mode (strict/lenient/medium)
            total_questions: Total questions to grade
            
        Returns:
            Task ID (UUID)
        """
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
            "progress": {
                "current": 0,
                "total": total_questions,
                "percentage": 0.0
            },
            "result": None,
            "error": None
        }
        
        # Store in Redis for fast polling
        self.redis.set_task_progress(task_id, progress)
        
        # Persist in MongoDB for permanent record
        self.task_repo.insert_task(progress.copy())
        
        logger.info(f"Created task {task_id} for exam {exam_id}")
        return task_id
    
    def start_task(self, task_id: str) -> bool:
        """Mark task as started in both Redis and MongoDB"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        now = datetime.now().isoformat()
        progress["status"] = "processing"
        progress["started_at"] = now
        
        self.redis.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "status": "processing",
            "started_at": now
        })
        
        return True
    
    def update_progress(self, task_id: str, questions_graded: int, failed: int = 0) -> bool:
        """
        Update task progress in both Redis and MongoDB
        
        Args:
            task_id: Task ID
            questions_graded: Number of questions graded so far
            failed: Number of failed gradings
        """
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        total = progress["total_questions"]
        progress["questions_graded"] = questions_graded
        progress["questions_failed"] += failed
        
        percentage = (questions_graded / total * 100) if total > 0 else 0
        progress["progress"] = {
            "current": questions_graded,
            "total": total,
            "percentage": round(percentage, 1)
        }
        
        self.redis.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "questions_graded": progress["questions_graded"],
            "questions_failed": progress["questions_failed"],
            "progress": progress["progress"]
        })
        
        return True
    
    def complete_task(self, task_id: str, result: Dict[str, Any]) -> bool:
        """Mark task as completed with result in both Redis and MongoDB"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        now = datetime.now().isoformat()
        progress["status"] = "completed"
        progress["completed_at"] = now
        progress["result"] = result
        progress["progress"]["percentage"] = 100.0
        progress["progress"]["current"] = progress["total_questions"]
        
        self.redis.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "status": "completed",
            "completed_at": now,
            "result": result,
            "progress": progress["progress"]
        })
        
        return True
    
    def fail_task(self, task_id: str, error: str) -> bool:
        """Mark task as failed with error in both Redis and MongoDB"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        now = datetime.now().isoformat()
        progress["status"] = "failed"
        progress["completed_at"] = now
        progress["error"] = error
        
        self.redis.set_task_progress(task_id, progress)
        self.task_repo.update_task(task_id, {
            "status": "failed",
            "completed_at": now,
            "error": error
        })
        
        return True
    
    def get_task_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current task progress (Redis first, fallback to MongoDB)"""
        progress = self.redis.get_task_progress(task_id)
        if progress:
            return progress
        
        # Fallback to MongoDB if Redis entry expired
        db_task = self.task_repo.find_by_task_id(task_id)
        if db_task:
            db_task.pop('_id', None)
            return db_task
        
        return None
    
    def get_tasks_by_exam(self, exam_id: str):
        """Get all tasks for an exam from MongoDB"""
        tasks = self.task_repo.find_by_exam(exam_id)
        for task in tasks:
            task.pop('_id', None)
        return tasks
    
    def delete_task(self, task_id: str) -> bool:
        """Delete task from both Redis and MongoDB"""
        self.redis.delete_task_progress(task_id)
        self.task_repo.delete_task(task_id)
        return True

