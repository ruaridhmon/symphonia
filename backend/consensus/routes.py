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
    UserFormUnlock, FollowUp, FollowUpResponse,
)
from .auth import (
    get_db,
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin_user,
)
from .synthesis import CommitteeSynthesiser, FlowMode
from consensus.ws import ws_manager

load_dotenv()


router = APIRouter()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)
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
        for q_idx, q_text in enumerate(questions, 1):
            answer = r.answers.get(f'q{q_idx}', 'No answer')
            prompt_content += f"  - Q: {q_text}\n"
            prompt_content += f"    A: {answer}\n"

    prompt_content += "\n--- End of Responses ---\n"
    prompt_content += "\nNow, please provide a concise synthesis of all the answers."

    try:
        completion = client.chat.completions.create(
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
    synthesiser = CommitteeSynthesiser(
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
        "join_code": f.join_code
    }


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

    return [
        {
            "id": r.id,
            "round_number": r.round_number,
            "synthesis": r.synthesis,
            "is_active": r.is_active,
            "questions": r.questions or []
        }
        for r in rounds
    ]


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
            "answers": x.answers,
            "email": x.user.email if x.user else None,
            "timestamp": x.created_at.isoformat(),
            "round_id": x.round_id
        }
        for x in items
    ]


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
                    "answers": x.answers,
                    "email": x.user.email if x.user else None,
                    "timestamp": x.created_at.isoformat()
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
        for key, val in r.answers.items():
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
