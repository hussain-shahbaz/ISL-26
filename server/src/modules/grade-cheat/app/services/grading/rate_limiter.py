"""Rate limit + retry helpers for LLM API calls.

Groq free tier (2026): 30 RPM → min interval ~2 s between calls.
The limiter is intentionally conservative to stay safely under the cap
even when multiple Celery workers share the same process space.
"""

import logging
import time
from threading import Lock
from typing import Callable, TypeVar

from app.config import Config
from app.utils.gemini_keys import is_quota_error

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RateLimiter:
    """Token-bucket rate limiter — thread-safe, single process."""

    def __init__(self, requests_per_minute: int):
        # Add a small safety margin: use 90 % of the stated RPM
        effective_rpm = max(1, int(requests_per_minute * 0.90))
        self.min_interval = 60.0 / effective_rpm
        self.last_request_time: float = 0.0
        self.lock = Lock()

    def wait_if_needed(self) -> None:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            wait = self.min_interval - elapsed
            if wait > 0:
                # Cap single sleep to 10 s so threads don't block forever
                capped = min(wait, 10.0)
                logger.debug("RateLimiter: sleeping %.2f s", capped)
                time.sleep(capped)
            self.last_request_time = time.time()


# One shared limiter instance per process (Gemini + Groq share it)
_limiter = RateLimiter(Config.GEMINI_RATE_LIMIT_RPM)


def call_with_limit(fn: Callable[[], T]) -> T:
    """Enforce rate limit, then call fn()."""
    _limiter.wait_if_needed()
    return fn()


def retry_with_backoff(
    fn: Callable[[], T],
    label: str = "llm",
    max_retries: int = 3,
    wait_seconds: int = 62,
) -> T:
    """Retry fn() on quota / rate-limit errors with capped exponential backoff.

    Wait schedule: wait_seconds * min(attempt, 3)
    Non-quota errors are re-raised immediately (no pointless retrying).
    """
    last_error: Exception = RuntimeError("No attempts made")

    for attempt in range(1, max_retries + 1):
        try:
            return call_with_limit(fn)
        except Exception as exc:
            last_error = exc
            if is_quota_error(exc) and attempt < max_retries:
                backoff = wait_seconds * min(attempt, 3)
                logger.warning(
                    "[%s] quota/rate limit (attempt %d/%d) — retrying in %d s",
                    label, attempt, max_retries, backoff,
                )
                time.sleep(backoff)
                continue
            # Not a quota error, or final attempt — propagate immediately
            raise

    raise last_error