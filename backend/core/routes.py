from __future__ import annotations

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Form,
    HTTPException,
    Request,
    Query,
    Response as FastAPIResponse,
)
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from email.message import EmailMessage
from openai import OpenAI
import aiosmtplib
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
import asyncio

from .rate_limiter import (
    limiter,
    AUTH_LIMIT,
    SYNTHESIS_LIMIT,
    AI_LIMIT,
    EMAIL_LIMIT,
    CRUD_LIMIT,
    READ_LIMIT,
)

from .models import (
    User,
    Response,
    ArchivedResponse,
    Feedback,
    FormModel,
    RoundModel,
    UserFormUnlock,
    FollowUp,
    FollowUpResponse,
    SynthesisComment,
    SynthesisVersion,
    Draft,
    AuditLog,
    Setting,
    InviteCode,
)
from .audit import audit_log
from .auth import (
    get_db,
    get_password_hash,
    verify_password,
    create_access_token,
    generate_csrf_token,
    get_current_user,
    assert_form_owner_or_facilitator,
    require_facilitator,
    require_platform_admin,
    generate_join_code,
    normalize_join_code,
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    COOKIE_MAX_AGE,
    COOKIE_SECURE,
    COOKIE_SAMESITE,
)
from .models import UserRole
from .db import SessionLocal
from .synthesis import (
    FlowMode,
    SynthesisConfigError,
    SynthesisError,
    SynthesisTimeoutError,
    get_synthesiser,
)
from core.ws import ws_manager

# Load root .env first (lower priority), then backend/.env overrides.
# This allows setting OPENROUTER_API_KEY in the project root .env.
_root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)
load_dotenv()  # backend/.env takes precedence

logger = logging.getLogger("symphonia.routes")


# ---------------------------------------------------------
# SYNTHESIS EMAIL NOTIFICATION HELPER
# ---------------------------------------------------------


async def _notify_synthesis_ready(
    form_id: int,
    round_id: int,
    round_number: int,
    admin_email: str | None,
    convergence_score: float | None = None,
):
    """Send email notifications when synthesis completes.

    Runs as a background task so it never blocks the HTTP response.
    Sends to the admin who triggered synthesis, plus all experts who
    responded to the round (if they have email addresses).

    Controlled by the NOTIFY_ON_SYNTHESIS env var (default: "true").
    Gracefully handles missing SMTP config — logs a warning and exits.
    """
    if os.getenv("NOTIFY_ON_SYNTHESIS", "true").lower() not in ("true", "1", "yes"):
        return

    # Quick check that SMTP is configured
    if not os.getenv("SMTP_HOST"):
        logger.warning(
            "NOTIFY_ON_SYNTHESIS is enabled but SMTP_HOST is not set — skipping email notifications."
        )
        return

    from .email_templates import synthesis_ready

    try:
        db = SessionLocal()
        try:
            form = db.query(FormModel).filter(FormModel.id == form_id).first()
            if not form:
                logger.warning("Synthesis notification: form %s not found", form_id)
                return

            form_title = form.title or f"Form #{form_id}"

            # Build summary URL
            frontend_url = os.getenv("FRONTEND_URL", os.getenv("APP_URL", "")).rstrip(
                "/"
            )
            summary_url = (
                f"{frontend_url}/forms/{form_id}/summary" if frontend_url else ""
            )

            subject, html = synthesis_ready(
                consultation_title=form_title,
                round_number=round_number,
                summary_url=summary_url,
                consensus_score=convergence_score,
            )

            # Collect recipients: admin + responding experts
            recipients: set[str] = set()
            if admin_email:
                recipients.add(admin_email)

            # Add emails of experts who responded to this round
            round_responses = (
                db.query(Response).filter(Response.round_id == round_id).all()
            )
            for resp in round_responses:
                if resp.user and resp.user.email:
                    recipients.add(resp.user.email)

            # Send to each recipient individually
            for recipient in recipients:
                try:
                    await _send_templated_email(recipient, subject, html)
                except Exception as exc:
                    logger.warning(
                        "Failed to send synthesis notification to %s: %s",
                        recipient,
                        exc,
                    )

            logger.info(
                "Synthesis notification sent for form=%s round=%s to %d recipients",
                form_id,
                round_id,
                len(recipients),
            )
        finally:
            db.close()
    except Exception as exc:
        logger.error("Synthesis email notification failed: %s", exc, exc_info=True)


# ---------------------------------------------------------
# COMMENT → SYNTHESIS HELPERS
# ---------------------------------------------------------


def _fetch_comments_for_round(db: Session, round_id: int) -> list[SynthesisComment]:
    """Fetch all comments for a round, ordered chronologically."""
    return (
        db.query(SynthesisComment)
        .filter(SynthesisComment.round_id == round_id)
        .order_by(SynthesisComment.created_at.asc())
        .all()
    )


def _format_comments_as_context(comments: list[SynthesisComment]) -> str:
    """Format synthesis comments into a text block suitable for LLM context.

    Returns an empty string if there are no comments.
    Groups comments by section type and includes author emails
    to allow the LLM to cross-reference with expert responses.
    """
    if not comments:
        return ""

    section_labels = {
        "agreement": "Agreement",
        "disagreement": "Disagreement",
        "nuance": "Nuance",
        "emergence": "Emergent Insight",
        "general": "General",
    }

    # Group by section_type
    grouped: dict[str, list[SynthesisComment]] = {}
    for c in comments:
        grouped.setdefault(c.section_type, []).append(c)

    lines = [
        "",
        "--- Expert Discussion Comments ---",
        "The following comments were posted by experts during discussion of the "
        "synthesis. These represent additional qualitative input — reactions, "
        "corrections, elaborations, and new points raised in deliberation. "
        "Incorporate these perspectives into the synthesis where relevant, "
        "noting them as points raised during expert discussion.",
        "",
    ]

    for section_type, section_comments in grouped.items():
        label = section_labels.get(section_type, section_type.title())
        lines.append(f"[Comments on {label} section]")
        for c in section_comments:
            author = c.author.email if c.author else f"User {c.author_id}"
            idx_note = (
                f" (item #{c.section_index + 1})" if c.section_index is not None else ""
            )
            prefix = "  ↳ Reply" if c.parent_id else " "
            lines.append(f"{prefix} {author}{idx_note}: {c.body}")
        lines.append("")

    lines.append("--- End of Expert Discussion Comments ---")
    return "\n".join(lines)


router = APIRouter()

# Lazy client initialization to avoid startup crash when no API key
_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return None
        _openai_client = OpenAI(
            api_key=api_key, base_url="https://openrouter.ai/api/v1"
        )
    return _openai_client


# Keep 'client' for backwards compat but make it a property
client = None  # Will be set lazily

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ---------------------------------------------------------
# SYNTHESIS HELPERS
# ---------------------------------------------------------


def _sanitize_error_message(raw: str) -> str:
    """
    Sanitize an error message before broadcasting to the frontend.

    Strips out payment/credit/billing details from upstream API errors
    (e.g. OpenRouter 402 messages) so users don't see confusing financial text.
    """
    lowered = raw.lower()
    payment_keywords = (
        "402",
        "payment",
        "credit",
        "billing",
        "balance",
        "insufficient funds",
        "quota",
    )
    if any(kw in lowered for kw in payment_keywords):
        return (
            "Synthesis is temporarily unavailable. "
            "Please try again in a moment or contact support if this persists."
        )
    # Truncate very long messages (raw library exceptions can be huge)
    if len(raw) > 300:
        return raw[:300] + "…"
    return raw


async def _broadcast_synthesis_error(
    form_id: int, round_id: int | None, error_message: str
):
    """Broadcast a synthesis error event via WebSocket so clients can show feedback."""
    safe_message = _sanitize_error_message(error_message)
    for conn in ws_manager.active_connections.copy():
        try:
            await conn.send_json(
                {
                    "type": "synthesis_error",
                    "form_id": form_id,
                    "round_id": round_id,
                    "error": safe_message,
                }
            )
        except Exception:
            ws_manager.disconnect(conn)


def _resolve_synthesis_model(db: Session, payload_model: str | None = None) -> str:
    """Resolve synthesis model: payload → DB settings → env var → default."""
    if payload_model and payload_model.strip():
        return payload_model.strip()
    db_setting = db.query(Setting).filter(Setting.key == "synthesis_model").first()
    if db_setting and db_setting.value:
        return db_setting.value
    return os.getenv("SYNTHESIS_MODEL", "anthropic/claude-opus-4-6")


# ---------------------------------------------------------
# SYNTHESIS STATUS
# ---------------------------------------------------------


@router.get(
    "/synthesis/status",
    tags=["Synthesis"],
    summary="Synthesis health check",
    description="Report the current synthesis configuration: active mode, API key presence, available strategies, and default model.",
    response_description="Synthesis configuration status",
)
@limiter.limit(READ_LIMIT)
def synthesis_status(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return current synthesis engine status for diagnostics."""
    mode_env = os.getenv("SYNTHESIS_MODE", "mock").strip().lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    has_key = bool(api_key and api_key.strip())

    if mode_env != "mock" and not has_key:
        effective_mode = "mock"
        mode_note = (
            f"Configured mode is '{mode_env}' but OPENROUTER_API_KEY is missing; "
            "falling back to mock mode."
        )
    else:
        effective_mode = mode_env
        mode_note = None

    model = _resolve_synthesis_model(db)

    return {
        "configured_mode": mode_env,
        "effective_mode": effective_mode,
        "api_key_configured": has_key,
        "available_strategies": ["mock", "simple", "committee", "ttd"],
        "default_model": model,
        "note": mode_note,
    }


# ---------------------------------------------------------
# USER AUTH
# ---------------------------------------------------------


@router.post(
    "/register",
    tags=["Authentication"],
    summary="Register a new user",
    description=(
        "Create a new user account with email and password. "
        "Behaviour depends on the `registration_mode` platform setting: "
        "open (default), invite-only, or domain-restricted."
    ),
    response_description="Success confirmation message",
)
@limiter.limit(AUTH_LIMIT)
def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    # ── Enforce registration_mode ──
    mode_row = db.query(Setting).filter(Setting.key == "registration_mode").first()
    reg_mode = mode_row.value if mode_row else "open"

    if reg_mode == "invite_only":
        raise HTTPException(
            status_code=403,
            detail="Registration is currently invite-only. Contact your administrator.",
        )
    elif reg_mode == "domain_restricted":
        allowed_row = db.query(Setting).filter(Setting.key == "allowed_domains").first()
        allowed_domains = [
            d.strip().lower()
            for d in (allowed_row.value if allowed_row else "").split(",")
            if d.strip()
        ]
        email_domain = email.rsplit("@", 1)[-1].lower() if "@" in email else ""
        if allowed_domains and email_domain not in allowed_domains:
            raise HTTPException(
                status_code=403,
                detail="Registration restricted to approved domains. Contact your administrator.",
            )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(password)
    user = User(email=email, hashed_password=hashed)
    db.add(user)
    db.commit()
    return {"message": "Registered successfully"}


@router.post(
    "/login",
    tags=["Authentication"],
    summary="Log in and obtain session",
    description=(
        "Authenticate with email and password (OAuth2 form). Sets httpOnly JWT cookie "
        "and a JS-readable CSRF cookie. Also returns tokens in the response body for "
        "backward compatibility. Rate-limited."
    ),
    response_description="Access token, token type, admin flag, email, and CSRF token",
)
@limiter.limit(AUTH_LIMIT)
def login(
    request: Request,
    response: FastAPIResponse,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    csrf_token = generate_csrf_token()

    # Set JWT as httpOnly cookie (not accessible to JS → XSS-proof)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )
    # Set CSRF token as readable cookie (JS reads it, sends as header)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=COOKIE_MAX_AGE,
        httponly=False,  # Must be readable by JS
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )

    # Still return token in body for backward compatibility during migration
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_admin": user.role == UserRole.PLATFORM_ADMIN.value,
        "role": user.role,
        "email": user.email,
        "csrf_token": csrf_token,
    }


@router.post(
    "/logout",
    tags=["Authentication"],
    summary="Log out and clear session",
    description="Clears the httpOnly auth cookie and the CSRF cookie, ending the user session.",
    response_description="Logout confirmation message",
)
@limiter.limit(AUTH_LIMIT)
def logout(
    request: Request,
    response: FastAPIResponse,
):
    """Clear auth cookies."""
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out"}


@router.post(
    "/forgot-password",
    tags=["Authentication"],
    summary="Request a password reset link",
)
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    """Request a password reset link. Always returns 200 to prevent user enumeration."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password?token={token}"

        try:
            from .email_templates import password_reset as password_reset_template

            subject, html = password_reset_template(reset_url=reset_url)
            await _send_templated_email(email, subject, html)
        except Exception:
            logging.warning("Failed to send password reset email to %s", email)

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post(
    "/reset-password",
    tags=["Authentication"],
    summary="Reset password using a valid token",
)
def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
):
    """Reset a user's password using a valid reset token."""
    user = db.query(User).filter(User.reset_token == token).first()
    if (
        not user
        or not user.reset_token_expiry
        or user.reset_token_expiry < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"message": "Password updated successfully"}


@router.get(
    "/me",
    tags=["Authentication"],
    summary="Get current user info",
    description="Returns the authenticated user's email and admin status. Requires a valid session.",
    response_description="Current user email and is_admin flag",
)
@limiter.limit(READ_LIMIT)
def me(
    request: Request,
    user: User = Depends(get_current_user),
):
    return {
        "email": user.email,
        "is_admin": user.role == UserRole.PLATFORM_ADMIN.value,
        "role": user.role,
    }


# ---------------------------------------------------------
# SUBMIT RESPONSE (Delphi style)
# ---------------------------------------------------------


