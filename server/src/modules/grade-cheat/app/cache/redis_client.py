"""Redis client and cache management"""

import redis
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.config import Config

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client singleton for caching and task tracking"""
    
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Redis connection"""
        if self._client is None:
            try:
                # redis 4.5.4 uses RESP2 by default, no HELLO command
                self._client = redis.from_url(Config.REDIS_URL, decode_responses=True)
                logger.info(f"Connected to Redis: {Config.REDIS_URL}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise
    
    @property
    def client(self):
        """Get Redis client instance"""
        return self._client
    
    def set_task_progress(self, task_id: str, progress: Dict[str, Any], ttl: int = 86400) -> bool:
        """
        Store task progress in Redis
        
        Args:
            task_id: Unique task identifier
            progress: Progress data dictionary
            ttl: Time-to-live in seconds (default: 24 hours)
        """
        try:
            key = f"grading:{task_id}"
            self._client.setex(key, ttl, json.dumps(progress))
            return True
        except Exception as e:
            logger.error(f"Error setting task progress: {e}")
            return False
    
    def get_task_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve task progress from Redis"""
        try:
            key = f"grading:{task_id}"
            data = self._client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Error getting task progress: {e}")
            return None
    
    def delete_task_progress(self, task_id: str) -> bool:
        """Delete task progress from Redis"""
        try:
            key = f"grading:{task_id}"
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting task progress: {e}")
            return False
    
    def set_cache(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Store any data in cache"""
        try:
            self._client.setex(key, ttl, json.dumps(value) if not isinstance(value, str) else value)
            return True
        except Exception as e:
            logger.error(f"Error setting cache: {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        """Retrieve cached data"""
        try:
            data = self._client.get(key)
            if data:
                try:
                    return json.loads(data)
                except:
                    return data
            return None
        except Exception as e:
            logger.error(f"Error getting cache: {e}")
            return None
    
    def delete_cache(self, key: str) -> bool:
        """Delete cached data"""
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting cache: {e}")
            return False
    
    def health_check(self) -> bool:
        """Check Redis connection health"""
        try:
            return self._client.ping()
        except:
            return False
