"""
Rate limiting configuration for Symphonia backend.

Uses slowapi (built on top of limits library) to provide per-route
rate limiting. Supports:
  - IP-based limiting for unauthenticated routes
  - User-based limiting for authenticated routes
  - Environment-variable toggle (RATE_LIMIT_ENABLED=true|false)

Usage in routes:
    from core.rate_limiter import limiter

    @router.get("/example")
    @limiter.limit("60/minute")
    def example(request: Request):
        ...
"""

from __future__ import annotations

import os

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _rate_limit_enabled() -> bool:
    """Check if rate limiting is enabled via environment variable."""
    return os.environ.get("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")


def _get_rate_limit_key(request: Request) -> str:
    """Extract a rate-limiting key from the request.

    For authenticated requests (Bearer token in header or session_token cookie),
    we try to extract the user identity so limits are per-user rather than per-IP.
    Falls back to client IP for unauthenticated requests.
    """
    # Try to get user identity from JWT token (without full auth validation,
    # just for rate-limit keying — the route handler does real auth)
    try:
        from jose import jwt

        token = None

        # Check Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:]

        # Check session cookie
        if not token:
            token = request.cookies.get("session_token")

        if token:
            # Decode without verification just to get the subject claim
            # (rate limiting doesn't need cryptographic verification)
            payload = jwt.get_unverified_claims(token)
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
    except Exception:
        pass

    # Fallback to IP address
    return get_remote_address(request)


def _noop_key(_request: Request) -> str:
    """When rate limiting is disabled, return a constant key (limits won't fire)."""
    return "noop"


# ---------------------------------------------------------------------------
# Limiter instance (module-level singleton)
# ---------------------------------------------------------------------------

_enabled = _rate_limit_enabled()

limiter = Limiter(
    key_func=_get_rate_limit_key if _enabled else _noop_key,
    enabled=_enabled,
    default_limits=[],  # No default — we apply per-route
    storage_uri="memory://",
)

# ---------------------------------------------------------------------------
# Rate limit constants (centralised so they're easy to tune)
# ---------------------------------------------------------------------------

# Auth routes — prevent brute-force
AUTH_LIMIT = "10/minute"

# Expensive LLM synthesis routes
SYNTHESIS_LIMIT = "5/minute"

# AI suggestion routes (also LLM)
AI_LIMIT = "10/minute"

# Email sending routes — prevent spam
EMAIL_LIMIT = "5/minute"

# General CRUD (create/update/delete)
CRUD_LIMIT = "60/minute"

# Read-only GET routes
READ_LIMIT = "120/minute"
