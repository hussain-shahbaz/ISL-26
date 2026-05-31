"""Gemini API key pool: rotate on quota errors, wait and retry."""

import logging
import time
from threading import Lock

from app.config import Config

logger = logging.getLogger(__name__)


class QuotaExhaustedError(Exception):
    """Raised when all keys are exhausted after retries."""


def is_quota_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(
        k in msg
        for k in ("resource_exhausted", "429", "quota", "rate limit", "too many requests")
    )


class KeyPool:
    """Round-robin keys; skip keys that recently hit quota."""

    def __init__(self, keys: list[str]):
        if not keys:
            raise ValueError("No Gemini API keys (set GEMINI_API_KEYS or GEMINI_API_KEY)")
        self._keys = keys
        self._index = 0
        self._exhausted: set[str] = set()
        self._lock = Lock()

    def available(self) -> list[str]:
        with self._lock:
            return [k for k in self._keys if k not in self._exhausted]

    def current(self) -> str | None:
        avail = self.available()
        if not avail:
            return None
        with self._lock:
            return avail[self._index % len(avail)]

    def mark_exhausted(self, key: str) -> None:
        with self._lock:
            self._exhausted.add(key)
            self._index += 1
        remaining = len(self.available())
        logger.warning("Gemini key quota hit (%d/%d keys left)", remaining, len(self._keys))

    def reset_exhausted(self) -> None:
        with self._lock:
            self._exhausted.clear()
        logger.info("Gemini key pool cooldown complete — retrying all keys")

    @property
    def size(self) -> int:
        return len(self._keys)


_pool: KeyPool | None = None


def get_key_pool() -> KeyPool:
    global _pool
    if _pool is None:
        _pool = KeyPool(Config.GEMINI_API_KEYS)
    return _pool


def run_with_retry(fn, label: str = "gemini"):
    """Call fn(api_key); rotate keys and backoff on quota errors."""
    pool = get_key_pool()
    wait = Config.GEMINI_RETRY_WAIT_SECONDS
    max_attempts = Config.GEMINI_MAX_RETRIES
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        key = pool.current()
        if key is None:
            delay = wait * min(attempt, 5)
            logger.warning(
                "[%s] all keys exhausted — waiting %ds (attempt %d/%d)",
                label, delay, attempt, max_attempts,
            )
            time.sleep(delay)
            pool.reset_exhausted()
            key = pool.current()
            if key is None:
                continue

        try:
            return fn(key)
        except Exception as exc:
            if not is_quota_error(exc):
                raise
            last_error = exc
            pool.mark_exhausted(key)
            logger.warning("[%s] quota error, rotating key (attempt %d/%d)", label, attempt, max_attempts)

    raise QuotaExhaustedError(
        f"Gemini quota exhausted after {max_attempts} retries ({pool.size} keys)"
    ) from last_error
