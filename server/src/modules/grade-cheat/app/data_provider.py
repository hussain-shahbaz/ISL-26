"""Exam questions and submissions — same shape as original mock DataProvider."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

FIXTURE_PATH = Path(__file__).resolve().parent / "data" / "exams.json"


def _load_fixture() -> Dict[str, Any]:
    if not FIXTURE_PATH.is_file():
        raise FileNotFoundError(f"Exam fixture not found: {FIXTURE_PATH}")
    with FIXTURE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


class DataProvider:
    """Returns lists keyed by examId — matches legacy get_exam_questions / get_exam_submissions."""

    def list_exams(self) -> List[Dict[str, Any]]:
        data = _load_fixture()
        ids = set(data.get("questions", {})) | set(data.get("submissions", {}))
        return [
            {
                "examId": exam_id,
                "questionCount": len(data["questions"].get(exam_id, [])),
                "submissionCount": len(data["submissions"].get(exam_id, [])),
            }
            for exam_id in sorted(ids)
        ]

    def get_exam_questions(self, exam_id: str) -> List[Dict[str, Any]]:
        questions = _load_fixture().get("questions", {}).get(exam_id, [])
        if not questions:
            logger.warning("No questions for exam %s", exam_id)
        return questions

    def get_exam_submissions(self, exam_id: str) -> List[Dict[str, Any]]:
        submissions = _load_fixture().get("submissions", {}).get(exam_id, [])
        if not submissions:
            logger.warning("No submissions for exam %s", exam_id)
        return submissions

    def get_student_submission(self, exam_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        for submission in self.get_exam_submissions(exam_id):
            if submission["studentId"] == student_id:
                return submission
        return None
