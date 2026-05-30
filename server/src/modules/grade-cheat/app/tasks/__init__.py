"""Async tasks module"""

# Import all tasks so they get registered with Celery
from . import grading_tasks

__all__ = ['grading_tasks']
