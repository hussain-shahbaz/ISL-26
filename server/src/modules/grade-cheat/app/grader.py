"""
Grade a single exam answer.

- MCQ  → exact string match (case-insensitive), no Gemini call
- Text → Gemini via GeminiGradingService
"""

from typing import Any, Dict, Optional

from app.services.gemini_service import GeminiGradingService


def grade_mcq(submitted_answer: str, reference_answer: str, marks: int) -> Dict[str, Any]:
    submitted = submitted_answer.strip()
    reference = reference_answer.strip()
    is_correct = submitted.lower() == reference.lower()

    return {
        "success": True,
        "data": {
            "score": marks if is_correct else 0,
            "maxMarks": marks,
            "isCorrect": is_correct,
            "feedback": "Correct answer." if is_correct else f"Incorrect. The correct answer is {reference}.",
            "whyWrong": None if is_correct else f"Expected {reference}, got {submitted or '(blank)'}.",
            "reasoning": "MCQ graded by exact match against the reference answer.",
            "confidence": 1.0,
        },
    }


def grade_question(
    question: Dict[str, Any],
    answer: Dict[str, Any],
    mode: str = "medium",
    gemini_service: Optional[GeminiGradingService] = None,
    additional_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    question_type = question.get("type") or answer.get("questionType", "text")

    if question_type == "mcq":
        return grade_mcq(
            submitted_answer=answer.get("submittedAnswer", ""),
            reference_answer=question.get("referenceAnswer", ""),
            marks=question.get("marks", 0),
        )

    if gemini_service is None:
        gemini_service = GeminiGradingService()

    return gemini_service.grade_answer(
        question_text=question["questionText"],
        reference_answer=question["referenceAnswer"],
        submitted_answer=answer.get("submittedAnswer", ""),
        marks=question["marks"],
        mode=mode,
        additional_instructions=additional_instructions,
    )
