import os
import secrets
from fastapi import Header, HTTPException


def verify_api_key(authorization: str = Header(...)) -> None:
    api_key = os.getenv("EXPORT_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EXPORT_API_KEY not configured on server")
    expected = f"Bearer {api_key}"
    if not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
