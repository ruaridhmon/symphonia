"""
Email OTP Authentication for Symphonia.

Locks down access to whitelisted emails only (antreas@axiotic.ai, samuel@axiotic.ai).
Uses email-based one-time passwords for secure access.
"""
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from email.message import EmailMessage
from dataclasses import dataclass, field
from fastapi import Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.responses import RedirectResponse as StarletteRedirectResponse
import aiosmtplib

# =============================================================================
# CONFIGURATION
# =============================================================================

# Whitelisted emails - ONLY these can access Symphonia
ALLOWED_EMAILS = frozenset([
    "antreas@axiotic.ai",
    "samuel@axiotic.ai",
])

# OTP configuration
OTP_LENGTH = 6  # 6-digit code
OTP_EXPIRY_MINUTES = 10  # OTP valid for 10 minutes
SESSION_EXPIRY_HOURS = 24  # Session valid for 24 hours
SESSION_COOKIE_NAME = "symphonia_otp_session"
MAX_OTP_ATTEMPTS = 5  # Max wrong attempts before lockout

# =============================================================================
# IN-MEMORY STORES (replace with Redis/DB for production)
# =============================================================================

@dataclass
class OTPRecord:
    email: str
    code_hash: str  # Store hash, not plaintext
    created_at: datetime
    attempts: int = 0


@dataclass
class SessionRecord:
    email: str
    created_at: datetime
    expires_at: datetime


# Thread-safe stores (for single-process deployment)
_otp_store: dict[str, OTPRecord] = {}
_session_store: dict[str, SessionRecord] = {}
_lockout_store: dict[str, datetime] = {}  # email -> lockout_until

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _hash_code(code: str) -> str:
    """Hash OTP code for secure storage."""
    return hashlib.sha256(code.encode()).hexdigest()


def _generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return ''.join(secrets.choice('0123456789') for _ in range(OTP_LENGTH))


def _generate_session_token() -> str:
    """Generate a secure session token."""
    return secrets.token_urlsafe(32)


def is_email_allowed(email: str) -> bool:
    """Check if email is in the whitelist."""
    return email.lower().strip() in ALLOWED_EMAILS


def is_email_locked_out(email: str) -> bool:
    """Check if email is currently locked out due to too many failed attempts."""
    if email not in _lockout_store:
        return False
    lockout_until = _lockout_store[email]
    if datetime.utcnow() > lockout_until:
        del _lockout_store[email]
        return False
    return True


def get_lockout_remaining(email: str) -> Optional[int]:
    """Get remaining lockout seconds, or None if not locked."""
    if email not in _lockout_store:
        return None
    lockout_until = _lockout_store[email]
    remaining = (lockout_until - datetime.utcnow()).total_seconds()
    return int(remaining) if remaining > 0 else None


# =============================================================================
# OTP OPERATIONS
# =============================================================================

def create_otp(email: str) -> str:
    """Create and store a new OTP for an email. Returns the plaintext code."""
    email = email.lower().strip()
    
    if not is_email_allowed(email):
        raise ValueError(f"Email {email} is not authorized to access Symphonia")
    
    if is_email_locked_out(email):
        remaining = get_lockout_remaining(email)
        raise ValueError(f"Too many failed attempts. Try again in {remaining} seconds.")
    
    code = _generate_otp()
    _otp_store[email] = OTPRecord(
        email=email,
        code_hash=_hash_code(code),
        created_at=datetime.utcnow(),
        attempts=0,
    )
    return code


def verify_otp(email: str, code: str) -> bool:
    """Verify an OTP code. Returns True if valid, False otherwise."""
    email = email.lower().strip()
    
    if is_email_locked_out(email):
        return False
    
    record = _otp_store.get(email)
    if not record:
        return False
    
    # Check expiry
    if datetime.utcnow() > record.created_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
        del _otp_store[email]
        return False
    
    # Check attempts
    if record.attempts >= MAX_OTP_ATTEMPTS:
        # Lock out for 15 minutes
        _lockout_store[email] = datetime.utcnow() + timedelta(minutes=15)
        del _otp_store[email]
        return False
    
    # Verify code
    if _hash_code(code) != record.code_hash:
        record.attempts += 1
        return False
    
    # Success - clean up
    del _otp_store[email]
    return True


def create_session(email: str) -> str:
    """Create a new session for a verified email. Returns session token."""
    email = email.lower().strip()
    token = _generate_session_token()
    now = datetime.utcnow()
    
    _session_store[token] = SessionRecord(
        email=email,
        created_at=now,
        expires_at=now + timedelta(hours=SESSION_EXPIRY_HOURS),
    )
    return token


def validate_session(token: str) -> Optional[str]:
    """Validate a session token. Returns email if valid, None otherwise."""
    if not token:
        return None
    
    record = _session_store.get(token)
    if not record:
        return None
    
    if datetime.utcnow() > record.expires_at:
        del _session_store[token]
        return None
    
    return record.email


