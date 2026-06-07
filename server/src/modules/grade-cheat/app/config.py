import os
from dataclasses import dataclass


@dataclass
class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    
    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    
    # Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # MongoDB
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "exam_grading")
    
    # Neo4j
    NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://127.0.0.1:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4jneo4j")
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Chroma
    CHROMA_MODE = os.getenv("CHROMA_MODE", "ephemeral")
    CHROMA_PATH = os.getenv("CHROMA_PATH", "/tmp/chroma")
    
    # Celery
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 30 * 60
    
    # Cheating Detection
    CHEATING_THRESHOLD = int(os.getenv("CHEATING_THRESHOLD", 85))
    SEMANTIC_WEIGHT = float(os.getenv("SEMANTIC_WEIGHT", 0.6))
    TFIDF_WEIGHT = float(os.getenv("TFIDF_WEIGHT", 0.4))
    
    # Features
    ENABLE_NEO4J = os.getenv("ENABLE_NEO4J", "true").lower() == "true"
    ENABLE_GEMINI = os.getenv("ENABLE_GEMINI", "true").lower() == "true"
    
    # Mock/Real
    USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"


@dataclass
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    FLASK_ENV = "development"
    CHROMA_MODE = "ephemeral"
    USE_MOCK_DATA = True


@dataclass
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = "production"
    CHROMA_MODE = "persistent"
    USE_MOCK_DATA = False


@dataclass
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    CHROMA_MODE = "ephemeral"
    USE_MOCK_DATA = True
    MONGODB_DB = "exam_grading_test"


def get_config() -> Config:
    """Get configuration based on environment"""
    env = os.getenv("FLASK_ENV", "development")
    if env == "production":
        return ProductionConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return DevelopmentConfig()
