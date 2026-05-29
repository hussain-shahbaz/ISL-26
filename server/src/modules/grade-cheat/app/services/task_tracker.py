"""Task progress tracking using Redis"""

import logging
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, Optional
from app.cache.redis_client import RedisClient

logger = logging.getLogger(__name__)


class TaskTracker:
    """Track async grading task progress"""
    
    def __init__(self):
        """Initialize task tracker"""
        self.redis = RedisClient()
    
    def create_task(self, exam_id: str, grading_mode: str, total_questions: int) -> str:
        """
        Create a new grading task and store initial progress
        
        Args:
            exam_id: The exam being graded
            grading_mode: Grading mode (strict/lenient/medium)
            total_questions: Total questions to grade
            
        Returns:
            Task ID (UUID)
        """
        task_id = str(uuid4())
        
        progress = {
            "task_id": task_id,
            "exam_id": exam_id,
            "grading_mode": grading_mode,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
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
        
        self.redis.set_task_progress(task_id, progress)
        logger.info(f"Created task {task_id} for exam {exam_id}")
        
        return task_id
    
    def start_task(self, task_id: str) -> bool:
        """Mark task as started"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        progress["status"] = "processing"
        progress["started_at"] = datetime.now().isoformat()
        return self.redis.set_task_progress(task_id, progress)
    
    def update_progress(self, task_id: str, questions_graded: int, failed: int = 0) -> bool:
        """
        Update task progress
        
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
        
        return self.redis.set_task_progress(task_id, progress)
    
    def complete_task(self, task_id: str, result: Dict[str, Any]) -> bool:
        """Mark task as completed with result"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        progress["status"] = "completed"
        progress["completed_at"] = datetime.now().isoformat()
        progress["result"] = result
        progress["progress"]["percentage"] = 100.0
        progress["progress"]["current"] = progress["total_questions"]
        
        return self.redis.set_task_progress(task_id, progress)
    
    def fail_task(self, task_id: str, error: str) -> bool:
        """Mark task as failed with error message"""
        progress = self.redis.get_task_progress(task_id)
        if not progress:
            return False
        
        progress["status"] = "failed"
        progress["completed_at"] = datetime.now().isoformat()
        progress["error"] = error
        
        return self.redis.set_task_progress(task_id, progress)
    
    def get_task_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current task progress"""
        return self.redis.get_task_progress(task_id)
    
    def delete_task(self, task_id: str) -> bool:
        """Delete task from Redis"""
        return self.redis.delete_task_progress(task_id)
