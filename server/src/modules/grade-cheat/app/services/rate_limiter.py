"""Rate limiter for Gemini API to stay within free tier quotas"""

import time
import logging
from threading import Lock
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter for Gemini API (5 requests per minute for free tier)"""
    
    def __init__(self, requests_per_minute: int = 5):
        """
        Initialize rate limiter
        
        Args:
            requests_per_minute: Max requests allowed per minute (default: 5 for free tier)
        """
        self.requests_per_minute = requests_per_minute
        self.min_interval = 60.0 / requests_per_minute  # Seconds between requests
        self.last_request_time = None
        self.lock = Lock()
        logger.info(f"Rate limiter initialized: {requests_per_minute} req/min ({self.min_interval:.1f}s interval)")
    
    def wait_if_needed(self):
        """Wait if necessary to maintain rate limit"""
        with self.lock:
            if self.last_request_time is None:
                self.last_request_time = time.time()
                return 0
            
            elapsed = time.time() - self.last_request_time
            if elapsed < self.min_interval:
                wait_time = self.min_interval - elapsed
                logger.debug(f"Rate limit: waiting {wait_time:.1f}s before next request")
                time.sleep(wait_time)
            
            self.last_request_time = time.time()
            return elapsed
    
    def reset(self):
        """Reset the rate limiter"""
        with self.lock:
            self.last_request_time = None
            logger.info("Rate limiter reset")


# Global rate limiter instance
_rate_limiter = RateLimiter(requests_per_minute=5)


def rate_limit():
    """Decorator to apply rate limiting to functions"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            _rate_limiter.wait_if_needed()
            return func(*args, **kwargs)
        return wrapper
    return decorator


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance"""
    return _rate_limiter
