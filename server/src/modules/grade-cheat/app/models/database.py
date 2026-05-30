"""MongoDB database client and operations"""

from pymongo import MongoClient
from app.config import Config
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class MongoDBClient:
    """MongoDB connection (Singleton)"""
    
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize MongoDB connection"""
        if self._client is None:
            try:
                self._client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=5000)
                self._client.admin.command('ping')
                logger.info(f"Connected to MongoDB: {Config.MONGODB_URI}")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
                raise
        
        self._db = self._client[Config.MONGODB_DB]
    
    @property
    def db(self):
        return self._db


class ExamResultRepository:
    """Exam results collection"""
    
    def __init__(self):
        self.mongo = MongoDBClient()
        self.collection = self.mongo.db['exam-results']
    
    def insert_many(self, results: List[Dict[str, Any]]) -> int:
        """Bulk insert results"""
        try:
            inserted = self.collection.insert_many(results)
            logger.info(f"Inserted {len(inserted.inserted_ids)} results")
            return len(inserted.inserted_ids)
        except Exception as e:
            logger.error(f"Error inserting results: {e}")
            raise
    
    def find_by_exam(self, exam_id: str) -> List[Dict]:
        """Get all results for an exam"""
        try:
            return list(self.collection.find({'examId': exam_id}))
        except Exception as e:
            logger.error(f"Error finding results: {e}")
            return []


class ExamAnalysisRepository:
    """Exam analysis collection with overall statistics"""
    
    def __init__(self):
        self.mongo = MongoDBClient()
        self.collection = self.mongo.db['exam-analysis']
    
    def insert_analysis(self, analysis: Dict[str, Any]) -> str:
        """Save or update exam analysis"""
        try:
            # Use upsert to replace existing analysis
            result = self.collection.update_one(
                {'examId': analysis['examId']},
                {'$set': analysis},
                upsert=True
            )
            logger.info(f"Saved analysis for exam: {analysis['examId']}")
            return str(result.upserted_id or result.matched_count)
        except Exception as e:
            logger.error(f"Error saving analysis: {e}")
            raise
    
    def find_by_exam(self, exam_id: str) -> Optional[Dict]:
        """Get analysis for an exam"""
        try:
            return self.collection.find_one({'examId': exam_id})
        except Exception as e:
            logger.error(f"Error finding analysis: {e}")
            return None


class GradingTaskRepository:
    """Grading tasks collection for persisting async task state"""
    
    def __init__(self):
        self.mongo = MongoDBClient()
        self.collection = self.mongo.db['grading-tasks']
    
    def insert_task(self, task_data: Dict[str, Any]) -> str:
        """Insert a new grading task"""
        try:
            result = self.collection.insert_one(task_data)
            logger.info(f"Inserted grading task: {task_data.get('task_id')}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error inserting grading task: {e}")
            raise
    
    def update_task(self, task_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a grading task by task_id"""
        try:
            result = self.collection.update_one(
                {'task_id': task_id},
                {'$set': update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating grading task: {e}")
            return False
    
    def find_by_task_id(self, task_id: str) -> Optional[Dict]:
        """Get a grading task by its task_id"""
        try:
            return self.collection.find_one({'task_id': task_id})
        except Exception as e:
            logger.error(f"Error finding grading task: {e}")
            return None
    
    def find_by_exam(self, exam_id: str) -> List[Dict]:
        """Get all grading tasks for an exam, newest first"""
        try:
            return list(
                self.collection.find(
                    {'exam_id': exam_id}
                ).sort('created_at', -1)
            )
        except Exception as e:
            logger.error(f"Error finding grading tasks by exam: {e}")
            return []
    
    def delete_task(self, task_id: str) -> bool:
        """Delete a grading task"""
        try:
            result = self.collection.delete_one({'task_id': task_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting grading task: {e}")
            return False

