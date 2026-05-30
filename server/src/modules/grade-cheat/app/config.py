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


class Config:
    """All settings come from environment variables with safe defaults."""

    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "3004"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = FLASK_ENV == "development"
    TESTING = False

    # Gemini (text questions only)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # MongoDB
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "exam_grading")

    # Redis / Celery
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 30 * 60

    # Plagiarism (TF-IDF similarity threshold, 0–100)
    CHEATING_THRESHOLD = int(os.getenv("CHEATING_THRESHOLD", "85"))

    # Reserved for future real-data integration (DataProvider still uses mock data)
    USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
