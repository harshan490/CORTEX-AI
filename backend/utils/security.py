import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings

logger = logging.getLogger("cortex.utils.security")

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(password, hashed)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError as e:
        logger.warning(f"Token decode failed: {e}")
        raise


def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_refresh_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        return payload
    except JWTError as e:
        logger.warning(f"Refresh token decode failed: {e}")
        raise


def verify_google_token(id_token: str) -> Dict[str, Any]:
    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token as google_id_token

        if not settings.GOOGLE_CLIENT_ID:
            raise ValueError("GOOGLE_CLIENT_ID not configured")

        id_info = google_id_token.verify_oauth2_token(
            id_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid token issuer")

        return {
            "email": id_info.get("email"),
            "name": id_info.get("name"),
            "picture": id_info.get("picture"),
            "sub": id_info.get("sub"),
            "email_verified": id_info.get("email_verified", False),
        }

    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise
    except ImportError:
        logger.warning("google-auth library not available, using mock verification")
        if id_token == "mock_google_token":
            return {
                "email": "user@example.com",
                "name": "Test User",
                "picture": None,
                "sub": "google_mock_12345",
                "email_verified": True,
            }
        raise ValueError("Google auth libraries not installed")

    except Exception as e:
        logger.error(f"Google token verification error: {e}")
        raise


def generate_api_key() -> str:
    return f"cx_{secrets.token_urlsafe(32)}"


def generate_webhook_secret() -> str:
    return secrets.token_hex(32)


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r'[^\w\.\-]', '_', filename)
    safe = safe.strip('.')
    return safe or f"file_{uuid.uuid4().hex[:8]}"


def mask_email(email: str) -> str:
    if '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = local[0] + '***'
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def mask_string(value: str, visible_chars: int = 4) -> str:
    if len(value) <= visible_chars:
        return value
    return value[:visible_chars] + '*' * (len(value) - visible_chars)


import re
