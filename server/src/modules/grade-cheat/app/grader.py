"""Route MCQ to exact match, text answers to Gemini (Grok fallback)."""

from typing import Any, Dict, Optional

from app.services.gemini_service import GeminiGradingService


def grade_mcq(submitted_answer: str, reference_answer: str, marks: int) -> Dict[str, Any]:
    submitted = submitted_answer.strip()
    reference = reference_answer.strip()
    ok = submitted.lower() == reference.lower()

    return {
        "success": True,
        "data": {
            "score": marks if ok else 0,
            "maxMarks": marks,
            "isCorrect": ok,
            "feedback": "Correct answer." if ok else f"Incorrect. The correct answer is {reference}.",
            "whyWrong": None if ok else f"Expected {reference}, got {submitted or '(blank)'}.",
            "reasoning": "MCQ graded by exact match.",
            "confidence": 1.0,
        },
    }


def grade_question(
    question: Dict[str, Any],
    answer: Dict[str, Any],
    mode: str = "medium",
    grader: Optional[GeminiGradingService] = None,
    additional_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    q_type = question.get("type") or answer.get("questionType", "text")

    if q_type == "mcq":
        return grade_mcq(
            answer.get("submittedAnswer", ""),
            question.get("referenceAnswer", ""),
            question.get("marks", 0),
        )

    if grader is None:
        grader = GeminiGradingService()

    return grader.grade_answer(
        question_text=question["questionText"],
        reference_answer=question["referenceAnswer"],
        submitted_answer=answer.get("submittedAnswer", ""),
        marks=question["marks"],
        mode=mode,
        additional_instructions=additional_instructions,
    )