def invalidate_session(token: str) -> None:
    """Invalidate/logout a session."""
    if token in _session_store:
        del _session_store[token]


# =============================================================================
# EMAIL SENDING
# =============================================================================

async def send_otp_email(email: str, code: str) -> bool:
    """Send OTP code via email. Returns True on success."""
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", "noreply@axiotic.ai")
    msg["To"] = email
    msg["Subject"] = f"Symphonia Access Code: {code}"
    
    html_content = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0A0A0A; font-weight: 600; font-size: 24px; margin: 0;">Symphonia</h1>
            <p style="color: #666; font-size: 14px; margin-top: 8px;">by Axiotic AI</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <p style="color: #888; font-size: 14px; margin: 0 0 16px 0;">Your access code is:</p>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #fff; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px 24px; display: inline-block;">
                {code}
            </div>
            <p style="color: #666; font-size: 12px; margin: 16px 0 0 0;">Valid for 10 minutes</p>
        </div>
        
        <p style="color: #666; font-size: 13px; text-align: center; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
        </p>
    </body>
    </html>
    """
    
    msg.set_content(f"Your Symphonia access code is: {code}\n\nThis code expires in 10 minutes.", subtype="plain")
    msg.add_alternative(html_content, subtype="html")
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not all([smtp_host, smtp_user, smtp_pass]):
        # No SMTP configured - print to console for development
        print(f"\n{'='*50}")
        print(f"📧 OTP EMAIL (SMTP not configured)")
        print(f"   To: {email}")
        print(f"   Code: {code}")
        print(f"{'='*50}\n")
        return True
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            start_tls=True,
            username=smtp_user,
            password=smtp_pass,
        )
        return True
    except Exception as e:
        print(f"❌ Failed to send OTP email: {e}")
        return False


# =============================================================================
# FASTAPI MIDDLEWARE / DEPENDENCIES
# =============================================================================

# Routes that don't require OTP authentication
OTP_EXEMPT_PATHS = frozenset([
    "/docs",
    "/redoc",
    "/openapi.json",
])

# Prefixes that are exempt from OTP auth
OTP_EXEMPT_PREFIXES = (
    "/otp/",      # All OTP routes
    "/static/",   # Static files
    "/assets/",   # Frontend assets (JS, CSS)
)


def _is_path_exempt(path: str) -> bool:
    """Check if a path is exempt from OTP auth."""
    # Exact match
    if path in OTP_EXEMPT_PATHS:
        return True
    # Prefix match (OTP routes, static files)
    if path.startswith(OTP_EXEMPT_PREFIXES):
        return True
    return False


async def require_otp_session(request: Request) -> str:
    """
    FastAPI dependency that requires a valid OTP session.
    Returns the authenticated email.
    Raises HTTPException 401 if not authenticated.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    email = validate_session(token)
    
    if not email:
        # For API requests, return 401
        # For browser requests, could redirect to login
        raise HTTPException(
            status_code=401,
            detail={
                "error": "authentication_required",
                "message": "Please authenticate via OTP to access Symphonia",
                "login_url": "/otp/login",
            }
        )
    
    return email


def get_otp_email_optional(request: Request) -> Optional[str]:
    """
    Get authenticated email if present, None otherwise.
    Does not raise - for optional auth checks.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    return validate_session(token)


class OTPAuthMiddleware:
    """
    ASGI middleware that enforces OTP authentication on all routes
    except those in OTP_EXEMPT_PATHS.
    
    For browser requests (Accept: text/html), redirects to /otp/login.
    For API requests, returns 401 JSON.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            # Pass through non-HTTP (WebSocket, lifespan)
            await self.app(scope, receive, send)
            return
        
        path = scope.get("path", "/")
        
        # Check if path is exempt
        if _is_path_exempt(path):
            await self.app(scope, receive, send)
            return
        
        # Extract headers
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()
        accept_header = headers.get(b"accept", b"").decode()
        
        # Parse cookies
        cookies = {}
        if cookie_header:
            for item in cookie_header.split(";"):
                item = item.strip()
                if "=" in item:
                    key, value = item.split("=", 1)
                    cookies[key.strip()] = value.strip()
        
        token = cookies.get(SESSION_COOKIE_NAME)
        email = validate_session(token)
        
        if email:
            # Valid session - proceed
            await self.app(scope, receive, send)
        else:
            # No valid session
            # Check if this is a browser request (wants HTML)
            is_browser = "text/html" in accept_header
            
            if is_browser:
                # Redirect to login page
                response = StarletteRedirectResponse(url="/otp/login", status_code=302)
            else:
                # Return 401 JSON for API requests
                response = JSONResponse(
                    status_code=401,
                    content={
                        "error": "authentication_required",
                        "message": "Please authenticate via OTP to access Symphonia",
                        "login_url": "/otp/login",
                        "allowed_emails": list(ALLOWED_EMAILS),
                    }
                )
            await response(scope, receive, send)
