from __future__ import annotations

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Form, HTTPException, Request, Query, Response as FastAPIResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from email.message import EmailMessage
from openai import OpenAI
import aiosmtplib
import asyncio
import json
import os
import uuid

from .models import (
    User, Response, ArchivedResponse, Feedback, FormModel, RoundModel,
    UserFormUnlock, FollowUp, FollowUpResponse, SynthesisComment,
    SynthesisVersion, Draft, AuditLog, Setting,
)
from .audit import audit_log
from .auth import (
    get_db,
    get_password_hash,
    verify_password,
    create_access_token,
    generate_csrf_token,
    get_current_user,
    get_current_admin_user,
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    COOKIE_MAX_AGE,
    COOKIE_SECURE,
    COOKIE_SAMESITE,
)
from .synthesis import CommitteeSynthesiser, FlowMode, get_synthesiser
from core.db import SessionLocal
from core.ws import ws_manager

load_dotenv()

# ---------------------------------------------------------
# ASYNC JOB STORE — for long-running synthesis tasks
# Avoids Cloudflare's 100-second origin timeout (524 error)
# ---------------------------------------------------------
_synthesis_jobs: dict[str, dict] = {}
# job schema: {"status": "pending"|"complete"|"failed", "result": {...}|None, "error": str|None}


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
            idx_note = f" (item #{c.section_index + 1})" if c.section_index is not None else ""
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
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
    return _openai_client

# Keep 'client' for backwards compat but make it a property
client = None  # Will be set lazily

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ---------------------------------------------------------
# USER AUTH
# ---------------------------------------------------------

@router.post("/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(password)
    user = User(email=email, hashed_password=hashed)
    db.add(user)
    db.commit()
    return {"message": "Registered successfully"}


@router.post("/login")
def login(
    response: FastAPIResponse,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": str(user.id), "is_admin": user.is_admin}
    )
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
        "is_admin": user.is_admin,
        "email": user.email,
        "csrf_token": csrf_token,
    }


@router.post("/logout")
def logout(response: FastAPIResponse):
    """Clear auth cookies."""
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out"}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"email": user.email, "is_admin": user.is_admin}


# ---------------------------------------------------------
# SUBMIT RESPONSE (Delphi style)
# ---------------------------------------------------------

