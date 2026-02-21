from __future__ import annotations

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from email.message import EmailMessage
from openai import OpenAI
import aiosmtplib
import json
import os

from .models import (
    User, Response, ArchivedResponse, Feedback, FormModel, RoundModel,
    UserFormUnlock, FollowUp, FollowUpResponse, SynthesisComment,
    SynthesisVersion,
)
from .auth import (
    get_db,
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin_user,
)
from .synthesis import CommitteeSynthesiser, FlowMode, get_synthesiser
from core.ws import ws_manager

load_dotenv()


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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": str(user.id), "is_admin": user.is_admin}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "is_admin": user.is_admin,
        "email": user.email
    }


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
    prompt_content += "\nNow, please provide a concise synthesis of all the answers."

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


@router.post("/forms/{form_id}/rounds/{round_id}/generate_synthesis")
async def generate_synthesis_for_round(
    form_id: int,
    round_id: int,
    payload: GenerateSynthesisVersionPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Generate a NEW synthesis version for ANY round (not just active).

    Creates a new SynthesisVersion record with an incremented version number.
    If strategy is 'committee', runs the committee synthesiser.
    Otherwise, falls back to simple single-prompt synthesis.
    """
    # Verify round belongs to form
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    # Fetch questions for this round
    questions = round_obj.questions or []
    if not questions:
        form = db.query(FormModel).filter(FormModel.id == form_id).first()
        if form:
            questions = form.questions or []
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this round")

    # Fetch responses for this round
    responses = (
        db.query(Response)
        .filter(Response.round_id == round_id)
        .order_by(Response.created_at.asc())
        .all()
    )
    if not responses:
        raise HTTPException(status_code=404, detail="No responses to synthesise for this round")

    # Determine next version number
    max_version = (
        db.query(SynthesisVersion.version)
        .filter(SynthesisVersion.round_id == round_id)
        .order_by(SynthesisVersion.version.desc())
        .first()
    )
    next_version = (max_version[0] + 1) if max_version else 1

    synthesis_text = None
    synthesis_json_data = None

    strategy = payload.strategy.lower()

    # Check for mock mode or missing API key
    synthesis_mode_env = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    if synthesis_mode_env == "mock" or not api_key:
        # Mock synthesis for demo/testing
        synthesis_text = (
            f"## Synthesis v{next_version} (Mock Mode)\n\n"
            f"**Round {round_obj.round_number}** — {len(responses)} responses analysed.\n\n"
            f"*Strategy: {strategy} | Model: {payload.model}*\n\n"
            "This is a mock synthesis. Enable OPENROUTER_API_KEY for real LLM synthesis."
        )
    elif strategy == "committee":
        # Run committee synthesis
        response_dicts = [
            {
                "answers": r.answers,
                "email": r.user.email if r.user else f"Expert {i}",
            }
            for i, r in enumerate(responses)
        ]

        try:
            flow_mode = FlowMode(payload.mode)
        except ValueError:
            flow_mode = FlowMode.HUMAN_ONLY

        synthesiser = get_synthesiser(
            api_key=api_key,
            n_analysts=payload.n_analysts,
        )

        result = await synthesiser.run(
            questions=questions,
            responses=response_dicts,
            model=payload.model,
            mode=flow_mode,
        )

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

        synthesis_text = "".join(text_parts) if text_parts else "Synthesis complete."

    else:
        # Simple / TTD single-prompt synthesis — now produces structured JSON too
        prompt_content = "Synthesize the following expert responses.\n\n"
        prompt_content += "Questions:\n"
        for i, q in enumerate(questions, 1):
            prompt_content += f"{i}. {q}\n"

        prompt_content += "\n--- Responses ---\n"
        for i, r in enumerate(responses, 1):
            prompt_content += f"\nResponse {i}:\n"
            answers = r.answers if isinstance(r.answers, dict) else json.loads(r.answers) if r.answers else {}
            for q_idx, q_text in enumerate(questions, 1):
                answer = answers.get(f'q{q_idx}', 'No answer')
                prompt_content += f"  - Q: {q_text}\n"
                prompt_content += f"    A: {answer}\n"

        prompt_content += "\n--- End of Responses ---\n"
        prompt_content += """
Return your synthesis as a JSON object with the following structure (and ONLY the JSON, no markdown fences, no extra text):
{
  "narrative": "A 2-3 paragraph narrative summary of the overall synthesis",
  "agreements": [
    {
      "claim": "What the experts agree on",
      "supporting_experts": [1, 2],
      "confidence": 0.85,
      "evidence_summary": "Key evidence supporting this agreement"
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
"""

        try:
            openai_client = get_openai_client()
            if not openai_client:
                raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
            completion = openai_client.chat.completions.create(
                model=payload.model,
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

            # Try to parse as structured JSON
            try:
                # Strip markdown code fences if present
                cleaned = raw_output.strip()
                if cleaned.startswith("```"):
                    # Remove ```json and trailing ```
                    lines = cleaned.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned = "\n".join(lines)
                parsed = json.loads(cleaned)

                # Validate required keys exist, fill defaults
                synthesis_json_data = {
                    "narrative": parsed.get("narrative", ""),
                    "agreements": parsed.get("agreements", []),
                    "disagreements": parsed.get("disagreements", []),
                    "nuances": parsed.get("nuances", []),
                    "confidence_map": parsed.get("confidence_map", {"overall": 0.5}),
                    "follow_up_probes": parsed.get("follow_up_probes", []),
                    "meta_synthesis_reasoning": parsed.get("meta_synthesis_reasoning", ""),
                }

                # Build readable text from the structured data
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
                # LLM didn't return valid JSON — fall back to raw text
                synthesis_text = raw_output
                synthesis_json_data = None

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate synthesis: {e}")

    # Create the version record
    new_version = SynthesisVersion(
        round_id=round_id,
        version=next_version,
        synthesis=synthesis_text,
        synthesis_json=synthesis_json_data,
        model_used=payload.model,
        strategy=strategy,
        is_active=False,
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    return {
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
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

    f.title = payload.title
    f.questions = payload.questions
    db.commit()
    return {"status": "updated"}


@router.delete("/forms/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin_user)
):
    # Now delete the form itself
    f = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Form not found")

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
