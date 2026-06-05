"""Text grading: Gemini first (google-genai), Groq fallback (OpenAI-compatible).

Groq base URL: https://api.groq.com/openai/v1  (NOT api.x.ai — that is xAI/Grok)
Free-tier limits (2026): 30 RPM / 6 000 TPM / 1 000 RPD per model.
Recommended free models: llama-3.3-70b-versatile, llama3-8b-8192, gemma2-9b-it
"""

import json
import logging
import time
from typing import Any, Dict, Optional

import requests
from google import genai
from google.genai import types
from pydantic import BaseModel, field_validator

from app.config import Config
from app.utils.gemini_keys import QuotaExhaustedError, run_with_retry
from app.services.grading.rate_limiter import call_with_limit, retry_with_backoff

logger = logging.getLogger(__name__)

__all__ = ["GeminiGradingService", "GroqGradingService"]

# ── Correct Groq endpoint ────────────────────────────────────────────────────
# Config.GROQ_BASE_URL must be "https://api.groq.com/openai/v1"
# If it is still pointing at api.x.ai, override it here as a safety net.
_GROQ_BASE_URL_FALLBACK = "https://api.groq.com/openai/v1"


def _groq_base_url() -> str:
    """Return the correct Groq base URL, fixing the common mis-config."""
    url = getattr(Config, "GROQ_BASE_URL", _GROQ_BASE_URL_FALLBACK) or _GROQ_BASE_URL_FALLBACK
    if "x.ai" in url or not url.startswith("https://api.groq.com"):
        logger.warning(
            "GROQ_BASE_URL is '%s' which looks wrong — using %s instead. "
            "Fix Config.GROQ_BASE_URL = 'https://api.groq.com/openai/v1'",
            url,
            _GROQ_BASE_URL_FALLBACK,
        )
        return _GROQ_BASE_URL_FALLBACK
    return url.rstrip("/")


# ── Recommended free-tier models (most capable → lightest) ──────────────────
_GROQ_MODEL_FALLBACK_CHAIN = [
    "llama-3.3-70b-versatile",   # Best quality; 30 RPM / 6 K TPM / 1 K RPD
    "llama3-8b-8192",            # Fastest; same RPM, lowest latency
    "gemma2-9b-it",              # Highest TPM (15 K) if token budget is an issue
]


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


def _is_connection_error(exc: Exception) -> bool:
    """True for network/DNS errors that are worth retrying after a short wait."""
    msg = str(exc).lower()
    return any(k in msg for k in ("connectionerror", "nameresolution", "timeout", "connect"))


def _is_rate_limit_error(exc: Exception) -> bool:
    """True for HTTP 429 / quota errors."""
    msg = str(exc).lower()
    return any(k in msg for k in ("429", "rate limit", "quota", "too many requests"))


class GroqGradingService:
    """Grade via Groq API (free, OpenAI-compatible).

    Endpoint: https://api.groq.com/openai/v1/chat/completions
    Free tier: 30 RPM / 6 000 TPM / 1 000 RPD (no credit card needed).
    Falls back through _GROQ_MODEL_FALLBACK_CHAIN on quota errors.
    """

    # How long to wait (seconds) before retrying a rate-limited request
    _RATE_LIMIT_WAIT = 62   # just over 1 minute resets the RPM window
    _CONN_ERROR_WAIT = 5    # brief pause before retrying a connection error
    _MAX_RETRIES = 4

    def _post(self, model: str, system: str, user: str) -> GradingOutput:
        """Single HTTP call to Groq."""
        base = _groq_base_url()
        url = f"{base}/chat/completions"
        timeout = getattr(Config, "GROQ_TIMEOUT", 30)

        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {Config.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.3,
            },
            timeout=timeout,
        )

        # Surface HTTP errors as exceptions with the status code in the message
        if not resp.ok:
            raise requests.HTTPError(
                f"HTTP {resp.status_code}: {resp.text[:300]}", response=resp
            )

        return _parse_grading_json(resp.json()["choices"][0]["message"]["content"])

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

        # Decide which model to try first
        configured_model = getattr(Config, "GROQ_MODEL", None) or _GROQ_MODEL_FALLBACK_CHAIN[0]
        # Build ordered chain: configured model first, then the rest
        chain = [configured_model] + [m for m in _GROQ_MODEL_FALLBACK_CHAIN if m != configured_model]

        last_exc: Optional[Exception] = None

        for model in chain:
            for attempt in range(1, self._MAX_RETRIES + 1):
                try:
                    result = call_with_limit(lambda m=model: self._post(m, system, user))
                    logger.info("Graded via Groq (%s)", model)
                    return _format_result(result, marks)

                except requests.exceptions.ConnectionError as exc:
                    # DNS / network failure — retry quickly, not a quota issue
                    last_exc = exc
                    logger.warning(
                        "[groq/%s] Connection error (attempt %d/%d): %s",
                        model, attempt, self._MAX_RETRIES, str(exc)[:120],
                    )
                    if attempt < self._MAX_RETRIES:
                        time.sleep(self._CONN_ERROR_WAIT * attempt)
                        continue
                    break  # give up on this model, try next

                except requests.exceptions.Timeout as exc:
                    last_exc = exc
                    logger.warning("[groq/%s] Timeout (attempt %d/%d)", model, attempt, self._MAX_RETRIES)
                    if attempt < self._MAX_RETRIES:
                        time.sleep(self._CONN_ERROR_WAIT)
                        continue
                    break

                except requests.HTTPError as exc:
                    last_exc = exc
                    if _is_rate_limit_error(exc):
                        logger.warning(
                            "[groq/%s] Rate limited (attempt %d/%d) — waiting %ds",
                            model, attempt, self._MAX_RETRIES, self._RATE_LIMIT_WAIT,
                        )
                        if attempt < self._MAX_RETRIES:
                            time.sleep(self._RATE_LIMIT_WAIT)
                            continue
                    # Non-429 HTTP error or exhausted retries → try next model
                    logger.warning("[groq/%s] HTTP error: %s", model, str(exc)[:120])
                    break

                except Exception as exc:
                    last_exc = exc
                    logger.warning("[groq/%s] Unexpected error: %s", model, str(exc)[:120])
                    break

        logger.error("All Groq models/retries exhausted. Last error: %s", last_exc)
        return {"success": False, "error": f"Groq grading failed: {last_exc}"}


class GeminiGradingService:
    """Grade via Gemini API; falls back to Groq on quota/errors.

    Uses gemini-1.5-flash (free tier: 15 RPM / 1 500 RPD on AI Studio keys).
    """

    def __init__(self):
        self._groq = GroqGradingService()

    def _call_gemini(self, api_key, question_text, reference_answer, submitted_answer, marks, mode, extra):
        system = _system_prompt(mode, extra)
        user = _user_prompt(question_text, reference_answer, submitted_answer, marks)

        def _invoke():
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=Config.GEMINI_MODEL,  # e.g. "gemini-1.5-flash"
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
                logger.warning("Gemini quota exhausted — falling back to Groq")
            except Exception as exc:
                logger.warning("Gemini failed: %s — falling back to Groq", str(exc)[:100])

        # Fall back to Groq
        logger.info("Falling back to Groq")
        return self._groq.grade_answer(
            question_text, reference_answer, submitted_answer, marks, mode, additional_instructions
        )