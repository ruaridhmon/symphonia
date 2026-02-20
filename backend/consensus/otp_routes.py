"""
OTP Authentication Routes for Symphonia.

Endpoints:
- GET  /otp/login    - Login page (returns HTML form)
- POST /otp/request  - Request OTP code (sends email)
- POST /otp/verify   - Verify OTP code (sets session cookie)
- POST /otp/logout   - Logout (clears session)
- GET  /otp/status   - Check authentication status
"""
from fastapi import APIRouter, Form, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr

from .otp_auth import (
    ALLOWED_EMAILS,
    SESSION_COOKIE_NAME,
    SESSION_EXPIRY_HOURS,
    is_email_allowed,
    is_email_locked_out,
    get_lockout_remaining,
    create_otp,
    verify_otp,
    create_session,
    invalidate_session,
    validate_session,
    send_otp_email,
)
from .auth import create_access_token, get_db
from .models import User
from sqlalchemy.orm import Session
from datetime import timedelta

router = APIRouter(prefix="/otp", tags=["OTP Authentication"])


# =============================================================================
# HTML TEMPLATES
# =============================================================================

LOGIN_PAGE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Symphonia - Sign In</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        
        .container {
            width: 100%;
            max-width: 420px;
            padding: 20px;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 48px 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .logo {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .logo h1 {
            font-size: 32px;
            font-weight: 600;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #fff 0%, #a5a5ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .logo p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            margin-top: 8px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 8px;
        }
        
        .form-group input {
            width: 100%;
            padding: 14px 16px;
            font-size: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            outline: none;
            transition: all 0.2s ease;
        }
        
        .form-group input:focus {
            border-color: rgba(165, 165, 255, 0.5);
            background: rgba(255, 255, 255, 0.08);
        }
        
        .form-group input::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }
        
        .otp-input {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 24px;
            letter-spacing: 8px;
            text-align: center;
        }
        
        .btn {
            width: 100%;
            padding: 14px;
            font-size: 15px;
            font-weight: 600;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #fff;
        }
        
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.5);
        }
        
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .message {
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .message.error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }
        
        .message.success {
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #86efac;
        }
        
        .message.info {
            background: rgba(99, 102, 241, 0.15);
            border: 1px solid rgba(99, 102, 241, 0.3);
            color: #a5b4fc;
        }
        
        .hidden { display: none; }
        
        .step-indicator {
            text-align: center;
            margin-bottom: 24px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
        }
        
        .step-indicator span {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .back-link {
            text-align: center;
            margin-top: 16px;
        }
        
        .back-link button {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
        }
        
        .back-link button:hover {
            color: rgba(255, 255, 255, 0.8);
        }
        
        .allowed-emails {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
            text-align: center;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <h1>Symphonia</h1>
                <p>Expert Consensus Platform</p>
            </div>
            
            <div id="message" class="message hidden"></div>
            
            <!-- Step 1: Email -->
            <form id="email-form">
                <div class="step-indicator">
                    <span>Step 1 of 2</span>
                </div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" 
                           placeholder="you@axiotic.ai" required autofocus>
                </div>
                <button type="submit" class="btn btn-primary" id="request-btn">
                    Send Access Code
                </button>
            </form>
            
            <!-- Step 2: OTP -->
            <form id="otp-form" class="hidden">
                <div class="step-indicator">
                    <span>Step 2 of 2</span>
                </div>
                <div class="form-group">
                    <label for="code">Enter 6-digit code sent to <span id="sent-email"></span></label>
                    <input type="text" id="code" name="code" 
                           class="otp-input" maxlength="6" 
                           placeholder="000000" required 
                           pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code">
                </div>
                <button type="submit" class="btn btn-primary" id="verify-btn">
                    Verify & Sign In
                </button>
                <div class="back-link">
                    <button type="button" onclick="showEmailStep()">← Use different email</button>
                </div>
            </form>
            
            <div class="allowed-emails">
                <strong>Authorized access:</strong><br>
                {allowed_emails}
            </div>
        </div>
    </div>
    
    <script>
        const emailForm = document.getElementById('email-form');
        const otpForm = document.getElementById('otp-form');
        const messageDiv = document.getElementById('message');
        const sentEmailSpan = document.getElementById('sent-email');
        let currentEmail = '';
        
        function showMessage(text, type) {
            messageDiv.textContent = text;
            messageDiv.className = 'message ' + type;
            messageDiv.classList.remove('hidden');
        }
        
        function hideMessage() {
            messageDiv.classList.add('hidden');
        }
        
        function showEmailStep() {
            emailForm.classList.remove('hidden');
            otpForm.classList.add('hidden');
            hideMessage();
        }
        
        function showOtpStep(email) {
            currentEmail = email;
            sentEmailSpan.textContent = email;
            emailForm.classList.add('hidden');
            otpForm.classList.remove('hidden');
            document.getElementById('code').focus();
        }
        
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const btn = document.getElementById('request-btn');
            
            btn.disabled = true;
            btn.textContent = 'Sending...';
            hideMessage();
            
            try {
                const resp = await fetch('/otp/request', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email})
                });
                
                const data = await resp.json();
                
                if (resp.ok) {
                    showMessage('Code sent! Check your email.', 'success');
                    showOtpStep(email);
                } else {
                    showMessage(data.detail || 'Failed to send code', 'error');
                }
            } catch (err) {
                showMessage('Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Send Access Code';
            }
        });
        
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('code').value;
            const btn = document.getElementById('verify-btn');
            
            btn.disabled = true;
            btn.textContent = 'Verifying...';
            hideMessage();
            
            try {
                const resp = await fetch('/otp/verify', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: currentEmail, code})
                });
                
                const data = await resp.json();
                
                if (resp.ok) {
                    showMessage('Success! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = data.redirect || '/';
                    }, 500);
                } else {
                    showMessage(data.detail || 'Invalid code', 'error');
                    document.getElementById('code').value = '';
                    document.getElementById('code').focus();
                }
            } catch (err) {
                showMessage('Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Verify & Sign In';
            }
        });
        
        // Auto-format OTP input
        document.getElementById('code').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    </script>
