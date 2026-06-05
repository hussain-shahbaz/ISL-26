"""Rate limit + retry for LLM API calls."""

import logging
import time
from threading import Lock

from app.config import Config
from app.gemini_keys import is_quota_error

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API calls."""

    def __init__(self, requests_per_minute: int):
        self.min_interval = 60.0 / requests_per_minute
        self.last_request_time = None
        self.lock = Lock()

    def wait_if_needed(self):
        """Wait if needed to maintain rate limit."""
        with self.lock:
            if self.last_request_time is not None:
                elapsed = time.time() - self.last_request_time
                if elapsed < self.min_interval:
                    wait_time = self.min_interval - elapsed
                    # Cap sleep to avoid excessive blocking in async tasks
                    wait_time = min(wait_time, 5.0)
                    if wait_time > 0.1:
                        time.sleep(wait_time)
            self.last_request_time = time.time()


_limiter = RateLimiter(Config.GEMINI_RATE_LIMIT_RPM)


def call_with_limit(fn):
    """Wait for rate limit, then run fn()."""
    _limiter.wait_if_needed()
    return fn()


def retry_with_backoff(fn, label: str = "llm", max_retries: int = 3, wait_seconds: int = 60):
    """Retry fn on quota/rate-limit errors with exponential backoff."""
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            return call_with_limit(fn)
        except Exception as exc:
            last_error = exc
            if is_quota_error(exc) and attempt < max_retries:
                # Exponential backoff: 60s, 120s, 180s, etc.
                backoff = wait_seconds * min(attempt, 3)
                logger.warning(
                    "[%s] quota/rate limit — retry %d/%d in %ds",
                    label,
                    attempt,
                    max_retries,
                    backoff,
                )
                time.sleep(backoff)
                continue
            raise
    raise last_error  # type: ignore[misc]
