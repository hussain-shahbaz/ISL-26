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