</body>
</html>
"""


# =============================================================================
# ROUTES
# =============================================================================

@router.get("/login", response_class=HTMLResponse)
async def otp_login_page():
    """Render the OTP login page."""
    html = LOGIN_PAGE_HTML.replace(
        "{allowed_emails}",
        ", ".join(sorted(ALLOWED_EMAILS))
    )
    return HTMLResponse(content=html)


class OTPRequestPayload(BaseModel):
    email: EmailStr


@router.post("/request")
async def request_otp(payload: OTPRequestPayload):
    """
    Request an OTP code to be sent to the specified email.
    Only works for whitelisted emails.
    """
    email = payload.email.lower().strip()
    
    # Check whitelist
    if not is_email_allowed(email):
        raise HTTPException(
            status_code=403,
            detail=f"Email '{email}' is not authorized to access Symphonia. "
                   f"Contact your administrator.",
        )
    
    # Check lockout
    if is_email_locked_out(email):
        remaining = get_lockout_remaining(email)
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Please wait {remaining} seconds.",
        )
    
    # Generate and send OTP
    try:
        code = create_otp(email)
        success = await send_otp_email(email, code)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP email. Please try again.",
            )
        
        return {
            "message": f"OTP sent to {email}",
            "expires_in": "10 minutes",
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class OTPVerifyPayload(BaseModel):
    email: EmailStr
    code: str


@router.post("/verify")
async def verify_otp_code(payload: OTPVerifyPayload, db: Session = Depends(get_db)):
    """
    Verify an OTP code and create an authenticated session.
    Sets a secure session cookie on success.
    Also returns a JWT access token for API calls.
    """
    email = payload.email.lower().strip()
    code = payload.code.strip()
    
    # Validate code format
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=400,
            detail="Invalid code format. Please enter a 6-digit code.",
        )
    
    # Check lockout
    if is_email_locked_out(email):
        remaining = get_lockout_remaining(email)
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Please wait {remaining} seconds.",
        )
    
    # Verify OTP
    if not verify_otp(email, code):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired code. Please try again.",
        )
    
    # Get or create user in database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # User is whitelisted but doesn't exist in DB - create them
        from .auth import get_password_hash
        user = User(
            email=email,
            hashed_password=get_password_hash("otp-authenticated"),
            is_admin=True,  # Both authorized users are admins
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create OTP session cookie
    session_token = create_session(email)
    
    # Create JWT access token for API calls
    jwt_token = create_access_token(
        data={"sub": str(user.id), "is_admin": user.is_admin},
        expires_delta=timedelta(hours=SESSION_EXPIRY_HOURS),
    )
    
    # Build response with cookie AND JWT
    response = JSONResponse(content={
        "message": "Authentication successful",
        "email": email,
        "is_admin": user.is_admin,
        "access_token": jwt_token,
        "token_type": "bearer",
        "expires_in": f"{SESSION_EXPIRY_HOURS} hours",
        "redirect": "/",
    })
    
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=SESSION_EXPIRY_HOURS * 3600,
    )
    
    return response


@router.post("/logout")
async def logout(request: Request):
    """Clear the OTP session (logout)."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    
    if token:
        invalidate_session(token)
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response


@router.get("/status")
async def auth_status(request: Request):
    """Check current authentication status."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    email = validate_session(token)
    
    if email:
        return {
            "authenticated": True,
            "email": email,
        }
    else:
        return {
            "authenticated": False,
            "login_url": "/otp/login",
        }


@router.get("/health")
async def health():
    """Health check endpoint (always accessible)."""
    return {"status": "ok", "service": "symphonia-otp"}
