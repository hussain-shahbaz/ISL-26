"""
Central configuration.

Loads `.env` from the grade-cheat module root before reading any variables,
so both `python main.py` and `celery -A app.celery_app worker` see the same values.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# grade-cheat/.env (one level above this file's app/ folder)
_MODULE_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_MODULE_ROOT / ".env")


def _parse_gemini_keys() -> list[str]:
    """GEMINI_API_KEYS=key1,key2,... or fallback to GEMINI_API_KEY."""
    raw = os.getenv("GEMINI_API_KEYS", "").strip()
    if raw:
        return [k.strip() for k in raw.split(",") if k.strip()]
    single = os.getenv("GEMINI_API_KEY", "").strip()
    return [single] if single else []


_GEMINI_KEYS = _parse_gemini_keys()


class Config:
    """All settings come from environment variables with safe defaults."""

    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "3004"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = FLASK_ENV == "development"
    TESTING = False

    # Gemini — comma-separated keys rotate on quota errors
    GEMINI_API_KEYS = _GEMINI_KEYS
    GEMINI_API_KEY = _GEMINI_KEYS[0] if _GEMINI_KEYS else ""
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    GEMINI_RETRY_WAIT_SECONDS = int(os.getenv("GEMINI_RETRY_WAIT_SECONDS", "60"))
    GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "10"))
    GEMINI_RATE_LIMIT_RPM = int(os.getenv("GEMINI_RATE_LIMIT_RPM", "5"))

    # Grok (xAI) — fallback when Gemini fails
    GROK_API_KEY = os.getenv("GROK_API_KEY", "").strip()
    GROK_MODEL = os.getenv("GROK_MODEL", "grok-4-1-fast-reasoning")
    GROK_BASE_URL = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")
    GROK_TIMEOUT = int(os.getenv("GROK_TIMEOUT", "360"))

    # MongoDB
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "exam_grading")

    # Redis / Celery
    REDIS_URL = os.getenv("REDIS_URL", "redis://172.28.244.79:6379/0")
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 30 * 60

    # Plagiarism: 60% semantic (ChromaDB) + 40% TF-IDF
    CHEATING_THRESHOLD = int(os.getenv("CHEATING_THRESHOLD", "85"))
    SEMANTIC_WEIGHT = float(os.getenv("SEMANTIC_WEIGHT", "0.6"))
    TFIDF_WEIGHT = float(os.getenv("TFIDF_WEIGHT", "0.4"))

    # ChromaDB (semantic embeddings)
    CHROMA_MODE = os.getenv("CHROMA_MODE", "ephemeral")  # ephemeral | persistent
    CHROMA_PATH = os.getenv("CHROMA_PATH", "/tmp/chroma")

    # When false, DataProvider can be extended to call external exam APIs
    USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
