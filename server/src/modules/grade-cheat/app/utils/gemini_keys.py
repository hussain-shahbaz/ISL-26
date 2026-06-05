"""Gemini API key pool: rotate on quota errors, wait and retry.

IS THIS USEFUL? YES — keep it.
  - Free AI Studio keys have per-minute AND per-day quotas (5 RPM / 1500 RPD for embeddings,
    15 RPM / 1500 RPD for generation on gemini-1.5-flash).
  - Adding 2-3 free API keys from different Google accounts multiplies your effective quota.
  - Key rotation is the standard pattern for maximizing free-tier throughput.
  - Without this, a single quota hit would fail the entire request immediately.

Changes in this version:
  - Cleaner fast-fail for single-key setups (don't burn 5-minute sleeps pointlessly)
  - reset_exhausted() now logs which keys are being retried (count only, not values)
  - Added `all_keys_exhausted` property for external monitoring
"""

import logging
import time
from threading import Lock
from typing import Callable, List, Optional, TypeVar

from app.config import Config

logger = logging.getLogger(__name__)

T = TypeVar("T")


class QuotaExhaustedError(Exception):
    """Raised when all Gemini keys are exhausted and retries are spent."""


def is_quota_error(exc: Exception) -> bool:
    """Detect quota / rate-limit errors from Gemini (and Groq)."""
    msg = str(exc).lower()
    return any(k in msg for k in (
        "resource_exhausted", "429", "quota", "rate limit", "too many requests",
        "rate_limit_exceeded",
    ))


class KeyPool:
    """Round-robin Gemini API key pool with per-key quota tracking."""

    def __init__(self, keys: List[str]):
        if not keys:
            raise ValueError("No Gemini API keys configured (GEMINI_API_KEYS or GEMINI_API_KEY)")
        self._keys = keys
        self._index = 0
        self._exhausted: set = set()
        self._lock = Lock()

    @property
    def size(self) -> int:
        return len(self._keys)

    @property
    def all_keys_exhausted(self) -> bool:
        with self._lock:
            return len(self._exhausted) >= len(self._keys)

    def available(self) -> List[str]:
        with self._lock:
            return [k for k in self._keys if k not in self._exhausted]

    def current(self) -> Optional[str]:
        avail = self.available()
        if not avail:
            return None
        with self._lock:
            return avail[self._index % len(avail)]

    def mark_exhausted(self, key: str) -> None:
        with self._lock:
            self._exhausted.add(key)
            self._index = (self._index + 1) % max(len(self._keys), 1)
        remaining = len(self.available())
        logger.warning(
            "Gemini key quota hit — %d/%d keys still available",
            remaining, len(self._keys),
        )

    def reset_exhausted(self) -> None:
        with self._lock:
            count = len(self._exhausted)
            self._exhausted.clear()
        if count:
            logger.info("Gemini key pool: reset %d exhausted key(s) — retrying", count)


_pool: Optional[KeyPool] = None


def get_key_pool() -> KeyPool:
    global _pool
    if _pool is None:
        _pool = KeyPool(Config.GEMINI_API_KEYS)
    return _pool


def run_with_retry(fn: Callable[[str], T], label: str = "gemini") -> T:
    """Call fn(api_key), rotating keys and backing off on quota errors.

    Strategy:
    - Single key: fail fast after first quota hit (no point waiting 5 min)
    - Multiple keys: rotate through all, then sleep and retry once more
    """
    pool = get_key_pool()
    wait = getattr(Config, "GEMINI_RETRY_WAIT_SECONDS", 65)
    max_attempts = getattr(Config, "GEMINI_MAX_RETRIES", 4)
    last_error: Optional[Exception] = None

    for attempt in range(1, max_attempts + 1):
        key = pool.current()

        if key is None:
            # All keys exhausted
            if pool.size == 1:
                # Single key — no point retrying; let caller fall back to Groq
                raise QuotaExhaustedError(
                    f"[{label}] single Gemini key quota exhausted"
                ) from last_error

            # Multiple keys exhausted — wait for quota window to reset, then retry once
            if attempt >= max_attempts:
                break
            delay = min(wait * attempt, 300)  # cap at 5 minutes
            logger.warning(
                "[%s] all %d keys exhausted — waiting %ds before retry (attempt %d/%d)",
                label, pool.size, delay, attempt, max_attempts,
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
                raise  # non-quota errors propagate immediately
            last_error = exc
            pool.mark_exhausted(key)
            logger.warning(
                "[%s] quota error on attempt %d/%d — rotating key",
                label, attempt, max_attempts,
            )

    raise QuotaExhaustedError(
        f"[{label}] quota exhausted after {max_attempts} attempts ({pool.size} key(s))"
    ) from last_error