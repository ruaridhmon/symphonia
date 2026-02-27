from __future__ import annotations

import os
import secrets
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import User, UserRole
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt


SECRET_KEY = os.environ.get("JWT_SECRET", "your-jwt-secret-CHANGE-ME")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Cookie configuration
AUTH_COOKIE_NAME = "session_token"
CSRF_COOKIE_NAME = "csrf_token"
COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = "lax"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

# ── Join code generation ──

_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # 23 chars, no I/O
_DIGITS = "2345679"  # 7 chars, no 0/1/8


def generate_join_code() -> str:
    """Generate a human-readable join code: SYM-XXXX-NNNN."""
    letters = "".join(secrets.choice(_LETTERS) for _ in range(4))
    digits = "".join(secrets.choice(_DIGITS) for _ in range(4))
    return f"SYM-{letters}-{digits}"


def normalize_join_code(raw: str) -> str:
    """Strip whitespace, hyphens, uppercase. Accepts both old and new formats."""
    cleaned = raw.strip().upper().replace("-", "").replace(" ", "")
    if cleaned.startswith("SYM"):
        cleaned = cleaned[3:]
    return cleaned


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


def get_password_hash(pw):
    return pwd_context.hash(pw)


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if user and verify_password(password, user.hashed_password):
        return user
    return None


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


def _resolve_token(request: Request, bearer_token: str | None) -> str | None:
    """Extract JWT from httpOnly cookie first, then fall back to Bearer header.

    This enables a smooth migration: old clients using Bearer still work,
    new clients using httpOnly cookies get XSS protection.
    """
    # 1. Try httpOnly cookie (preferred — immune to XSS)
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    # 2. Fall back to Authorization: Bearer header (backward compat)
    if bearer_token:
        return bearer_token
    return None


async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Resolve the current user from cookie or Bearer token.

    Tries candidates in order (cookie preferred, then Bearer). If the cookie
    is stale/invalid (e.g. old JWT secret after a redeploy), the Bearer token
    is used as a fallback rather than immediately returning 401. This prevents
    the "session expired" loop where a valid Bearer token is ignored because
    an expired cookie is present.
    """
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")

    # Build candidate list: httpOnly cookie first (XSS-proof), then Bearer
    candidates: list[str] = []
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token:
        candidates.append(cookie_token)
    if token:
        candidates.append(token)

    if not candidates:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    for candidate in candidates:
        # Legacy dev dummy token
        if candidate == "dummy-token":
            admin = db.query(User).filter(User.email == admin_email).first()
            if admin:
                return admin
            continue

        # Validate JWT
        try:
            payload = jwt.decode(candidate, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                continue
        except JWTError:
            continue  # Try next candidate

        # Guard against legacy tokens with email in sub (old format)
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            continue  # Try next candidate

        # Role is always read from DB, never from JWT (security requirement)
        user = db.query(User).filter(User.id == user_id_int).first()
        if user:
            return user
        # User ID valid but not in DB — try next candidate

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


# ── Role-based dependencies ──


def require_role(*roles: UserRole):
    """FastAPI dependency — returns 403 if user's role not in allowed set."""
    allowed = {r.value for r in roles}

    async def _check(user: User = Depends(get_current_user)):
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(r.value for r in roles)}",
            )
        return user

    return _check


require_facilitator = require_role(UserRole.FACILITATOR, UserRole.PLATFORM_ADMIN)
require_platform_admin = require_role(UserRole.PLATFORM_ADMIN)


# ── Form-level access control ──


def assert_form_owner_or_facilitator(form: object, user: User) -> None:
    """Raise 403 unless user owns the form or is a platform admin."""
    if getattr(form, "owner_id", None) == user.id:
        return
    if user.role == UserRole.PLATFORM_ADMIN.value:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the consultation owner or a platform admin can perform this action",
    )
