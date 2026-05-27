import time
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.dependencies import rate_limit as rl_module
from app.dependencies.rate_limit import rate_limit


def make_request(ip: str):
    request = MagicMock()
    request.client.host = ip
    return request


def test_allows_requests_under_limit():
    rl_module._requests.clear()
    request = make_request("1.2.3.4")
    for _ in range(59):
        rate_limit(request)  # deve passar sem exceção


def test_blocks_at_limit():
    rl_module._requests.clear()
    request = make_request("9.9.9.9")
    for _ in range(60):
        rl_module._requests["9.9.9.9"].append(time.time())
    with pytest.raises(HTTPException) as exc:
        rate_limit(request)
    assert exc.value.status_code == 429


def test_different_ips_are_independent():
    rl_module._requests.clear()
    for _ in range(60):
        rl_module._requests["1.1.1.1"].append(time.time())
    request = make_request("2.2.2.2")
    rate_limit(request)  # IP diferente — deve passar