@router.post("/submit")
def submit_response(
    form_id: int = Form(...),
    answers: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    # Check if user has already submitted for this round, and delete old response if so
    existing_response = db.query(Response).filter(
        Response.user_id == user.id,
        Response.round_id == active_round.id
    ).first()
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


@router.get("/has_submitted")
def has_submitted(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
        .first()
    )
    if not active_round:
        return {"submitted": False}

    r = db.query(Response).filter(
        Response.user_id == user.id,
        Response.round_id == active_round.id
    ).first()
    return {"submitted": bool(r)}


@router.get("/form/{form_id}/my_response")
def get_my_response(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
        .first()
    )
    if not active_round:
        raise HTTPException(status_code=404, detail="No active round")

    response = db.query(Response).filter(
        Response.user_id == user.id,
        Response.round_id == active_round.id
    ).first()

    if not response:
        raise HTTPException(status_code=404, detail="No response found")

    return {"answers": response.answers}


# ---------------------------------------------------------
# SERVER-SIDE DRAFTS (auto-save)
# ---------------------------------------------------------

class DraftPayload(BaseModel):
    answers: dict


@router.put("/forms/{form_id}/draft")
def save_draft(
    form_id: int,
    payload: DraftPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert a draft for the active round. Called by the frontend auto-save."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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
        from datetime import datetime as dt
        draft.updated_at = dt.utcnow()
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


@router.get("/forms/{form_id}/draft")
def get_draft(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Load a saved draft for the active round (if any)."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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


@router.delete("/forms/{form_id}/draft")
def delete_draft(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a draft after successful submission."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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


@router.post("/submit_feedback")
def submit_feedback(
    feedback: FeedbackPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
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
        user_id=user.id
    )
    db.add(entry)
    user.has_submitted_feedback = True
    db.commit()
    return {"message": "Feedback saved"}


@router.get("/all_feedback")
def all_feedback(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
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
            "timestamp": x.created_at.isoformat()
        }
        for x in f
    ]


# ---------------------------------------------------------
# SUMMARY (SYNTHESIS)
# ---------------------------------------------------------

class SummaryPayload(BaseModel):
    summary: str


@router.post("/forms/{form_id}/push_summary")
async def push_summary(
    form_id: int,
    payload: SummaryPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    summary = payload.summary.strip()

    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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


@router.post("/forms/{form_id}/generate_summary")
def generate_summary(
    form_id: int,
    payload: GenerateSummaryPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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
        answers = r.answers if isinstance(r.answers, dict) else json.loads(r.answers) if r.answers else {}
        for q_idx, q_text in enumerate(questions, 1):
            answer = answers.get(f'q{q_idx}', 'No answer')
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
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
        completion = openai_client.chat.completions.create(
            model=payload.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at synthesizing and summarizing responses.",
                },
                {"role": "user", "content": prompt_content},
            ],
        )
        summary = completion.choices[0].message.content
        audit_log(db, user=user, action="generate_summary", resource_type="form",
                  resource_id=form_id, detail={"model": payload.model, "round": active_round.round_number}, request=request)
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


@router.post("/forms/{form_id}/synthesise_committee")
async def synthesise_committee(
    form_id: int,
    payload: CommitteeSynthesisPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Run committee-based synthesis on the active round's responses.

    Uses N independent LLM analysts + a meta-synthesiser to produce
    structured synthesis with agreements, disagreements, nuances,
    and optionally follow-up probe questions.
    """
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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
                await conn.send_json({
                    "type": "synthesis_progress",
                    "form_id": form_id,
                    "stage": stage,
                    "step": step,
                    "total_steps": total,
                })
            except Exception:
                ws_manager.disconnect(conn)

    # Fetch expert discussion comments for additional context
    comments = _fetch_comments_for_round(db, active_round.id)
    comments_context = _format_comments_as_context(comments)

    # Run committee synthesis
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    synthesiser = get_synthesiser(
        api_key=api_key,
        n_analysts=payload.n_analysts,
    )

    result = await synthesiser.run(
        questions=questions,
        responses=response_dicts,
        model=payload.model,
        mode=flow_mode,
        progress_callback=progress_callback,
        comments_context=comments_context,
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

    active_round.synthesis = "".join(text_parts) if text_parts else "Synthesis complete."

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
            await conn.send_json({
                "type": "synthesis_complete",
                "form_id": form_id,
                "round_id": active_round.id,
            })
        except Exception:
            ws_manager.disconnect(conn)

    return {
        "synthesis": result_dict,
        "convergence_score": active_round.convergence_score,
        "text_synthesis": active_round.synthesis,
    }


# ---------------------------------------------------------
# SYNTHESIS VERSIONING
# ---------------------------------------------------------

@router.get("/forms/{form_id}/rounds/{round_id}/synthesis_versions")
def list_synthesis_versions(
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


class GenerateSynthesisVersionPayload(BaseModel):
    model: str = "anthropic/claude-sonnet-4"
    strategy: str = "simple"  # "simple" | "committee" | "ttd"
    n_analysts: int = 3
    mode: str = "human_only"


# ---------------------------------------------------------
# BACKGROUND SYNTHESIS RUNNER
# Runs after the POST returns job_id, saves result to DB
# ---------------------------------------------------------
async def _run_synthesis_job(job_id: str, task_data: dict) -> None:
    """Run synthesis in background and store result in _synthesis_jobs."""
    from core.db import SessionLocal as _SL  # local import avoids circular
    try:
        form_id = task_data["form_id"]
        round_id = task_data["round_id"]
        questions = task_data["questions"]
        response_dicts = task_data["response_dicts"]
        strategy = task_data["strategy"]
        model = task_data["model"]
        n_analysts = task_data["n_analysts"]
        mode_str = task_data["mode"]
        next_version = task_data["next_version"]
        api_key = task_data["api_key"]
        synthesis_mode_env = task_data["synthesis_mode_env"]
        round_comments_context = task_data["round_comments_context"]
        round_number = task_data["round_number"]
        n_responses = task_data["n_responses"]

        synthesis_text: str | None = None
        synthesis_json_data: dict | None = None

        if synthesis_mode_env == "mock" or not api_key:
            synthesis_text = (
                f"## Synthesis v{next_version} (Mock Mode)\n\n"
                f"**Round {round_number}** — {n_responses} responses analysed.\n\n"
                f"*Strategy: {strategy} | Model: {model}*\n\n"
                "This is a mock synthesis. Enable OPENROUTER_API_KEY for real LLM synthesis."
            )

        elif strategy in ("committee", "ttd"):
            try:
                flow_mode = FlowMode(mode_str)
            except ValueError:
                flow_mode = FlowMode.HUMAN_ONLY

            synthesiser = get_synthesiser(
                api_key=api_key,
                strategy=strategy if strategy == "ttd" else None,
                model=model,
                n_analysts=n_analysts,
            )
            result = await synthesiser.run(
                questions=questions,
                responses=response_dicts,
                model=model,
                mode=flow_mode,
                comments_context=round_comments_context,
            )
            synthesis_json_data = result.to_dict()
            text_parts = []
            # Narrative FIRST
            _narrative = synthesis_json_data.get("narrative", "")
            if _narrative:
                text_parts.append(f"<h3>Narrative Summary</h3><p>{_narrative}</p>")
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
                        text_parts.append(f"<li>{pos.get('position', '')} — {pos.get('evidence', '')}</li>")
                    text_parts.append("</ul>")
            if result.nuances:
                text_parts.append("<h3>Nuances</h3>")
                for n in result.nuances:
                    text_parts.append(f"<p><strong>{n.claim}</strong> — {n.context}</p>")
            synthesis_text = "".join(text_parts) if text_parts else "Synthesis complete."

        else:
            # Simple single-prompt synthesis
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
            )
            prompt_content = "Synthesize the following expert responses.\n\nQuestions:\n"
            for i, q in enumerate(questions, 1):
                prompt_content += f"{i}. {q}\n"
            prompt_content += "\n--- Responses ---\n"
            for i, r in enumerate(response_dicts, 1):
                prompt_content += f"\nResponse {i}:\n"
                answers = r.get("answers", {})
                if isinstance(answers, str):
                    try:
                        answers = json.loads(answers)
                    except Exception:
                        answers = {}
                for q_idx, q_text in enumerate(questions, 1):
                    answer = answers.get(f'q{q_idx}', 'No answer')
                    prompt_content += f"  - Q: {q_text}\n    A: {answer}\n"
            prompt_content += "\n--- End of Responses ---\n"
            if round_comments_context:
                prompt_content += round_comments_context + "\n"
            prompt_content += """
Return your synthesis as a JSON object with the following structure (and ONLY the JSON, no markdown fences, no extra text):
{
  "narrative": "A 2-3 paragraph narrative summary",
  "agreements": [{"claim": "...", "supporting_experts": [1], "confidence": 0.85, "evidence_summary": "...", "evidence_excerpts": [{"expert_id": 1, "expert_label": "Response 1", "quote": "..."}]}],
  "disagreements": [{"topic": "...", "positions": [{"position": "...", "experts": [1], "evidence": "..."}], "severity": "moderate"}],
  "nuances": [{"claim": "...", "context": "..."}],
  "confidence_map": {"overall": 0.75},
  "follow_up_probes": ["..."],
  "meta_synthesis_reasoning": "..."
}"""
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert synthesis engine. Return only valid JSON."},
                    {"role": "user", "content": prompt_content},
                ],
                temperature=0.3,
            )
            raw_output = completion.choices[0].message.content or ""
            try:
                if "```" in raw_output:
                    raw_output = raw_output.split("```")[1]
                    if raw_output.startswith("json"):
                        raw_output = raw_output[4:]
                parsed = json.loads(raw_output.strip())
                synthesis_json_data = {
                    "narrative": parsed.get("narrative", ""),
                    "agreements": parsed.get("agreements", []),
                    "disagreements": parsed.get("disagreements", []),
                    "nuances": parsed.get("nuances", []),
                    "confidence_map": parsed.get("confidence_map", {"overall": 0.5}),
                    "follow_up_probes": parsed.get("follow_up_probes", []),
                    "meta_synthesis_reasoning": parsed.get("meta_synthesis_reasoning", ""),
                }
                text_parts = []
                if synthesis_json_data.get("narrative"):
                    text_parts.append(f"<p>{synthesis_json_data['narrative']}</p>")
                if synthesis_json_data["agreements"]:
                    text_parts.append("<h3>Agreements</h3>")
                    for a in synthesis_json_data["agreements"]:
                        conf = a.get("confidence", 0)
                        text_parts.append(f"<p><strong>{a.get('claim', '')}</strong> (confidence: {conf:.0%}) — {a.get('evidence_summary', '')}</p>")
                if synthesis_json_data["disagreements"]:
                    text_parts.append("<h3>Disagreements</h3>")
                    for d in synthesis_json_data["disagreements"]:
                        text_parts.append(f"<p><strong>{d.get('topic', '')}</strong> ({d.get('severity', 'moderate')})</p><ul>")
                        for pos in d.get("positions", []):
                            text_parts.append(f"<li>{pos.get('position', '')} — {pos.get('evidence', '')}</li>")
                        text_parts.append("</ul>")
                if synthesis_json_data["nuances"]:
                    text_parts.append("<h3>Nuances</h3>")
                    for n in synthesis_json_data["nuances"]:
                        text_parts.append(f"<p><strong>{n.get('claim', '')}</strong> — {n.get('context', '')}</p>")
                synthesis_text = "".join(text_parts) if text_parts else raw_output
            except (json.JSONDecodeError, KeyError, TypeError):
                synthesis_text = raw_output
                synthesis_json_data = None

        # Save to DB using a fresh session
        db = _SL()
        try:
            db.query(SynthesisVersion).filter(SynthesisVersion.round_id == round_id).update({"is_active": False})
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
            round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
            if round_obj:
                round_obj.synthesis = synthesis_text
                round_obj.synthesis_json = synthesis_json_data
            db.commit()
            db.refresh(new_version)

            result_payload = {
                "id": new_version.id,
                "round_id": new_version.round_id,
                "version": new_version.version,
                "synthesis": new_version.synthesis,
                "synthesis_json": new_version.synthesis_json,
                "model_used": new_version.model_used,
                "strategy": new_version.strategy,
                "created_at": new_version.created_at.isoformat() if new_version.created_at else None,
                "is_active": new_version.is_active,
            }
            _synthesis_jobs[job_id] = {"status": "complete", "result": result_payload, "error": None}

            # Broadcast via WebSocket
            if synthesis_text:
                await ws_manager.broadcast_summary(synthesis_text)
            for conn in ws_manager.active_connections.copy():
                try:
                    await conn.send_json({
                        "type": "synthesis_complete",
                        "form_id": form_id,
                        "round_id": round_id,
                        "version_id": new_version.id,
                        "synthesis_json": synthesis_json_data,
                    })
                except Exception:
                    ws_manager.disconnect(conn)
        finally:
            db.close()

    except Exception as exc:
        _synthesis_jobs[job_id] = {"status": "failed", "result": None, "error": str(exc)}


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    user: User = Depends(get_current_admin_user),
):
    """Poll the status of a background synthesis job.

    Returns {"status": "pending"|"complete"|"failed", "result": {...}|null, "error": str|null}.
    The result shape is identical to a synchronous generate_synthesis response.
    """
    job = _synthesis_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/forms/{form_id}/rounds/{round_id}/generate_synthesis")
async def generate_synthesis_for_round(
    form_id: int,
    round_id: int,
    payload: GenerateSynthesisVersionPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Generate a NEW synthesis version for ANY round (not just active).

    Immediately returns a job_id. The synthesis runs in the background to avoid
    Cloudflare's 100-second origin timeout (HTTP 524). Poll GET /jobs/{job_id}
    until status == 'complete'.
    """
    # ── Pre-flight validation (fast DB reads, no AI) ──
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
        raise HTTPException(status_code=404, detail="No responses to synthesise for this round")

    max_version = (
        db.query(SynthesisVersion.version)
        .filter(SynthesisVersion.round_id == round_id)
        .order_by(SynthesisVersion.version.desc())
        .first()
    )
    next_version = (max_version[0] + 1) if max_version else 1

    strategy = payload.strategy.lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    synthesis_mode_env = os.getenv("SYNTHESIS_MODE", "").lower()

    # Package all data for the background runner (avoids 524 Cloudflare timeout)
    round_comments = _fetch_comments_for_round(db, round_id)
    round_comments_context = _format_comments_as_context(round_comments)

    response_dicts = [
        {"answers": r.answers, "email": r.user.email if r.user else f"Expert {i}"}
        for i, r in enumerate(responses)
    ]

    job_id = str(uuid.uuid4())
    _synthesis_jobs[job_id] = {"status": "pending", "result": None, "error": None}

    task_data = {
        "form_id": form_id,
        "round_id": round_id,
        "questions": questions,
        "response_dicts": response_dicts,
        "strategy": strategy,
        "model": payload.model,
        "n_analysts": payload.n_analysts,
        "mode": payload.mode,
        "next_version": next_version,
        "api_key": api_key,
        "synthesis_mode_env": synthesis_mode_env,
        "round_comments_context": round_comments_context,
        "round_number": round_obj.round_number,
        "n_responses": len(responses),
    }

    asyncio.create_task(_run_synthesis_job(job_id, task_data))
    return {"job_id": job_id, "status": "pending"}


@router.put("/synthesis_versions/{version_id}/activate")
def activate_synthesis_version(
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Set a synthesis version as the active/published one.

    Deactivates all other versions for the same round, then activates
    the specified version. Also copies the synthesis text and JSON
    back onto the Round model for backwards compatibility.
    """
    version = db.query(SynthesisVersion).filter(SynthesisVersion.id == version_id).first()
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


@router.get("/synthesis_versions/{version_id}")
def get_synthesis_version(
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a specific synthesis version by ID."""
    version = db.query(SynthesisVersion).filter(SynthesisVersion.id == version_id).first()
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
# FOLLOW-UPS
# ---------------------------------------------------------

class FollowUpCreatePayload(BaseModel):
    question: str


@router.get("/forms/{form_id}/follow_ups")
def get_follow_ups(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all follow-up questions for the active round of a form."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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

        result.append({
            "id": fu.id,
            "round_id": fu.round_id,
            "author_type": fu.author_type,
            "author_id": fu.author_id,
            "author_email": author_email,
            "question": fu.question,
            "created_at": fu.created_at.isoformat(),
            "responses": responses,
        })

    return result


@router.post("/forms/{form_id}/follow_ups")
def create_follow_up(
    form_id: int,
    payload: FollowUpCreatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new follow-up question on the active round."""
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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


@router.post("/follow_ups/{follow_up_id}/respond")
def respond_to_follow_up(
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


@router.post("/create_form")
def create_form(
    payload: FormCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    f = FormModel(
        title=payload.title,
        questions=payload.questions,
        allow_join=payload.allow_join,
        join_code=payload.join_code
    )
    db.add(f)
    db.commit()
    db.refresh(f)

    first_round = RoundModel(
        form_id=f.id,
        round_number=1,
        is_active=True,
        questions=payload.questions
    )
    db.add(first_round)

    audit_log(db, user=user, action="create_form", resource_type="form",
              resource_id=f.id, detail={"title": f.title}, request=request)
    db.commit()

    return {
        "id": f.id,
        "title": f.title,
        "questions": f.questions,
        "allow_join": f.allow_join,
        "join_code": f.join_code,
        "participant_count": 0,
        "current_round": 1
    }


@router.put("/forms/{form_id}")
def update_form(
    form_id: int,
    payload: FormUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

    old_title = f.title
    f.title = payload.title
    f.questions = payload.questions
    audit_log(db, user=user, action="update_form", resource_type="form",
              resource_id=form_id, detail={"old_title": old_title, "new_title": payload.title}, request=request)
    db.commit()
    return {"status": "updated"}


@router.delete("/forms/{form_id}")
def delete_form(
    form_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    # Now delete the form itself
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

    audit_log(db, user=user, action="delete_form", resource_type="form",
              resource_id=form_id, detail={"title": f.title}, request=request)
    db.delete(f)
    db.commit()
    return {"status": "deleted"}


@router.get("/forms")
def get_forms(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    items = db.query(FormModel).order_by(FormModel.id).all()

    result = []
    for f in items:
        participant_count = db.query(Response.user_id).filter(Response.form_id == f.id).distinct().count()
        
        active_round = db.query(RoundModel).filter(
            RoundModel.form_id == f.id,
            RoundModel.is_active == True
        ).first()
        
        result.append({
            "id": f.id,
            "title": f.title,
            "questions": f.questions,
            "allow_join": f.allow_join,
            "join_code": f.join_code,
            "participant_count": participant_count,
            "current_round": active_round.round_number if active_round else 0
        })

    return result


class UnlockFormPayload(BaseModel):
    join_code: str


@router.post("/forms/unlock")
def unlock_form(
    payload: UnlockFormPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    form = db.query(FormModel).filter(
        FormModel.join_code == payload.join_code,
        FormModel.allow_join == True
    ).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or closed.")

    # Check if user has already unlocked this form
    existing_unlock = db.query(UserFormUnlock).filter(
        UserFormUnlock.user_id == user.id,
        UserFormUnlock.form_id == form.id
    ).first()

    if existing_unlock:
        return {"message": "Form already unlocked."}

    # Create a new unlock record
    new_unlock = UserFormUnlock(user_id=user.id, form_id=form.id)
    db.add(new_unlock)
    db.commit()
        
    return {"message": "Form unlocked successfully."}


@router.get("/my_forms")
def get_my_forms(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    unlocked_forms = db.query(FormModel).join(UserFormUnlock).filter(UserFormUnlock.user_id == user.id).order_by(FormModel.id).all()
    return unlocked_forms


@router.get("/forms/{form_id}")
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
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
# EXPERT LABELS
# ---------------------------------------------------------

class ExpertLabelsPayload(BaseModel):
    preset: str  # "default" | "temporal" | "custom" | "methodological" | "stakeholder"
    custom_labels: dict | None = None


@router.get("/forms/{form_id}/expert_labels")
def get_expert_labels(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")
    return f.expert_labels or {"preset": "default", "custom_labels": {}}


@router.put("/forms/{form_id}/expert_labels")
def put_expert_labels(
    form_id: int,
    payload: ExpertLabelsPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
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


@router.get("/forms/{form_id}/active_round")
def get_active_round(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    active = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
        .first()
    )
    if not active:
        raise HTTPException(status_code=404, detail="No active round")

    prev = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form_id,
            RoundModel.round_number == active.round_number - 1
        )
        .first()
    )

    previous_round_synthesis = prev.synthesis if prev else ""

    return {
        "id": active.id,
        "round_number": active.round_number,
        "questions": active.questions or [],
        "previous_round_synthesis": previous_round_synthesis
    }



@router.post("/forms/{form_id}/next_round")
def open_next_round(
    form_id: int,
    payload: RoundConfig | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    current = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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
        synthesis=previous_synthesis
    )
    db.add(new)
    db.commit()
    db.refresh(new)

    return {
        "id": new.id,
        "round_number": new.round_number,
        "questions": new.questions
    }



@router.get("/forms/{form_id}/rounds")
def get_rounds(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rounds = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )

    result = []
    for r in rounds:
        response_count = (
            db.query(Response)
            .filter(Response.round_id == r.id)
            .count()
        )
        result.append({
            "id": r.id,
            "round_number": r.round_number,
            "synthesis": r.synthesis,
            "synthesis_json": r.synthesis_json,
            "is_active": r.is_active,
            "questions": r.questions or [],
            "convergence_score": r.convergence_score,
            "response_count": response_count,
        })

    return result


# ---------------------------------------------------------
# RESPONSES
# ---------------------------------------------------------

@router.get("/form/{form_id}/responses")
def form_responses(
    form_id: int,
    all_rounds: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    q = db.query(Response).filter(Response.form_id == form_id)

    if not all_rounds:
        active = (
            db.query(RoundModel)
            .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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


@router.put("/responses/{response_id}")
def edit_response(
    response_id: int,
    payload: ResponseEditPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
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

    from datetime import datetime as _dt

    response.answers = payload.answers
    response.version = response.version + 1
    response.updated_at = _dt.utcnow()
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


@router.put("/responses/{response_id}/force")
def force_edit_response(
    response_id: int,
    payload: ResponseEditPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Force-edit a response, overwriting any concurrent changes (admin only)."""
    response = db.query(Response).filter(Response.id == response_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    from datetime import datetime as _dt

    response.answers = payload.answers
    response.version = response.version + 1
    response.updated_at = _dt.utcnow()
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


@router.get("/form/{form_id}/archived_responses")
def form_archived(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
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
            "round_id": x.round_id
        }
        for x in items
    ]


@router.get("/forms/{form_id}/rounds_with_responses")
def rounds_with_responses(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
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

        output.append({
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
            ]
        })

    return output


# ---------------------------------------------------------
# GENERIC SYNTHESIS
# ---------------------------------------------------------

@router.post("/form/{form_id}/synthesise")
def synthesise_simple(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    active = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
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
        answers = r.answers if isinstance(r.answers, dict) else json.loads(r.answers) if r.answers else {}
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


@router.post("/send_email")
async def send_email(
    to: str = Form(...),
    subject: str = Form(...),
    html: str = Form(...),
    user: User = Depends(get_current_admin_user)
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
            password=os.getenv("SMTP_PASS")
        )
        return {"status": "sent"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


# ── Helper: send a styled template email ────────────────────────
async def _send_templated_email(to: str, subject: str, html: str):
    """Internal helper to send an email via SMTP."""
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", "info@colabintel.org")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html, subtype="html")
    await aiosmtplib.send(
        msg,
        hostname=os.getenv("SMTP_HOST"),
        port=int(os.getenv("SMTP_PORT", "587")),
        start_tls=True,
        username=os.getenv("SMTP_USER"),
        password=os.getenv("SMTP_PASS"),
    )


class InvitationEmailPayload(BaseModel):
    to: EmailStr
    consultation_title: str
    admin_name: str
    invitation_url: str
    message: str = ""


@router.post("/email/invitation")
async def send_invitation_email(
    payload: InvitationEmailPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
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
        audit_log(db, user=user, action="send_invitation", resource_type="email",
                  detail={"to": payload.to, "consultation": payload.consultation_title}, request=request)
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


@router.post("/email/new-round")
async def send_new_round_email(
    payload: NewRoundEmailPayload,
    user: User = Depends(get_current_admin_user),
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
    return {"status": "sent", "template": "new_round", "sent": len(payload.to) - len(errors), "errors": errors}


class SynthesisReadyEmailPayload(BaseModel):
    to: list[EmailStr]
    consultation_title: str
    round_number: int
    summary_url: str
    consensus_score: float | None = None


@router.post("/email/synthesis-ready")
async def send_synthesis_ready_email(
    payload: SynthesisReadyEmailPayload,
    user: User = Depends(get_current_admin_user),
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
    return {"status": "sent", "template": "synthesis_ready", "sent": len(payload.to) - len(errors), "errors": errors}


class ReminderEmailPayload(BaseModel):
    to: list[EmailStr]
    consultation_title: str
    round_number: int
    deadline: str | None = None
    round_url: str


@router.post("/email/reminder")
async def send_reminder_email(
    payload: ReminderEmailPayload,
    user: User = Depends(get_current_admin_user),
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
    return {"status": "sent", "template": "round_reminder", "sent": len(payload.to) - len(errors), "errors": errors}


@router.get("/email/preview/{template_name}")
async def preview_email_template(
    template_name: str,
    user: User = Depends(get_current_admin_user),
):
    """Preview a template with sample data (returns HTML string)."""
    from .email_templates import TEMPLATES
    if template_name not in TEMPLATES:
        raise HTTPException(status_code=404, detail=f"Unknown template: {template_name}. Available: {list(TEMPLATES.keys())}")

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
            questions=["How should we handle AI disagreement with clinicians?", "What oversight mechanisms are essential?"],
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

@router.get("/audit-log")
def get_audit_log(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
    user_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
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


@router.get("/audit-log/actions")
def get_audit_log_actions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
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


@router.get("/forms/{form_id}/rounds/{round_id}/comments")
def get_comments(
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


@router.post("/forms/{form_id}/rounds/{round_id}/comments")
async def create_comment(
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

    valid_section_types = {"agreement", "disagreement", "nuance", "emergence", "general"}
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
            await conn.send_json({
                "type": "comment_added",
                "form_id": form_id,
                "round_id": round_id,
                "comment": result,
            })
        except Exception:
            ws_manager.disconnect(conn)

    return result


@router.put("/comments/{comment_id}")
def update_comment(
    comment_id: int,
    payload: CommentUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Edit own comment."""
    comment = db.query(SynthesisComment).filter(SynthesisComment.id == comment_id).first()
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


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete own comment (or admin can delete any)."""
    comment = db.query(SynthesisComment).filter(SynthesisComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")

    db.delete(comment)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------
# AI DEVIL'S ADVOCATE
# ---------------------------------------------------------


@router.post("/forms/{form_id}/rounds/{round_id}/devil_advocate")
def devil_advocate(
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
        answers = r.answers if isinstance(r.answers, dict) else json.loads(r.answers) if r.answers else {}
        for q_idx, q in enumerate(questions, 1):
            q_text = q if isinstance(q, str) else q.get("label", q.get("text", str(q)))
            answer = answers.get(f'q{q_idx}', 'No answer')
            responses_text += f"  Q: {q_text}\n  A: {answer}\n"

    # Get synthesis text
    synthesis_text = ""
    if round_obj.synthesis_json:
        sj = round_obj.synthesis_json
        parts = []
        for a in sj.get("agreements", []):
            parts.append(f"Agreement: {a.get('claim', '')} — {a.get('evidence_summary', '')}")
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
        raise HTTPException(status_code=400, detail="No synthesis available to critique. Generate a synthesis first.")

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

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

        completion = openai_client.chat.completions.create(
            model="anthropic/claude-sonnet-4",
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
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = json.loads(cleaned)

        # Validate structure
        counterarguments = parsed.get("counterarguments", [])
        validated = []
        for ca in counterarguments:
            strength = ca.get("strength", "moderate")
            if strength not in ("strong", "moderate", "weak"):
                strength = "moderate"
            validated.append({
                "argument": ca.get("argument", ""),
                "rationale": ca.get("rationale", ""),
                "strength": strength,
            })

        return {"counterarguments": validated}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse devil's advocate response")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate counterarguments: {e}")


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


@router.post("/forms/{form_id}/rounds/{round_id}/translate")
def translate_synthesis(
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

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

        completion = openai_client.chat.completions.create(
            model="anthropic/claude-sonnet-4",
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
        raise HTTPException(status_code=500, detail=f"Failed to translate synthesis: {e}")


# ---------------------------------------------------------
# EXPERT VOICE MIRRORING
# ---------------------------------------------------------


class VoiceMirrorPayload(BaseModel):
    """Payload for clarifying expert responses."""
    responses: list[dict]  # [{"expert": "Expert 1", "question": "...", "answer": "..."}]


@router.post("/forms/{form_id}/rounds/{round_id}/voice_mirror")
def voice_mirror(
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
            clarified.append({
                "expert": item.get("expert", "Unknown"),
                "question": item.get("question", ""),
                "original": item.get("answer", ""),
                "clarified": f"[Mock clarification] {item.get('answer', '')}",
            })
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

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

        completion = openai_client.chat.completions.create(
            model="anthropic/claude-sonnet-4",
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
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = json.loads(cleaned)

        return {"clarified_responses": parsed.get("clarified_responses", [])}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse voice mirroring response")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clarify responses: {e}")


# ---------------------------------------------------------
# ATLAS: UX TESTING DATA SEEDER
# ---------------------------------------------------------

@router.post("/atlas/seed")
def seed_atlas_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    """Seed the database with test forms for UX testing."""
    import uuid
    
    test_forms = [
        {
            "title": "🧪 Round 1: Fresh Form",
            "questions": [
                {"id": "q1", "type": "text", "label": "What is your main concern?", "required": True},
                {"id": "q2", "type": "textarea", "label": "Describe your perspective in detail", "required": True},
                {"id": "q3", "type": "select", "label": "Priority level", "options": ["Low", "Medium", "High", "Critical"], "required": True},
            ]
        },
        {
            "title": "📊 Round 2: With Responses",
            "questions": [
                {"id": "q1", "type": "text", "label": "What solution do you propose?", "required": True},
                {"id": "q2", "type": "rating", "label": "Rate your confidence (1-5)", "required": True},
                {"id": "q3", "type": "textarea", "label": "Additional comments", "required": False},
            ],
            "seed_responses": [
                {"q1": "Implement automated testing", "q2": "4", "q3": "This would significantly reduce bugs"},
                {"q1": "Hire more developers", "q2": "3", "q3": "We need more hands on deck"},
                {"q1": "Improve documentation", "q2": "5", "q3": "Clear docs prevent misunderstandings"},
            ]
        },
        {
            "title": "🎯 Multi-Round Delphi",
            "questions": [
                {"id": "q1", "type": "text", "label": "Final recommendation", "required": True},
                {"id": "q2", "type": "textarea", "label": "Justification", "required": True},
            ],
            "rounds": 3,
            "seed_responses": [
                {"q1": "Consensus reached on Option A", "q2": "After 3 rounds, experts converged on this approach"},
            ]
        },
    ]
    
    created_forms = []
    
    for form_data in test_forms:
        # Check if form with this title already exists
        existing = db.query(FormModel).filter(FormModel.title == form_data["title"]).first()
        if existing:
            created_forms.append({"id": existing.id, "title": existing.title, "status": "exists"})
            continue
        
        # Create form with unique join_code
        form = FormModel(
            title=form_data["title"],
            questions=form_data["questions"],
            join_code=str(uuid.uuid4())[:8]
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
                    test_email = f"test_user_{i+1}@atlas.test"
                    test_user = db.query(User).filter(User.email == test_email).first()
                    if not test_user:
                        test_user = User(
                            email=test_email,
                            hashed_password=get_password_hash("test123"),
                            is_admin=False
                        )
                        db.add(test_user)
                        db.flush()
                    
                    response = Response(
                        user_id=test_user.id,
                        form_id=form.id,
                        round_id=round_obj.id,
                        answers=json.dumps(resp_data)
                    )
                    db.add(response)
        
        created_forms.append({"id": form.id, "title": form.title, "status": "created"})
    
    db.commit()
    
    return {
        "message": "Atlas data seeded",
        "forms": created_forms
    }


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


def _build_ai_suggest_user_prompt(title: str, description: str, questions: list[str], mode: str, **kwargs) -> str:
    """Build the user prompt for the AI suggest endpoint based on mode."""
    context = f'Consultation title: "{title}"'
    if description:
        context += f'\nDescription: "{description}"'
    if questions and any(q.strip() for q in questions):
        non_empty = [q for q in questions if q.strip()]
        context += "\nExisting questions:\n" + "\n".join(f"  {i+1}. {q}" for i, q in enumerate(non_empty))

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
}

@router.get("/admin/settings")
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all app settings (admin only)."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    rows = db.query(Setting).all()
    result = dict(DEFAULT_SETTINGS)  # start with defaults
    for row in rows:
        result[row.key] = row.value
    return result


@router.patch("/admin/settings")
def update_settings(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Update one or more settings (admin only)."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
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

@router.post("/ai/suggest")
def ai_suggest(
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
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'suggest', 'critique', or 'improve'.")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")

    if mode in ("critique", "improve"):
        non_empty = [q for q in questions if isinstance(q, str) and q.strip()]
        if not non_empty:
            raise HTTPException(status_code=400, detail=f"At least one question is required for '{mode}' mode.")

    # Check for mock mode or missing API key
    synthesis_mode = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode == "mock" or not api_key:
        # Return mock data for demo/testing
        if mode == "suggest":
            return {
                "suggestions": [
                    f"What are the most significant challenges facing {title.lower() if title else 'this domain'} in the next 5 years?",
                    f"How should organisations adapt their strategies to address emerging trends in this area?",
                    f"What key factors will determine success or failure in addressing these challenges?",
                    f"Where do you see the greatest potential for innovation or disruption?",
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
    count_setting = db.query(Setting).filter(Setting.key == "ai_suggestions_count").first()
    if count_setting:
        try:
            suggestion_count = max(3, min(10, int(count_setting.value)))
        except (ValueError, TypeError):
            pass
    user_prompt = _build_ai_suggest_user_prompt(title, description, questions, mode, suggestion_count=suggestion_count)
    # Model: from payload > DB setting > env var > hardcoded default
    model = payload.get("model") or None
    if not model:
        db_setting = db.query(Setting).filter(Setting.key == "synthesis_model").first()
        model = db_setting.value if db_setting else os.getenv("SYNTHESIS_MODEL", "anthropic/claude-opus-4-6")

    try:
        openai_client = get_openai_client()
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

        completion = openai_client.chat.completions.create(
            model=model,
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
            lines = [l for l in lines if not l.strip().startswith("```")]
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
                validated.append({
                    "question": item.get("question", ""),
                    "issue": item.get("issue", ""),
                    "severity": severity,
                })
            return {"critique": validated}

        elif mode == "improve":
            improved = parsed.get("improved", [])
            if not isinstance(improved, list):
                raise ValueError("Invalid improved format")
            validated = []
            for item in improved:
                validated.append({
                    "original": item.get("original", ""),
                    "improved": item.get("improved", ""),
                    "reason": item.get("reason", ""),
                })
            return {"improved": validated}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {e}")
