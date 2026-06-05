"""Text grading: Gemini first (google-genai), Groq fallback (OpenAI-compatible)."""

import json
import logging
from typing import Any, Dict, Optional

import requests
from google import genai
from google.genai import types
from pydantic import BaseModel, field_validator

from app.config import Config
from app.gemini_keys import QuotaExhaustedError, run_with_retry
from app.services.grading.rate_limiter import call_with_limit, retry_with_backoff

logger = logging.getLogger(__name__)

__all__ = ["GeminiGradingService", "GroqGradingService"]


class GradingOutput(BaseModel):
    score: float
    isCorrect: bool
    feedback: str
    whyWrong: Optional[str] = None
    reasoning: str
    confidence: float

    @field_validator("confidence", mode="before")
    @classmethod
    def convert_confidence(cls, v):
        """Convert text confidence (High/Medium/Low) to 0-1 float."""
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            mapping = {
                "high": 0.85,
                "medium": 0.65,
                "low": 0.40,
                "very high": 0.95,
                "very low": 0.20,
            }
            return mapping.get(v.lower().strip(), 0.65)
        return 0.65


_SYSTEM = {
    "strict": "Strict exam grader. Require correct terminology.",
    "lenient": "Lenient grader. Focus on concepts; accept paraphrasing.",
    "medium": "Balanced grader. Mix accuracy and understanding.",
}


def _system_prompt(mode: str, extra: Optional[str]) -> str:
    text = _SYSTEM.get(mode, _SYSTEM["medium"]) + " Keep feedback to 2-3 sentences."
    if extra:
        text += f"\n\nAdditional:\n{extra}"
    return text


def _user_prompt(question_text, reference_answer, submitted_answer, marks) -> str:
    return (
        f"Question: {question_text}\n"
        f"Reference: {reference_answer}\n"
        f"Student: {submitted_answer}\n"
        f"Max marks: {marks}\n"
        "Return JSON only with keys: score, isCorrect, feedback, whyWrong, reasoning, "
        "confidence (float 0-1, where 0.9+ is high confidence, 0.5-0.7 is medium, <0.5 is low)."
    )


def _parse_grading_json(content: str) -> GradingOutput:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    data = json.loads(text)
    return GradingOutput.model_validate(data)


def _format_result(result: GradingOutput, marks: int) -> Dict[str, Any]:
    score = max(0, min(result.score, marks))
    return {
        "success": True,
        "data": {
            "score": score,
            "maxMarks": marks,
            "isCorrect": result.isCorrect,
            "feedback": result.feedback,
            "whyWrong": result.whyWrong,
            "reasoning": result.reasoning,
            "confidence": result.confidence,
        },
    }


class GroqGradingService:
    """Grade via Groq API (free/cheap OpenAI-compatible endpoint)."""

    def grade_answer(
        self,
        question_text: str,
        reference_answer: str,
        submitted_answer: str,
        marks: int,
        mode: str = "medium",
        additional_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not Config.GROQ_API_KEY:
            return {"success": False, "error": "GROQ_API_KEY not configured"}

        if mode not in _SYSTEM:
            mode = "medium"

        system = _system_prompt(mode, additional_instructions)
        user = _user_prompt(question_text, reference_answer, submitted_answer, marks)

        def _call():
            # Groq uses OpenAI-compatible /chat/completions endpoint
            url = f"{Config.GROQ_BASE_URL}/chat/completions"
            resp = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {Config.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": Config.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.3,
                },
                timeout=Config.GROQ_TIMEOUT,
            )
            resp.raise_for_status()
            return _parse_grading_json(resp.json()["choices"][0]["message"]["content"])

        try:
            result = retry_with_backoff(
                _call,
                label="groq",
                max_retries=3,
                wait_seconds=10,
            )
            logger.info("Graded via Groq")
            return _format_result(result, marks)
        except Exception as exc:
            logger.exception("Groq grading failed: %s", exc)
            return {"success": False, "error": str(exc)}


class GeminiGradingService:
    """Grade via Gemini API; falls back to Groq on quota/errors."""

    def __init__(self):
        self._groq = GroqGradingService()

    def _call_gemini(self, api_key, question_text, reference_answer, submitted_answer, marks, mode, extra):
        system = _system_prompt(mode, extra)
        user = _user_prompt(question_text, reference_answer, submitted_answer, marks)

        def _invoke():
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.3,
                    response_mime_type="application/json",
                ),
            )
            return _parse_grading_json(response.text)

        return call_with_limit(_invoke)

    def grade_answer(
        self,
        question_text: str,
        reference_answer: str,
        submitted_answer: str,
        marks: int,
        mode: str = "medium",
        additional_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        if mode not in _SYSTEM:
            mode = "medium"

        args = (question_text, reference_answer, submitted_answer, marks, mode, additional_instructions)

        # Try Gemini first if keys are configured
        if Config.GEMINI_API_KEYS:
            try:
                result = run_with_retry(
                    lambda key: self._call_gemini(key, *args),
                    label="gemini",
                )
                logger.info("Graded via Gemini")
                return _format_result(result, marks)
            except QuotaExhaustedError:
                logger.warning("Gemini quota exhausted — using Groq")
            except Exception as exc:
                logger.warning("Gemini failed: %s — using Groq", str(exc)[:100])

        # Fall back to Groq
        logger.info("Falling back to Groq")
        return self._groq.grade_answer(
            question_text, reference_answer, submitted_answer, marks, mode, additional_instructions
        )
