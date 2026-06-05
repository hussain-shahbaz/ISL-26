"""Exam questions and submissions provider backed by Student Exam API."""

import logging
import os
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

from app.config import Config

if not Config.SUBMISSION_BASE_URL:
    raise ValueError("SUBMISSION_BASE_URL is not configured")


class DataProvider:
    """Returns lists keyed by examId — matches legacy get_exam_questions / get_exam_submissions."""

    def __init__(self):
        self.base_url = Config.SUBMISSION_BASE_URL.rstrip("/")

    def _get(self, path: str, **kwargs):
        response = requests.get(
            f"{self.base_url}{path}",
            headers={
                "x-service-secret": Config.SERVICE_SECRET,
            },
            timeout=30,
            **kwargs,
        )

        response.raise_for_status()

        payload = response.json()

        if not payload.get("success", False):
            raise RuntimeError(
                payload.get("error")
                or payload.get("message")
                or "Student Exam API request failed"
            )

        return payload.get("data")
    def list_exams(self) -> List[Dict[str, Any]]:
        exams = self._get("/")

        return [
            {
                "examId": str(exam["_id"]),
                "questionCount": len(exam.get("questions", [])),
                "submissionCount": 0,  # API does not expose this information
            }
            for exam in exams
        ]

    def get_exam_questions(self, exam_id: str) -> List[Dict[str, Any]]:
        exams = self._get("/")

        for exam in exams:
            if str(exam["_id"]) == str(exam_id):
                return exam.get("questions", [])

        logger.warning("No questions for exam %s", exam_id)
        return []

    def get_exam_submissions(self, exam_id: str) -> List[Dict[str, Any]]:
        """
        Student Exam API does not expose an endpoint that returns
        all submissions for an exam.

        If your grading service requires bulk submissions,
        a new endpoint must be added to student-exam service.
        """
        logger.warning(
            "Student Exam API does not support fetching all submissions for exam %s",
            exam_id,
        )
        return []

    def get_student_submission(
        self,
        exam_id: str,
        student_id: str,
    ) -> Optional[Dict[str, Any]]:
        try:
            return self._get(
                f"/result/{exam_id}",
                params={"studentId": student_id},
            )
        except Exception as exc:
            logger.warning(
                "No submission found for exam=%s student=%s (%s)",
                exam_id,
                student_id,
                exc,
            )
            return None