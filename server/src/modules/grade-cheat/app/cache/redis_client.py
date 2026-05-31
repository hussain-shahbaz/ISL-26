"""Redis connection and key helpers for task progress + exam locks."""

import json
import logging
from typing import Any, Dict, Optional

import redis

from app.config import Config

logger = logging.getLogger(__name__)

_client = None


def _conn():
    global _client
    if _client is None:
        _client = redis.from_url(Config.REDIS_URL, decode_responses=True)
        _client.ping()
        logger.info("Connected to Redis: %s", Config.REDIS_URL)
    return _client


def _task_key(task_id: str) -> str:
    return f"grading:{task_id}"


def _exam_key(exam_id: str) -> str:
    return f"grading:exam:{exam_id}"


def set_task_progress(task_id: str, progress: Dict[str, Any], ttl: int = 86400) -> bool:
    try:
        _conn().setex(_task_key(task_id), ttl, json.dumps(progress))
        return True
    except Exception as exc:
        logger.error("Redis set task failed: %s", exc)
        return False


def get_task_progress(task_id: str) -> Optional[Dict[str, Any]]:
    try:
        raw = _conn().get(_task_key(task_id))
        return json.loads(raw) if raw else None
    except Exception as exc:
        logger.error("Redis get task failed: %s", exc)
        return None


def delete_task_progress(task_id: str) -> bool:
    try:
        _conn().delete(_task_key(task_id))
        return True
    except Exception as exc:
        logger.error("Redis delete task failed: %s", exc)
        return False


def acquire_exam_lock(exam_id: str, task_id: str, ttl: int = 86400) -> bool:
    """Set exam lock if none exists (one active grading task per exam)."""
    return bool(_conn().set(_exam_key(exam_id), task_id, nx=True, ex=ttl))


def release_exam_lock(exam_id: str) -> None:
    _conn().delete(_exam_key(exam_id))


def get_exam_lock_task_id(exam_id: str) -> Optional[str]:
    return _conn().get(_exam_key(exam_id))
