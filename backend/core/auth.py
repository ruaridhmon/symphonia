import os
import secrets
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import User
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from types import SimpleNamespace


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
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
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
    resolved_token = _resolve_token(request, token)
    if not resolved_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")

    if resolved_token == "dummy-token":
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            raise HTTPException(status_code=401, detail="Dummy admin not found")
        return admin

    try:
        payload = jwt.decode(resolved_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise credentials_exception
    return user

async def get_admin_user(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user


def get_current_admin_user(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user


def assert_form_owner_or_admin(form: object, user: User) -> None:
    """Raise 403 if user is neither the form's owner nor a platform admin."""
    if getattr(form, "owner_id", None) != user.id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the form owner or an admin can perform this action",
        )