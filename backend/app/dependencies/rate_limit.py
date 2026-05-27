import time
from collections import defaultdict
from fastapi import Request, HTTPException

# Sliding window: 60 requests per minute per IP
# NOTE: This dict is per-process. With multiple Uvicorn workers,
# the effective limit is MAX_REQUESTS * num_workers per IP.
# For production with >1 worker, use Redis-backed limiting.
_requests: dict = defaultdict(list)
WINDOW_SECONDS = 60
MAX_REQUESTS = 60


def rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - WINDOW_SECONDS

    _requests[ip] = [t for t in _requests[ip] if t > window_start]
    if not _requests[ip]:
        del _requests[ip]  # evict stale entries to prevent unbounded growth

    if len(_requests[ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Limit: 60/min per IP."
        )

    _requests[ip].append(now)
