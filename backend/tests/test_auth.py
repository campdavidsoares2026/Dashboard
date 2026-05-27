import pytest
from unittest.mock import patch
from fastapi import HTTPException
from app.dependencies.auth import verify_api_key


def test_valid_api_key():
    with patch.dict("os.environ", {"EXPORT_API_KEY": "secret123"}):
        result = verify_api_key("Bearer secret123")
        assert result is None


def test_invalid_api_key():
    with patch.dict("os.environ", {"EXPORT_API_KEY": "secret123"}):
        with pytest.raises(HTTPException) as exc:
            verify_api_key("Bearer wrong-key")
        assert exc.value.status_code == 401


def test_missing_env_key():
    with patch.dict("os.environ", {"EXPORT_API_KEY": ""}):
        with pytest.raises(HTTPException) as exc:
            verify_api_key("Bearer qualquer-coisa")
        assert exc.value.status_code == 500
