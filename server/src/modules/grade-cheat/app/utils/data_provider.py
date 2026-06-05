"""Exam questions and submissions provider backed by inter-service APIs."""

import logging
from typing import Any, Dict, List, Optional

import requests

from app.config import Config

logger = logging.getLogger(__name__)


class DataProvider:
    """Returns lists keyed by examId."""

    def __init__(self):
        self.exam_base_url = Config.EXAM_BASE_URL.rstrip("/")
        self.submission_base_url = Config.SUBMISSION_BASE_URL.rstrip("/")

    def _get(self, base_url: str, path: str, **kwargs):
        response = requests.get(
            f"{base_url}{path}",
            headers={
                "x-service-secret": Config.SERVICE_SECRET,
            },
            timeout=30,
            **kwargs,
        )

        response.raise_for_status()

        payload = response.json()

        success = (
            payload.get("success") is True
            or payload.get("status") == "success"
        )

        if not success:
            raise RuntimeError(
                payload.get("error")
                or payload.get("message")
                or "Inter-service request failed"
            )

        return payload.get("data")

    def list_exams(self) -> List[Dict[str, Any]]:
        """
        Optional.
        Only works if exam service exposes a list endpoint.
        """

        try:
            exams = self._get(self.exam_base_url, "")

            return [
                {
                    "examId": str(exam.get("_id") or exam.get("id")),
                    "questionCount": len(exam.get("questions", [])),
                    "submissionCount": 0,
                }
                for exam in exams
            ]

        except Exception:
            logger.exception("Failed to fetch exams")
            return []

    def get_exam_questions(self, exam_id: str) -> List[Dict[str, Any]]:
        """
        GET {EXAM_BASE_URL}/{exam_id}
        """

        try:
            exam = self._get(
                self.exam_base_url,
                f"/{exam_id}",
            )

            questions = exam.get("questions", [])
            logger.debug("QUESTIONS: ",questions)
            if not questions:
                logger.warning(
                    "No questions returned for exam %s",
                    exam_id,
                )

            return questions

        except Exception:
            logger.exception(
                "Failed to fetch questions for exam %s",
                exam_id,
            )
            return []

    def get_exam_submissions(
        self,
        exam_id: str,
    ) -> List[Dict[str, Any]]:
        """
        GET {SUBMISSION_BASE_URL}/result/{exam_id}

        Expected response:
        [
            {
                "studentId": "...",
                "answers": [...]
            }
        ]
        """

        try:
            submissions = self._get(
                self.submission_base_url,
                f"/result/{exam_id}",
            )
            logger.debug("SUBMISSIONS",submissions)
            return submissions or []

        except Exception:
            logger.exception(
                "Failed to fetch submissions for exam %s",
                exam_id,
            )
            return []

    def get_student_submission(
        self,
        exam_id: str,
        student_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        GET {SUBMISSION_BASE_URL}/result/{exam_id}?studentId={student_id}
        """

        try:
            return self._get(
                self.submission_base_url,
                f"/result/{exam_id}",
                params={
                    "studentId": student_id,
                },
            )

        except Exception:
            logger.exception(
                "Failed to fetch submission for exam=%s student=%s",
                exam_id,
                student_id,
            )
            return None