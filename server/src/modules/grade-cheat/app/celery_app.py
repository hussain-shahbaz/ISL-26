"""Celery application — runs grading tasks in the background."""

import platform

from celery import Celery

from app.config import Config

celery_app = Celery(__name__)

# Windows cannot use prefork; solo pool runs tasks in-process
worker_pool = "solo" if platform.system() == "Windows" else "prefork"

celery_app.conf.update(
    broker_url=Config.CELERY_BROKER_URL,
    result_backend=Config.CELERY_RESULT_BACKEND,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_pool=worker_pool,
)

celery_app.autodiscover_tasks(["app.tasks"])
