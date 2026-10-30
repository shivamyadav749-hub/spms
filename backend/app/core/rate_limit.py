import time
from collections import defaultdict
from threading import Lock
from typing import Dict, Tuple
from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse

from app.core.config import settings


class TokenBucket:
    def __init__(self, rate: int, per: int):
        self.rate = rate
        self.per = per
        self._buckets: Dict[str, Tuple[float, int]] = {}
        self._lock = Lock()
    
    def consume(self, key: str, amount: int = 1) -> bool:
        now = time.time()
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = (now, self.rate)
                return True
            
            last_refill, tokens = self._buckets[key]
            elapsed = now - last_refill
            refill = elapsed * (self.rate / self.per)
            tokens = min(self.rate, tokens + refill)
            
            if tokens >= amount:
                self._buckets[key] = (now, tokens - amount)
                return True
            
            self._buckets[key] = (now, tokens)
            return False
    
    def get_remaining(self, key: str) -> int:
        now = time.time()
        with self._lock:
            if key not in self._buckets:
                return self.rate
            last_refill, tokens = self._buckets[key]
            elapsed = now - last_refill
            refill = elapsed * (self.rate / self.per)
            tokens = min(self.rate, tokens + refill)
            return int(tokens)


ai_rate_limiter = TokenBucket(settings.AI_RATE_LIMIT_REQUESTS, settings.AI_RATE_LIMIT_WINDOW)


async def rate_limit_dependency(request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return
    
    key = f"ai:{user_id}"
    if not ai_rate_limiter.consume(key):
        remaining = ai_rate_limiter.get_remaining(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"AI rate limit exceeded. Try again later. Remaining: {remaining}",
            headers={"Retry-After": str(settings.AI_RATE_LIMIT_WINDOW)}
        )


def get_rate_limit_headers(user_id: str) -> Dict[str, str]:
    key = f"ai:{user_id}"
    remaining = ai_rate_limiter.get_remaining(key)
    return {
        "X-RateLimit-Limit": str(settings.AI_RATE_LIMIT_REQUESTS),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(settings.AI_RATE_LIMIT_WINDOW)
    }