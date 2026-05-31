"""Text grading: Gemini first (google-genai), Grok fallback (requests)."""

import json
import logging
from typing import Any, Dict, Optional

import requests
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.config import Config
from app.gemini_keys import QuotaExhaustedError, run_with_retry
from app.services.rate_limiter import call_with_limit, retry_with_backoff

logger = logging.getLogger(__name__)

__all__ = ["GeminiGradingService", "GrokGradingService"]


class GradingOutput(BaseModel):
    score: float
    isCorrect: bool
    feedback: str
    whyWrong: Optional[str] = None
    reasoning: str
    confidence: float


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
        "Return JSON only with keys: score, isCorrect, feedback, whyWrong, reasoning, confidence."
    )


def _parse_grading_json(content: str) -> GradingOutput:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return GradingOutput.model_validate(json.loads(text))


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


class GrokGradingService:
    """Grade via xAI Grok HTTP API."""

    def grade_answer(
        self,
        question_text: str,
        reference_answer: str,
        submitted_answer: str,
        marks: int,
        mode: str = "medium",
        additional_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not Config.GROK_API_KEY:
            return {"success": False, "error": "GROK_API_KEY not configured"}

        if mode not in _SYSTEM:
            mode = "medium"

        system = _system_prompt(mode, additional_instructions)
        user = _user_prompt(question_text, reference_answer, submitted_answer, marks)

        def _call():
            resp = requests.post(
                f"{Config.GROK_BASE_URL.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {Config.GROK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": Config.GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.3,
                },
                timeout=Config.GROK_TIMEOUT,
            )
            resp.raise_for_status()
            return _parse_grading_json(resp.json()["choices"][0]["message"]["content"])

        try:
            result = retry_with_backoff(
                _call,
                label="grok",
                max_retries=Config.GEMINI_MAX_RETRIES,
                wait_seconds=Config.GEMINI_RETRY_WAIT_SECONDS,
            )
            logger.info("Graded via Grok")
            return _format_result(result, marks)
        except Exception as exc:
            logger.exception("Grok grading failed")
            return {"success": False, "error": str(exc)}


class GeminiGradingService:
    """Grade via Gemini API; falls back to Grok on quota/errors."""

    def __init__(self):
        self._grok = GrokGradingService()

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

        if Config.GEMINI_API_KEYS:
            try:
                result = run_with_retry(
                    lambda key: self._call_gemini(key, *args),
                    label="gemini",
                )
                return _format_result(result, marks)
            except QuotaExhaustedError:
                logger.warning("Gemini quota exhausted — using Grok")
            except Exception as exc:
                logger.warning("Gemini failed (%s) — using Grok", exc)

        return self._grok.grade_answer(*args)