@router.post(
    "/submit",
    tags=["Responses"],
    summary="Submit expert response",
    description=(
        "Submit answers for the active round of a form. If the user has already "
        "submitted for this round, the previous response is replaced. Also creates "
        "an archived copy and cleans up any saved draft. Requires authentication."
    ),
    response_description="Success confirmation",
)
@limiter.limit(CRUD_LIMIT)
def submit_response(
    request: Request,
    form_id: int = Form(...),
    answers: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    # Check if user has already submitted for this round, and delete old response if so
    existing_response = (
        db.query(Response)
        .filter(Response.user_id == user.id, Response.round_id == active_round.id)
        .first()
    )
    if existing_response:
        db.delete(existing_response)
        db.commit()

    data = json.loads(answers)

    new = Response(
        form_id=form_id,
        user_id=user.id,
        round_id=active_round.id,
        answers=data,
    )
    db.add(new)

    archive = ArchivedResponse(
        form_id=form_id,
        user_id=user.id,
        email=user.email,
        answers=data,
        round_id=active_round.id,
    )
    db.add(archive)

    # Clean up any saved draft for this form/round
    db.query(Draft).filter(
        Draft.user_id == user.id,
        Draft.form_id == form_id,
        Draft.round_id == active_round.id,
    ).delete()

    db.commit()
    return {"ok": True}


@router.get(
    "/has_submitted",
    tags=["Responses"],
    summary="Check if user has submitted",
    description="Check whether the authenticated user has already submitted a response for the active round of a given form.",
    response_description="Boolean submitted flag",
)
@limiter.limit(READ_LIMIT)
def has_submitted(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        return {"submitted": False}

    r = (
        db.query(Response)
        .filter(Response.user_id == user.id, Response.round_id == active_round.id)
        .first()
    )
    return {"submitted": bool(r)}


@router.get(
    "/form/{form_id}/my_response",
    tags=["Responses"],
    summary="Get own response for active round",
    description="Retrieve the authenticated user's submitted response for the active round of a form. Returns 404 if no response exists.",
    response_description="The user's answers object",
)
@limiter.limit(READ_LIMIT)
def get_my_response(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        raise HTTPException(status_code=404, detail="No active round")

    response = (
        db.query(Response)
        .filter(Response.user_id == user.id, Response.round_id == active_round.id)
        .first()
    )

    if not response:
        raise HTTPException(status_code=404, detail="No response found")

    return {"answers": response.answers}


# ---------------------------------------------------------
# SERVER-SIDE DRAFTS (auto-save)
# ---------------------------------------------------------


class DraftPayload(BaseModel):
    answers: dict


@router.put(
    "/forms/{form_id}/draft",
    tags=["Responses"],
    summary="Save or update draft",
    description="Upsert a draft for the active round. Called by the frontend auto-save. Creates a new draft or updates the existing one.",
    response_description="Success confirmation",
)
@limiter.limit(CRUD_LIMIT)
def save_draft(
    request: Request,
    form_id: int,
    payload: DraftPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert a draft for the active round. Called by the frontend auto-save."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    draft = (
        db.query(Draft)
        .filter(
            Draft.user_id == user.id,
            Draft.form_id == form_id,
            Draft.round_id == active_round.id,
        )
        .first()
    )

    if draft:
        draft.answers = payload.answers
        from datetime import datetime as dt, timezone as _tz

        draft.updated_at = dt.now(_tz.utc)
    else:
        draft = Draft(
            user_id=user.id,
            form_id=form_id,
            round_id=active_round.id,
            answers=payload.answers,
        )
        db.add(draft)

    db.commit()
    return {"ok": True}


@router.get(
    "/forms/{form_id}/draft",
    tags=["Responses"],
    summary="Load saved draft",
    description="Load a saved draft for the active round (if any). Returns null draft if none exists.",
    response_description="Draft answers and timestamp, or null",
)
@limiter.limit(READ_LIMIT)
def get_draft(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Load a saved draft for the active round (if any)."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        return {"draft": None}

    draft = (
        db.query(Draft)
        .filter(
            Draft.user_id == user.id,
            Draft.form_id == form_id,
            Draft.round_id == active_round.id,
        )
        .first()
    )

    if not draft:
        return {"draft": None}

    return {
        "draft": {
            "answers": draft.answers,
            "updated_at": draft.updated_at.isoformat() if draft.updated_at else None,
        }
    }


@router.delete(
    "/forms/{form_id}/draft",
    tags=["Responses"],
    summary="Delete draft",
    description="Delete a draft after successful submission. Silently succeeds if no draft exists.",
    response_description="Success confirmation",
)
@limiter.limit(CRUD_LIMIT)
def delete_draft(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a draft after successful submission."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        return {"ok": True}

    db.query(Draft).filter(
        Draft.user_id == user.id,
        Draft.form_id == form_id,
        Draft.round_id == active_round.id,
    ).delete()
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------
# FEEDBACK
# ---------------------------------------------------------


class FeedbackPayload(BaseModel):
    accuracy: str
    influence: str
    furtherThoughts: str
    usability: str


@router.post(
    "/submit_feedback",
    tags=["Responses"],
    summary="Submit user feedback",
    description="Submit feedback on synthesis quality — accuracy, influence, usability, and further thoughts. Marks the user as having submitted feedback.",
    response_description="Feedback saved confirmation",
)
@limiter.limit(CRUD_LIMIT)
def submit_feedback(
    request: Request,
    feedback: FeedbackPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        with open("summary_cache.txt") as f:
            summary_html = f.read().strip()
    except FileNotFoundError:
        summary_html = ""

    entry = Feedback(
        accuracy=feedback.accuracy,
        influence=feedback.influence,
        further_thoughts=feedback.furtherThoughts,
        usability=feedback.usability,
        summary=summary_html,
        user_id=user.id,
    )
    db.add(entry)
    user.has_submitted_feedback = True
    db.commit()
    return {"message": "Feedback saved"}


@router.get(
    "/all_feedback",
    tags=["Responses"],
    summary="List all feedback (admin)",
    description="Retrieve all user feedback entries ordered by most recent. Admin only.",
    response_description="Array of feedback entries with user emails and timestamps",
)
@limiter.limit(READ_LIMIT)
def all_feedback(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    f = db.query(Feedback).order_by(Feedback.created_at.desc()).all()

    return [
        {
            "accuracy": x.accuracy,
            "influence": x.influence,
            "usability": x.usability,
            "furtherThoughts": x.further_thoughts,
            "summary": x.summary,
            "email": x.user.email,
            "timestamp": x.created_at.isoformat(),
        }
        for x in f
    ]


# ---------------------------------------------------------
# SUMMARY (SYNTHESIS)
# ---------------------------------------------------------


class SummaryPayload(BaseModel):
    summary: str


@router.post(
    "/forms/{form_id}/push_summary",
    tags=["Synthesis"],
    summary="Push manual synthesis text",
    description="Manually set the synthesis text for the active round. Broadcasts update via WebSocket. Admin only.",
    response_description="Confirmation that synthesis was pushed",
)
@limiter.limit(CRUD_LIMIT)
async def push_summary(
    request: Request,
    form_id: int,
    payload: SummaryPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    summary = payload.summary.strip()

    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    active_round.synthesis = summary
    db.commit()

    with open("summary_cache.txt", "w") as f:
        f.write(summary)

    await ws_manager.broadcast_summary(summary)

    return {"detail": "Summary pushed"}


class GenerateSummaryPayload(BaseModel):
    model: str


@router.post(
    "/forms/{form_id}/generate_summary",
    tags=["Synthesis"],
    summary="Generate AI summary (legacy)",
    description=(
        "Generate a single-prompt AI synthesis of all responses for the active round. "
        "Uses the specified LLM model via OpenRouter. Falls back to mock synthesis when "
        "OPENROUTER_API_KEY is not set. Admin only."
    ),
    response_description="Generated synthesis text",
)
@limiter.limit(SYNTHESIS_LIMIT)
def generate_summary(
    form_id: int,
    payload: GenerateSummaryPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    # Fetch questions for the active round
    questions = active_round.questions or []
    if not questions:
        form = db.query(FormModel).filter(FormModel.id == form_id).first()
        if form:
            questions = form.questions or []

    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this round")

    # Fetch responses for the active round
    responses = (
        db.query(Response)
        .filter(Response.round_id == active_round.id)
        .order_by(Response.created_at.asc())
        .all()
    )

    if not responses:
        raise HTTPException(status_code=404, detail="No responses to summarize")

    # Prepare the content for the LLM
    prompt_content = "Please synthesize the following responses to the questions that were asked.\n\n"
    prompt_content += "Questions:\n"
    for i, q in enumerate(questions, 1):
        prompt_content += f"{i}. {q}\n"

    prompt_content += "\n--- Responses ---\n"

    for i, r in enumerate(responses, 1):
        prompt_content += f"\nResponse {i}:\n"
        # Parse answers if stored as JSON string
        answers = (
            r.answers
            if isinstance(r.answers, dict)
            else json.loads(r.answers)
            if r.answers
            else {}
        )
        for q_idx, q_text in enumerate(questions, 1):
            answer = answers.get(f"q{q_idx}", "No answer")
            prompt_content += f"  - Q: {q_text}\n"
            prompt_content += f"    A: {answer}\n"

    prompt_content += "\n--- End of Responses ---\n"

    # Include expert discussion comments if any exist
    comments = _fetch_comments_for_round(db, active_round.id)
    comments_context = _format_comments_as_context(comments)
    if comments_context:
        prompt_content += comments_context + "\n"

    prompt_content += "\nNow, please provide a concise synthesis of all the answers."
    if comments_context:
        prompt_content += (
            " Where experts raised additional points in discussion comments, "
            "integrate those perspectives naturally (e.g. 'In discussion, experts also noted...')."
        )

    # Check for mock mode or missing API key
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        # Return mock synthesis for demo purposes
        mock_summary = """## Synthesis Summary (Mock Mode)

### Areas of Agreement
- All experts recognize the need for AI governance frameworks
- There is consensus that current measures are insufficient
- Historical precedents provide some guidance, though with limitations

### Areas of Divergence  
- **Urðr (Past)**: Historical analogies (nuclear, aviation) are instructive
- **Verðandi (Present)**: AI velocity exceeds historical precedents by 10-100x
- **Skuld (Future)**: Historical models will fundamentally break; need new approaches

### Emergent Insight
The dimensional analysis reveals a **temporal paradox**: governance frameworks developed from historical patterns may be obsolete before implementation, yet we have no alternative methodology for anticipating truly novel scenarios.

### Recommended Next Steps
1. Establish adaptive governance mechanisms that can evolve
2. Invest in safety research at higher ratios (currently estimated 10:1 capability:safety)
3. Build international coordination before crisis events

*[This is a mock synthesis demonstrating the UI flow. Enable OPENROUTER_API_KEY for real LLM synthesis.]*"""
        return {"summary": mock_summary}

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
            )
        completion = openai_client.chat.completions.create(
            model=payload.model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at synthesizing and summarizing responses.",
                },
                {"role": "user", "content": prompt_content},
            ],
        )
        summary = completion.choices[0].message.content
        audit_log(
            db,
            user=user,
            action="generate_summary",
            resource_type="form",
            resource_id=form_id,
            detail={"model": payload.model, "round": active_round.round_number},
            request=request,
        )
        db.commit()
        return {"summary": summary}
    except Exception as e:
        # Log the error for debugging
        print(f"Error calling OpenRouter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")


# ---------------------------------------------------------
# COMMITTEE SYNTHESIS
# ---------------------------------------------------------


class CommitteeSynthesisPayload(BaseModel):
    model: str = "anthropic/claude-sonnet-4-5"
    mode: str = "human_only"  # "human_only" | "ai_assisted"
    n_analysts: int = 3


@router.post(
    "/forms/{form_id}/synthesise_committee",
    tags=["Synthesis"],
    summary="Run committee synthesis",
    description=(
        "Run N independent LLM analysts + a meta-synthesiser on the active round's responses. "
        "Produces structured synthesis with agreements, disagreements, nuances, confidence scores, "
        "and optional follow-up probes. Broadcasts progress via WebSocket. Admin only."
    ),
    response_description="Structured synthesis JSON, convergence score, and text synthesis",
)
@limiter.limit(SYNTHESIS_LIMIT)
async def synthesise_committee(
    request: Request,
    form_id: int,
    payload: CommitteeSynthesisPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Run committee-based synthesis on the active round's responses.

    Uses N independent LLM analysts + a meta-synthesiser to produce
    structured synthesis with agreements, disagreements, nuances,
    and optionally follow-up probe questions.
    """
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    # Fetch questions for the active round
    questions = active_round.questions or []
    if not questions:
        form = db.query(FormModel).filter(FormModel.id == form_id).first()
        if form:
            questions = form.questions or []

    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this round")

    # Fetch responses for the active round
    responses = (
        db.query(Response)
        .filter(Response.round_id == active_round.id)
        .order_by(Response.created_at.asc())
        .all()
    )

    if not responses:
        raise HTTPException(status_code=404, detail="No responses to synthesise")

    # Format responses for the synthesis engine
    response_dicts = [
        {
            "answers": r.answers,
            "email": r.user.email if r.user else f"Expert {i}",
        }
        for i, r in enumerate(responses)
    ]

    # Parse flow mode
    try:
        flow_mode = FlowMode(payload.mode)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode: {payload.mode}. Use 'human_only' or 'ai_assisted'.",
        )

    # Build progress callback for WebSocket updates
    async def progress_callback(stage: str, step: int, total: int):
        for conn in ws_manager.active_connections.copy():
            try:
                await conn.send_json(
                    {
                        "type": "synthesis_progress",
                        "form_id": form_id,
                        "stage": stage,
                        "step": step,
                        "total_steps": total,
                    }
                )
            except Exception:
                ws_manager.disconnect(conn)

    # Fetch expert discussion comments for additional context
    comments = _fetch_comments_for_round(db, active_round.id)
    comments_context = _format_comments_as_context(comments)

    # Run committee synthesis with error handling
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    resolved_model = _resolve_synthesis_model(db, payload.model)

    try:
        synthesiser = get_synthesiser(
            api_key=api_key,
            n_analysts=payload.n_analysts,
            model=resolved_model,
        )

        result = await synthesiser.run(
            questions=questions,
            responses=response_dicts,
            model=resolved_model,
            mode=flow_mode,
            progress_callback=progress_callback,
            comments_context=comments_context,
        )
    except SynthesisConfigError as exc:
        logger.warning("Synthesis config error on form %d: %s", form_id, exc)
        await _broadcast_synthesis_error(form_id, active_round.id, str(exc))
        raise HTTPException(
            status_code=400, detail=f"Synthesis configuration error: {exc}"
        )
    except SynthesisTimeoutError as exc:
        logger.warning("Synthesis timeout on form %d: %s", form_id, exc)
        await _broadcast_synthesis_error(form_id, active_round.id, str(exc))
        raise HTTPException(status_code=504, detail=f"Synthesis timed out: {exc}")
    except SynthesisError as exc:
        logger.error("Synthesis error on form %d: %s", form_id, exc, exc_info=True)
        await _broadcast_synthesis_error(form_id, active_round.id, str(exc))
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {exc}")
    except Exception as exc:
        logger.error(
            "Unexpected synthesis error on form %d: %s", form_id, exc, exc_info=True
        )
        await _broadcast_synthesis_error(
            form_id, active_round.id, "An unexpected error occurred during synthesis"
        )
        raise HTTPException(
            status_code=500, detail=f"Synthesis failed unexpectedly: {exc}"
        )

    # Store results on the round
    result_dict = result.to_dict()
    active_round.synthesis_json = result_dict
    active_round.provenance = result.provenance
    active_round.flow_mode = payload.mode

    # Compute a simple convergence score: avg confidence from confidence_map
    confidences = list(result.confidence_map.values())
    if confidences:
        active_round.convergence_score = sum(confidences) / len(confidences)

    # Also store a text synthesis for backwards compatibility
    text_parts = []
    if result.agreements:
        text_parts.append("<h3>Agreements</h3>")
        for a in result.agreements:
            text_parts.append(
                f"<p><strong>{a.claim}</strong> "
                f"(confidence: {a.confidence:.0%}) — {a.evidence_summary}</p>"
            )
    if result.disagreements:
        text_parts.append("<h3>Disagreements</h3>")
        for d in result.disagreements:
            text_parts.append(f"<p><strong>{d.topic}</strong> ({d.severity})</p><ul>")
            for pos in d.positions:
                text_parts.append(
                    f"<li>{pos.get('position', '')} — {pos.get('evidence', '')}</li>"
                )
            text_parts.append("</ul>")
    if result.nuances:
        text_parts.append("<h3>Nuances</h3>")
        for n in result.nuances:
            text_parts.append(f"<p><strong>{n.claim}</strong> — {n.context}</p>")

    active_round.synthesis = (
        "".join(text_parts) if text_parts else "Synthesis complete."
    )

    # If AI-assisted, store generated probes as FollowUp records
    if flow_mode == FlowMode.AI_ASSISTED and result.follow_up_probes:
        for probe in result.follow_up_probes:
            follow_up = FollowUp(
                round_id=active_round.id,
                author_type="ai",
                author_id=None,
                question=probe.question,
            )
            db.add(follow_up)

    db.commit()

    # Broadcast completion
    await ws_manager.broadcast_summary(active_round.synthesis)
    for conn in ws_manager.active_connections.copy():
        try:
            await conn.send_json(
                {
                    "type": "synthesis_complete",
                    "form_id": form_id,
                    "round_id": active_round.id,
                }
            )
        except Exception:
            ws_manager.disconnect(conn)

    # Schedule email notifications in the background
    background_tasks.add_task(
        _notify_synthesis_ready,
        form_id=form_id,
        round_id=active_round.id,
        round_number=active_round.round_number,
        admin_email=user.email,
        convergence_score=active_round.convergence_score,
    )

    return {
        "synthesis": result_dict,
        "convergence_score": active_round.convergence_score,
        "text_synthesis": active_round.synthesis,
    }


# ---------------------------------------------------------
# SYNTHESIS VERSIONING
# ---------------------------------------------------------


@router.get(
    "/forms/{form_id}/rounds/{round_id}/synthesis_versions",
    tags=["Synthesis"],
    summary="List synthesis versions",
    description="List all synthesis versions for a given round, ordered by version number ascending. Requires authentication.",
    response_description="Array of synthesis version objects with metadata",
)
@limiter.limit(READ_LIMIT)
def list_synthesis_versions(
    request: Request,
    form_id: int,
    round_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all synthesis versions for a given round."""
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    versions = (
        db.query(SynthesisVersion)
        .filter(SynthesisVersion.round_id == round_id)
        .order_by(SynthesisVersion.version.asc())
        .all()
    )

    return [
        {
            "id": v.id,
            "round_id": v.round_id,
            "version": v.version,
            "synthesis": v.synthesis,
            "synthesis_json": v.synthesis_json,
            "model_used": v.model_used,
            "strategy": v.strategy,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "is_active": v.is_active,
        }
        for v in versions
    ]


# ---------------------------------------------------------
# BACKGROUND SYNTHESIS TASK
# ---------------------------------------------------------


async def _synthesis_background(
    *,
    form_id: int,
    round_id: int,
    round_number: int,
    questions: list,
    response_dicts: list[dict],
    comments_context: str,
    next_version: int,
    strategy: str,
    model: str,
    n_analysts: int,
    mode_str: str,
    admin_email: str | None,
):
    """Run synthesis in the background (committee/ttd/simple).

    Launched via asyncio.create_task() from the HTTP handler.
    Creates its own DB session, runs synthesis, saves the result, and
    broadcasts completion (or error) via WebSocket.
    """
    db = SessionLocal()
    try:
        synthesis_text = None
        synthesis_json_data = None

        if strategy in ("committee", "ttd"):
            # ── Committee / TTD synthesis ──
            try:
                flow_mode = FlowMode(mode_str)
            except ValueError:
                flow_mode = FlowMode.HUMAN_ONLY

            resolved_model = _resolve_synthesis_model(db, model)

            try:
                synthesiser = get_synthesiser(
                    api_key=os.getenv("OPENROUTER_API_KEY", ""),
                    n_analysts=n_analysts,
                    strategy=strategy,
                    model=resolved_model,
                )

                result = await synthesiser.run(
                    questions=questions,
                    responses=response_dicts,
                    model=resolved_model,
                    mode=flow_mode,
                    comments_context=comments_context,
                )
            except (SynthesisConfigError, SynthesisTimeoutError, SynthesisError) as exc:
                logger.error(
                    "Background synthesis error (round %d): %s",
                    round_id,
                    exc,
                    exc_info=True,
                )
                await _broadcast_synthesis_error(form_id, round_id, str(exc))
                return
            except Exception as exc:
                logger.error(
                    "Unexpected background synthesis error (round %d): %s",
                    round_id,
                    exc,
                    exc_info=True,
                )
                await _broadcast_synthesis_error(
                    form_id, round_id, "An unexpected error occurred"
                )
                return

            synthesis_json_data = result.to_dict()

            # Build text representation for backwards compat
            text_parts = []
            if result.agreements:
                text_parts.append("<h3>Agreements</h3>")
                for a in result.agreements:
                    text_parts.append(
                        f"<p><strong>{a.claim}</strong> "
                        f"(confidence: {a.confidence:.0%}) — {a.evidence_summary}</p>"
                    )
            if result.disagreements:
                text_parts.append("<h3>Disagreements</h3>")
                for d in result.disagreements:
                    text_parts.append(
                        f"<p><strong>{d.topic}</strong> ({d.severity})</p><ul>"
                    )
                    for pos in d.positions:
                        text_parts.append(
                            f"<li>{pos.get('position', '')} — {pos.get('evidence', '')}</li>"
                        )
                    text_parts.append("</ul>")
            if result.nuances:
                text_parts.append("<h3>Nuances</h3>")
                for n in result.nuances:
                    text_parts.append(
                        f"<p><strong>{n.claim}</strong> — {n.context}</p>"
                    )

            synthesis_text = (
                "".join(text_parts) if text_parts else "Synthesis complete."
            )

        else:
            # ── Simple single-prompt synthesis ──
            prompt_content = "Synthesize the following expert responses.\n\n"
            prompt_content += "Questions:\n"
            for i, q in enumerate(questions, 1):
                prompt_content += f"{i}. {q}\n"

            prompt_content += "\n--- Responses ---\n"
            for i, rd in enumerate(response_dicts, 1):
                prompt_content += f"\nResponse {i}:\n"
                answers = rd.get("answers", {})
                if isinstance(answers, str):
                    answers = json.loads(answers) if answers else {}
                for q_idx, q_text in enumerate(questions, 1):
                    answer = answers.get(f"q{q_idx}", "No answer")
                    prompt_content += f"  - Q: {q_text}\n"
                    prompt_content += f"    A: {answer}\n"

            prompt_content += "\n--- End of Responses ---\n"

            if comments_context:
                prompt_content += comments_context + "\n"

            prompt_content += """
Return your synthesis as a JSON object with the following structure (and ONLY the JSON, no markdown fences, no extra text):
{
  "narrative": "A 2-3 paragraph narrative summary of the overall synthesis",
  "agreements": [
    {
      "claim": "What the experts agree on",
      "supporting_experts": [1, 2],
      "confidence": 0.85,
      "evidence_summary": "Key evidence supporting this agreement",
      "evidence_excerpts": [
        {"expert_id": 1, "expert_label": "Response 1", "quote": "Direct quote or close paraphrase from this expert's response that supports the claim"},
        {"expert_id": 2, "expert_label": "Response 2", "quote": "Direct quote or close paraphrase from this expert's response"}
      ]
    }
  ],
  "disagreements": [
    {
      "topic": "Topic of disagreement",
      "positions": [
        {"position": "Position A", "experts": [1], "evidence": "Evidence for A"},
        {"position": "Position B", "experts": [2], "evidence": "Evidence for B"}
      ],
      "severity": "low|moderate|high"
    }
  ],
  "nuances": [
    {
      "claim": "A nuanced point or uncertainty",
      "context": "Why this matters",
      "relevant_experts": [1]
    }
  ],
  "confidence_map": {"overall": 0.75},
  "follow_up_probes": [
    {
      "question": "A follow-up question to deepen understanding",
      "target_experts": [1, 2],
      "rationale": "Why this question would help"
    }
  ],
  "meta_synthesis_reasoning": "Brief explanation of how the synthesis was constructed"
}

Expert numbers correspond to the Response numbers above. Include ALL relevant agreements, disagreements, and nuances. Be thorough.
IMPORTANT: For each agreement, include "evidence_excerpts" with direct quotes from each supporting expert's actual response. This allows users to trace each agreement back to the original expert input.

If expert discussion comments are included above, integrate those perspectives into the synthesis naturally. Comments represent additional qualitative input raised during deliberation — they may reinforce, challenge, or add nuance to the structured responses.
"""

            try:
                openai_client = get_openai_client()
                if not openai_client:
                    await _broadcast_synthesis_error(
                        form_id,
                        round_id,
                        "Synthesis is not configured. Please add an OpenRouter API key in Settings.",
                    )
                    return

                completion = openai_client.chat.completions.create(
                    model=model,
                    max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an expert Delphi method facilitator. You synthesize expert responses "
                                "into structured analyses identifying agreements, disagreements, nuances, and "
                                "follow-up questions. Always return valid JSON matching the requested schema."
                            ),
                        },
                        {"role": "user", "content": prompt_content},
                    ],
                )
                raw_output = completion.choices[0].message.content or ""

                try:
                    cleaned = raw_output.strip()
                    if cleaned.startswith("```"):
                        lines = cleaned.split("\n")
                        lines = [
                            line for line in lines if not line.strip().startswith("```")
                        ]
                        cleaned = "\n".join(lines)
                    parsed = json.loads(cleaned)

                    synthesis_json_data = {
                        "narrative": parsed.get("narrative", ""),
                        "agreements": parsed.get("agreements", []),
                        "disagreements": parsed.get("disagreements", []),
                        "nuances": parsed.get("nuances", []),
                        "confidence_map": parsed.get(
                            "confidence_map", {"overall": 0.5}
                        ),
                        "follow_up_probes": parsed.get("follow_up_probes", []),
                        "meta_synthesis_reasoning": parsed.get(
                            "meta_synthesis_reasoning", ""
                        ),
                    }

                    text_parts = []
                    if synthesis_json_data.get("narrative"):
                        text_parts.append(f"<p>{synthesis_json_data['narrative']}</p>")
                    if synthesis_json_data["agreements"]:
                        text_parts.append("<h3>Agreements</h3>")
                        for a in synthesis_json_data["agreements"]:
                            conf = a.get("confidence", 0)
                            text_parts.append(
                                f"<p><strong>{a.get('claim', '')}</strong> "
                                f"(confidence: {conf:.0%}) — {a.get('evidence_summary', '')}</p>"
                            )
                    if synthesis_json_data["disagreements"]:
                        text_parts.append("<h3>Disagreements</h3>")
                        for d in synthesis_json_data["disagreements"]:
                            text_parts.append(
                                f"<p><strong>{d.get('topic', '')}</strong> ({d.get('severity', 'moderate')})</p><ul>"
                            )
                            for pos in d.get("positions", []):
                                text_parts.append(
                                    f"<li>{pos.get('position', '')} — {pos.get('evidence', '')}</li>"
                                )
                            text_parts.append("</ul>")
                    if synthesis_json_data["nuances"]:
                        text_parts.append("<h3>Nuances</h3>")
                        for n in synthesis_json_data["nuances"]:
                            text_parts.append(
                                f"<p><strong>{n.get('claim', '')}</strong> — {n.get('context', '')}</p>"
                            )
                    synthesis_text = "".join(text_parts) if text_parts else raw_output

                except (json.JSONDecodeError, KeyError, TypeError):
                    synthesis_text = raw_output
                    synthesis_json_data = None

            except Exception as exc:
                logger.error(
                    "Background simple synthesis error (round %d): %s",
                    round_id,
                    exc,
                    exc_info=True,
                )
                await _broadcast_synthesis_error(
                    form_id, round_id, f"Synthesis failed: {exc}"
                )
                return

        # ── Save to DB ──
        round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
        if not round_obj:
            logger.error("Background synthesis: round %d disappeared", round_id)
            await _broadcast_synthesis_error(
                form_id, round_id, "Round not found after synthesis completed"
            )
            return

        # Deactivate existing versions
        db.query(SynthesisVersion).filter(
            SynthesisVersion.round_id == round_id,
        ).update({"is_active": False})

        new_version = SynthesisVersion(
            round_id=round_id,
            version=next_version,
            synthesis=synthesis_text,
            synthesis_json=synthesis_json_data,
            model_used=model,
            strategy=strategy,
            is_active=True,
        )
        db.add(new_version)

        round_obj.synthesis = synthesis_text
        round_obj.synthesis_json = synthesis_json_data

        db.commit()
        db.refresh(new_version)

        # ── Broadcast completion via WebSocket ──
        if synthesis_text:
            await ws_manager.broadcast_summary(synthesis_text)
        for conn in ws_manager.active_connections.copy():
            try:
                await conn.send_json(
                    {
                        "type": "synthesis_complete",
                        "form_id": form_id,
                        "round_id": round_id,
                        "version_id": new_version.id,
                        "synthesis_json": synthesis_json_data,
                    }
                )
            except Exception:
                ws_manager.disconnect(conn)

        # ── Send email notifications ──
        convergence = None
        if synthesis_json_data and isinstance(
            synthesis_json_data.get("confidence_map"), dict
        ):
            vals = list(synthesis_json_data["confidence_map"].values())
            convergence = sum(vals) / len(vals) if vals else None

        await _notify_synthesis_ready(
            form_id=form_id,
            round_id=round_id,
            round_number=round_number,
            admin_email=admin_email,
            convergence_score=convergence,
        )

        logger.info(
            "Background synthesis complete for round %d (version %d)",
            round_id,
            next_version,
        )

    except Exception as exc:
        logger.error(
            "Unhandled error in background synthesis (round %d): %s",
            round_id,
            exc,
            exc_info=True,
        )
        try:
            await _broadcast_synthesis_error(
                form_id, round_id, f"Synthesis failed unexpectedly: {exc}"
            )
        except Exception:
            pass
    finally:
        db.close()


class GenerateSynthesisVersionPayload(BaseModel):
    model: str = "anthropic/claude-sonnet-4"
    strategy: str = "simple"  # "simple" | "committee" | "ttd"
    n_analysts: int = 3
    mode: str = "human_only"


@router.post(
    "/forms/{form_id}/rounds/{round_id}/generate_synthesis",
    tags=["Synthesis"],
    summary="Generate synthesis for any round",
    description=(
        "Generate a new synthesis version for ANY round (not just active). Supports "
        "'simple', 'committee', and 'ttd' strategies. For real (non-mock) strategies, "
        "synthesis runs asynchronously in the background — the endpoint returns "
        "immediately and broadcasts completion via WebSocket. Admin only."
    ),
    response_description=(
        "Immediate result for mock mode, or status='started' for real synthesis"
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
async def generate_synthesis_for_round(
    request: Request,
    form_id: int,
    round_id: int,
    payload: GenerateSynthesisVersionPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Generate a NEW synthesis version for ANY round (not just active).

    Mock mode returns the result synchronously (instant, no LLM).
    Real synthesis (committee/ttd/simple) is launched as a background
    asyncio task — the HTTP response returns within milliseconds and
    the client is notified via the ``synthesis_complete`` WebSocket event.
    """
    # ── 1. Validate (fast, synchronous) ──
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    questions = round_obj.questions or []
    if not questions:
        form = db.query(FormModel).filter(FormModel.id == form_id).first()
        if form:
            questions = form.questions or []
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this round")

    responses = (
        db.query(Response)
        .filter(Response.round_id == round_id)
        .order_by(Response.created_at.asc())
        .all()
    )
    if not responses:
        raise HTTPException(
            status_code=404, detail="No responses to synthesise for this round"
        )

    # ── 2. Pre-fetch everything we need from DB ──
    max_version = (
        db.query(SynthesisVersion.version)
        .filter(SynthesisVersion.round_id == round_id)
        .order_by(SynthesisVersion.version.desc())
        .first()
    )
    next_version = (max_version[0] + 1) if max_version else 1

    strategy = payload.strategy.lower()
    synthesis_mode_env = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    round_comments = _fetch_comments_for_round(db, round_id)
    round_comments_context = _format_comments_as_context(round_comments)

    # Materialise response data while the ORM session is still open
    response_dicts = [
        {
            "answers": r.answers,
            "email": r.user.email if r.user else f"Expert {i}",
        }
        for i, r in enumerate(responses)
    ]
    round_number = round_obj.round_number

    # ── 3a. Mock mode → return synchronously (instant, no LLM call) ──
    if synthesis_mode_env == "mock" or not api_key:
        synthesis_text = (
            f"## Synthesis v{next_version} (Mock Mode)\n\n"
            f"**Round {round_number}** — {len(responses)} responses analysed.\n\n"
            f"*Strategy: {strategy} | Model: {payload.model}*\n\n"
            "This is a mock synthesis. Enable OPENROUTER_API_KEY for real LLM synthesis."
        )

        db.query(SynthesisVersion).filter(
            SynthesisVersion.round_id == round_id,
        ).update({"is_active": False})

        new_version = SynthesisVersion(
            round_id=round_id,
            version=next_version,
            synthesis=synthesis_text,
            synthesis_json=None,
            model_used=payload.model,
            strategy=strategy,
            is_active=True,
        )
        db.add(new_version)
        round_obj.synthesis = synthesis_text
        round_obj.synthesis_json = None
        db.commit()
        db.refresh(new_version)

        # Still broadcast so other tabs / clients update
        if synthesis_text:
            await ws_manager.broadcast_summary(synthesis_text)
        for conn in ws_manager.active_connections.copy():
            try:
                await conn.send_json(
                    {
                        "type": "synthesis_complete",
                        "form_id": form_id,
                        "round_id": round_id,
                        "version_id": new_version.id,
                        "synthesis_json": None,
                    }
                )
            except Exception:
                ws_manager.disconnect(conn)

        return {
            "id": new_version.id,
            "round_id": new_version.round_id,
            "version": new_version.version,
            "synthesis": new_version.synthesis,
            "synthesis_json": new_version.synthesis_json,
            "model_used": new_version.model_used,
            "strategy": new_version.strategy,
            "created_at": new_version.created_at.isoformat()
            if new_version.created_at
            else None,
            "is_active": new_version.is_active,
        }

    # ── 3b. Real synthesis → launch background task, return immediately ──
    asyncio.create_task(
        _synthesis_background(
            form_id=form_id,
            round_id=round_id,
            round_number=round_number,
            questions=list(questions),
            response_dicts=response_dicts,
            comments_context=round_comments_context,
            next_version=next_version,
            strategy=strategy,
            model=payload.model,
            n_analysts=payload.n_analysts,
            mode_str=payload.mode,
            admin_email=user.email,
        )
    )

    return {
        "status": "started",
        "message": (
            "Synthesis running in background. "
            "You will be notified via WebSocket when complete."
        ),
    }


@router.put(
    "/synthesis_versions/{version_id}/activate",
    tags=["Synthesis"],
    summary="Activate a synthesis version",
    description=(
        "Set a synthesis version as the active/published one. Deactivates all other "
        "versions for the same round and copies synthesis onto the Round model. Admin only."
    ),
    response_description="Activated version info with confirmation message",
)
@limiter.limit(CRUD_LIMIT)
def activate_synthesis_version(
    request: Request,
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Set a synthesis version as the active/published one.

    Deactivates all other versions for the same round, then activates
    the specified version. Also copies the synthesis text and JSON
    back onto the Round model for backwards compatibility.
    """
    version = (
        db.query(SynthesisVersion).filter(SynthesisVersion.id == version_id).first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Synthesis version not found")

    # Deactivate all other versions for this round
    db.query(SynthesisVersion).filter(
        SynthesisVersion.round_id == version.round_id,
        SynthesisVersion.id != version_id,
    ).update({"is_active": False})

    # Activate the selected version
    version.is_active = True

    # Copy synthesis to the round model for backwards compatibility
    round_obj = db.query(RoundModel).filter(RoundModel.id == version.round_id).first()
    if round_obj:
        round_obj.synthesis = version.synthesis
        round_obj.synthesis_json = version.synthesis_json

    db.commit()

    return {
        "id": version.id,
        "round_id": version.round_id,
        "version": version.version,
        "is_active": version.is_active,
        "message": f"Version {version.version} is now active",
    }


@router.get(
    "/synthesis_versions/{version_id}",
    tags=["Synthesis"],
    summary="Get a synthesis version",
    description="Retrieve a specific synthesis version by ID including text, structured JSON, model, and strategy.",
    response_description="Full synthesis version object",
)
@limiter.limit(READ_LIMIT)
def get_synthesis_version(
    request: Request,
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a specific synthesis version by ID."""
    version = (
        db.query(SynthesisVersion).filter(SynthesisVersion.id == version_id).first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Synthesis version not found")

    return {
        "id": version.id,
        "round_id": version.round_id,
        "version": version.version,
        "synthesis": version.synthesis,
        "synthesis_json": version.synthesis_json,
        "model_used": version.model_used,
        "strategy": version.strategy,
        "created_at": version.created_at.isoformat() if version.created_at else None,
        "is_active": version.is_active,
    }


# ---------------------------------------------------------
# SYNTHESIS EXPORT
# ---------------------------------------------------------


def _build_synthesis_markdown(form: FormModel, rounds_list: list[RoundModel]) -> str:
    """Build a comprehensive markdown document from all rounds' synthesis data."""
    lines: list[str] = []
    now = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")

    lines.append(f"# {form.title}")
    lines.append("")
    lines.append(f"**Exported:** {now}  ")
    lines.append(f"**Rounds:** {len(rounds_list)}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for rnd in rounds_list:
        lines.append(f"## Round {rnd.round_number}")
        lines.append("")

        if rnd.convergence_score is not None:
            lines.append(f"**Convergence Score:** {rnd.convergence_score * 100:.0f}%")
            lines.append("")

        questions = rnd.questions or []
        if questions:
            lines.append("### Questions")
            lines.append("")
            for i, q in enumerate(questions, 1):
                q_text = (
                    q
                    if isinstance(q, str)
                    else q.get("label", q.get("text", str(q)))
                    if isinstance(q, dict)
                    else str(q)
                )
                lines.append(f"{i}. {q_text}")
            lines.append("")

        sj = rnd.synthesis_json
        if sj and isinstance(sj, dict):
            # Narrative
            if sj.get("narrative"):
                lines.append("### Narrative")
                lines.append("")
                lines.append(sj["narrative"])
                lines.append("")

            # Agreements
            agreements = sj.get("agreements", [])
            if agreements:
                lines.append("### Agreements")
                lines.append("")
                for a in agreements:
                    conf = a.get("confidence", 0)
                    lines.append(
                        f"- **{a.get('claim', '')}** ({conf * 100:.0f}% confidence)"
                    )
                    experts = a.get("supporting_experts", [])
                    if experts:
                        lines.append(
                            f"  - Supporting experts: {', '.join(f'Expert {e}' for e in experts)}"
                        )
                    if a.get("evidence_summary"):
                        lines.append(f"  - Evidence: {a['evidence_summary']}")
                    excerpts = a.get("evidence_excerpts", [])
                    if excerpts:
                        lines.append("  - **Supporting Excerpts:**")
                        for ex in excerpts:
                            label = ex.get(
                                "expert_label", f"Expert {ex.get('expert_id', '?')}"
                            )
                            lines.append(f'    - _{label}_: "{ex.get("quote", "")}"')
                lines.append("")

            # Disagreements
            disagreements = sj.get("disagreements", [])
            if disagreements:
                lines.append("### Disagreements")
                lines.append("")
                for d in disagreements:
                    sev = d.get("severity", "moderate")
                    lines.append(f"- **{d.get('topic', '')}** (Severity: {sev})")
                    for pos in d.get("positions", []):
                        experts = pos.get("experts", [])
                        lines.append(f"  - *{pos.get('position', '')}*")
                        if experts:
                            lines.append(
                                f"    - Experts: {', '.join(f'Expert {e}' for e in experts)}"
                            )
                        if pos.get("evidence"):
                            lines.append(f"    - Evidence: {pos['evidence']}")
                lines.append("")

            # Nuances
            nuances = sj.get("nuances", [])
            if nuances:
                lines.append("### Nuances")
                lines.append("")
                for n in nuances:
                    lines.append(f"- **{n.get('claim', '')}**")
                    lines.append(f"  - Context: {n.get('context', '')}")
                    relevant = n.get("relevant_experts", [])
                    if relevant:
                        lines.append(
                            f"  - Relevant experts: {', '.join(f'Expert {e}' for e in relevant)}"
                        )
                lines.append("")

            # Follow-up Probes
            probes = sj.get("follow_up_probes", [])
            if probes:
                lines.append("### Follow-up Probes")
                lines.append("")
                for p in probes:
                    lines.append(f"- **{p.get('question', '')}**")
                    target = p.get("target_experts", [])
                    if target:
                        lines.append(
                            f"  - Target experts: {', '.join(f'Expert {e}' for e in target)}"
                        )
                    if p.get("rationale"):
                        lines.append(f"  - Rationale: {p['rationale']}")
                lines.append("")

            # Confidence Map
            conf_map = sj.get("confidence_map", {})
            if conf_map:
                lines.append("### Confidence Map")
                lines.append("")
                for topic, score in conf_map.items():
                    lines.append(f"- {topic}: {score * 100:.0f}%")
                lines.append("")

            # Meta-synthesis reasoning
            if sj.get("meta_synthesis_reasoning"):
                lines.append("### Meta-Synthesis Reasoning")
                lines.append("")
                lines.append(sj["meta_synthesis_reasoning"])
                lines.append("")

        elif rnd.synthesis:
            lines.append("### Synthesis")
            lines.append("")
            lines.append(rnd.synthesis)
            lines.append("")

        lines.append("---")
        lines.append("")

    lines.append("*Generated by Symphonia*")
    return "\n".join(lines)


@router.get(
    "/forms/{form_id}/export_synthesis",
    tags=["Synthesis"],
    summary="Export synthesis document",
    description=(
        "Export all rounds' synthesis data as a downloadable document. "
        "Supports `format=markdown` (default), `format=json`, or `format=pdf`."
    ),
    response_description="Downloadable file (markdown, JSON, or PDF)",
)
def export_synthesis(
    form_id: int,
    format: str = Query("markdown", pattern="^(markdown|json|pdf)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export all rounds' synthesis data for a form.

    Accepts query param ``format``: markdown, json, or pdf.
    """
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    rounds_list = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )

    safe_title = (
        "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in form.title)
        .strip()
        .replace(" ", "-")
        .lower()
    )
    if not safe_title:
        safe_title = f"form-{form_id}"

    if format == "json":
        payload = {
            "form_id": form.id,
            "title": form.title,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "rounds": [
                {
                    "round_number": rnd.round_number,
                    "convergence_score": rnd.convergence_score,
                    "synthesis_json": rnd.synthesis_json,
                    "synthesis_text": rnd.synthesis,
                    "questions": rnd.questions,
                }
                for rnd in rounds_list
            ],
        }
        return FastAPIResponse(
            content=json.dumps(payload, indent=2, default=str),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-synthesis.json"',
            },
        )

    # Build markdown
    md_content = _build_synthesis_markdown(form, rounds_list)

    if format == "pdf":
        # Try weasyprint for PDF generation
        try:
            import markdown as md_lib
            from weasyprint import HTML as WeasyHTML

            html_body = md_lib.markdown(
                md_content, extensions=["tables", "fenced_code"]
            )
            full_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; font-size: 14px; line-height: 1.6; color: #333; }}
h1 {{ font-size: 28px; border-bottom: 2px solid #1d70b8; padding-bottom: 8px; }}
h2 {{ font-size: 22px; margin-top: 30px; color: #1d70b8; }}
h3 {{ font-size: 18px; margin-top: 20px; }}
hr {{ border: none; border-top: 1px solid #ccc; margin: 20px 0; }}
ul, ol {{ margin-left: 20px; }}
li {{ margin-bottom: 4px; }}
strong {{ color: #0b0c0c; }}
em {{ color: #505a5f; }}
</style>
</head><body>{html_body}</body></html>"""

            pdf_bytes = WeasyHTML(string=full_html).write_pdf()
            return FastAPIResponse(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_title}-synthesis.pdf"',
                },
            )
        except ImportError:
            # weasyprint or markdown not available — fall back to .md download
            return FastAPIResponse(
                content=md_content.encode("utf-8"),
                media_type="text/markdown; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_title}-synthesis.md"',
                },
            )

    # Default: markdown
    return FastAPIResponse(
        content=md_content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}-synthesis.md"',
        },
    )


# ---------------------------------------------------------
# FOLLOW-UPS
# ---------------------------------------------------------


class FollowUpCreatePayload(BaseModel):
    question: str


@router.get(
    "/forms/{form_id}/follow_ups",
    tags=["Responses"],
    summary="List follow-up questions",
    description="Get all follow-up questions and their responses for the active round. Includes author info and response threads.",
    response_description="Array of follow-up questions with nested responses",
)
@limiter.limit(READ_LIMIT)
def get_follow_ups(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all follow-up questions for the active round of a form."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=404, detail="No active round")

    follow_ups = (
        db.query(FollowUp)
        .filter(FollowUp.round_id == active_round.id)
        .order_by(FollowUp.created_at.asc())
        .all()
    )

    result = []
    for fu in follow_ups:
        # Get author email for human-authored follow-ups
        author_email = None
        if fu.author_type == "human" and fu.author_id:
            author = db.query(User).filter(User.id == fu.author_id).first()
            if author:
                author_email = author.email

        responses = [
            {
                "id": r.id,
                "author_type": r.author_type,
                "author_id": r.author_id,
                "author_email": (
                    db.query(User).filter(User.id == r.author_id).first().email
                    if r.author_type == "human" and r.author_id
                    else None
                ),
                "response": r.response,
                "created_at": r.created_at.isoformat(),
            }
            for r in fu.responses
        ]

        result.append(
            {
                "id": fu.id,
                "round_id": fu.round_id,
                "author_type": fu.author_type,
                "author_id": fu.author_id,
                "author_email": author_email,
                "question": fu.question,
                "created_at": fu.created_at.isoformat(),
                "responses": responses,
            }
        )

    return result


@router.post(
    "/forms/{form_id}/follow_ups",
    tags=["Responses"],
    summary="Create a follow-up question",
    description="Post a new follow-up question on the active round. Tagged as human-authored.",
    response_description="Created follow-up with ID and timestamp",
)
@limiter.limit(CRUD_LIMIT)
def create_follow_up(
    request: Request,
    form_id: int,
    payload: FollowUpCreatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new follow-up question on the active round."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    follow_up = FollowUp(
        round_id=active_round.id,
        author_type="human",
        author_id=user.id,
        question=payload.question,
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    return {
        "id": follow_up.id,
        "round_id": follow_up.round_id,
        "author_type": follow_up.author_type,
        "author_id": follow_up.author_id,
        "question": follow_up.question,
        "created_at": follow_up.created_at.isoformat(),
    }


class FollowUpRespondPayload(BaseModel):
    response: str


@router.post(
    "/follow_ups/{follow_up_id}/respond",
    tags=["Responses"],
    summary="Respond to a follow-up",
    description=(
        "Submit a response to an existing follow-up question. Responses are timestamped and attributed to the authenticated user."
    ),
)
@limiter.limit(CRUD_LIMIT)
def respond_to_follow_up(
    request: Request,
    follow_up_id: int,
    payload: FollowUpRespondPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Respond to a follow-up question."""
    follow_up = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    response = FollowUpResponse(
        follow_up_id=follow_up.id,
        author_type="human",
        author_id=user.id,
        response=payload.response,
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    return {
        "id": response.id,
        "follow_up_id": response.follow_up_id,
        "author_type": response.author_type,
        "author_id": response.author_id,
        "response": response.response,
        "created_at": response.created_at.isoformat(),
    }


# ---------------------------------------------------------
# FORM MANAGEMENT
# ---------------------------------------------------------


class FormCreate(BaseModel):
    title: str
    questions: list[str]
    allow_join: bool
    join_code: str


class FormUpdate(BaseModel):
    title: str
    questions: list[str]


# ---------------------------------------------------------------------------
# User-scoped form management (any authenticated user)
# ---------------------------------------------------------------------------


class UserFormCreate(BaseModel):
    title: str
    description: str | None = None
    questions: list = []
    allow_join: bool = True


@router.post(
    "/forms/create",
    tags=["Forms"],
    status_code=201,
    summary="Create a consultation (facilitator/admin)",
)
@limiter.limit(CRUD_LIMIT)
def user_create_form(
    payload: UserFormCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_facilitator),
):
    """Facilitators and platform admins can create consultation forms. Join code is auto-generated."""
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    for _ in range(10):
        code = generate_join_code()
        if not db.query(FormModel).filter(FormModel.join_code == code).first():
            break
    else:
        raise HTTPException(
            status_code=500, detail="Could not generate unique join code"
        )

    form = FormModel(
        title=title,
        description=payload.description,
        questions=payload.questions,
        allow_join=payload.allow_join,
        join_code=code,
        owner_id=user.id,
    )
    db.add(form)
    db.flush()
    first_round = RoundModel(
        form_id=form.id, round_number=1, is_active=True, questions=payload.questions
    )
    db.add(first_round)
    # Also create an InviteCode row for the default join code
    invite = InviteCode(
        form_id=form.id, code=code, form_role="expert", created_by=user.id
    )
    db.add(invite)
    db.commit()
    db.refresh(form)
    audit_log(
        db,
        user=user,
        action="create_form",
        resource_type="form",
        resource_id=form.id,
        detail={"title": title},
        request=request,
    )
    return {
        "id": form.id,
        "title": form.title,
        "join_code": form.join_code,
        "allow_join": form.allow_join,
        "owner_id": form.owner_id,
        "current_round": 1,
    }


@router.get("/forms/my-created", tags=["Forms"], summary="List forms I created")
def my_created_forms(
    db: Session = Depends(get_db),
    user: User = Depends(require_facilitator),
):
    """Return all forms owned by the current user, newest first."""
    forms = (
        db.query(FormModel)
        .filter(FormModel.owner_id == user.id)
        .order_by(FormModel.id.desc())
        .all()
    )
    return [
        {
            "id": f.id,
            "title": f.title,
            "join_code": f.join_code,
            "allow_join": f.allow_join,
            "round_count": len(f.rounds),
            "participant_count": len(f.unlocked_by_users),
        }
        for f in forms
    ]


@router.post(
    "/forms/{form_id}/regenerate-join-code",
    tags=["Forms"],
    summary="Regenerate join code (owner/admin only)",
)
def regenerate_join_code(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a new join code for a form. Old code is invalidated immediately."""
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)
    for _ in range(10):
        code = generate_join_code()
        if (
            not db.query(FormModel)
            .filter(FormModel.join_code == code, FormModel.id != form_id)
            .first()
        ):
            break
    form.join_code = code
    db.commit()
    return {"join_code": form.join_code, "form_id": form_id}


@router.delete(
    "/forms/{form_id}/delete",
    tags=["Forms"],
    summary="Delete a form (owner/admin only)",
)
def delete_owned_form(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Permanently delete a form. Only the owner or a platform admin may do this."""
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    title = form.title
    assert_form_owner_or_facilitator(form, user)
    db.delete(form)
    db.commit()
    audit_log(
        db,
        user=user,
        action="delete_form",
        resource_type="form",
        resource_id=form_id,
        detail={"title": title},
        request=request,
    )
    return {"deleted": form_id, "title": title}


@router.put(
    "/forms/{form_id}",
    tags=["Forms"],
    summary="Update a form",
    description=(
        "Update the title and questions of an existing form. Admin-only. Records an audit log entry."
    ),
)
@limiter.limit(CRUD_LIMIT)
def update_form(
    form_id: int,
    payload: FormUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(f, user)

    old_title = f.title
    f.title = payload.title
    f.questions = payload.questions
    audit_log(
        db,
        user=user,
        action="update_form",
        resource_type="form",
        resource_id=form_id,
        detail={"old_title": old_title, "new_title": payload.title},
        request=request,
    )
    db.commit()
    return {"status": "updated"}


@router.delete(
    "/forms/{form_id}",
    tags=["Forms"],
    summary="Delete a form",
    description=(
        "Permanently delete a form and all associated data via cascade. Admin-only. Records an audit log entry."
    ),
)
@limiter.limit(CRUD_LIMIT)
def delete_form(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Now delete the form itself
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(f, user)

    audit_log(
        db,
        user=user,
        action="delete_form",
        resource_type="form",
        resource_id=form_id,
        detail={"title": f.title},
        request=request,
    )
    db.delete(f)
    db.commit()
    return {"status": "deleted"}


@router.get(
    "/forms",
    tags=["Forms"],
    summary="List all forms",
    description=(
        "List all consultation forms with participant counts and current round info. Admin-only. Returns forms ordered by ID."
    ),
)
@limiter.limit(READ_LIMIT)
def get_forms(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    items = db.query(FormModel).order_by(FormModel.id).all()

    result = []
    for f in items:
        participant_count = (
            db.query(Response.user_id)
            .filter(Response.form_id == f.id)
            .distinct()
            .count()
        )

        active_round = (
            db.query(RoundModel)
            .filter(RoundModel.form_id == f.id, RoundModel.is_active)
            .first()
        )

        result.append(
            {
                "id": f.id,
                "title": f.title,
                "questions": f.questions,
                "allow_join": f.allow_join,
                "join_code": f.join_code,
                "participant_count": participant_count,
                "current_round": active_round.round_number if active_round else 0,
            }
        )

    return result


class UnlockFormPayload(BaseModel):
    join_code: str


@router.post(
    "/forms/unlock",
    tags=["Forms"],
    summary="Unlock a form with join code",
    description=(
        "Unlock access to a form using its join code. The form must have allow_join=true. Idempotent — returns success if already unlocked. Requires authentication."
    ),
)
@limiter.limit(CRUD_LIMIT)
def unlock_form(
    request: Request,
    payload: UnlockFormPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw_code = payload.join_code.strip()

    # Try exact match first (handles both old-format and new-format codes)
    form = (
        db.query(FormModel)
        .filter(FormModel.join_code == raw_code, FormModel.allow_join)
        .first()
    )

    # If no exact match, try normalized matching for SYM-XXXX-NNNN codes
    if not form:
        normalized = normalize_join_code(raw_code)
        if normalized:
            all_forms = db.query(FormModel).filter(FormModel.allow_join).all()
            for f in all_forms:
                if normalize_join_code(f.join_code) == normalized:
                    form = f
                    break

    if not form:
        raise HTTPException(status_code=404, detail="Form not found or closed.")

    # Check if user has already unlocked this form
    existing_unlock = (
        db.query(UserFormUnlock)
        .filter(UserFormUnlock.user_id == user.id, UserFormUnlock.form_id == form.id)
        .first()
    )

    if existing_unlock:
        return {"message": "Form already unlocked."}

    # Create a new unlock record
    new_unlock = UserFormUnlock(user_id=user.id, form_id=form.id)
    db.add(new_unlock)
    db.commit()

    return {"message": "Form unlocked successfully."}


@router.get(
    "/my_forms",
    tags=["Forms"],
    summary="List my unlocked forms",
    description=(
        "Returns all forms the authenticated user has unlocked via join code."
    ),
)
@limiter.limit(READ_LIMIT)
def get_my_forms(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    unlocked_forms = (
        db.query(FormModel)
        .join(UserFormUnlock)
        .filter(UserFormUnlock.user_id == user.id)
        .order_by(FormModel.id)
        .all()
    )
    return unlocked_forms


@router.get(
    "/forms/{form_id}",
    tags=["Forms"],
    summary="Get form details",
    description=(
        "Retrieve details of a specific form including title, questions, join settings, and expert label configuration. Requires authentication."
    ),
)
@limiter.limit(READ_LIMIT)
def get_form(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

    return {
        "id": f.id,
        "title": f.title,
        "questions": f.questions,
        "allow_join": f.allow_join,
        "join_code": f.join_code,
        "expert_labels": f.expert_labels,
    }


# ---------------------------------------------------------
# FORM TEMPLATES
# ---------------------------------------------------------

from .form_templates import list_templates, get_template  # noqa: E402


@router.get(
    "/templates",
    tags=["Forms"],
    summary="List form templates",
    description="Return all available pre-built form templates with metadata. No authentication required.",
    response_description="Array of template objects",
)
@limiter.limit(READ_LIMIT)
def get_templates(request: Request):
    """Return all available form templates."""
    return list_templates()


class TemplateCreatePayload(BaseModel):
    title: str | None = None
    description: str | None = None
    join_code: str | None = None
    allow_join: bool = True


@router.post(
    "/forms/from_template/{template_id}",
    tags=["Forms"],
    summary="Create form from template",
    description=(
        "Create a new form pre-filled with a template's questions and settings. "
        "Optionally override title and description. Admin-only."
    ),
    response_description="Created form with ID and all fields",
)
@limiter.limit(CRUD_LIMIT)
def create_form_from_template(
    request: Request,
    template_id: str,
    payload: TemplateCreatePayload | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_facilitator),
):
    """Create a new form pre-filled from a template."""
    template = get_template(template_id)
    if not template:
        raise HTTPException(
            status_code=404, detail=f"Template '{template_id}' not found"
        )

    title = (payload.title if payload and payload.title else template.name).strip()
    # Auto-generate join code in SYM format
    for _ in range(10):
        join_code = generate_join_code()
        if not db.query(FormModel).filter(FormModel.join_code == join_code).first():
            break

    f = FormModel(
        title=title,
        questions=template.default_questions,
        allow_join=payload.allow_join if payload else True,
        join_code=join_code,
        expert_labels=template.expert_label_preset,
        owner_id=user.id,
    )
    db.add(f)
    db.commit()
    db.refresh(f)

    first_round = RoundModel(
        form_id=f.id,
        round_number=1,
        is_active=True,
        questions=template.default_questions,
    )
    db.add(first_round)

    audit_log(
        db,
        user=user,
        action="create_form_from_template",
        resource_type="form",
        resource_id=f.id,
        detail={"title": f.title, "template_id": template_id},
        request=request,
    )
    db.commit()

    return {
        "id": f.id,
        "title": f.title,
        "questions": f.questions,
        "allow_join": f.allow_join,
        "join_code": f.join_code,
        "expert_labels": f.expert_labels,
        "participant_count": 0,
        "current_round": 1,
        "template_id": template_id,
    }


# ---------------------------------------------------------
# EXPERT LABELS
# ---------------------------------------------------------


class ExpertLabelsPayload(BaseModel):
    preset: str  # "default" | "temporal" | "custom" | "methodological" | "stakeholder"
    custom_labels: dict | None = None


@router.get(
    "/forms/{form_id}/expert_labels",
    tags=["Forms"],
    summary="Get expert label config",
    description=(
        "Get the expert labelling preset and custom labels for a form. Requires authentication."
    ),
)
@limiter.limit(READ_LIMIT)
def get_expert_labels(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")
    return f.expert_labels or {"preset": "default", "custom_labels": {}}


@router.put(
    "/forms/{form_id}/expert_labels",
    tags=["Forms"],
    summary="Update expert label config",
    description=(
        "Set the expert labelling preset (default, temporal, custom, methodological, stakeholder) and optional custom labels. Admin-only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def put_expert_labels(
    request: Request,
    form_id: int,
    payload: ExpertLabelsPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

    f.expert_labels = {
        "preset": payload.preset,
        "custom_labels": payload.custom_labels or {},
    }
    db.commit()
    return f.expert_labels


# ---------------------------------------------------------
# ROUNDS (Delphi)
# ---------------------------------------------------------


class RoundConfig(BaseModel):
    questions: list[str] | None = None


@router.get(
    "/forms/{form_id}/active_round",
    tags=["Rounds"],
    summary="Get the active round",
    description=(
        "Get the currently active round for a form, including questions and the previous round's synthesis for reference. Returns 404 if no active round. Requires authentication."
    ),
)
@limiter.limit(READ_LIMIT)
def get_active_round(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active:
        raise HTTPException(status_code=404, detail="No active round")

    prev = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form_id,
            RoundModel.round_number == active.round_number - 1,
        )
        .first()
    )

    previous_round_synthesis = prev.synthesis if prev else ""

    return {
        "id": active.id,
        "round_number": active.round_number,
        "questions": active.questions or [],
        "previous_round_synthesis": previous_round_synthesis,
    }


@router.post(
    "/forms/{form_id}/next_round",
    tags=["Rounds"],
    summary="Advance to next round",
    description=(
        "Close the current active round and open a new one. Optionally provide new questions; otherwise inherits from previous round. Admin-only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def open_next_round(
    request: Request,
    form_id: int,
    payload: RoundConfig | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    current = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if current:
        current.is_active = False

    last = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.desc())
        .first()
    )

    next_number = (last.round_number + 1) if last else 1

    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    base = form.questions or []

    if payload and payload.questions:
        questions = payload.questions
    elif last and last.questions:
        questions = last.questions
    else:
        questions = base

    previous_synthesis = last.synthesis if last and last.synthesis else ""

    new = RoundModel(
        form_id=form_id,
        round_number=next_number,
        is_active=True,
        questions=questions,
        synthesis=previous_synthesis,
    )
    db.add(new)
    db.commit()
    db.refresh(new)

    return {"id": new.id, "round_number": new.round_number, "questions": new.questions}


@router.get(
    "/forms/{form_id}/rounds",
    tags=["Rounds"],
    summary="List all rounds",
    description=(
        "List all rounds for a form with synthesis data, convergence scores, questions, and response counts. Requires authentication."
    ),
)
@limiter.limit(READ_LIMIT)
def get_rounds(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rounds = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )

    result = []
    for r in rounds:
        response_count = db.query(Response).filter(Response.round_id == r.id).count()
        result.append(
            {
                "id": r.id,
                "round_number": r.round_number,
                "synthesis": r.synthesis,
                "synthesis_json": r.synthesis_json,
                "is_active": r.is_active,
                "questions": r.questions or [],
                "convergence_score": r.convergence_score,
                "response_count": response_count,
            }
        )

    return result


# ---------------------------------------------------------
# RESPONSES
# ---------------------------------------------------------


@router.get(
    "/form/{form_id}/responses",
    tags=["Responses"],
    summary="Get responses for a form",
    description=(
        "Retrieve expert responses. By default returns only the active round; pass all_rounds=true for all. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def form_responses(
    request: Request,
    form_id: int,
    all_rounds: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    q = db.query(Response).filter(Response.form_id == form_id)

    if not all_rounds:
        active = (
            db.query(RoundModel)
            .filter(RoundModel.form_id == form_id, RoundModel.is_active)
            .first()
        )
        if active:
            q = q.filter(Response.round_id == active.id)

    items = q.order_by(Response.created_at.asc()).all()

    return [
        {
            "id": x.id,
            "answers": x.answers,
            "email": x.user.email if x.user else None,
            "timestamp": x.created_at.isoformat(),
            "round_id": x.round_id,
            "version": x.version,
        }
        for x in items
    ]


class ResponseEditPayload(BaseModel):
    answers: dict
    version: int  # optimistic locking: must match current version


@router.put(
    "/responses/{response_id}",
    tags=["Responses"],
    summary="Edit a response (optimistic lock)",
    description=(
        "Edit a response with optimistic locking. Returns 409 Conflict if the version doesn't match (concurrent edit). Admin-only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def edit_response(
    request: Request,
    response_id: int,
    payload: ResponseEditPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Edit a participant response (admin only) with optimistic locking.

    Returns 409 Conflict if the response has been modified since the client
    last fetched it (version mismatch).
    """
    response = db.query(Response).filter(Response.id == response_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    # Optimistic lock check
    if response.version != payload.version:
        raise HTTPException(
            status_code=409,
            detail="Conflict: response was modified by another user",
            headers={"X-Current-Version": str(response.version)},
        )

    from datetime import datetime as _dt, timezone as _tz

    response.answers = payload.answers
    response.version = response.version + 1
    response.updated_at = _dt.now(_tz.utc)
    db.commit()
    db.refresh(response)

    return {
        "id": response.id,
        "answers": response.answers,
        "email": response.user.email if response.user else None,
        "timestamp": response.created_at.isoformat(),
        "updated_at": response.updated_at.isoformat() if response.updated_at else None,
        "round_id": response.round_id,
        "version": response.version,
    }


@router.put(
    "/responses/{response_id}/force",
    tags=["Responses"],
    summary="Force-edit a response",
    description=(
        "Force-edit a response, bypassing optimistic locking and overwriting any concurrent changes. Admin-only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def force_edit_response(
    request: Request,
    response_id: int,
    payload: ResponseEditPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Force-edit a response, overwriting any concurrent changes (admin only)."""
    response = db.query(Response).filter(Response.id == response_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    from datetime import datetime as _dt, timezone as _tz

    response.answers = payload.answers
    response.version = response.version + 1
    response.updated_at = _dt.now(_tz.utc)
    db.commit()
    db.refresh(response)

    return {
        "id": response.id,
        "answers": response.answers,
        "email": response.user.email if response.user else None,
        "timestamp": response.created_at.isoformat(),
        "updated_at": response.updated_at.isoformat() if response.updated_at else None,
        "round_id": response.round_id,
        "version": response.version,
    }


@router.get(
    "/form/{form_id}/archived_responses",
    tags=["Responses"],
    summary="Get archived responses",
    description=(
        "Retrieve the permanent archive of all responses for a form across all rounds. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def form_archived(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    items = (
        db.query(ArchivedResponse)
        .filter(ArchivedResponse.form_id == form_id)
        .order_by(ArchivedResponse.created_at.asc())
        .all()
    )

    return [
        {
            "answers": x.answers,
            "email": x.email,
            "timestamp": x.created_at.isoformat(),
            "round_id": x.round_id,
        }
        for x in items
    ]


@router.get(
    "/forms/{form_id}/rounds_with_responses",
    tags=["Responses"],
    summary="Get rounds with embedded responses",
    description=(
        "List all rounds with their responses inline. Used for the admin view showing responses grouped by round. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def rounds_with_responses(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    rounds = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )

    output = []
    for r in rounds:
        rs = (
            db.query(Response)
            .filter(Response.round_id == r.id)
            .order_by(Response.created_at.asc())
            .all()
        )

        output.append(
            {
                "id": r.id,
                "round_number": r.round_number,
                "synthesis": r.synthesis,
                "is_active": r.is_active,
                "responses": [
                    {
                        "id": x.id,
                        "answers": x.answers,
                        "email": x.user.email if x.user else None,
                        "timestamp": x.created_at.isoformat(),
                        "version": x.version,
                    }
                    for x in rs
                ],
            }
        )

    return output


# ---------------------------------------------------------
# GENERIC SYNTHESIS
# ---------------------------------------------------------


@router.post(
    "/form/{form_id}/synthesise",
    tags=["Synthesis"],
    summary="Simple HTML concatenation",
    description=(
        "Format all active-round responses into simple HTML blocks. No AI involved. Admin-only. For AI synthesis, use generate_summary or synthesise_committee."
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
def synthesise_simple(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    active = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active:
        raise HTTPException(status_code=400, detail="No active round")

    items = (
        db.query(Response)
        .filter(Response.round_id == active.id)
        .order_by(Response.created_at.asc())
        .all()
    )

    if not items:
        return {"summary": "No responses yet"}

    blocks = []
    for i, r in enumerate(items, start=1):
        parts = []
        answers = (
            r.answers
            if isinstance(r.answers, dict)
            else json.loads(r.answers)
            if r.answers
            else {}
        )
        for key, val in answers.items():
            clean = str(val).replace("\n", "<br/>")
            parts.append(f"<p><strong>{key}</strong>: {clean}</p>")

        blocks.append(f"<div><h3>Response {i}</h3>{''.join(parts)}</div>")

    html = "<p><strong>All responses:</strong></p>" + "".join(blocks)
    return {"summary": html}


# ---------------------------------------------------------
# EMAIL
# ---------------------------------------------------------


class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    html: str


@router.post(
    "/send_email",
    tags=["Email"],
    summary="Send a custom email",
    description=(
        "Send a custom HTML email. Requires SMTP configuration. Admin-only. For branded templates, use the specific /email/* endpoints."
    ),
)
@limiter.limit(EMAIL_LIMIT)
async def send_email(
    request: Request,
    to: str = Form(...),
    subject: str = Form(...),
    html: str = Form(...),
    user: User = Depends(require_platform_admin),
):
    # This function requires the following environment variables to be set in the .env file:
    # SMTP_HOST: The hostname of the SMTP server.
    # SMTP_PORT: The port of the SMTP server.
    # SMTP_USER: The username for the SMTP server.
    # SMTP_PASS: The password for the SMTP server.
    msg = EmailMessage()
    msg["From"] = "info@colabintel.org"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=os.getenv("SMTP_HOST"),
            port=int(os.getenv("SMTP_PORT", "587")),
            start_tls=True,
            username=os.getenv("SMTP_USER"),
            password=os.getenv("SMTP_PASS"),
        )
        return {"status": "sent"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


# ── Helper: send a styled template email ────────────────────────
async def _send_templated_email(to: str, subject: str, html: str):
    """Internal helper to send an email via SMTP.

    Supports both credential-based auth (SMTP_USER + SMTP_PASS) and
    IP-whitelisted relay (no credentials needed — just SMTP_HOST).
    """
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", "info@colabintel.org")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html, subtype="html")

    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    send_kwargs: dict = dict(
        hostname=os.getenv("SMTP_HOST"),
        port=int(os.getenv("SMTP_PORT", "587")),
        start_tls=True,
    )
    if smtp_user and smtp_pass:
        send_kwargs["username"] = smtp_user
        send_kwargs["password"] = smtp_pass

    await aiosmtplib.send(msg, **send_kwargs)


class InvitationEmailPayload(BaseModel):
    to: EmailStr
    consultation_title: str
    admin_name: str
    invitation_url: str
    message: str = ""


@router.post(
    "/email/invitation",
    tags=["Email"],
    summary="Send expert invitation",
    description=(
        "Send a branded invitation email to an expert for a consultation. Records an audit log entry. Admin-only."
    ),
)
@limiter.limit(EMAIL_LIMIT)
async def send_invitation_email(
    payload: InvitationEmailPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Send a branded invitation email to an expert."""
    from .email_templates import invitation

    subject, html = invitation(
        consultation_title=payload.consultation_title,
        admin_name=payload.admin_name,
        invitation_url=payload.invitation_url,
        message=payload.message,
    )
    try:
        await _send_templated_email(payload.to, subject, html)
        audit_log(
            db,
            user=user,
            action="send_invitation",
            resource_type="email",
            detail={"to": payload.to, "consultation": payload.consultation_title},
            request=request,
        )
        db.commit()
        return {"status": "sent", "template": "invitation"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")


class NewRoundEmailPayload(BaseModel):
    to: list[EmailStr]
    consultation_title: str
    round_number: int
    questions: list[str] | None = None
    round_url: str


@router.post(
    "/email/new-round",
    tags=["Email"],
    summary="Send new round notification",
    description=(
        "Notify experts that a new round is open. Sends individually; reports partial failures. Admin-only."
    ),
)
@limiter.limit(EMAIL_LIMIT)
async def send_new_round_email(
    request: Request,
    payload: NewRoundEmailPayload,
    user: User = Depends(require_platform_admin),
):
    """Notify experts that a new round is open."""
    from .email_templates import new_round

    subject, html = new_round(
        consultation_title=payload.consultation_title,
        round_number=payload.round_number,
        questions=payload.questions,
        round_url=payload.round_url,
    )
    errors = []
    for recipient in payload.to:
        try:
            await _send_templated_email(recipient, subject, html)
        except Exception as e:
            errors.append({"to": recipient, "error": str(e)})
    if errors and len(errors) == len(payload.to):
        raise HTTPException(status_code=500, detail={"errors": errors})
    return {
        "status": "sent",
        "template": "new_round",
        "sent": len(payload.to) - len(errors),
        "errors": errors,
    }


class SynthesisReadyEmailPayload(BaseModel):
    to: list[EmailStr]
    consultation_title: str
    round_number: int
    summary_url: str
    consensus_score: float | None = None


@router.post(
    "/email/synthesis-ready",
    tags=["Email"],
    summary="Send synthesis-ready notification",
    description=(
        "Notify participants that synthesis is ready for review. Optionally includes the consensus score. Admin-only."
    ),
)
@limiter.limit(EMAIL_LIMIT)
async def send_synthesis_ready_email(
    request: Request,
    payload: SynthesisReadyEmailPayload,
    user: User = Depends(require_platform_admin),
):
    """Notify participants that synthesis is ready."""
    from .email_templates import synthesis_ready

    subject, html = synthesis_ready(
        consultation_title=payload.consultation_title,
        round_number=payload.round_number,
        summary_url=payload.summary_url,
        consensus_score=payload.consensus_score,
    )
    errors = []
    for recipient in payload.to:
        try:
            await _send_templated_email(recipient, subject, html)
        except Exception as e:
            errors.append({"to": recipient, "error": str(e)})
    if errors and len(errors) == len(payload.to):
        raise HTTPException(status_code=500, detail={"errors": errors})
    return {
        "status": "sent",
        "template": "synthesis_ready",
        "sent": len(payload.to) - len(errors),
        "errors": errors,
    }


class ReminderEmailPayload(BaseModel):
    to: list[EmailStr]
    consultation_title: str
    round_number: int
    deadline: str | None = None
    round_url: str


@router.post(
    "/email/reminder",
    tags=["Email"],
    summary="Send response reminder",
    description=(
        "Send a gentle reminder to experts who haven't responded. Admin-only."
    ),
)
@limiter.limit(EMAIL_LIMIT)
async def send_reminder_email(
    request: Request,
    payload: ReminderEmailPayload,
    user: User = Depends(require_platform_admin),
):
    """Send a gentle reminder to experts who haven't responded."""
    from .email_templates import round_reminder

    subject, html = round_reminder(
        consultation_title=payload.consultation_title,
        round_number=payload.round_number,
        deadline=payload.deadline,
        round_url=payload.round_url,
    )
    errors = []
    for recipient in payload.to:
        try:
            await _send_templated_email(recipient, subject, html)
        except Exception as e:
            errors.append({"to": recipient, "error": str(e)})
    if errors and len(errors) == len(payload.to):
        raise HTTPException(status_code=500, detail={"errors": errors})
    return {
        "status": "sent",
        "template": "round_reminder",
        "sent": len(payload.to) - len(errors),
        "errors": errors,
    }


# ── Manual synthesis notification trigger ────────────────────────
@router.post(
    "/forms/{form_id}/notify",
    tags=["Email"],
    summary="Notify participants about latest synthesis",
    description=(
        "Manually trigger synthesis-ready email notifications for the latest "
        "synthesised round of a form. Sends to the admin and all experts who "
        "responded. Admin-only."
    ),
    response_description="Notification status and recipient count",
)
@limiter.limit(EMAIL_LIMIT)
async def notify_synthesis_ready(
    request: Request,
    form_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Manually trigger synthesis notification emails for the latest round."""
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Find the latest round that has a synthesis
    latest_round = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form_id,
            RoundModel.synthesis.isnot(None),
        )
        .order_by(RoundModel.round_number.desc())
        .first()
    )
    if not latest_round:
        raise HTTPException(
            status_code=404, detail="No synthesised round found for this form"
        )

    background_tasks.add_task(
        _notify_synthesis_ready,
        form_id=form_id,
        round_id=latest_round.id,
        round_number=latest_round.round_number,
        admin_email=user.email,
        convergence_score=latest_round.convergence_score,
    )

    audit_log(
        db,
        user=user,
        action="manual_synthesis_notify",
        resource_type="form",
        resource_id=form_id,
        detail={"round_id": latest_round.id, "round_number": latest_round.round_number},
        request=request,
    )
    db.commit()

    return {
        "status": "queued",
        "form_id": form_id,
        "round_id": latest_round.id,
        "round_number": latest_round.round_number,
        "message": "Synthesis notification emails have been queued for delivery.",
    }


@router.get(
    "/email/preview/{template_name}",
    tags=["Email"],
    summary="Preview email template",
    description=(
        "Preview a branded email template with sample data. Available: invitation, new_round, synthesis_ready, round_reminder, welcome. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
async def preview_email_template(
    request: Request,
    template_name: str,
    user: User = Depends(require_platform_admin),
):
    """Preview a template with sample data (returns HTML string)."""
    from .email_templates import TEMPLATES

    if template_name not in TEMPLATES:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown template: {template_name}. Available: {list(TEMPLATES.keys())}",
        )

    sample_data = {
        "invitation": dict(
            consultation_title="AI Safety in Healthcare",
            admin_name="Dr. Ruaridh Cattach-McLeod",
            invitation_url="https://symphonia.example.com/form/abc123",
            message="We'd love your expertise on the ethical implications of AI triage systems.",
        ),
        "new_round": dict(
            consultation_title="AI Safety in Healthcare",
            round_number=2,
            questions=[
                "How should we handle AI disagreement with clinicians?",
                "What oversight mechanisms are essential?",
            ],
            round_url="https://symphonia.example.com/form/abc123",
        ),
        "synthesis_ready": dict(
            consultation_title="AI Safety in Healthcare",
            round_number=2,
            summary_url="https://symphonia.example.com/summary/abc123",
            consensus_score=0.73,
        ),
        "round_reminder": dict(
            consultation_title="AI Safety in Healthcare",
            round_number=2,
            deadline="28 February 2026, 17:00 GMT",
            round_url="https://symphonia.example.com/form/abc123",
        ),
        "welcome": dict(
            user_email="expert@university.ac.uk",
            login_url="https://symphonia.example.com/login",
        ),
    }

    _subject, html = TEMPLATES[template_name](**sample_data[template_name])
    return {"template": template_name, "subject": _subject, "html": html}


# ---------------------------------------------------------
# AUDIT LOG
# ---------------------------------------------------------


@router.get(
    "/audit-log",
    tags=["Admin"],
    summary="Get audit trail",
    description=(
        "Retrieve the audit trail with pagination. Supports filtering by action type and user ID. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def get_audit_log(
    request: Request,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
    user_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Retrieve the audit trail. Admin-only. Supports filtering by action type and user."""
    q = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    total = q.count()
    entries = q.offset(offset).limit(limit).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat() + "Z",
                "user_id": e.user_id,
                "user_email": e.user_email,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "detail": e.detail,
                "ip_address": e.ip_address,
            }
            for e in entries
        ],
    }


@router.get(
    "/audit-log/actions",
    tags=["Admin"],
    summary="List audit action types",
    description=(
        "Return distinct action types in the audit log for filter dropdowns. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def get_audit_log_actions(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Return distinct action types in the audit log (for filter dropdowns)."""
    rows = db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
    return {"actions": [r[0] for r in rows]}


# ---------------------------------------------------------
# SYNTHESIS COMMENTS
# ---------------------------------------------------------


class CommentCreatePayload(BaseModel):
    section_type: str
    section_index: int | None = None
    parent_id: int | None = None
    body: str


class CommentUpdatePayload(BaseModel):
    body: str


def _serialize_comment(c: SynthesisComment) -> dict:
    """Serialize a comment to a dict (without replies)."""
    return {
        "id": c.id,
        "round_id": c.round_id,
        "section_type": c.section_type,
        "section_index": c.section_index,
        "parent_id": c.parent_id,
        "author_id": c.author_id,
        "author_email": c.author.email if c.author else None,
        "body": c.body,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _nest_comments(comments: list[SynthesisComment]) -> list[dict]:
    """Build nested comment threads from a flat list."""
    top_level = []
    replies_map: dict[int, list[dict]] = {}

    # First pass: serialize all
    serialized = {c.id: _serialize_comment(c) for c in comments}

    # Second pass: group replies
    for c in comments:
        s = serialized[c.id]
        if c.parent_id and c.parent_id in serialized:
            replies_map.setdefault(c.parent_id, []).append(s)
        else:
            top_level.append(s)

    # Third pass: attach replies to parents
    for s in serialized.values():
        s["replies"] = replies_map.get(s["id"], [])

    return top_level


@router.get(
    "/forms/{form_id}/rounds/{round_id}/comments",
    tags=["Synthesis"],
    summary="List synthesis comments",
    description=(
        "List all comments for a round's synthesis, nested by thread. Requires authentication."
    ),
)
@limiter.limit(READ_LIMIT)
def get_comments(
    request: Request,
    form_id: int,
    round_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all comments for a round, nested by thread."""
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    comments = (
        db.query(SynthesisComment)
        .filter(SynthesisComment.round_id == round_id)
        .order_by(SynthesisComment.created_at.asc())
        .all()
    )

    return _nest_comments(comments)


@router.post(
    "/forms/{form_id}/rounds/{round_id}/comments",
    tags=["Synthesis"],
    summary="Post a synthesis comment",
    description=(
        "Post a comment on a synthesis section (agreement, disagreement, nuance, emergence, or general). Supports one-level threading via parent_id. Broadcasts via WebSocket. Requires authentication."
    ),
)
@limiter.limit(CRUD_LIMIT)
async def create_comment(
    request: Request,
    form_id: int,
    round_id: int,
    payload: CommentCreatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a comment on a synthesis section."""
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    valid_section_types = {
        "agreement",
        "disagreement",
        "nuance",
        "emergence",
        "general",
    }
    if payload.section_type not in valid_section_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid section_type. Must be one of: {', '.join(sorted(valid_section_types))}",
        )

    # If replying, validate parent exists and belongs to same round
    if payload.parent_id:
        parent = (
            db.query(SynthesisComment)
            .filter(
                SynthesisComment.id == payload.parent_id,
                SynthesisComment.round_id == round_id,
            )
            .first()
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        # Only 1 level deep — disallow replying to a reply
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot reply to a reply (max 1 level of nesting)",
            )

    comment = SynthesisComment(
        round_id=round_id,
        section_type=payload.section_type,
        section_index=payload.section_index,
        parent_id=payload.parent_id,
        author_id=user.id,
        body=payload.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    result = _serialize_comment(comment)
    result["replies"] = []

    # Broadcast new comment via WebSocket
    for conn in ws_manager.active_connections.copy():
        try:
            await conn.send_json(
                {
                    "type": "comment_added",
                    "form_id": form_id,
                    "round_id": round_id,
                    "comment": result,
                }
            )
        except Exception:
            ws_manager.disconnect(conn)

    return result


@router.put(
    "/comments/{comment_id}",
    tags=["Synthesis"],
    summary="Edit a comment",
    description=(
        "Edit the body of your own comment. Users can only edit their own comments."
    ),
)
@limiter.limit(CRUD_LIMIT)
def update_comment(
    request: Request,
    comment_id: int,
    payload: CommentUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Edit own comment."""
    comment = (
        db.query(SynthesisComment).filter(SynthesisComment.id == comment_id).first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own comments")

    comment.body = payload.body
    db.commit()
    db.refresh(comment)

    result = _serialize_comment(comment)
    result["replies"] = []
    return result


@router.delete(
    "/comments/{comment_id}",
    tags=["Synthesis"],
    summary="Delete a comment",
    description=(
        "Delete a comment. Users can delete their own; admins can delete any."
    ),
)
@limiter.limit(CRUD_LIMIT)
def delete_comment(
    request: Request,
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete own comment (or admin can delete any)."""
    comment = (
        db.query(SynthesisComment).filter(SynthesisComment.id == comment_id).first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != user.id and user.role != UserRole.PLATFORM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")

    db.delete(comment)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------
# AI DEVIL'S ADVOCATE
# ---------------------------------------------------------


@router.post(
    "/forms/{form_id}/rounds/{round_id}/devil_advocate",
    tags=["AI Tools"],
    summary="Generate devil's advocate counterarguments",
    description=(
        "Generate AI counterarguments for a round's synthesis — blind spots, missing perspectives, and steel-man counterarguments. Returns 3-5 rated counterarguments. Requires existing synthesis. Requires authentication."
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
def devil_advocate(
    request: Request,
    form_id: int,
    round_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate AI counterarguments (devil's advocate) for a round's synthesis.

    Reads all expert responses and the current synthesis, then asks the LLM
    to identify blind spots, missing perspectives, and steel-man counterarguments.
    """
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    # Fetch questions
    questions = round_obj.questions or []
    if not questions:
        form = db.query(FormModel).filter(FormModel.id == form_id).first()
        if form:
            questions = form.questions or []

    # Fetch responses
    responses = (
        db.query(Response)
        .filter(Response.round_id == round_id)
        .order_by(Response.created_at.asc())
        .all()
    )
    if not responses:
        raise HTTPException(status_code=404, detail="No responses found for this round")

    # Build context from responses
    responses_text = ""
    for i, r in enumerate(responses, 1):
        responses_text += f"\nExpert {i}:\n"
        answers = (
            r.answers
            if isinstance(r.answers, dict)
            else json.loads(r.answers)
            if r.answers
            else {}
        )
        for q_idx, q in enumerate(questions, 1):
            q_text = q if isinstance(q, str) else q.get("label", q.get("text", str(q)))
            answer = answers.get(f"q{q_idx}", "No answer")
            responses_text += f"  Q: {q_text}\n  A: {answer}\n"

    # Get synthesis text
    synthesis_text = ""
    if round_obj.synthesis_json:
        sj = round_obj.synthesis_json
        parts = []
        for a in sj.get("agreements", []):
            parts.append(
                f"Agreement: {a.get('claim', '')} — {a.get('evidence_summary', '')}"
            )
        for d in sj.get("disagreements", []):
            parts.append(f"Disagreement: {d.get('topic', '')}")
            for p in d.get("positions", []):
                parts.append(f"  - {p.get('position', '')}: {p.get('evidence', '')}")
        for n in sj.get("nuances", []):
            parts.append(f"Nuance: {n.get('claim', '')} — {n.get('context', '')}")
        synthesis_text = "\n".join(parts)
    elif round_obj.synthesis:
        synthesis_text = round_obj.synthesis

    if not synthesis_text:
        raise HTTPException(
            status_code=400,
            detail="No synthesis available to critique. Generate a synthesis first.",
        )

    # Check for mock mode
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        return {
            "counterarguments": [
                {
                    "argument": "Selection bias in expert panel composition",
                    "rationale": "The expert panel may not represent the full spectrum of views on this topic. Key stakeholder groups or dissenting traditions may be absent.",
                    "strength": "strong",
                },
                {
                    "argument": "Temporal assumptions may not hold",
                    "rationale": "The consensus assumes current conditions persist, but rapid technological or political change could invalidate core premises.",
                    "strength": "moderate",
                },
                {
                    "argument": "Implementation feasibility gap",
                    "rationale": "Recommendations may be theoretically sound but practically difficult to implement given resource constraints and institutional inertia.",
                    "strength": "strong",
                },
            ]
        }

    prompt = f"""You are a rigorous devil's advocate analyst. Your job is to identify important counterarguments, blind spots, and perspectives that are NOT represented in the expert discussion below.

--- Expert Responses ---
{responses_text}

--- Current Synthesis ---
{synthesis_text}

--- Your Task ---
Given these expert responses and synthesis, what important counterarguments, blind spots, or perspectives are NOT represented? Generate 3-5 steel-man counterarguments.

For each counterargument:
1. State the argument clearly and charitably (steel-man it)
2. Provide rationale for why this perspective matters
3. Rate its strength as "strong", "moderate", or "weak"

Return ONLY valid JSON (no markdown fences, no extra text) in this exact format:
{{
  "counterarguments": [
    {{
      "argument": "The counterargument stated clearly",
      "rationale": "Why this perspective matters and evidence that supports it",
      "strength": "strong|moderate|weak"
    }}
  ]
}}"""

    resolved_model = _resolve_synthesis_model(db)

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
            )

        completion = openai_client.chat.completions.create(
            model=resolved_model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a devil's advocate analyst for a Delphi-style expert consensus platform. "
                        "Your role is to identify blind spots, missing perspectives, and counterarguments "
                        "that the expert panel has NOT considered. Be rigorous, specific, and constructive. "
                        "Always return valid JSON matching the requested schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        raw_output = completion.choices[0].message.content or ""

        # Parse JSON
        cleaned = raw_output.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = json.loads(cleaned)

        # Validate structure
        counterarguments = parsed.get("counterarguments", [])
        validated = []
        for ca in counterarguments:
            strength = ca.get("strength", "moderate")
            if strength not in ("strong", "moderate", "weak"):
                strength = "moderate"
            validated.append(
                {
                    "argument": ca.get("argument", ""),
                    "rationale": ca.get("rationale", ""),
                    "strength": strength,
                }
            )

        return {"counterarguments": validated}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="Failed to parse devil's advocate response"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate counterarguments: {e}"
        )


# ---------------------------------------------------------
# AUDIENCE TRANSLATION
# ---------------------------------------------------------

AUDIENCE_PROMPTS = {
    "policy_maker": (
        "Translate the following expert synthesis into actionable policy recommendations "
        "with regulatory framing. Use clear policy language, identify regulatory levers, "
        "suggest specific actions, and frame uncertainties as risk assessments. "
        "Structure with: Executive Summary, Key Policy Recommendations, Regulatory Considerations, "
        "Risk Assessment, and Suggested Next Steps."
    ),
    "technical": (
        "Preserve the precise terminology, uncertainties, and caveats in this expert synthesis. "
        "Maintain technical accuracy, include confidence intervals where applicable, "
        "note methodological limitations, and preserve the nuance of expert disagreements. "
        "Use precise language appropriate for domain specialists."
    ),
    "general_public": (
        "Translate this expert synthesis into plain language that a general audience can understand. "
        "Use analogies, avoid jargon, explain technical terms when they must be used, "
        "and focus on practical implications for everyday life. "
        "Keep sentences short and use concrete examples."
    ),
    "executive": (
        "Translate this expert synthesis into a bottom-line executive summary. "
        "Focus on key risks and opportunities. Use a maximum of 3 main bullet points. "
        "Be decisive, highlight what matters for decision-making, and indicate confidence levels. "
        "Format: Bottom Line Up Front, then 3 key bullets, then a single 'Watch Out For' caveat."
    ),
    "academic": (
        "Translate this expert synthesis with academic rigour. Include methodology notes, "
        "epistemic uncertainty framing, citation-style references to expert positions, "
        "and note where further research is needed. Use appropriate hedging language "
        "and distinguish between established consensus and emerging perspectives."
    ),
}


class TranslatePayload(BaseModel):
    audience: str
    synthesis_text: str


@router.post(
    "/forms/{form_id}/rounds/{round_id}/translate",
    tags=["AI Tools"],
    summary="Translate synthesis for audience",
    description=(
        "Translate a synthesis for a specific audience: policy_maker, technical, general_public, executive, or academic. Requires authentication."
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
def translate_synthesis(
    request: Request,
    form_id: int,
    round_id: int,
    payload: TranslatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Translate a synthesis for a specific audience lens."""
    # Validate audience
    if payload.audience not in AUDIENCE_PROMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audience. Must be one of: {', '.join(AUDIENCE_PROMPTS.keys())}",
        )

    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    if not payload.synthesis_text.strip():
        raise HTTPException(status_code=400, detail="No synthesis text provided")

    # Check for mock mode
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    audience_labels = {
        "policy_maker": "Policy Maker",
        "technical": "Technical Specialist",
        "general_public": "General Public",
        "executive": "Executive",
        "academic": "Academic",
    }

    if synthesis_mode == "mock" or not api_key:
        return {
            "audience": payload.audience,
            "audience_label": audience_labels.get(payload.audience, payload.audience),
            "translated_text": (
                f"**[{audience_labels.get(payload.audience, payload.audience)} Translation — Mock Mode]**\n\n"
                f"This is a mock translation of the synthesis for the "
                f"*{audience_labels.get(payload.audience, payload.audience)}* audience. "
                f"Enable OPENROUTER_API_KEY for real LLM translation.\n\n"
                f"Original synthesis has been preserved above."
            ),
        }

    system_prompt = AUDIENCE_PROMPTS[payload.audience]
    resolved_model = _resolve_synthesis_model(db)

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
            )

        completion = openai_client.chat.completions.create(
            model=resolved_model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": (
                        f"Please translate the following expert consensus synthesis "
                        f"for a {audience_labels.get(payload.audience, payload.audience)} audience:\n\n"
                        f"{payload.synthesis_text}"
                    ),
                },
            ],
        )

        translated = completion.choices[0].message.content or ""

        return {
            "audience": payload.audience,
            "audience_label": audience_labels.get(payload.audience, payload.audience),
            "translated_text": translated.strip(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to translate synthesis: {e}"
        )


# ---------------------------------------------------------
# AI PROBE QUESTIONS
# ---------------------------------------------------------


class ProbeQuestionsPayload(BaseModel):
    synthesis_text: str = ""  # Optional: current synthesis for richer probing


@router.post(
    "/forms/{form_id}/rounds/{round_id}/probe-questions",
    tags=["AI Tools"],
    summary="Generate AI probing questions",
    description=(
        "Generate maximally-probing follow-up questions given the full context: "
        "form questions, all expert responses, and optional synthesis. "
        "Questions are designed to surface hidden assumptions, resolve disagreements, "
        "and deepen the enquiry. Requires authentication."
    ),
)
@limiter.limit(AI_LIMIT)
def generate_probe_questions(
    request: Request,
    form_id: int,
    round_id: int,
    payload: ProbeQuestionsPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate AI-powered probing questions from the full context."""
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Gather form questions
    questions = round_obj.questions or form.questions or []
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this round")

    # Gather responses for this round
    responses = db.query(Response).filter(Response.round_id == round_id).all()

    # Check mode / key
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        return {
            "questions": [
                {
                    "question": "Can you elaborate on the assumptions underlying your position?",
                    "rationale": "Surfaces hidden premises that may not withstand scrutiny.",
                    "category": "assumption",
                },
                {
                    "question": "What evidence would change your view?",
                    "rationale": "Tests the falsifiability and robustness of expert positions.",
                    "category": "challenge",
                },
                {
                    "question": "How do you reconcile your view with the opposing position raised by other experts?",
                    "rationale": "Forces explicit engagement with the sharpest disagreement.",
                    "category": "disagreement",
                },
                {
                    "question": "What are the second-order consequences of your recommendation?",
                    "rationale": "Exposes downstream effects not yet considered.",
                    "category": "depth",
                },
                {
                    "question": "Who is most affected by this decision and whose voice is missing from this discussion?",
                    "rationale": "Surfaces blind spots around representation and impact.",
                    "category": "blind_spot",
                },
            ],
            "mock": True,
        }

    # Build context string
    q_text = "\n".join(
        f"{i}. {q.get('label', q.get('text', str(q))) if isinstance(q, dict) else str(q)}"
        for i, q in enumerate(questions, 1)
    )

    r_blocks = []
    for idx, resp in enumerate(responses, 1):
        answers = resp.answers or {}
        if isinstance(answers, dict):
            a_lines = "\n".join(f"  Q: {k}\n  A: {v}" for k, v in answers.items() if v)
        else:
            a_lines = str(answers)
        r_blocks.append(f"Expert {idx}:\n{a_lines}")
    r_text = "\n\n".join(r_blocks) if r_blocks else "(No responses yet)"

    synthesis_section = (
        f"\n\nCurrent synthesis:\n{payload.synthesis_text.strip()}"
        if payload.synthesis_text.strip()
        else ""
    )

    prompt = f"""You are a master Delphi facilitator and Socratic questioner. Your task is to generate the most penetrating, maximally-probing follow-up questions that will deepen the expert discussion and surface what is currently hidden, assumed, or unresolved.

Form topic: {form.title}

Questions asked so far:
{q_text}

Expert responses:
{r_text}{synthesis_section}

Generate 5-7 probing questions that:
1. Challenge hidden assumptions in the expert responses
2. Resolve or sharpen the most significant disagreements
3. Expose blind spots — perspectives, populations, or second-order effects not yet considered
4. Deepen the enquiry into areas that are currently shallow or vague
5. Test the robustness of the areas of consensus

For each question, assign a category from: "assumption", "challenge", "disagreement", "depth", "blind_spot", "clarification".

Return ONLY a JSON object in this exact format:
{{
  "questions": [
    {{
      "question": "The probing question text",
      "rationale": "One sentence explaining why this question matters and what it surfaces",
      "category": "assumption|challenge|disagreement|depth|blind_spot|clarification"
    }}
  ]
}}"""

    resolved_model = _resolve_synthesis_model(db)

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key.",
            )

        completion = openai_client.chat.completions.create(
            model=resolved_model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert Delphi facilitator. You generate incisive, "
                        "maximally-probing questions that advance expert deliberation. "
                        "Always respond with valid JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        content = completion.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            import re as _re

            m = _re.search(r"\{.*\}", content, _re.DOTALL)
            parsed = json.loads(m.group()) if m else {}

        raw_questions = parsed.get("questions", [])
        validated = []
        valid_categories = {
            "assumption",
            "challenge",
            "disagreement",
            "depth",
            "blind_spot",
            "clarification",
        }
        for q in raw_questions:
            if isinstance(q, dict) and q.get("question"):
                validated.append(
                    {
                        "question": str(q.get("question", "")),
                        "rationale": str(q.get("rationale", "")),
                        "category": q.get("category", "depth")
                        if q.get("category") in valid_categories
                        else "depth",
                    }
                )

        return {"questions": validated, "mock": False}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate probe questions: {e}"
        )


# ---------------------------------------------------------
# EXPERT VOICE MIRRORING
# ---------------------------------------------------------


class VoiceMirrorPayload(BaseModel):
    """Payload for clarifying expert responses."""

    responses: list[
        dict
    ]  # [{"expert": "Expert 1", "question": "...", "answer": "..."}]


@router.post(
    "/forms/{form_id}/rounds/{round_id}/voice_mirror",
    tags=["AI Tools"],
    summary="Clarify expert responses",
    description=(
        "Clarify expert statements for accessibility without changing meaning. Simplifies jargon and complex sentences while preserving intent. Requires authentication."
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
def voice_mirror(
    request: Request,
    form_id: int,
    round_id: int,
    payload: VoiceMirrorPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Clarify expert statements for accessibility without changing meaning.

    Takes expert responses and returns clarified versions that preserve
    the original meaning and nuance while making them more readable.
    """
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    if not payload.responses:
        raise HTTPException(status_code=400, detail="No responses provided to clarify")

    # Check for mock mode
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        clarified = []
        for item in payload.responses:
            clarified.append(
                {
                    "expert": item.get("expert", "Unknown"),
                    "question": item.get("question", ""),
                    "original": item.get("answer", ""),
                    "clarified": f"[Mock clarification] {item.get('answer', '')}",
                }
            )
        return {"clarified_responses": clarified}

    # Build prompt
    responses_block = ""
    for i, item in enumerate(payload.responses, 1):
        responses_block += (
            f"\n--- Response {i} ---\n"
            f"Expert: {item.get('expert', 'Unknown')}\n"
            f"Question: {item.get('question', '')}\n"
            f"Answer: {item.get('answer', '')}\n"
        )

    prompt = f"""You are an expert communications editor for a Delphi-style consensus platform. Your task is to clarify expert statements to make them more accessible to a broader audience, WITHOUT changing the meaning, position, or nuance of what the expert said.

Rules:
1. Preserve the expert's exact position and intent
2. Simplify jargon and technical terms (add brief parenthetical explanations where needed)
3. Break long, complex sentences into shorter, clearer ones
4. Maintain all caveats, qualifications, and uncertainty language
5. Do NOT add information the expert didn't provide
6. Do NOT strengthen or weaken any claims
7. If the original is already clear and accessible, return it with minimal changes

--- Expert Responses to Clarify ---
{responses_block}

Return ONLY valid JSON (no markdown fences, no extra text) in this exact format:
{{
  "clarified_responses": [
    {{
      "expert": "Expert name",
      "question": "The question text",
      "original": "The original answer text",
      "clarified": "The clarified version"
    }}
  ]
}}"""

    resolved_model = _resolve_synthesis_model(db)

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
            )

        completion = openai_client.chat.completions.create(
            model=resolved_model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a communications editor specialising in making expert "
                        "technical language accessible while preserving meaning. "
                        "Always return valid JSON matching the requested schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        raw_output = completion.choices[0].message.content or ""

        # Parse JSON
        cleaned = raw_output.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = json.loads(cleaned)

        return {"clarified_responses": parsed.get("clarified_responses", [])}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="Failed to parse voice mirroring response"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clarify responses: {e}")


# ---------------------------------------------------------
# ADMIN ANALYTICS
# ---------------------------------------------------------


@router.get(
    "/admin/analytics",
    tags=["Admin"],
    summary="Get analytics dashboard",
    description=(
        "Aggregated analytics: total forms/responses, convergence scores, response rates, synthesis mode distribution, and 30-day activity timeline. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def admin_analytics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Return aggregated analytics for the admin dashboard.

    Returns:
    - total_forms, total_responses, average_convergence, most_active_form
    - response_rate_per_form: [{form_id, title, participant_count, response_count, rate}]
    - convergence_by_form: [{form_id, title, rounds: [{round_number, convergence_score}]}]
    - synthesis_mode_distribution: [{mode, count}]
    - activity_timeline: [{date, forms_created, responses_submitted}]
    """
    from sqlalchemy import func
    from datetime import timedelta

    # ── Basic counts ──
    total_forms = db.query(func.count(FormModel.id)).scalar() or 0
    total_responses = db.query(func.count(Response.id)).scalar() or 0

    # ── Average convergence (across all rounds that have one) ──
    avg_convergence = (
        db.query(func.avg(RoundModel.convergence_score))
        .filter(RoundModel.convergence_score.isnot(None))
        .scalar()
    )
    avg_convergence = round(float(avg_convergence), 3) if avg_convergence else 0

    # ── Most active form (by response count) ──
    most_active_row = (
        db.query(
            FormModel.id,
            FormModel.title,
            func.count(Response.id).label("cnt"),
        )
        .join(Response, Response.form_id == FormModel.id)
        .group_by(FormModel.id, FormModel.title)
        .order_by(func.count(Response.id).desc())
        .first()
    )
    most_active_form = (
        {
            "id": most_active_row[0],
            "title": most_active_row[1],
            "response_count": most_active_row[2],
        }
        if most_active_row
        else None
    )

    # ── Response rate per form ──
    forms = db.query(FormModel).order_by(FormModel.id).all()
    response_rate_per_form = []
    for f in forms:
        participant_count = (
            db.query(Response.user_id)
            .filter(Response.form_id == f.id)
            .distinct()
            .count()
        )
        # Total unlocked users as the "invited" pool
        invited_count = (
            db.query(UserFormUnlock.user_id)
            .filter(UserFormUnlock.form_id == f.id)
            .count()
        )
        # Use max(invited, participants) to avoid >100%
        denominator = max(invited_count, participant_count, 1)
        response_count = db.query(Response).filter(Response.form_id == f.id).count()
        rate = round(participant_count / denominator * 100, 1) if denominator else 0
        response_rate_per_form.append(
            {
                "form_id": f.id,
                "title": f.title,
                "invited": denominator,
                "responded": participant_count,
                "response_count": response_count,
                "rate": rate,
            }
        )

    # ── Convergence trend per form ──
    convergence_by_form = []
    for f in forms:
        rounds = (
            db.query(RoundModel)
            .filter(RoundModel.form_id == f.id)
            .order_by(RoundModel.round_number.asc())
            .all()
        )
        round_data = []
        for r in rounds:
            resp_count = db.query(Response).filter(Response.round_id == r.id).count()
            round_data.append(
                {
                    "round_number": r.round_number,
                    "convergence_score": r.convergence_score,
                    "response_count": resp_count,
                }
            )
        convergence_by_form.append(
            {
                "form_id": f.id,
                "title": f.title,
                "rounds": round_data,
            }
        )

    # ── Synthesis mode distribution ──
    # Count synthesis versions by strategy
    strategy_counts = (
        db.query(SynthesisVersion.strategy, func.count(SynthesisVersion.id))
        .group_by(SynthesisVersion.strategy)
        .all()
    )
    synthesis_mode_distribution = [
        {"mode": row[0] or "simple", "count": row[1]} for row in strategy_counts
    ]
    # If no synthesis versions, check flow_mode on rounds as fallback
    if not synthesis_mode_distribution:
        mode_counts = (
            db.query(RoundModel.flow_mode, func.count(RoundModel.id))
            .filter(RoundModel.synthesis.isnot(None))
            .group_by(RoundModel.flow_mode)
            .all()
        )
        synthesis_mode_distribution = [
            {"mode": row[0] or "simple", "count": row[1]} for row in mode_counts
        ]

    # ── Activity timeline (last 30 days) ──
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Responses per day
    response_timeline = (
        db.query(
            func.date(Response.created_at).label("date"),
            func.count(Response.id).label("count"),
        )
        .filter(Response.created_at >= thirty_days_ago)
        .group_by(func.date(Response.created_at))
        .order_by(func.date(Response.created_at))
        .all()
    )

    # Build a complete 30-day series
    today = datetime.now(timezone.utc).date()
    date_map_responses: dict[str, int] = {}
    for row in response_timeline:
        date_map_responses[str(row[0])] = row[1]

    activity_timeline = []
    for i in range(30):
        d = today - timedelta(days=29 - i)
        ds = str(d)
        activity_timeline.append(
            {
                "date": ds,
                "responses": date_map_responses.get(ds, 0),
            }
        )

    return {
        "total_forms": total_forms,
        "total_responses": total_responses,
        "average_convergence": avg_convergence,
        "most_active_form": most_active_form,
        "response_rate_per_form": response_rate_per_form,
        "convergence_by_form": convergence_by_form,
        "synthesis_mode_distribution": synthesis_mode_distribution,
        "activity_timeline": activity_timeline,
    }


# ---------------------------------------------------------
# ATLAS: UX TESTING DATA SEEDER
# ---------------------------------------------------------


@router.post(
    "/atlas/seed",
    tags=["Admin"],
    summary="Seed UX test data",
    description=(
        "Seed the database with sample consultation forms for UX testing. Idempotent — skips existing forms. Admin-only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def seed_atlas_data(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Seed the database with test forms for UX testing."""
    import uuid

    test_forms = [
        {
            "title": "🧪 Round 1: Fresh Form",
            "questions": [
                {
                    "id": "q1",
                    "type": "text",
                    "label": "What is your main concern?",
                    "required": True,
                },
                {
                    "id": "q2",
                    "type": "textarea",
                    "label": "Describe your perspective in detail",
                    "required": True,
                },
                {
                    "id": "q3",
                    "type": "select",
                    "label": "Priority level",
                    "options": ["Low", "Medium", "High", "Critical"],
                    "required": True,
                },
            ],
        },
        {
            "title": "📊 Round 2: With Responses",
            "questions": [
                {
                    "id": "q1",
                    "type": "text",
                    "label": "What solution do you propose?",
                    "required": True,
                },
                {
                    "id": "q2",
                    "type": "rating",
                    "label": "Rate your confidence (1-5)",
                    "required": True,
                },
                {
                    "id": "q3",
                    "type": "textarea",
                    "label": "Additional comments",
                    "required": False,
                },
            ],
            "seed_responses": [
                {
                    "q1": "Implement automated testing",
                    "q2": "4",
                    "q3": "This would significantly reduce bugs",
                },
                {
                    "q1": "Hire more developers",
                    "q2": "3",
                    "q3": "We need more hands on deck",
                },
                {
                    "q1": "Improve documentation",
                    "q2": "5",
                    "q3": "Clear docs prevent misunderstandings",
                },
            ],
        },
        {
            "title": "🎯 Multi-Round Delphi",
            "questions": [
                {
                    "id": "q1",
                    "type": "text",
                    "label": "Final recommendation",
                    "required": True,
                },
                {
                    "id": "q2",
                    "type": "textarea",
                    "label": "Justification",
                    "required": True,
                },
            ],
            "rounds": 3,
            "seed_responses": [
                {
                    "q1": "Consensus reached on Option A",
                    "q2": "After 3 rounds, experts converged on this approach",
                },
            ],
        },
    ]

    created_forms = []

    for form_data in test_forms:
        # Check if form with this title already exists
        existing = (
            db.query(FormModel).filter(FormModel.title == form_data["title"]).first()
        )
        if existing:
            created_forms.append(
                {"id": existing.id, "title": existing.title, "status": "exists"}
            )
            continue

        # Create form with unique join_code
        form = FormModel(
            title=form_data["title"],
            questions=form_data["questions"],
            join_code=str(uuid.uuid4())[:8],
        )
        db.add(form)
        db.flush()

        # Create initial round
        num_rounds = form_data.get("rounds", 1)
        for round_num in range(1, num_rounds + 1):
            round_obj = RoundModel(form_id=form.id, round_number=round_num)
            db.add(round_obj)
            db.flush()

            # Seed responses if this is the last round and we have seed data
            if round_num == num_rounds and "seed_responses" in form_data:
                for i, resp_data in enumerate(form_data["seed_responses"]):
                    # Create a test user for this response if needed
                    test_email = f"test_user_{i + 1}@atlas.test"
                    test_user = db.query(User).filter(User.email == test_email).first()
                    if not test_user:
                        test_user = User(
                            email=test_email,
                            hashed_password=get_password_hash("test123"),
                        )
                        db.add(test_user)
                        db.flush()

                    response = Response(
                        user_id=test_user.id,
                        form_id=form.id,
                        round_id=round_obj.id,
                        answers=json.dumps(resp_data),
                    )
                    db.add(response)

        created_forms.append({"id": form.id, "title": form.title, "status": "created"})

    db.commit()

    return {"message": "Atlas data seeded", "forms": created_forms}


# ---------------------------------------------------------
# AI QUESTION ASSISTANT
# ---------------------------------------------------------

DELPHI_SYSTEM_PROMPT = """You are an expert facilitator of Delphi consultations. Symphonia is a structured multi-round expert consultation platform. Your job is to help design high-quality Delphi consultation forms.

DELPHI METHODOLOGY:
- Structured, iterative, multi-round process for converging expert opinion
- Round 1: Open questions invite broad expert perspectives
- Round 2+: Synthesis of prior responses + targeted follow-up questions
- Goal: Surface areas of consensus AND genuine disagreement among experts
- Key principle: Questions should generate DIVERSE responses, not confirm existing views

WHAT MAKES A GOOD DELPHI QUESTION:
1. Open-ended — cannot be answered yes/no
2. Forward-looking — "What will...", "How should...", "What are the key..."
3. Neutral framing — no loaded language, no implied correct answer
4. Specific scope — one topic per question, not "What do you think about X and Y and Z?"
5. Expert-relevant — requires domain knowledge to answer meaningfully
6. Generative — likely to produce diverse, substantive responses across experts
7. Right length — short enough to be clear, not so brief it's vague

WHAT MAKES A BAD DELPHI QUESTION:
- Binary: "Should we do X?" → experts just say yes/no
- Leading: "Given the obvious risks of X, how should we..." → implies the answer
- Too broad: "What do you think about AI?" → too vague, experts can't focus
- Too narrow: "What is the exact percentage of..." → not opinion-worthy
- Double-barrelled: "What are the risks and opportunities of X?" → split it

When suggesting questions for a consultation titled "{title}", generate questions that would surface meaningful expert disagreement and produce a rich synthesis.

Respond with JSON only. No prose outside JSON."""


def _build_ai_suggest_user_prompt(
    title: str, description: str, questions: list[str], mode: str, **kwargs
) -> str:
    """Build the user prompt for the AI suggest endpoint based on mode."""
    context = f'Consultation title: "{title}"'
    if description:
        context += f'\nDescription: "{description}"'
    if questions and any(q.strip() for q in questions):
        non_empty = [q for q in questions if q.strip()]
        context += "\nExisting questions:\n" + "\n".join(
            f"  {i + 1}. {q}" for i, q in enumerate(non_empty)
        )

    if mode == "suggest":
        count = kwargs.get("suggestion_count", 5)
        return (
            f"{context}\n\n"
            f"Generate {count} new question suggestions for this consultation topic. "
            "Each question should be distinct, open-ended, and designed to surface meaningful expert disagreement.\n\n"
            'Respond with JSON only: { "suggestions": ["Q1?", "Q2?", ...] }'
        )
    elif mode == "critique":
        return (
            f"{context}\n\n"
            "Review the existing questions and identify weaknesses. For each issue found, "
            "explain what's wrong and rate severity.\n\n"
            "Respond with JSON only: "
            '{ "critique": [{ "question": "the question text", "issue": "what is wrong", "severity": "low|medium|high" }] }'
        )
    elif mode == "improve":
        return (
            f"{context}\n\n"
            "Rewrite the existing questions to be better Delphi consultation questions. "
            "For each, provide the original, the improved version, and the reason for the change.\n\n"
            "Respond with JSON only: "
            '{ "improved": [{ "original": "original question", "improved": "improved question", "reason": "why this is better" }] }'
        )
    else:
        return f"{context}\n\nGenerate 3-5 question suggestions.\n\nRespond with JSON only."


# ── App Settings ─────────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "synthesis_model": "anthropic/claude-opus-4-6",
    "max_rounds": "3",
    "convergence_threshold": "70",
    "default_anonymous": "false",
    "ai_suggestions_count": "5",
    "synthesis_strategy": "single_prompt",
    "allow_late_join": "true",
    "registration_mode": "open",
    "allowed_domains": "",
}


@router.get(
    "/admin/settings",
    tags=["Admin"],
    summary="Get application settings",
    description=(
        "Return all app settings with defaults. Includes synthesis_model, max_rounds, convergence_threshold, and more. Admin-only."
    ),
)
@limiter.limit(READ_LIMIT)
def get_settings(
    request: Request,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """Return all app settings (platform admin only)."""
    rows = db.query(Setting).all()
    result = dict(DEFAULT_SETTINGS)  # start with defaults
    for row in rows:
        result[row.key] = row.value
    return result


@router.patch(
    "/admin/settings",
    tags=["Admin"],
    summary="Update application settings",
    description=("Update one or more settings. Only known keys accepted. Admin-only."),
)
@limiter.limit(CRUD_LIMIT)
def update_settings(
    payload: dict,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Update one or more settings (platform admin only)."""
    allowed_keys = set(DEFAULT_SETTINGS.keys())
    for key, value in payload.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Unknown setting: {key}")
        row = db.query(Setting).filter(Setting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(Setting(key=key, value=str(value)))
    db.commit()
    return {"status": "ok"}


@router.post(
    "/ai/suggest",
    tags=["AI Tools"],
    summary="AI question design assistant",
    description=(
        "AI-powered Delphi question assistant. Modes: 'suggest' (new ideas), 'critique' (review weaknesses), 'improve' (rewrite). Requires authentication."
    ),
)
@limiter.limit(AI_LIMIT)
def ai_suggest(
    request: Request,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI-powered question assistant for Delphi consultation form design.

    Modes:
    - suggest: Generate 3-5 new question suggestions
    - critique: Review existing questions for weaknesses
    - improve: Rewrite existing questions to be better
    """
    title = payload.get("title", "").strip()
    description = payload.get("description", "").strip()
    questions = payload.get("questions", [])
    mode = payload.get("mode", "suggest")

    if mode not in ("suggest", "critique", "improve"):
        raise HTTPException(
            status_code=400,
            detail="Invalid mode. Must be 'suggest', 'critique', or 'improve'.",
        )

    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")

    if mode in ("critique", "improve"):
        non_empty = [q for q in questions if isinstance(q, str) and q.strip()]
        if not non_empty:
            raise HTTPException(
                status_code=400,
                detail=f"At least one question is required for '{mode}' mode.",
            )

    # Check for mock mode or missing API key
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        # Return mock data for demo/testing
        if mode == "suggest":
            return {
                "suggestions": [
                    f"What are the most significant challenges facing {title.lower() if title else 'this domain'} in the next 5 years?",
                    "How should organisations adapt their strategies to address emerging trends in this area?",
                    "What key factors will determine success or failure in addressing these challenges?",
                    "Where do you see the greatest potential for innovation or disruption?",
                ]
            }
        elif mode == "critique":
            return {
                "critique": [
                    {
                        "question": questions[0] if questions else "N/A",
                        "issue": "This is a mock critique. Enable OPENROUTER_API_KEY for real AI analysis.",
                        "severity": "medium",
                    }
                ]
            }
        else:
            return {
                "improved": [
                    {
                        "original": questions[0] if questions else "N/A",
                        "improved": f"[Mock improvement] {questions[0] if questions else 'N/A'}",
                        "reason": "This is a mock improvement. Enable OPENROUTER_API_KEY for real AI suggestions.",
                    }
                ]
            }

    # Build prompts
    system_prompt = DELPHI_SYSTEM_PROMPT.replace("{title}", title)
    # Read suggestion count from DB setting
    suggestion_count = int(DEFAULT_SETTINGS["ai_suggestions_count"])
    count_setting = (
        db.query(Setting).filter(Setting.key == "ai_suggestions_count").first()
    )
    if count_setting:
        try:
            suggestion_count = max(3, min(10, int(count_setting.value)))
        except (ValueError, TypeError):
            pass
    user_prompt = _build_ai_suggest_user_prompt(
        title, description, questions, mode, suggestion_count=suggestion_count
    )
    # Model: from payload > DB setting > env var > hardcoded default
    model = payload.get("model") or None
    if not model:
        db_setting = db.query(Setting).filter(Setting.key == "synthesis_model").first()
        model = (
            db_setting.value
            if db_setting
            else os.getenv("SYNTHESIS_MODEL", "anthropic/claude-opus-4-6")
        )

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(
                status_code=503,
                detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
            )

        completion = openai_client.chat.completions.create(
            model=model,
            max_tokens=8192,  # Cap to prevent OpenRouter 402 pre-flight failures
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        raw_output = completion.choices[0].message.content or ""

        # Parse JSON response
        cleaned = raw_output.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = json.loads(cleaned)

        # Validate and return based on mode
        if mode == "suggest":
            suggestions = parsed.get("suggestions", [])
            if not isinstance(suggestions, list):
                raise ValueError("Invalid suggestions format")
            return {"suggestions": suggestions}

        elif mode == "critique":
            critique = parsed.get("critique", [])
            if not isinstance(critique, list):
                raise ValueError("Invalid critique format")
            # Validate each critique entry
            validated = []
            for item in critique:
                severity = item.get("severity", "medium")
                if severity not in ("low", "medium", "high"):
                    severity = "medium"
                validated.append(
                    {
                        "question": item.get("question", ""),
                        "issue": item.get("issue", ""),
                        "severity": severity,
                    }
                )
            return {"critique": validated}

        elif mode == "improve":
            improved = parsed.get("improved", [])
            if not isinstance(improved, list):
                raise ValueError("Invalid improved format")
            validated = []
            for item in improved:
                validated.append(
                    {
                        "original": item.get("original", ""),
                        "improved": item.get("improved", ""),
                        "reason": item.get("reason", ""),
                    }
                )
            return {"improved": validated}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="Failed to parse AI response as JSON"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {e}")


# ---------------------------------------------------------
# PHASE 2 — INVITE CODES, USER MANAGEMENT, PARTICIPANTS
# ---------------------------------------------------------


class JoinFormPayload(BaseModel):
    code: str


@router.post(
    "/forms/join",
    tags=["Forms"],
    summary="Join a form via invite code (invite-code-aware)",
    description=(
        "Join a consultation using an invite code. Validates expiry, max_uses, "
        "and is_active from the invite_codes table. Falls back to legacy "
        "FormModel.join_code matching."
    ),
)
@limiter.limit(CRUD_LIMIT)
def join_form(
    request: Request,
    payload: JoinFormPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Invite-code-aware join. Supplements the legacy /forms/unlock endpoint."""
    raw_code = payload.code.strip()
    normalized = normalize_join_code(raw_code)

    # 1. Try invite_codes table (preferred path)
    invite = db.query(InviteCode).filter(InviteCode.code == raw_code).first()
    if not invite and normalized:
        # Try normalized match
        all_invites = db.query(InviteCode).filter(InviteCode.is_active).all()
        for ic in all_invites:
            if normalize_join_code(ic.code) == normalized:
                invite = ic
                break

    if invite:
        if not invite.is_active:
            raise HTTPException(
                status_code=400, detail="This invite code has been deactivated."
            )
        if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite code has expired.")
        if invite.max_uses is not None and invite.use_count >= invite.max_uses:
            raise HTTPException(
                status_code=400, detail="This invite code has reached its usage limit."
            )

        form = db.query(FormModel).filter(FormModel.id == invite.form_id).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found.")

        # Check idempotent
        existing = (
            db.query(UserFormUnlock)
            .filter(
                UserFormUnlock.user_id == user.id,
                UserFormUnlock.form_id == form.id,
            )
            .first()
        )
        if existing:
            return {"message": "Already joined.", "form_id": form.id}

        unlock = UserFormUnlock(
            user_id=user.id,
            form_id=form.id,
            form_role=invite.form_role,
        )
        db.add(unlock)
        invite.use_count += 1
        db.commit()
        audit_log(
            db,
            user=user,
            action="join_form",
            resource_type="form",
            resource_id=form.id,
            detail={"invite_code_id": invite.id},
            request=request,
        )
        return {"message": "Joined successfully.", "form_id": form.id}

    # 2. Fall back to legacy FormModel.join_code matching
    form = (
        db.query(FormModel)
        .filter(
            FormModel.join_code == raw_code,
            FormModel.allow_join,
        )
        .first()
    )
    if not form and normalized:
        all_forms = db.query(FormModel).filter(FormModel.allow_join).all()
        for f in all_forms:
            if normalize_join_code(f.join_code) == normalized:
                form = f
                break

    if not form:
        raise HTTPException(status_code=404, detail="Invalid join code.")

    existing = (
        db.query(UserFormUnlock)
        .filter(
            UserFormUnlock.user_id == user.id,
            UserFormUnlock.form_id == form.id,
        )
        .first()
    )
    if existing:
        return {"message": "Already joined.", "form_id": form.id}

    unlock = UserFormUnlock(user_id=user.id, form_id=form.id)
    db.add(unlock)
    db.commit()
    audit_log(
        db,
        user=user,
        action="join_form",
        resource_type="form",
        resource_id=form.id,
        request=request,
    )
    return {"message": "Joined successfully.", "form_id": form.id}


# ── Invite code CRUD ──


class CreateInviteCodePayload(BaseModel):
    form_role: str = "expert"
    expires_at: str | None = None
    max_uses: int | None = None
    label: str | None = None


@router.get(
    "/forms/{form_id}/invite-codes",
    tags=["Forms"],
    summary="List invite codes for a form",
)
@limiter.limit(READ_LIMIT)
def list_invite_codes(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    codes = (
        db.query(InviteCode)
        .filter(InviteCode.form_id == form_id)
        .order_by(InviteCode.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "code": c.code,
            "form_role": c.form_role,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "max_uses": c.max_uses,
            "use_count": c.use_count,
            "is_active": c.is_active,
            "label": c.label,
        }
        for c in codes
    ]


@router.post(
    "/forms/{form_id}/invite-codes",
    tags=["Forms"],
    summary="Create a new invite code for a form",
    status_code=201,
)
@limiter.limit(CRUD_LIMIT)
def create_invite_code(
    form_id: int,
    request: Request,
    payload: CreateInviteCodePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    if payload.form_role not in ("expert", "collaborator"):
        raise HTTPException(
            status_code=400, detail="form_role must be 'expert' or 'collaborator'"
        )

    # Generate unique code
    for _ in range(10):
        code = generate_join_code()
        if not db.query(InviteCode).filter(InviteCode.code == code).first():
            break
    else:
        raise HTTPException(
            status_code=500, detail="Could not generate unique invite code"
        )

    expires = None
    if payload.expires_at:
        try:
            expires = datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")

    invite = InviteCode(
        form_id=form_id,
        code=code,
        form_role=payload.form_role,
        created_by=user.id,
        expires_at=expires,
        max_uses=payload.max_uses,
        label=payload.label,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    audit_log(
        db,
        user=user,
        action="create_invite_code",
        resource_type="invite_code",
        resource_id=invite.id,
        detail={"form_id": form_id, "code": code},
        request=request,
    )
    return {
        "id": invite.id,
        "code": invite.code,
        "form_role": invite.form_role,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "max_uses": invite.max_uses,
        "use_count": invite.use_count,
        "is_active": invite.is_active,
        "label": invite.label,
    }


class UpdateInviteCodePayload(BaseModel):
    is_active: bool | None = None
    label: str | None = None
    max_uses: int | None = None
    expires_at: str | None = None


@router.patch(
    "/forms/{form_id}/invite-codes/{code_id}",
    tags=["Forms"],
    summary="Update an invite code (deactivate, label, etc.)",
)
@limiter.limit(CRUD_LIMIT)
def update_invite_code(
    form_id: int,
    code_id: int,
    request: Request,
    payload: UpdateInviteCodePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    invite = (
        db.query(InviteCode)
        .filter(
            InviteCode.id == code_id,
            InviteCode.form_id == form_id,
        )
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")

    if payload.is_active is not None:
        invite.is_active = payload.is_active
    if payload.label is not None:
        invite.label = payload.label
    if payload.max_uses is not None:
        invite.max_uses = payload.max_uses
    if payload.expires_at is not None:
        try:
            invite.expires_at = datetime.fromisoformat(
                payload.expires_at.replace("Z", "+00:00")
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")

    db.commit()
    audit_log(
        db,
        user=user,
        action="update_invite_code",
        resource_type="invite_code",
        resource_id=invite.id,
        detail={"form_id": form_id},
        request=request,
    )
    return {
        "id": invite.id,
        "code": invite.code,
        "is_active": invite.is_active,
        "label": invite.label,
        "max_uses": invite.max_uses,
        "use_count": invite.use_count,
    }


# ── User management (platform admin) ──


@router.get(
    "/admin/users",
    tags=["Admin"],
    summary="List all users for role management",
)
@limiter.limit(READ_LIMIT)
def list_users(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Return all users with their roles. Platform admin only."""
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_admin": u.role == UserRole.PLATFORM_ADMIN.value,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


class UpdateUserRolePayload(BaseModel):
    role: str


@router.patch(
    "/admin/users/{user_id}/role",
    tags=["Admin"],
    summary="Change a user's platform role",
)
@limiter.limit(CRUD_LIMIT)
def update_user_role(
    user_id: int,
    request: Request,
    payload: UpdateUserRolePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Promote or demote a user. Platform admin only. Self-modification prevented."""
    valid_roles = {r.value for r in UserRole}
    if payload.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role.")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target.role
    target.role = payload.role
    db.commit()

    audit_log(
        db,
        user=admin,
        action="change_user_role",
        resource_type="user",
        resource_id=user_id,
        detail={"old_role": old_role, "new_role": payload.role},
        request=request,
    )
    return {"id": target.id, "email": target.email, "role": target.role}


# ── Participants ──


@router.get(
    "/forms/{form_id}/participants",
    tags=["Forms"],
    summary="List experts who joined a form",
)
@limiter.limit(READ_LIMIT)
def list_participants(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    unlocks = db.query(UserFormUnlock).filter(UserFormUnlock.form_id == form_id).all()
    result = []
    for u in unlocks:
        participant = db.query(User).filter(User.id == u.user_id).first()
        if participant:
            result.append(
                {
                    "user_id": participant.id,
                    "email": participant.email,
                    "form_role": u.form_role,
                    "joined_at": u.joined_at.isoformat() if u.joined_at else None,
                }
            )
    return result


@router.delete(
    "/forms/{form_id}/participants/{target_user_id}",
    tags=["Forms"],
    summary="Remove an expert from a form",
)
@limiter.limit(CRUD_LIMIT)
def remove_participant(
    form_id: int,
    target_user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    unlock = (
        db.query(UserFormUnlock)
        .filter(
            UserFormUnlock.form_id == form_id,
            UserFormUnlock.user_id == target_user_id,
        )
        .first()
    )
    if not unlock:
        raise HTTPException(status_code=404, detail="Participant not found")

    db.delete(unlock)
    db.commit()
    audit_log(
        db,
        user=user,
        action="remove_participant",
        resource_type="form",
        resource_id=form_id,
        detail={"removed_user_id": target_user_id},
        request=request,
    )
    return {"removed": target_user_id, "form_id": form_id}


# ── Magic-link join (GET /join/{code}) ──


@router.get(
    "/join/{code}",
    tags=["Forms"],
    summary="Magic-link join — auto-join or return join info",
)
@limiter.limit(CRUD_LIMIT)
def magic_join(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """If authenticated, auto-join the form. Returns form_id for frontend redirect."""
    raw_code = code.strip()
    normalized = normalize_join_code(raw_code)

    # Try invite_codes table first
    invite = db.query(InviteCode).filter(InviteCode.code == raw_code).first()
    if not invite and normalized:
        all_invites = db.query(InviteCode).filter(InviteCode.is_active).all()
        for ic in all_invites:
            if normalize_join_code(ic.code) == normalized:
                invite = ic
                break

    if invite:
        if not invite.is_active:
            raise HTTPException(
                status_code=400, detail="This invite code has been deactivated."
            )
        if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite code has expired.")
        if invite.max_uses is not None and invite.use_count >= invite.max_uses:
            raise HTTPException(
                status_code=400, detail="This invite code has reached its usage limit."
            )

        form = db.query(FormModel).filter(FormModel.id == invite.form_id).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found.")

        existing = (
            db.query(UserFormUnlock)
            .filter(
                UserFormUnlock.user_id == user.id,
                UserFormUnlock.form_id == form.id,
            )
            .first()
        )
        if not existing:
            unlock = UserFormUnlock(
                user_id=user.id, form_id=form.id, form_role=invite.form_role
            )
            db.add(unlock)
            invite.use_count += 1
            db.commit()

        return {"message": "Joined.", "form_id": form.id, "title": form.title}

    # Fall back to legacy
    form = (
        db.query(FormModel)
        .filter(FormModel.join_code == raw_code, FormModel.allow_join)
        .first()
    )
    if not form and normalized:
        all_forms = db.query(FormModel).filter(FormModel.allow_join).all()
        for f in all_forms:
            if normalize_join_code(f.join_code) == normalized:
                form = f
                break

    if not form:
        raise HTTPException(status_code=404, detail="Invalid join code.")

    existing = (
        db.query(UserFormUnlock)
        .filter(
            UserFormUnlock.user_id == user.id,
            UserFormUnlock.form_id == form.id,
        )
        .first()
    )
    if not existing:
        unlock = UserFormUnlock(user_id=user.id, form_id=form.id)
        db.add(unlock)
        db.commit()

    return {"message": "Joined.", "form_id": form.id, "title": form.title}
