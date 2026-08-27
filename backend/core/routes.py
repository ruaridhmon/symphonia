from __future__ import annotations

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Query,
    Response as FastAPIResponse,
    UploadFile,
)
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from email.message import EmailMessage
from openai import OpenAI
import aiosmtplib
import html
import json
import logging
import os
import re
import secrets
import zipfile
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
import asyncio
from typing import Any
from xml.etree import ElementTree as ET
import textwrap

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
    PublicFormSession,
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
    AUTH_COOKIE_DOMAIN,
    CSRF_COOKIE_NAME,
    CSRF_COOKIE_DOMAIN,
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


SYNTHESIS_JOB_TTL_SECONDS = 30 * 60
_synthesis_jobs: dict[str, dict[str, Any]] = {}
_synthesis_jobs_by_round: dict[tuple[int, int], str] = {}
_synthesis_job_lock = asyncio.Lock()


# ---------------------------------------------------------
# SYNTHESIS HELPERS
# ---------------------------------------------------------


def _estimate_model_latency_multiplier(model: str | None) -> float:
    """Return a coarse latency multiplier for slower/faster model families."""
    if not model:
        return 1.0

    lowered = model.lower()
    if any(token in lowered for token in ("mini", "flash", "haiku")):
        return 0.8
    if any(token in lowered for token in ("opus", "pro", "o1", "o3")):
        return 1.25
    return 1.0


def _extract_answer_position(answer: Any) -> str:
    if isinstance(answer, str):
        return _html_to_plain_text(answer)
    if isinstance(answer, (int, float)) and not isinstance(answer, bool):
        return str(answer)
    if isinstance(answer, bool):
        return str(answer)
    if isinstance(answer, list):
        return "\n".join(
            item
            for item in (
                _extract_answer_position(candidate).strip() for candidate in answer
            )
            if item
        )
    if isinstance(answer, dict):
        for key in (
            "position",
            "value",
            "answer",
            "selected",
            "selectedScore",
            "score",
        ):
            if key not in answer:
                continue
            position = _extract_answer_position(answer.get(key))
            if position.strip():
                return position
    return ""


def _is_question_visible(
    question: dict[str, Any],
    questions: list[dict[str, Any]],
    answers: dict[str, Any],
) -> bool:
    controlling_question_id = question.get("conditionalOnQuestionId")
    controlling_option = question.get("conditionalOnOption")
    if not controlling_question_id or not controlling_option:
        return True

    for index, candidate in enumerate(questions):
        if candidate.get("questionId") != controlling_question_id:
            continue
        selected = [
            item.strip()
            for item in _extract_answer_position(
                answers.get(f"q{index + 1}", "")
            ).split("\n")
            if item.strip()
        ]
        return controlling_option in selected

    return False


def _validate_required_answers(
    questions: list[Any] | None,
    answers: dict[str, Any],
) -> str | None:
    raw_questions = list(questions or [])
    normalized_questions = [
        question if isinstance(question, dict) else {"label": str(question)}
        for question in raw_questions
    ]

    for index, question in enumerate(normalized_questions):
        if question.get("optional") is True:
            continue
        if isinstance(raw_questions[index], dict) and not _is_question_visible(
            question, normalized_questions, answers
        ):
            continue
        if _extract_answer_position(answers.get(f"q{index + 1}", "")).strip():
            continue

        label = str(
            question.get("label")
            or question.get("text")
            or question.get("question")
            or ""
        ).strip()
        return (
            f'Please answer "{label}" before submitting.'
            if label
            else "Please complete all required questions before submitting."
        )

    return None


def _estimate_synthesis_duration_seconds(
    strategy: str,
    response_count: int,
    *,
    n_analysts: int = 3,
    model: str | None = None,
) -> int:
    """Estimate synthesis wall-clock time from the real pipeline shape.

    These estimates are intentionally conservative. The old numbers assumed
    committee/TTD were close to single-pass generations, but the consensus
    library runs multi-stage workflows with extra post-processing.
    """
    count = max(1, response_count)
    profile = _build_synthesis_runtime_profile(
        strategy,
        response_count=count,
        requested_analysts=n_analysts,
    )
    analysts = int(profile["n_analysts"])
    latency = _estimate_model_latency_multiplier(model)

    if strategy == "custom":
        base = 8 + count * 2
        return min(round(35 * latency), round(base * latency))

    if strategy == "simple":
        return round(float(profile["timeout_seconds"]) * 0.7 * latency)

    if strategy == "committee":
        base = 55 + count * 18 + max(0, analysts - 1) * 8
        return min(
            round(float(profile["timeout_seconds"]) * 0.85 * latency),
            round(base * latency),
        )

    if strategy == "ttd":
        base = 85 + count * 28 + max(0, analysts - 1) * 10
        return min(
            round(float(profile["timeout_seconds"]) * 0.8 * latency),
            round(base * latency),
        )

    return 60


def _build_synthesis_runtime_profile(
    strategy: str,
    *,
    response_count: int,
    requested_analysts: int,
) -> dict[str, object]:
    """Return interactive runtime limits for the selected strategy.

    These profiles are tuned for an admin UI, not an overnight batch job.
    """
    responses = max(1, response_count)
    analysts = max(1, requested_analysts)

    if strategy == "simple":
        return {
            "n_analysts": 1,
            "timeout_seconds": min(120.0, max(45.0, 30.0 + responses * 8.0)),
            "n_denoise_steps": 1,
        }

    if strategy == "committee":
        return {
            "n_analysts": min(3, analysts),
            "timeout_seconds": min(210.0, max(90.0, 60.0 + responses * 20.0)),
            "n_denoise_steps": 1,
        }

    if strategy == "ttd":
        return {
            "n_analysts": min(2, analysts),
            "timeout_seconds": min(300.0, max(150.0, 90.0 + responses * 30.0)),
            "n_denoise_steps": 1,
        }

    return {
        "n_analysts": analysts,
        "timeout_seconds": 45.0,
        "n_denoise_steps": 1,
    }


def _format_duration_estimate(seconds: int) -> str:
    """Render a short human-readable ETA."""
    if seconds < 60:
        return f"about {seconds} seconds"
    minutes = round(seconds / 60)
    if minutes == 1:
        return "about 1 minute"
    return f"about {minutes} minutes"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_timestamp(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _build_synthesis_job_message(job: dict[str, Any]) -> str:
    status = job.get("status")
    strategy = str(job.get("strategy") or "synthesis")
    estimate_label = job.get("estimate_label")
    strategy_label = (
        "committee synthesis"
        if strategy == "committee"
        else "thorough synthesis"
        if strategy == "ttd"
        else "synthesis"
    )
    if status in {"queued", "running"}:
        if estimate_label:
            return f"{strategy_label.capitalize()} is running in the background. Expected time: {estimate_label}."
        return f"{strategy_label.capitalize()} is running in the background."
    if status == "completed":
        return f"{strategy_label.capitalize()} completed."
    if status == "failed":
        return str(job.get("error") or "Synthesis failed.")
    return "No synthesis job is currently running."


def _serialize_synthesis_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "job_id": job["job_id"],
        "form_id": job["form_id"],
        "round_id": job["round_id"],
        "strategy": job["strategy"],
        "model": job["model"],
        "status": job["status"],
        "stage": job.get("stage"),
        "step": job.get("step"),
        "total_steps": job.get("total_steps"),
        "estimate_seconds": job.get("estimate_seconds"),
        "estimate_label": job.get("estimate_label"),
        "started_at": _serialize_timestamp(job.get("started_at")),
        "updated_at": _serialize_timestamp(job.get("updated_at")),
        "completed_at": _serialize_timestamp(job.get("completed_at")),
        "version_id": job.get("version_id"),
        "error": job.get("error"),
        "message": _build_synthesis_job_message(job),
    }


async def _prune_synthesis_jobs() -> None:
    now = _utcnow()
    expired_job_ids: list[str] = []
    for job_id, job in _synthesis_jobs.items():
        status = str(job.get("status") or "")
        if status not in {"completed", "failed"}:
            continue
        completed_at = job.get("completed_at") or job.get("updated_at") or now
        if (
            isinstance(completed_at, datetime)
            and (now - completed_at).total_seconds() > SYNTHESIS_JOB_TTL_SECONDS
        ):
            expired_job_ids.append(job_id)

    for job_id in expired_job_ids:
        job = _synthesis_jobs.pop(job_id, None)
        if not job:
            continue
        round_key = (int(job["form_id"]), int(job["round_id"]))
        if _synthesis_jobs_by_round.get(round_key) == job_id:
            _synthesis_jobs_by_round.pop(round_key, None)


async def _get_synthesis_job_for_round(
    form_id: int,
    round_id: int,
) -> dict[str, Any] | None:
    async with _synthesis_job_lock:
        await _prune_synthesis_jobs()
        job_id = _synthesis_jobs_by_round.get((form_id, round_id))
        if not job_id:
            return None
        return _synthesis_jobs.get(job_id)


async def _create_synthesis_job(
    *,
    form_id: int,
    round_id: int,
    strategy: str,
    model: str,
    estimate_seconds: int,
    estimate_label: str,
) -> dict[str, Any]:
    async with _synthesis_job_lock:
        await _prune_synthesis_jobs()
        existing_job_id = _synthesis_jobs_by_round.get((form_id, round_id))
        if existing_job_id:
            existing = _synthesis_jobs.get(existing_job_id)
            if existing and existing.get("status") in {"queued", "running"}:
                return existing

        now = _utcnow()
        job_id = secrets.token_urlsafe(12)
        job = {
            "job_id": job_id,
            "form_id": form_id,
            "round_id": round_id,
            "strategy": strategy,
            "model": model,
            "status": "queued",
            "stage": "preparing",
            "step": 1,
            "total_steps": 4,
            "estimate_seconds": estimate_seconds,
            "estimate_label": estimate_label,
            "started_at": now,
            "updated_at": now,
            "completed_at": None,
            "version_id": None,
            "error": None,
            "task": None,
        }
        _synthesis_jobs[job_id] = job
        _synthesis_jobs_by_round[(form_id, round_id)] = job_id
        return job


async def _update_synthesis_job(
    job_id: str,
    **updates: Any,
) -> dict[str, Any] | None:
    async with _synthesis_job_lock:
        job = _synthesis_jobs.get(job_id)
        if not job:
            return None
        job.update(updates)
        job["updated_at"] = _utcnow()
        return job


SUMMARY_OPTION_LABELS = {
    "narrative": "text overview",
    "agreements": "agreements",
    "disagreements": "disagreements",
    "nuances": "nuances",
    "consensusMap": "consensus heatmap",
    "probes": "follow-up questions",
}
DEFAULT_SUMMARY_OPTIONS = {
    "narrative": True,
    "agreements": True,
    "disagreements": True,
    "nuances": True,
    "consensusMap": False,
    "probes": False,
}
SUMMARY_DISPLAY_OPTION_DEFAULTS = {
    "statistics": True,
    "narrative": True,
    "agreements": False,
    "disagreements": False,
    "nuances": False,
    "consensusMap": False,
    "probes": False,
}
SUMMARY_DISPLAY_ORDER_DEFAULTS = [
    "statistics",
    "narrative",
    "agreements",
    "disagreements",
    "nuances",
    "consensusMap",
    "probes",
]
SUMMARY_BACKGROUND_OPTIONS = {"default", "paper", "soft"}


def _normalise_summary_options(raw: dict[str, Any] | None) -> dict[str, bool]:
    if not isinstance(raw, dict):
        return DEFAULT_SUMMARY_OPTIONS.copy()
    options = DEFAULT_SUMMARY_OPTIONS.copy()
    for key in options:
        if key in raw:
            options[key] = bool(raw[key])
    if not any(options.values()):
        return DEFAULT_SUMMARY_OPTIONS.copy()
    return options


def _normalise_summary_display_options(
    raw: dict[str, Any] | None,
) -> dict[str, bool]:
    options = SUMMARY_DISPLAY_OPTION_DEFAULTS.copy()
    if not isinstance(raw, dict):
        return options
    for key in options:
        if key in raw:
            options[key] = bool(raw[key])
    return options


def _normalise_summary_display_order(raw: list[Any] | None) -> list[str]:
    allowed = set(SUMMARY_DISPLAY_ORDER_DEFAULTS)
    order: list[str] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str) and item in allowed and item not in order:
                order.append(item)
    for item in SUMMARY_DISPLAY_ORDER_DEFAULTS:
        if item not in order:
            order.append(item)
    return order


def _merge_summary_display_preferences(
    synthesis_json: dict[str, Any],
    existing_json: Any,
    incoming_options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    existing = existing_json if isinstance(existing_json, dict) else {}
    source_options = (
        incoming_options
        if isinstance(incoming_options, dict)
        else existing.get("summary_options")
    )
    background = existing.get("synthesis_background")
    synthesis_json["summary_options"] = _normalise_summary_display_options(
        source_options
    )
    synthesis_json["summary_order"] = _normalise_summary_display_order(
        existing.get("summary_order")
    )
    synthesis_json["synthesis_background"] = (
        background if background in SUMMARY_BACKGROUND_OPTIONS else "default"
    )
    return synthesis_json


def _format_summary_generation_guidance(options: dict[str, bool]) -> str:
    selected = [
        label for key, label in SUMMARY_OPTION_LABELS.items() if options.get(key)
    ]
    omitted = [
        label for key, label in SUMMARY_OPTION_LABELS.items() if not options.get(key)
    ]
    if not selected:
        return ""
    guidance = (
        "Synthesis output preferences: prioritise these sections in the final "
        f"synthesis: {', '.join(selected)}."
    )
    if omitted:
        guidance += f" De-emphasise or omit: {', '.join(omitted)}."
    if options.get("consensusMap"):
        guidance += (
            " Pay particular attention to which themes show agreement, divergence, "
            "and mixed or conditional views so they can be represented as a consensus heatmap."
        )
    return guidance


def _render_expert_ids(ids: list[int] | None) -> str:
    if not ids:
        return "Not specified"
    return ", ".join(f"Expert {id_}" for id_ in ids)


def _render_synthesis_text(
    result, summary_options: dict[str, bool] | None = None
) -> str:
    """Build the HTML synthesis summary used by round pages and exports."""
    options = _normalise_summary_options(summary_options)
    text_parts: list[str] = []
    if options["narrative"] and getattr(result, "narrative", ""):
        text_parts.append(f"<p>{result.narrative}</p>")
    if options["agreements"] and result.agreements:
        text_parts.append("<h3>Agreements</h3>")
        for agreement in result.agreements:
            text_parts.append(
                f"<p><strong>{agreement.claim}</strong> "
                f"(confidence: {agreement.confidence:.0%}) — {agreement.evidence_summary}</p>"
            )
    if options["disagreements"] and result.disagreements:
        text_parts.append("<h3>Disagreements</h3>")
        for disagreement in result.disagreements:
            text_parts.append(
                f"<p><strong>{disagreement.topic}</strong> ({disagreement.severity})</p><ul>"
            )
            for position in disagreement.positions:
                text_parts.append(
                    f"<li>{position.get('position', '')} — {position.get('evidence', '')}</li>"
                )
            text_parts.append("</ul>")
    if options["nuances"] and result.nuances:
        text_parts.append("<h3>Nuances</h3>")
        for nuance in result.nuances:
            text_parts.append(
                f"<p><strong>{nuance.claim}</strong> — {nuance.context}</p>"
            )
    if options["consensusMap"] and (result.agreements or result.disagreements):
        text_parts.append(
            "<h3>Consensus heatmap</h3>"
            "<table><thead><tr><th>Topic</th><th>Signal</th><th>Voices</th><th>Detail</th></tr></thead><tbody>"
        )
        for agreement in result.agreements:
            text_parts.append(
                "<tr>"
                f"<td>{html.escape(agreement.claim)}</td>"
                f"<td>Agreement ({agreement.confidence:.0%})</td>"
                f"<td>{html.escape(_render_expert_ids(agreement.supporting_experts))}</td>"
                f"<td>{html.escape(agreement.evidence_summary)}</td>"
                "</tr>"
            )
        for disagreement in result.disagreements:
            voices = sorted(
                {
                    expert_id
                    for position in disagreement.positions
                    for expert_id in position.get("experts", [])
                }
            )
            detail = "; ".join(
                position.get("position", "")
                for position in disagreement.positions
                if position.get("position")
            )
            text_parts.append(
                "<tr>"
                f"<td>{html.escape(disagreement.topic)}</td>"
                f"<td>Divergence ({html.escape(disagreement.severity)})</td>"
                f"<td>{html.escape(_render_expert_ids(voices))}</td>"
                f"<td>{html.escape(detail)}</td>"
                "</tr>"
            )
        text_parts.append("</tbody></table>")
    if options["probes"] and result.follow_up_probes:
        text_parts.append("<h3>Follow-up questions</h3><ul>")
        for probe in result.follow_up_probes:
            text_parts.append(
                f"<li><strong>{html.escape(probe.question)}</strong>"
                f" — {html.escape(probe.rationale)}"
                f" <em>Suggested for: {html.escape(_render_expert_ids(probe.target_experts))}</em></li>"
            )
        text_parts.append("</ul>")
    return "".join(text_parts) if text_parts else "Synthesis complete."


def _safe_export_title(form: FormModel, form_id: int) -> str:
    safe_title = (
        "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "" for c in (form.title or "")
        )
        .strip()
        .replace(" ", "-")
        .lower()
    )
    return safe_title or f"form-{form_id}"


def _build_responses_export_payload(
    db: Session,
    rounds_list: list[RoundModel],
) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for rnd in rounds_list:
        responses = (
            db.query(Response)
            .filter(Response.round_id == rnd.id)
            .order_by(Response.created_at.asc())
            .all()
        )
        payload.append(
            {
                "round_number": rnd.round_number,
                "questions": rnd.questions or [],
                "responses": [
                    {
                        "response_id": item.id,
                        "email": item.user.email if item.user else None,
                        "timestamp": item.created_at.isoformat()
                        if item.created_at
                        else None,
                        "version": item.version,
                        "answers": item.answers,
                    }
                    for item in responses
                ],
            }
        )
    return payload


def _question_export_label(question: Any, fallback: str) -> str:
    if isinstance(question, str):
        return question.strip() or fallback
    if isinstance(question, dict):
        for key in ("label", "text", "question", "title"):
            value = question.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return fallback


def _question_export_id(question: Any) -> str | None:
    if not isinstance(question, dict):
        return None
    value = question.get("questionId")
    return value.strip() if isinstance(value, str) and value.strip() else None


def _question_is_simple_response(question: Any) -> bool:
    if not isinstance(question, dict):
        return False
    input_type = str(question.get("inputType") or "").strip()
    return input_type in {
        "text",
        "textarea",
        "single_select",
        "multi_select",
        "slider",
        "likert",
        "document",
    }


def _response_question_lookup(questions: list[Any]) -> dict[str, Any]:
    lookup: dict[str, Any] = {}
    for index, question in enumerate(questions, start=1):
        lookup[f"q{index}"] = question
        question_id = _question_export_id(question)
        if question_id:
            lookup[question_id] = question
    return lookup


def _format_export_scalar(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return _html_to_plain_text(value).strip()
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)):
        return str(value)
    return str(value).strip()


def _format_response_answer_for_export(
    value: Any,
    question: Any = None,
) -> list[tuple[str, str]]:
    """Return labelled, human-readable response fields for export documents."""
    simple_response = _question_is_simple_response(question)

    if value is None:
        return [("Response", "No response provided")]

    if isinstance(value, (str, int, float, bool)):
        rendered = _format_export_scalar(value)
        return [("Response", rendered or "No response provided")]

    if isinstance(value, list):
        rendered_items = [
            _format_export_scalar(item) for item in value if _format_export_scalar(item)
        ]
        return [("Response", ", ".join(rendered_items) or "No response provided")]

    if not isinstance(value, dict):
        return [("Response", _format_export_scalar(value) or "No response provided")]

    selected_options = value.get("selectedOptions")
    if isinstance(selected_options, list):
        selected = [
            _format_export_scalar(item)
            for item in selected_options
            if _format_export_scalar(item)
        ]
        other_text = _format_export_scalar(value.get("otherText"))
        if other_text:
            selected.append(other_text)
        if selected:
            return [("Response", ", ".join(selected))]

    position = _extract_answer_position(value).strip()
    fields: list[tuple[str, str]] = []
    if position:
        fields.append(("Response" if simple_response else "Position", position))

    if simple_response:
        return fields or [("Response", "No response provided")]

    for source_key, label in (
        ("evidence", "Evidence"),
        ("confidence", "Confidence"),
        ("confidenceJustification", "Confidence rationale"),
        ("counterarguments", "Counterarguments"),
    ):
        if source_key not in value:
            continue
        rendered = _format_export_scalar(value.get(source_key))
        if not rendered:
            continue
        if source_key == "confidence" and rendered:
            rendered = f"{rendered}/10"
        fields.append((label, rendered))

    for source_key, label in (
        ("citations", "Citations"),
        ("expertNominations", "Expert nominations"),
    ):
        items = value.get(source_key)
        if not isinstance(items, list):
            continue
        rendered_items = [
            _format_export_scalar(item) for item in items if _format_export_scalar(item)
        ]
        if rendered_items:
            fields.append((label, ", ".join(rendered_items)))

    if fields:
        return fields

    readable_pairs: list[tuple[str, str]] = []
    for key, item in value.items():
        rendered = _format_export_scalar(item)
        if rendered:
            readable_pairs.append((str(key).replace("_", " ").title(), rendered))
    return readable_pairs or [("Response", "No response provided")]


def _build_responses_markdown(
    form: FormModel,
    rounds_payload: list[dict[str, Any]],
) -> str:
    def _format_value(value: Any) -> list[str]:
        if isinstance(value, (dict, list)):
            rendered = json.dumps(value, ensure_ascii=False, indent=2)
        else:
            rendered = str(value)

        lines: list[str] = []
        for raw_line in rendered.splitlines() or [""]:
            wrapped = textwrap.wrap(
                raw_line,
                width=88,
                break_long_words=True,
                break_on_hyphens=False,
                replace_whitespace=False,
                drop_whitespace=False,
            )
            if wrapped:
                lines.extend(wrapped)
            else:
                lines.append("")
        return lines

    lines: list[str] = [f"# {form.title}", "", "## Responses", ""]
    for round_payload in rounds_payload:
        lines.append(f"### Round {round_payload['round_number']}")
        lines.append("")
        responses = round_payload["responses"]
        if not responses:
            lines.append("No responses recorded.")
            lines.append("")
            continue
        for idx, response in enumerate(responses, start=1):
            lines.append(
                f"#### Response {idx}"
                + (f" ({response['email']})" if response.get("email") else "")
            )
            timestamp = response.get("timestamp")
            if timestamp:
                lines.append(f"**Submitted:** {timestamp}")
                lines.append("")
            question_lookup = _response_question_lookup(
                round_payload.get("questions") or []
            )
            for question_index, (key, value) in enumerate(
                (response.get("answers") or {}).items(),
                start=1,
            ):
                question = question_lookup.get(key)
                fallback_label = (
                    key.replace("_", " ").upper() if key.startswith("q") else key
                )
                question_label = _question_export_label(question, fallback_label)
                lines.append(f"##### Question {question_index}: {question_label}")
                lines.append("")
                for label, answer_text in _format_response_answer_for_export(
                    value, question
                ):
                    lines.append(f"**{label}:**")
                    for wrapped_line in _format_value(answer_text):
                        lines.append(f"> {wrapped_line}" if wrapped_line else ">")
                    lines.append("")
                lines.append("")
            lines.append("---")
            lines.append("")
    return "\n".join(lines).strip() + "\n"


def _build_consultation_markdown(
    form: FormModel,
    rounds_list: list[RoundModel],
    rounds_payload: list[dict[str, Any]],
) -> str:
    synthesis_md = _build_synthesis_markdown(form, rounds_list).rstrip()
    responses_md = _build_responses_markdown(form, rounds_payload).rstrip()
    return f"{synthesis_md}\n\n---\n\n{responses_md}\n"


def _markdown_to_pdf_bytes(md_content: str) -> bytes:
    weasy_error: Exception | None = None
    try:
        import markdown as md_lib
        from weasyprint import HTML as WeasyHTML

        html_body = md_lib.markdown(md_content, extensions=["tables", "fenced_code"])
        full_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
@page {{
  size: A4;
  margin: 16mm 16mm 18mm 16mm;
  @bottom-right {{
    content: counter(page);
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 9pt;
    color: #667085;
  }}
}}
html {{ font-size: 11pt; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  color: #172033;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
}}
h1, h2, h3, h4, h5, h6 {{
  page-break-after: avoid;
  break-after: avoid-page;
  color: #0f2f67;
  font-weight: 800;
  line-height: 1.25;
  margin-bottom: 0.35rem;
}}
h1 {{
  font-size: 22pt;
  border-bottom: 1.5pt solid #2563eb;
  padding-bottom: 0.18in;
  margin: 0 0 0.24in;
}}
h2 {{
  font-size: 16pt;
  margin-top: 0.28in;
}}
h3 {{
  font-size: 13pt;
  margin-top: 0.2in;
}}
h4 {{
  font-size: 11pt;
  margin-top: 0.16in;
  color: #344054;
}}
h5 {{
  font-size: 10.5pt;
  margin: 0.18in 0 0.08in;
  padding: 0.06in 0.08in;
  background: #f3f6fb;
  border-left: 3px solid #2563eb;
  color: #0f2f67;
}}
h6 {{
  font-size: 10pt;
  margin-top: 0.14in;
  color: #344054;
}}
p, ul, ol, table, pre {{
  margin-top: 0;
  margin-bottom: 0.14in;
}}
p, li, td, th, blockquote {{
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: pre-wrap;
}}
ul, ol {{
  padding-left: 1.2rem;
}}
li {{
  margin-bottom: 0.05in;
}}
hr {{
  border: none;
  border-top: 1px solid #d0d7e2;
  margin: 0.26in 0;
}}
strong {{
  color: #111827;
  font-weight: 700;
}}
em {{
  color: #475467;
}}
code {{
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.92em;
  background: #eef3fb;
  border-radius: 4px;
  padding: 0.08rem 0.24rem;
}}
pre {{
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f6f8fb;
  border: 1px solid #d9e2f2;
  border-radius: 10px;
  padding: 0.14in;
}}
pre code {{
  background: transparent;
  padding: 0;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 10pt;
}}
th, td {{
  border: 1px solid #d9e2f2;
  padding: 0.08in 0.09in;
  vertical-align: top;
  text-align: left;
}}
th {{
  background: #f3f6fb;
  color: #0f2f67;
}}
blockquote {{
  border-left: 3px solid #bfd3f7;
  margin: 0 0 0.14in;
  padding: 0.02in 0 0.02in 0.14in;
  color: #475467;
}}
</style>
</head><body>{html_body}</body></html>"""
        return WeasyHTML(string=full_html).write_pdf()
    except Exception as exc:
        weasy_error = exc

    try:
        from fpdf import FPDF

        def _clean_md_text(value: str) -> str:
            value = re.sub(r"\*\*(.*?)\*\*", r"\1", value)
            value = re.sub(r"_(.*?)_", r"\1", value)
            value = re.sub(r"\*(.*?)\*", r"\1", value)
            value = re.sub(r"`(.*?)`", r"\1", value)
            return value

        def _safe_pdf_text(value: str) -> str:
            return _clean_md_text(value).encode("latin-1", "replace").decode("latin-1")

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.set_margins(16, 16, 16)
        pdf.add_page()
        writable_width = max(20, pdf.w - pdf.l_margin - pdf.r_margin)

        def _write_line(
            text: str,
            *,
            size: int = 11,
            style: str = "",
            line_height: float = 6,
            spacing_after: float = 2,
            text_color: tuple[int, int, int] = (23, 32, 51),
            fill_color: tuple[int, int, int] | None = None,
        ) -> None:
            pdf.set_x(pdf.l_margin)
            pdf.set_text_color(*text_color)
            pdf.set_font("Helvetica", style=style, size=size)
            if fill_color:
                pdf.set_fill_color(*fill_color)
                pdf.multi_cell(
                    writable_width,
                    line_height,
                    text=_safe_pdf_text(text),
                    fill=True,
                )
            else:
                pdf.multi_cell(writable_width, line_height, text=_safe_pdf_text(text))
            if spacing_after:
                pdf.ln(spacing_after)

        for raw_line in md_content.splitlines():
            line = raw_line.rstrip()
            stripped = line.strip()

            if not stripped:
                pdf.ln(3)
                continue

            if re.fullmatch(r"-{3,}", stripped):
                y = pdf.get_y() + 1
                pdf.set_draw_color(208, 215, 226)
                pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
                pdf.ln(6)
                continue

            heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
            if heading_match:
                level = len(heading_match.group(1))
                text = heading_match.group(2)
                if level == 1:
                    _write_line(
                        text,
                        size=18,
                        style="B",
                        line_height=9,
                        spacing_after=5,
                        text_color=(15, 47, 103),
                    )
                    continue
                if level == 2:
                    _write_line(
                        text,
                        size=15,
                        style="B",
                        line_height=8,
                        spacing_after=4,
                        text_color=(15, 47, 103),
                    )
                    continue
                if level == 3:
                    _write_line(
                        text,
                        size=13,
                        style="B",
                        line_height=7,
                        spacing_after=3,
                        text_color=(15, 47, 103),
                    )
                    continue
                _write_line(
                    text,
                    size=11,
                    style="B",
                    line_height=6.5,
                    spacing_after=2,
                    text_color=(15, 47, 103),
                    fill_color=(243, 246, 251) if level >= 5 else None,
                )
                continue

            quote_match = re.match(r"^>\s?(.*)$", stripped)
            if quote_match:
                _write_line(
                    quote_match.group(1),
                    size=10,
                    line_height=5.5,
                    spacing_after=1,
                    text_color=(71, 84, 103),
                )
                continue

            ordered_match = re.match(r"^(\d+)\.\s+(.*)$", stripped)
            bullet_match = re.match(r"^[-*+]\s+(.*)$", stripped)
            if ordered_match:
                _write_line(
                    f"{ordered_match.group(1)}. {ordered_match.group(2)}",
                    size=10,
                    style="B" if "**" in ordered_match.group(2) else "",
                    line_height=5.8,
                    spacing_after=1,
                )
                continue
            if bullet_match:
                text = bullet_match.group(1)
                _write_line(
                    f"- {text}",
                    size=10,
                    style="B" if "**" in text else "",
                    line_height=5.8,
                    spacing_after=1,
                )
                continue

            label_match = re.match(r"^\*\*([^*]+):\*\*(.*)$", stripped)
            if label_match:
                label = label_match.group(1).strip()
                value = label_match.group(2).strip()
                text = f"{label}: {value}" if value else f"{label}:"
                _write_line(text, size=10, style="B", line_height=5.8, spacing_after=1)
                continue

            if stripped.startswith("**") and stripped.endswith("**"):
                _write_line(stripped, size=10.5, style="B", line_height=6)
                continue

            _write_line(stripped, size=10.5, line_height=5.8, spacing_after=1)

        out = pdf.output()
        return bytes(
            out if isinstance(out, (bytes, bytearray)) else out.encode("latin-1")
        )
    except Exception as fpdf_error:
        detail = "Failed to generate PDF export."
        if weasy_error:
            detail += f" WeasyPrint/Markdown error: {weasy_error}"
        detail += f" FPDF fallback error: {fpdf_error}"
        raise HTTPException(status_code=500, detail=detail)


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
                if resp.user and resp.user.email and not resp.user.is_public_guest:
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
        domain=AUTH_COOKIE_DOMAIN,
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
        domain=CSRF_COOKIE_DOMAIN,
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
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/", domain=AUTH_COOKIE_DOMAIN)
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/", domain=CSRF_COOKIE_DOMAIN)
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
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _ensure_user_consent_for_form(db, form, user)

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
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Answers payload must be an object")

    validation_error = _validate_required_answers(active_round.questions, data)
    if validation_error:
        raise HTTPException(status_code=400, detail=validation_error)

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


def _get_user_response_for_round(
    db: Session, *, round_id: int, user_id: int
) -> Response | None:
    return (
        db.query(Response)
        .filter(Response.user_id == user_id, Response.round_id == round_id)
        .order_by(Response.created_at.desc())
        .first()
    )


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
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _ensure_user_consent_for_form(db, form, user)

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


@router.get(
    "/forms/{form_id}/summary_text",
    tags=["Synthesis"],
    summary="Get participant synthesis text for a form",
)
@limiter.limit(READ_LIMIT)
def get_form_summary_text(
    request: Request,
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )
    if not active_round:
        return {
            "summary": "",
            "show_own_response_to_participants": form.show_own_response_to_participants,
            "own_response": None,
        }

    own_response = None
    if form.show_own_response_to_participants:
        response = _get_user_response_for_round(
            db, round_id=active_round.id, user_id=user.id
        )
        if response:
            own_response = response.answers

    return {
        "summary": active_round.synthesis or "",
        "show_own_response_to_participants": form.show_own_response_to_participants,
        "own_response": own_response,
    }


@router.get(
    "/summary_text",
    tags=["Synthesis"],
    summary="Get legacy cached synthesis text",
)
@limiter.limit(READ_LIMIT)
def get_summary_text(
    request: Request,
    user: User = Depends(get_current_user),
):
    try:
        with open("summary_cache.txt") as f:
            return {"summary": f.read().strip()}
    except FileNotFoundError:
        return {"summary": ""}


class SummaryPayload(BaseModel):
    summary: str


class CodexSummaryMessage(BaseModel):
    role: str
    content: str


class CodexSummaryPayload(BaseModel):
    instruction: str
    current_summary_html: str | None = ""
    history: list[CodexSummaryMessage] | None = None
    model: str | None = None


class SynthesisDisplayPayload(BaseModel):
    summary_options: dict[str, bool] | None = None
    summary_order: list[str] | None = None
    synthesis_background: str | None = None


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
    survey_template_synced = False

    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )

    if not active_round:
        raise HTTPException(status_code=400, detail="No active round")

    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    active_round.synthesis = summary
    synced_template = (
        _sync_rich_document_template_from_summary(form.document_template, summary)
        if form
        else None
    )
    if form and synced_template and synced_template != form.document_template:
        form.document_template = synced_template
        survey_template_synced = True
    db.commit()

    with open("summary_cache.txt", "w") as f:
        f.write(summary)

    await ws_manager.broadcast_summary(summary)

    return {
        "detail": "Summary pushed",
        "survey_template_synced": survey_template_synced,
    }


def _sanitize_llm_summary_html(value: str) -> str:
    cleaned = value or ""
    cleaned = re.sub(
        r"<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*/\s*\1\s*>",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"<\s*(script|style|iframe|object|embed|link|meta)[^>]*?/?>",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\s+on[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\s+(href|src)\s*=\s*(['\"])\s*javascript:[\s\S]*?\2",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.strip()


def _build_codex_round_context(
    form: FormModel,
    round_obj: RoundModel,
    responses: list[Response],
) -> str:
    questions = round_obj.questions or form.questions or []
    lines: list[str] = [
        f"Consultation: {form.title}",
        f"Round: {round_obj.round_number}",
        f"Responses: {len(responses)}",
        "",
        "Questions:",
    ]
    if questions:
        for index, question in enumerate(questions, start=1):
            lines.append(
                f"{index}. {_question_export_label(question, f'Question {index}')}"
            )
    else:
        lines.append("No explicit questions found.")
    lines.extend(["", "Participant responses:"])
    if not responses:
        lines.append("No responses recorded for this round.")
        return "\n".join(lines)

    question_lookup = _response_question_lookup(questions)
    for response_index, response in enumerate(responses, start=1):
        lines.extend(["", f"Response {response_index}:"])
        answers = (
            response.answers
            if isinstance(response.answers, dict)
            else json.loads(response.answers)
            if response.answers
            else {}
        )
        if not isinstance(answers, dict) or not answers:
            lines.append("  No answers recorded.")
            continue
        for answer_index, (key, value) in enumerate(answers.items(), start=1):
            question = question_lookup.get(key)
            label = _question_export_label(question, f"Question {answer_index}")
            lines.append(f"  Q: {label}")
            rendered_parts = _format_response_answer_for_export(value, question)
            for part_label, answer_text in rendered_parts:
                lines.append(f"  {part_label}: {answer_text}")
    return "\n".join(lines)


def _parse_codex_summary_response(raw_output: str) -> dict[str, str]:
    cleaned = (raw_output or "").strip()
    if cleaned.startswith("```"):
        lines = [
            line for line in cleaned.splitlines() if not line.strip().startswith("```")
        ]
        cleaned = "\n".join(lines).strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Response was not a JSON object")
    message = str(
        parsed.get("message") or parsed.get("assistant_message") or ""
    ).strip()
    summary_html = str(parsed.get("summary_html") or parsed.get("html") or "").strip()
    return {
        "message": message,
        "summary_html": _sanitize_llm_summary_html(summary_html),
    }


@router.post(
    "/forms/{form_id}/rounds/{round_id}/codex_summary",
    tags=["AI Tools"],
    summary="Chat-edit a round synthesis",
    description=(
        "Use the configured synthesis model as an interactive editing assistant. "
        "The assistant receives the round questions, anonymised responses, current "
        "summary HTML, and the facilitator's instruction, then returns revised "
        "summary HTML for review. Admin only."
    ),
)
@limiter.limit(SYNTHESIS_LIMIT)
def codex_summary_edit(
    request: Request,
    form_id: int,
    round_id: int,
    payload: CodexSummaryPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    instruction = payload.instruction.strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Instruction is required")

    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    responses = (
        db.query(Response)
        .filter(Response.round_id == round_id)
        .order_by(Response.created_at.asc())
        .all()
    )
    current_summary_html = _sanitize_llm_summary_html(
        payload.current_summary_html or round_obj.synthesis or ""
    )
    context = _build_codex_round_context(form, round_obj, responses)
    history_lines: list[str] = []
    for message in payload.history or []:
        role = "Facilitator" if message.role == "user" else "Assistant"
        content = message.content.strip()
        if content:
            history_lines.append(f"{role}: {content[:1600]}")

    prompt = f"""You are Codex inside Symphonia, helping a facilitator rewrite the round synthesis.

You can edit the summary HTML. Use only the consultation material below. Do not invent participant claims or evidence.

Return ONLY valid JSON with this exact shape:
{{
  "message": "Briefly explain what you changed or ask a concise follow-up if you cannot safely make the edit.",
  "summary_html": "<h2>...</h2><p>...</p>"
}}

HTML rules:
- Return complete replacement HTML for the summary, not a patch.
- Use clean semantic HTML only: h2, h3, p, ul, ol, li, strong, em, blockquote, table, thead, tbody, tr, th, td.
- Do not use script, style, iframe, external images, inline event handlers, markdown fences, or CSS.
- Keep the structure professional and easy to scan.

Current summary HTML:
{current_summary_html or "<p>No summary has been drafted yet.</p>"}

Conversation so far:
{chr(10).join(history_lines) if history_lines else "No previous messages."}

Facilitator instruction:
{instruction}

Consultation material:
{context}
"""

    resolved_model = _resolve_synthesis_model(db, payload.model)
    openai_client = get_openai_client()
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="Synthesis is not configured. Please add an OpenRouter API key in Settings.",
        )

    try:
        completion = openai_client.chat.completions.create(
            model=resolved_model,
            max_tokens=8192,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert synthesis editor embedded in Symphonia. "
                        "You rewrite consultation summaries from evidence, preserve "
                        "uncertainty and disagreement, and always return strict JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )
        raw_output = completion.choices[0].message.content or ""
        parsed = _parse_codex_summary_response(raw_output)
        if not parsed["summary_html"]:
            raise ValueError("Missing summary_html")
        return {
            "message": parsed["message"] or "I updated the synthesis draft.",
            "summary_html": parsed["summary_html"],
            "model": resolved_model,
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="The assistant returned invalid JSON. Try a shorter, more specific instruction.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to edit synthesis with Codex workspace: {e}",
        )


@router.patch(
    "/forms/{form_id}/rounds/{round_id}/synthesis_display",
    tags=["Synthesis"],
    summary="Save synthesis display preferences",
    description=(
        "Persist facilitator choices for which synthesis sections are shown, "
        "their order, and the visual background for a round. Admin only."
    ),
)
@limiter.limit(CRUD_LIMIT)
def update_synthesis_display(
    request: Request,
    form_id: int,
    round_id: int,
    payload: SynthesisDisplayPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    synthesis_json = (
        dict(round_obj.synthesis_json)
        if isinstance(round_obj.synthesis_json, dict)
        else {}
    )

    if payload.summary_options is not None:
        synthesis_json["summary_options"] = _normalise_summary_display_options(
            payload.summary_options
        )
    if payload.summary_order is not None:
        synthesis_json["summary_order"] = _normalise_summary_display_order(
            payload.summary_order
        )
    if payload.synthesis_background is not None:
        synthesis_json["synthesis_background"] = (
            payload.synthesis_background
            if payload.synthesis_background in SUMMARY_BACKGROUND_OPTIONS
            else "default"
        )

    round_obj.synthesis_json = synthesis_json

    active_version = (
        db.query(SynthesisVersion)
        .filter(SynthesisVersion.round_id == round_obj.id, SynthesisVersion.is_active)
        .first()
    )
    if active_version:
        version_json = (
            dict(active_version.synthesis_json)
            if isinstance(active_version.synthesis_json, dict)
            else {}
        )
        for key in ("summary_options", "summary_order", "synthesis_background"):
            if key in synthesis_json:
                version_json[key] = synthesis_json[key]
        active_version.synthesis_json = version_json

    db.commit()
    db.refresh(round_obj)
    return {
        "round_id": round_obj.id,
        "synthesis_json": round_obj.synthesis_json,
    }


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
    model: str = "openai/gpt-4o"
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
            form_id=form_id,
            round_id=active_round.id,
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
    result_dict = _merge_summary_display_preferences(
        result_dict,
        active_round.synthesis_json,
    )
    active_round.synthesis_json = result_dict
    active_round.provenance = result.provenance
    active_round.flow_mode = payload.mode

    # Compute a simple convergence score: avg confidence from confidence_map
    confidences = list(result.confidence_map.values())
    if confidences:
        active_round.convergence_score = sum(confidences) / len(confidences)

    # Also store a text synthesis for backwards compatibility
    active_round.synthesis = _render_synthesis_text(result)

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


@router.get(
    "/forms/{form_id}/rounds/{round_id}/synthesis_job",
    tags=["Synthesis"],
    summary="Get synthesis job status",
    description=(
        "Return the current or most recent background synthesis job for a round. "
        "Used by the summary page to recover progress after refreshes and detect failures "
        "when WebSocket events are unavailable."
    ),
    response_description="Background synthesis job status",
)
@limiter.limit(READ_LIMIT)
async def get_synthesis_job_status(
    request: Request,
    form_id: int,
    round_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    job = await _get_synthesis_job_for_round(form_id, round_id)
    if not job:
        return {"status": "idle", "message": "No synthesis job is currently running."}

    return _serialize_synthesis_job(job)


# ---------------------------------------------------------
# SYNTHESIS EXECUTION
# ---------------------------------------------------------


async def _run_synthesis_job(
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
    summary_options: dict[str, bool] | None = None,
    job_id: str | None = None,
):
    """Run a synthesis job and persist the resulting version.

    Creates its own DB session, runs synthesis, saves the result, and
    broadcasts completion (or error) via WebSocket.
    """
    db = SessionLocal()
    try:

        async def progress_callback(stage: str, step: int, total: int):
            if job_id:
                await _update_synthesis_job(
                    job_id,
                    status="running",
                    stage=stage,
                    step=step,
                    total_steps=total,
                    error=None,
                )
            for conn in ws_manager.active_connections.copy():
                try:
                    await conn.send_json(
                        {
                            "type": "synthesis_progress",
                            "form_id": form_id,
                            "round_id": round_id,
                            "stage": stage,
                            "step": step,
                            "total_steps": total,
                        }
                    )
                except Exception:
                    ws_manager.disconnect(conn)

        synthesis_text = None
        synthesis_json_data = None
        try:
            flow_mode = FlowMode(mode_str)
        except ValueError:
            flow_mode = FlowMode.HUMAN_ONLY

        resolved_model = _resolve_synthesis_model(db, model)
        resolved_summary_options = _normalise_summary_options(summary_options)
        summary_guidance = _format_summary_generation_guidance(resolved_summary_options)
        synthesis_context = comments_context
        if summary_guidance:
            synthesis_context = (
                f"{synthesis_context}\n\n{summary_guidance}"
                if synthesis_context
                else summary_guidance
            )
        runtime_profile = _build_synthesis_runtime_profile(
            strategy,
            response_count=len(response_dicts),
            requested_analysts=n_analysts,
        )
        effective_analysts = int(runtime_profile["n_analysts"])
        timeout_seconds = float(runtime_profile["timeout_seconds"])
        n_denoise_steps = int(runtime_profile["n_denoise_steps"])

        try:
            synthesiser = get_synthesiser(
                api_key=os.getenv("OPENROUTER_API_KEY", ""),
                n_analysts=effective_analysts,
                strategy=strategy,
                model=resolved_model,
                timeout_seconds=timeout_seconds,
                n_denoise_steps=n_denoise_steps,
            )

            result = await synthesiser.run(
                questions=questions,
                responses=response_dicts,
                model=resolved_model,
                mode=flow_mode,
                progress_callback=progress_callback,
                comments_context=synthesis_context,
                form_id=form_id,
                round_id=round_id,
            )
        except (SynthesisConfigError, SynthesisTimeoutError, SynthesisError) as exc:
            logger.error(
                "Synthesis error (round %d): %s",
                round_id,
                exc,
                exc_info=True,
            )
            safe_error = _sanitize_error_message(str(exc))
            if job_id:
                await _update_synthesis_job(
                    job_id,
                    status="failed",
                    stage="preparing",
                    error=safe_error,
                    completed_at=_utcnow(),
                    task=None,
                )
            await _broadcast_synthesis_error(form_id, round_id, safe_error)
            return None
        except Exception as exc:
            logger.error(
                "Unexpected synthesis error (round %d): %s",
                round_id,
                exc,
                exc_info=True,
            )
            safe_error = _sanitize_error_message("An unexpected error occurred")
            if job_id:
                await _update_synthesis_job(
                    job_id,
                    status="failed",
                    stage="preparing",
                    error=safe_error,
                    completed_at=_utcnow(),
                    task=None,
                )
            await _broadcast_synthesis_error(form_id, round_id, safe_error)
            return None

        synthesis_json_data = result.to_dict()
        synthesis_text = _render_synthesis_text(result, resolved_summary_options)

        # ── Save to DB ──
        round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
        if not round_obj:
            logger.error("Synthesis round %d disappeared before save", round_id)
            if job_id:
                await _update_synthesis_job(
                    job_id,
                    status="failed",
                    error="Round not found after synthesis completed",
                    completed_at=_utcnow(),
                    task=None,
                )
            await _broadcast_synthesis_error(
                form_id, round_id, "Round not found after synthesis completed"
            )
            return None

        synthesis_json_data = _merge_summary_display_preferences(
            synthesis_json_data,
            round_obj.synthesis_json,
            summary_options,
        )

        # Deactivate existing versions
        db.query(SynthesisVersion).filter(
            SynthesisVersion.round_id == round_id,
        ).update({"is_active": False})

        new_version = SynthesisVersion(
            round_id=round_id,
            version=next_version,
            synthesis=synthesis_text,
            synthesis_json=synthesis_json_data,
            model_used=resolved_model,
            strategy=strategy,
            is_active=True,
        )
        db.add(new_version)

        round_obj.synthesis = synthesis_text
        round_obj.synthesis_json = synthesis_json_data

        db.commit()
        db.refresh(new_version)
        if job_id:
            await _update_synthesis_job(
                job_id,
                status="completed",
                stage="complete",
                step=4,
                total_steps=4,
                version_id=new_version.id,
                completed_at=_utcnow(),
                error=None,
                task=None,
            )

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
            "Synthesis complete for round %d (version %d)",
            round_id,
            next_version,
        )
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

    except Exception as exc:
        logger.error(
            "Unhandled synthesis error (round %d): %s",
            round_id,
            exc,
            exc_info=True,
        )
        try:
            if job_id:
                await _update_synthesis_job(
                    job_id,
                    status="failed",
                    error=_sanitize_error_message(
                        f"Synthesis failed unexpectedly: {exc}"
                    ),
                    completed_at=_utcnow(),
                    task=None,
                )
            await _broadcast_synthesis_error(
                form_id, round_id, f"Synthesis failed unexpectedly: {exc}"
            )
        except Exception:
            pass
        return None
    finally:
        db.close()


async def _launch_synthesis_job(task_job_id: str, **job_kwargs: Any) -> None:
    try:
        await _update_synthesis_job(
            task_job_id,
            status="running",
            stage="preparing",
            step=1,
            total_steps=4,
            error=None,
        )
        await _run_synthesis_job(job_id=task_job_id, **job_kwargs)
    finally:
        await _update_synthesis_job(task_job_id, task=None)


class GenerateSynthesisVersionPayload(BaseModel):
    model: str = "openai/gpt-4o"
    strategy: str = "simple"  # "simple" | "committee" | "ttd" | "custom"
    n_analysts: int = 3
    mode: str = "human_only"
    summary_options: dict[str, bool] | None = None
    prompt: str | None = None


CUSTOM_SYNTHESIS_BASELINE_PROMPT = """Create a terse claim list. No waffle.

Output plain text only, using this exact structure:

Claims

Claim 1
Status: Uncontested / Questionable / Clear disagreement
People: X of N
Text: ...
Opposing views: None / ...

Claim 2
Status: Uncontested / Questionable / Clear disagreement
People: X of N
Text: ...
Opposing views: None / ...

Rules:
- Output claims, status, people count, and opposing views only.
- Do not include introductions, conclusions, caveats, methodology, evidence notes, next steps, or recommendations.
- Do not include "who/evidence", "position A/B", "what would resolve it", explanations, or paragraphs.
- Each claim must have exactly one status line, one people count line, one text line, and one opposing views line.
- People means the number of submitted responses that make or support the claim, as X of N.
- Use Uncontested when most relevant responses point the same way and there is no meaningful opposition.
- Use Questionable when support is mixed, weak, conditional, or uncertain.
- Use Clear disagreement when there are opposing response positions.
- For Clear disagreement, write the opposing views as a short contrast, not a long explanation.
- For Uncontested or Questionable, use Opposing views: None unless there is a real opposing view.
- Opposing views must be a short phrase, never just "Agree" or "Disagree".
- Put a blank line between every claim.
- Maximum 12 claims total.
- Each claim may appear once only. Do not repeat the same claim under different headings.
- Keep each claim under 22 words.
- Do not invent claims, evidence, consensus, or expert positions.
"""


def _stringify_custom_synthesis_answer(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return "\n".join(
            item
            for item in (
                _stringify_custom_synthesis_answer(candidate).strip()
                for candidate in value
            )
            if item
        )
    if isinstance(value, dict):
        parts: list[str] = []
        for key, label in (
            ("position", "Answer"),
            ("value", "Answer"),
            ("answer", "Answer"),
            ("selected", "Selected"),
            ("selectedScore", "Score"),
            ("score", "Score"),
            ("evidence", "Evidence"),
            ("confidence", "Confidence"),
            ("confidenceJustification", "Confidence rationale"),
            ("counterarguments", "Counterarguments"),
        ):
            if key not in value:
                continue
            text = _stringify_custom_synthesis_answer(value.get(key)).strip()
            if text:
                parts.append(f"{label}: {text}")
        if parts:
            return "\n".join(parts)
        try:
            return json.dumps(value, ensure_ascii=False, indent=2)
        except TypeError:
            return str(value)
    return str(value)


def _question_label_for_custom_synthesis(question: Any, fallback: str) -> str:
    if isinstance(question, str):
        return question.strip() or fallback
    if isinstance(question, dict):
        for key in ("label", "text", "question", "title"):
            value = question.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return fallback


def _format_custom_synthesis_material(
    questions: list[Any],
    response_dicts: list[dict[str, Any]],
) -> str:
    labels = [
        _question_label_for_custom_synthesis(question, f"Question {index + 1}")
        for index, question in enumerate(questions)
    ]
    lines: list[str] = ["Questions:"]
    for index, label in enumerate(labels, start=1):
        lines.append(f"{index}. {label}")
    lines.append("")
    lines.append("Responses:")
    for response_index, response in enumerate(response_dicts, start=1):
        lines.append("")
        lines.append(f"Response {response_index} ({response.get('email') or f'Expert {response_index}'}):")
        answers = response.get("answers") or {}
        if isinstance(answers, str):
            try:
                answers = json.loads(answers)
            except json.JSONDecodeError:
                answers = {}
        if not isinstance(answers, dict):
            answers = {}
        for question_index, label in enumerate(labels, start=1):
            answer = _stringify_custom_synthesis_answer(
                answers.get(f"q{question_index}")
            ).strip()
            lines.append(f"Q{question_index}. {label}")
            lines.append(f"A: {answer or 'No answer'}")
    return "\n".join(lines)


def _format_custom_claim_list(markdown: str) -> str:
    """Render custom claim bullets as simple HTML so line breaks are preserved."""
    def status_style(status: str) -> tuple[str, str, str, str]:
        normalised = status.strip().lower()
        if "clear" in normalised and "disagreement" in normalised:
            return ("#dc2626", "#fef2f2", "Clear disagreement", "🟥")
        if "question" in normalised or "mixed" in normalised or "uncertain" in normalised:
            return ("#d97706", "#fffbeb", "Questionable", "🟨")
        return ("#16a34a", "#f0fdf4", "Uncontested", "🟩")

    def render_structured_claims(claims: list[dict[str, str]]) -> str:
        output = ["<h2>Claims</h2>"]
        for index, item in enumerate(claims, start=1):
            _colour, _background, label, _marker = status_style(item.get("status", "Questionable"))
            claim_text = html.escape(item.get("text", "").strip())
            people = html.escape(item.get("people", "").strip() or "Not counted")
            opposing = item.get("opposing", "").strip()
            if index > 1:
                output.append("<hr>")
            output.append(f"<h3>🟩 Claim {index} - {html.escape(label)}</h3>")
            output.append(f"<p>{claim_text}</p>")
            output.append(f"<p><strong>People making this claim:</strong> {people}</p>")
            output.append(f"<p><strong>Status:</strong> {html.escape(label)}</p>")
            if opposing and opposing.lower() not in {"none", "n/a", "not applicable", "no opposing views"}:
                output.append(f"<p><strong>Opposing views:</strong> {html.escape(opposing)}</p>")
        return "\n".join(output)

    structured_claims: list[dict[str, str]] = []
    current_claim: dict[str, str] | None = None
    for raw_line in markdown.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            continue
        if re.match(r"^claim\s+\d+\b", stripped, re.IGNORECASE):
            if current_claim and current_claim.get("text"):
                structured_claims.append(current_claim)
            current_claim = {"status": "Questionable", "people": "", "text": "", "opposing": ""}
            inline_text = re.sub(r"^claim\s+\d+\s*[:\-–—]?\s*", "", stripped, flags=re.IGNORECASE).strip()
            if inline_text:
                current_claim["text"] = inline_text
            continue
        if current_claim is None:
            continue
        match = re.match(r"^(status|people|text|opposing views?)\s*:\s*(.+)$", stripped, re.IGNORECASE)
        if not match:
            if current_claim.get("text"):
                current_claim["text"] = f"{current_claim['text']} {stripped}".strip()
            continue
        key = match.group(1).lower()
        value = match.group(2).strip()
        if key == "status":
            current_claim["status"] = value
        elif key == "people":
            current_claim["people"] = value
        elif key == "text":
            current_claim["text"] = value
        else:
            current_claim["opposing"] = value
    if current_claim and current_claim.get("text"):
        structured_claims.append(current_claim)

    if structured_claims:
        seen_structured: set[str] = set()
        deduped_structured: list[dict[str, str]] = []
        for item in structured_claims:
            claim_key = re.sub(r"\s+", " ", item.get("text", "").strip().lower())
            if not claim_key or claim_key in seen_structured:
                continue
            seen_structured.add(claim_key)
            deduped_structured.append(item)
        return render_structured_claims(deduped_structured[:12])

    section_order = [
        "### Agreement claims",
        "### Disagreement claims",
        "### Uncertain or conditional claims",
        "### Isolated claims",
    ]
    sections: dict[str, list[tuple[str, str]]] = {heading: [] for heading in section_order}
    seen: set[str] = set()
    current_section: str | None = None
    pending_claim: str | None = None
    pending_confidence = "Medium"

    def normalise_heading(value: str) -> str | None:
        heading = value.lstrip("#").strip().lower()
        if "disagreement" in heading or "contested" in heading or "conflict" in heading:
            return "### Disagreement claims"
        if "uncertain" in heading or "conditional" in heading or "mixed" in heading:
            return "### Uncertain or conditional claims"
        if "isolated" in heading or "minority" in heading:
            return "### Isolated claims"
        if "agreement" in heading or "consensus" in heading or "supported" in heading:
            return "### Agreement claims"
        return None

    def flush_pending() -> None:
        nonlocal pending_claim, pending_confidence
        if not current_section or pending_claim is None:
            pending_claim = None
            pending_confidence = "Medium"
            return
        claim = pending_claim.strip().rstrip(".")
        if claim:
            claim = f"{claim}."
        claim_key = re.sub(r"\s+", " ", claim.lower())
        if claim and claim_key not in seen:
            seen.add(claim_key)
            sections[current_section].append((claim, pending_confidence))
        pending_claim = None
        pending_confidence = "Medium"

    for line in markdown.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            flush_pending()
            current_section = normalise_heading(stripped) or current_section
            continue
        plain_heading = normalise_heading(stripped)
        if plain_heading and not stripped.startswith("-"):
            flush_pending()
            current_section = plain_heading
            continue

        if not current_section:
            if "claim" in stripped.lower():
                current_section = "### Uncertain or conditional claims"
            else:
                continue

        if stripped.startswith("- **Claim:**"):
            flush_pending()
            pending_claim = stripped.removeprefix("- **Claim:**").strip()
            continue
        if stripped.startswith("- **Claim**"):
            flush_pending()
            pending_claim = stripped.removeprefix("- **Claim**").strip()
            continue
        bold_bullet_match = re.match(r"-\s+\*\*(.+?)\*\*\s*$", stripped)
        if bold_bullet_match and not bold_bullet_match.group(1).lower().startswith("confidence:"):
            flush_pending()
            pending_claim = bold_bullet_match.group(1).strip()
            continue
        if stripped.startswith("- Claim:"):
            flush_pending()
            pending_claim = stripped.removeprefix("- Claim:").strip()
            continue
        generic_bullet_match = re.match(r"[-*+]\s+(.+)$", stripped)
        if generic_bullet_match and not generic_bullet_match.group(1).lower().startswith("confidence:"):
            flush_pending()
            pending_claim = generic_bullet_match.group(1).strip()
            continue
        if stripped.startswith("Claim:"):
            flush_pending()
            pending_claim = stripped.removeprefix("Claim:").strip()
            continue
        if stripped.startswith("**Confidence:**"):
            pending_confidence = stripped.removeprefix("**Confidence:**").strip() or "Medium"
            continue
        if stripped.startswith("- **Confidence:**"):
            pending_confidence = stripped.removeprefix("- **Confidence:**").strip() or "Medium"
            continue
        if stripped.startswith("Confidence:"):
            pending_confidence = stripped.removeprefix("Confidence:").strip() or "Medium"
            continue
        if stripped.startswith("- Confidence:"):
            pending_confidence = stripped.removeprefix("- Confidence:").strip() or "Medium"
            continue
        if pending_claim is not None and stripped and not stripped.startswith("#"):
            pending_claim = f"{pending_claim} {stripped}".strip()

    flush_pending()

    output: list[str] = ["<h2>Claims</h2>"]
    for heading in section_order:
        claims = sections.get(heading) or []
        if not claims:
            continue
        section_title = heading.removeprefix("### ").strip()
        output.append(f"<h3>{html.escape(section_title)}</h3>")
        output.append("<ul>")
        for claim, confidence in claims:
            output.append(
                "<li>"
                f"{html.escape(claim)}"
                "<br>"
                f"<strong>Confidence:</strong> {html.escape(confidence)}"
                "</li>"
            )
        output.append("</ul>")

    formatted = "\n".join(output).strip()
    return formatted if any(sections.get(heading) for heading in section_order) else markdown.strip()


async def _run_custom_synthesis(
    *,
    form_id: int,
    round_id: int,
    round_number: int,
    questions: list[Any],
    response_dicts: list[dict[str, Any]],
    comments_context: str,
    next_version: int,
    model: str,
    custom_prompt: str,
    summary_options: dict[str, bool] | None,
    db: Session,
) -> dict[str, Any]:
    resolved_model = _resolve_synthesis_model(db, model)
    prompt = custom_prompt.strip()

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Synthesis is not configured. Please add an OpenRouter API key.",
        )

    material = _format_custom_synthesis_material(questions, response_dicts)
    summary_guidance = _format_summary_generation_guidance(
        _normalise_summary_options(summary_options)
    )
    comments_section = (
        f"\n\nDiscussion comments:\n{comments_context.strip()}"
        if comments_context.strip()
        else ""
    )
    guidance_section = f"\n\n{summary_guidance}" if summary_guidance else ""
    facilitator_instruction = (
        f"{CUSTOM_SYNTHESIS_BASELINE_PROMPT}\n\nAdditional facilitator instruction:\n{prompt}"
        if prompt
        else CUSTOM_SYNTHESIS_BASELINE_PROMPT
    )
    user_prompt = f"""Synthesis instruction:
{facilitator_instruction}

Use only the consultation material below. Preserve disagreement and uncertainty. Do not invent evidence or consensus.
{guidance_section}

{material}{comments_section}
"""

    try:
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
        completion = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model=resolved_model,
                max_tokens=2500,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert facilitator writing custom "
                            "syntheses of structured consultation responses."
                        ),
                    },
                    {"role": "user", "content": user_prompt},
                ],
            ),
            timeout=45,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="Custom synthesis timed out. Try a shorter prompt or a faster model.",
        ) from exc
    except Exception as exc:
        logger.exception("Custom synthesis failed for round %d", round_id)
        raise HTTPException(
            status_code=500,
            detail=f"Custom synthesis failed: {_sanitize_error_message(str(exc))}",
        ) from exc

    synthesis_text = _format_custom_claim_list(
        completion.choices[0].message.content or ""
    )
    synthesis_json_data = _merge_summary_display_preferences(
        {
            "narrative": synthesis_text,
            "confidence_map": {"overall": 0.5},
            "agreements": [],
            "disagreements": [],
            "nuances": [],
            "follow_up_probes": [],
            "analyst_reports": [],
            "meta_synthesis_reasoning": (
                "Generated with a facilitator-provided custom synthesis prompt."
            ),
            "provenance": {
                "mode": "custom",
                "model": resolved_model,
                "form_id": form_id,
                "round_id": round_id,
                "round_number": round_number,
                "custom_prompt": prompt,
                "baseline_prompt": CUSTOM_SYNTHESIS_BASELINE_PROMPT,
            },
        },
        None,
        summary_options,
    )

    round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    synthesis_json_data = _merge_summary_display_preferences(
        synthesis_json_data,
        round_obj.synthesis_json,
        summary_options,
    )
    db.query(SynthesisVersion).filter(
        SynthesisVersion.round_id == round_id,
    ).update({"is_active": False})
    new_version = SynthesisVersion(
        round_id=round_id,
        version=next_version,
        synthesis=synthesis_text,
        synthesis_json=synthesis_json_data,
        model_used=resolved_model,
        strategy="custom",
        is_active=True,
    )
    db.add(new_version)
    round_obj.synthesis = synthesis_text
    round_obj.synthesis_json = synthesis_json_data
    db.commit()
    db.refresh(new_version)

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


@router.post(
    "/forms/{form_id}/rounds/{round_id}/generate_synthesis",
    tags=["Synthesis"],
    summary="Generate synthesis for any round",
    description=(
        "Generate a new synthesis version for ANY round (not just active). Supports "
        "'simple', 'committee', 'ttd', and 'custom' strategies. Long-running strategies are "
        "queued as background jobs so the website does not time out while they run. "
        "Progress is broadcast via WebSocket and can also be polled via the synthesis "
        "job status endpoint. Admin only."
    ),
    response_description="New synthesis version object",
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
    Simple synthesis also returns synchronously. Committee and TTD are
    launched as background jobs so the website can stay responsive and
    avoid upstream request timeouts.
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
    if strategy not in {"simple", "committee", "ttd", "custom", "question_summaries"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid synthesis strategy. Use 'custom', 'simple', 'committee', or 'ttd'.",
        )
    if strategy == "question_summaries":
        strategy = "custom"

    synthesis_mode_env = os.getenv("SYNTHESIS_MODE", "").lower()
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    summary_options = payload.summary_options
    generation_summary_options = _normalise_summary_options(payload.summary_options)
    estimated_seconds = _estimate_synthesis_duration_seconds(
        strategy,
        len(responses),
        n_analysts=payload.n_analysts,
        model=payload.model,
    )
    estimated_label = _format_duration_estimate(estimated_seconds)

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

    if strategy == "custom" and synthesis_mode_env != "mock" and api_key:
        return await _run_custom_synthesis(
            form_id=form_id,
            round_id=round_id,
            round_number=round_number,
            questions=list(questions),
            response_dicts=response_dicts,
            comments_context=round_comments_context,
            next_version=next_version,
            model=payload.model,
            custom_prompt=payload.prompt or "",
            summary_options=summary_options,
            db=db,
        )

    # ── 3a. Mock mode → return synchronously (instant, no LLM call) ──
    if synthesis_mode_env == "mock" or not api_key:
        custom_note = ""
        if strategy == "custom":
            prompt_preview = (payload.prompt or "").strip()
            custom_note = (
                f"\n\n*Custom prompt:* {prompt_preview[:500]}"
                if prompt_preview
                else "\n\n*Custom prompt:* Not provided"
            )
        synthesis_text = (
            f"## Synthesis v{next_version} (Mock Mode)\n\n"
            f"**Round {round_number}** — {len(responses)} responses analysed.\n\n"
            f"*Strategy: {strategy} | Model: {payload.model}*\n\n"
            f"*Sections: {', '.join(label for key, label in SUMMARY_OPTION_LABELS.items() if generation_summary_options.get(key))}*\n\n"
            f"{custom_note}\n\n"
            "This is a mock synthesis. Enable OPENROUTER_API_KEY for real LLM synthesis."
        )
        synthesis_json_data = _merge_summary_display_preferences(
            {},
            round_obj.synthesis_json,
            summary_options,
        )

        db.query(SynthesisVersion).filter(
            SynthesisVersion.round_id == round_id,
        ).update({"is_active": False})

        new_version = SynthesisVersion(
            round_id=round_id,
            version=next_version,
            synthesis=synthesis_text,
            synthesis_json=synthesis_json_data,
            model_used=payload.model,
            strategy=strategy,
            is_active=True,
        )
        db.add(new_version)
        round_obj.synthesis = synthesis_text
        round_obj.synthesis_json = synthesis_json_data
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
                        "synthesis_json": synthesis_json_data,
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

    if strategy in {"committee", "ttd"}:
        job = await _create_synthesis_job(
            form_id=form_id,
            round_id=round_id,
            strategy=strategy,
            model=payload.model,
            estimate_seconds=estimated_seconds,
            estimate_label=estimated_label,
        )
        if job.get("task") is None and job.get("status") not in {
            "running",
            "completed",
        }:
            task = asyncio.create_task(
                _launch_synthesis_job(
                    job["job_id"],
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
                    summary_options=summary_options,
                )
            )
            task.add_done_callback(lambda _task: None)
            await _update_synthesis_job(job["job_id"], task=task)

        started_job = await _get_synthesis_job_for_round(form_id, round_id)
        payload_data = _serialize_synthesis_job(started_job or job)
        payload_data["status"] = "started"
        return JSONResponse(status_code=202, content=payload_data)

    # ── 3b. Real simple synthesis → run inside the request ──
    result = await _run_synthesis_job(
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
        summary_options=summary_options,
        job_id=None,
    )
    if result is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Synthesis failed before completion. "
                f"Expected time was {estimated_label}."
            ),
        )
    return result


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


_ROUND_FEEDBACK_PREAMBLE_RE = re.compile(
    r"^\s*below is a synthesis you can use as the round\s+1 feedback report "
    r"and as the basis for round\s+2\.?\s*",
    re.IGNORECASE,
)


def _clean_synthesis_export_text(value: str | None) -> str:
    if not value:
        return ""
    return _ROUND_FEEDBACK_PREAMBLE_RE.sub("", value, count=1).strip()


def _export_question_text(question: Any) -> str:
    if isinstance(question, str):
        return question.strip()
    if isinstance(question, dict):
        for key in ("label", "text", "question", "title"):
            value = question.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return str(question).strip()


def _round_question_texts(round_obj: RoundModel | None) -> list[str]:
    if not round_obj or not isinstance(round_obj.questions, list):
        return []
    return [
        text
        for question in round_obj.questions
        if (text := _export_question_text(question))
    ]


def _synthesis_probe_questions(
    synthesis_json: Any,
) -> list[dict[str, Any]]:
    if not isinstance(synthesis_json, dict):
        return []
    probes = synthesis_json.get("follow_up_probes")
    if not isinstance(probes, list):
        return []
    result: list[dict[str, Any]] = []
    for probe in probes:
        if not isinstance(probe, dict):
            continue
        question = probe.get("question")
        if isinstance(question, str) and question.strip():
            result.append(
                {
                    "question": question.strip(),
                    "rationale": probe.get("rationale"),
                    "target_experts": probe.get("target_experts"),
                }
            )
    return result


def _append_next_round_questions(
    lines: list[str],
    round_obj: RoundModel,
    next_round: RoundModel | None,
) -> bool:
    next_round_number = round_obj.round_number + 1
    configured_questions = _round_question_texts(next_round)
    probe_questions = _synthesis_probe_questions(round_obj.synthesis_json)

    if configured_questions:
        lines.append(f"### Questions for Round {next_round_number}")
        lines.append("")
        lines.append("These are the questions currently configured for the next round.")
        lines.append("")
        for index, question in enumerate(configured_questions, 1):
            lines.append(f"{index}. {question}")
        lines.append("")
        return True

    if not probe_questions:
        return False

    lines.append(f"### Proposed Questions for Round {next_round_number}")
    lines.append("")
    lines.append("Use these questions to turn the synthesis into a focused next round.")
    lines.append("")
    for index, probe in enumerate(probe_questions, 1):
        lines.append(f"{index}. {probe['question']}")
        rationale = probe.get("rationale")
        if isinstance(rationale, str) and rationale.strip():
            lines.append(f"   - Rationale: {rationale.strip()}")
        target = probe.get("target_experts")
        if isinstance(target, list) and target:
            lines.append(
                "   - Target experts: "
                + ", ".join(f"Expert {expert}" for expert in target)
            )
    lines.append("")
    return True


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

    for round_index, rnd in enumerate(rounds_list):
        next_round = (
            rounds_list[round_index + 1] if round_index + 1 < len(rounds_list) else None
        )
        heading_suffix = " Feedback Report" if rnd.round_number == 1 else ""
        lines.append(f"## Round {rnd.round_number}{heading_suffix}")
        lines.append("")

        if rnd.convergence_score is not None:
            lines.append(f"**Convergence Score:** {rnd.convergence_score * 100:.0f}%")
            lines.append("")

        questions = rnd.questions or []
        if questions:
            lines.append(f"### Round {rnd.round_number} Questions")
            lines.append("")
            for i, q in enumerate(questions, 1):
                q_text = _export_question_text(q)
                lines.append(f"{i}. {q_text}")
            lines.append("")

        sj = rnd.synthesis_json
        if sj and isinstance(sj, dict):
            # Narrative
            if sj.get("narrative"):
                lines.append("### Narrative")
                lines.append("")
                lines.append(_clean_synthesis_export_text(sj["narrative"]))
                lines.append("")

            # Agreements
            agreements = sj.get("agreements", [])
            if agreements:
                lines.append("### Agreements")
                lines.append("")
                for index, a in enumerate(agreements, start=1):
                    conf = a.get("confidence", 0)
                    lines.append(f"#### Agreement {index}")
                    lines.append("")
                    lines.append(f"**Claim:** {a.get('claim', '')}")
                    lines.append(f"**Confidence:** {conf * 100:.0f}%")
                    experts = a.get("supporting_experts", [])
                    if experts:
                        lines.append(
                            f"**Supporting experts:** {', '.join(f'Expert {e}' for e in experts)}"
                        )
                    if a.get("evidence_summary"):
                        lines.append(f"**Evidence:** {a['evidence_summary']}")
                    excerpts = a.get("evidence_excerpts", [])
                    if excerpts:
                        lines.append("**Supporting excerpts:**")
                        for ex in excerpts:
                            label = ex.get(
                                "expert_label", f"Expert {ex.get('expert_id', '?')}"
                            )
                            lines.append(f'- _{label}_: "{ex.get("quote", "")}"')
                    lines.append("")
                lines.append("")

            # Disagreements
            disagreements = sj.get("disagreements", [])
            if disagreements:
                lines.append("### Disagreements")
                lines.append("")
                for index, d in enumerate(disagreements, start=1):
                    sev = d.get("severity", "moderate")
                    lines.append(f"#### Disagreement {index}")
                    lines.append("")
                    lines.append(f"**Topic:** {d.get('topic', '')}")
                    lines.append(f"**Severity:** {sev}")
                    positions = d.get("positions", [])
                    if positions:
                        lines.append("")
                    for position_index, pos in enumerate(positions, start=1):
                        experts = pos.get("experts", [])
                        lines.append(
                            f"**Position {position_index}:** {pos.get('position', '')}"
                        )
                        if experts:
                            lines.append(
                                f"**Experts:** {', '.join(f'Expert {e}' for e in experts)}"
                            )
                        if pos.get("evidence"):
                            lines.append(f"**Evidence:** {pos['evidence']}")
                        lines.append("")
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

            _append_next_round_questions(lines, rnd, next_round)

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
            lines.append(_clean_synthesis_export_text(rnd.synthesis))
            lines.append("")
            _append_next_round_questions(lines, rnd, next_round)

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

    safe_title = _safe_export_title(form, form_id)

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
                    "next_round_questions": (
                        _round_question_texts(rounds_list[index + 1])
                        if index + 1 < len(rounds_list)
                        else [
                            probe["question"]
                            for probe in _synthesis_probe_questions(rnd.synthesis_json)
                        ]
                    ),
                }
                for index, rnd in enumerate(rounds_list)
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
        pdf_bytes = _markdown_to_pdf_bytes(md_content)
        return FastAPIResponse(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-synthesis.pdf"',
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


@router.get(
    "/forms/{form_id}/export_responses",
    tags=["Responses"],
    summary="Export responses document",
    description=(
        "Export all rounds' responses as a downloadable document. "
        "Supports `format=markdown` (default), `format=json`, or `format=pdf`."
    ),
)
def export_responses(
    form_id: int,
    format: str = Query("markdown", pattern="^(markdown|json|pdf)$"),
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    rounds_list = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )
    safe_title = _safe_export_title(form, form_id)
    responses_payload = _build_responses_export_payload(db, rounds_list)

    if format == "json":
        payload = {
            "form_id": form.id,
            "title": form.title,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "rounds": responses_payload,
        }
        return FastAPIResponse(
            content=json.dumps(payload, indent=2, default=str),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-responses.json"',
            },
        )

    md_content = _build_responses_markdown(form, responses_payload)
    if format == "pdf":
        pdf_bytes = _markdown_to_pdf_bytes(md_content)
        return FastAPIResponse(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-responses.pdf"',
            },
        )

    return FastAPIResponse(
        content=md_content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}-responses.md"',
        },
    )


@router.get(
    "/forms/{form_id}/export_consultation",
    tags=["Forms"],
    summary="Export consultation pack",
    description=(
        "Export the full consultation pack including synthesis and responses. "
        "Supports `format=markdown` (default), `format=json`, or `format=pdf`."
    ),
)
def export_consultation(
    form_id: int,
    format: str = Query("markdown", pattern="^(markdown|json|pdf)$"),
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    rounds_list = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id)
        .order_by(RoundModel.round_number.asc())
        .all()
    )
    safe_title = _safe_export_title(form, form_id)
    responses_payload = _build_responses_export_payload(db, rounds_list)

    if format == "json":
        payload = {
            "form_id": form.id,
            "title": form.title,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "synthesis": [
                {
                    "round_number": rnd.round_number,
                    "convergence_score": rnd.convergence_score,
                    "synthesis_json": rnd.synthesis_json,
                    "synthesis_text": rnd.synthesis,
                    "questions": rnd.questions,
                    "next_round_questions": (
                        _round_question_texts(rounds_list[index + 1])
                        if index + 1 < len(rounds_list)
                        else [
                            probe["question"]
                            for probe in _synthesis_probe_questions(rnd.synthesis_json)
                        ]
                    ),
                }
                for index, rnd in enumerate(rounds_list)
            ],
            "responses": responses_payload,
        }
        return FastAPIResponse(
            content=json.dumps(payload, indent=2, default=str),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-consultation.json"',
            },
        )

    md_content = _build_consultation_markdown(form, rounds_list, responses_payload)
    if format == "pdf":
        pdf_bytes = _markdown_to_pdf_bytes(md_content)
        return FastAPIResponse(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_title}-consultation.pdf"',
            },
        )

    return FastAPIResponse(
        content=md_content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}-consultation.md"',
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


class QuestionConfig(BaseModel):
    label: str
    requireEvidence: bool = True
    requireCounterarguments: bool = True
    requireConfidence: bool = True
    questionId: str | None = None
    sectionTitle: str | None = None
    helpText: str | None = None
    groupPrompt: str | None = None
    optional: bool | None = None
    conditionalOnQuestionId: str | None = None
    conditionalOnOption: str | None = None
    inputType: str | None = None
    options: list[str] | None = None
    allowUnsure: bool | None = None
    maxSelections: int | None = None
    minValue: int | None = None
    maxValue: int | None = None
    minLabel: str | None = None
    midLabel: str | None = None
    maxLabel: str | None = None
    importedFromQuestionnaire: bool | None = None
    fieldType: str | None = None
    rows: int | None = None
    placeholder: str | None = None


class FormCreate(BaseModel):
    title: str
    questions: list[str | QuestionConfig]
    allow_join: bool
    join_code: str
    allow_public_responses: bool = False
    require_consent: bool = False
    consent_text: str | None = None
    consent_document: str | None = None
    public_require_consent: bool = False
    public_consent_text: str | None = None
    public_require_upload: bool = False
    public_upload_prompt: str | None = None


class FormUpdate(BaseModel):
    title: str
    questions: list[str | QuestionConfig] = []
    document_template: str | None = None
    allow_public_responses: bool = False
    require_consent: bool = False
    consent_text: str | None = None
    consent_document: str | None = None
    public_require_consent: bool = False
    public_consent_text: str | None = None
    public_require_upload: bool = False
    public_upload_prompt: str | None = None


class ParticipantVisibilityPayload(BaseModel):
    show_own_response_to_participants: bool


DOCUMENT_PLACEHOLDER_PATTERN = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
RICH_DOCUMENT_FIELD_PATTERN = re.compile(
    r"<span\b[^>]*data-symphonia-field-key=(['\"])(?P<key>.*?)\1(?P<attrs>[^>]*)>",
    re.IGNORECASE | re.DOTALL,
)
HTML_HEADING_PATTERN = re.compile(
    r"<h(?P<level>[1-6])\b[^>]*>[\s\S]*?</h(?P=level)>",
    re.IGNORECASE,
)
WORDPROCESSINGML_NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
}
EDITABLE_DOCUMENT_TEMPLATE_PREFIX = "<!-- symphonia-document-mode: editable -->"
RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX = (
    "<!-- symphonia-document-mode: fillable-rich -->"
)
DEFAULT_PUBLIC_CONSENT_TEXT = (
    "I confirm that I understand the purpose of this form and consent to my "
    "response being used within this consultation."
)
PUBLIC_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "public-intake"


def _is_editable_document_template(template: str | None) -> bool:
    return bool(
        template and template.lstrip().startswith(EDITABLE_DOCUMENT_TEMPLATE_PREFIX)
    )


def _is_rich_fillable_document_template(template: str | None) -> bool:
    return bool(
        template
        and template.lstrip().startswith(RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX)
    )


def _strip_document_template_prefix(template: str | None) -> str:
    if not template:
        return ""
    if _is_editable_document_template(template):
        return template.replace(EDITABLE_DOCUMENT_TEMPLATE_PREFIX, "", 1).strip()
    if _is_rich_fillable_document_template(template):
        return template.replace(RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX, "", 1).strip()
    return template


def _split_html_heading_sections(markup: str) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    matches = list(HTML_HEADING_PATTERN.finditer(markup))
    if not matches:
        if markup.strip():
            sections.append(
                {
                    "raw": markup.strip(),
                    "heading": "",
                    "heading_text": "",
                    "heading_level": 0,
                }
            )
        return sections

    if matches[0].start() > 0:
        prefix = markup[: matches[0].start()].strip()
        if prefix:
            sections.append(
                {
                    "raw": prefix,
                    "heading": "",
                    "heading_text": "",
                    "heading_level": 0,
                }
            )

    for index, match in enumerate(matches):
        next_start = (
            matches[index + 1].start() if index + 1 < len(matches) else len(markup)
        )
        raw = markup[match.start() : next_start].strip()
        heading = match.group(0)
        sections.append(
            {
                "raw": raw,
                "heading": heading,
                "heading_text": _html_to_plain_text(heading),
                "heading_level": int(match.group("level")),
            }
        )
    return sections


def _recommendation_heading_number(text: str) -> int | None:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    match = re.search(r"\brecommendation\s+(\d{1,2})\b", normalized, re.IGNORECASE)
    if not match:
        match = re.match(r"^(\d{1,2})[\.\)]\s+\S", normalized)
    if not match:
        return None
    number = int(match.group(1))
    return number if 1 <= number <= 50 else None


def _is_survey_control_heading(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text or "").strip().casefold()
    return normalized in {
        "delphi round 2 questions",
        "overall questions",
        "opening questions",
        "each recommendation",
        "recommendation-by-recommendation",
        "recommendation by recommendation",
    }


def _is_recommendation_wrapper_heading(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text or "").strip().casefold()
    return normalized in {
        "recommendations",
        "recommendations for round 2",
        "revised recommendations",
        "recommendations for review",
    }


def _strip_rich_field_spans(markup: str) -> str:
    return re.sub(
        r"<span\b[^>]*data-symphonia-field-key[\s\S]*?</span>",
        "",
        markup or "",
        flags=re.IGNORECASE,
    ).strip()


def _section_body_markup(section: dict[str, Any]) -> str:
    raw = str(section.get("raw") or "")
    heading = str(section.get("heading") or "")
    if heading and raw.startswith(heading):
        return raw[len(heading) :].strip()
    return raw.strip()


def _section_body_plain_text(section: dict[str, Any]) -> str:
    return _html_to_plain_text(_section_body_markup(section))


def _extract_recommendation_list_sections(markup: str) -> dict[int, str]:
    recommendations: dict[int, str] = {}
    list_items = re.findall(
        r"<li\b[^>]*>([\s\S]*?)</li>", markup or "", flags=re.IGNORECASE
    )
    for index, item_markup in enumerate(list_items, start=1):
        strong_match = re.search(
            r"<strong\b[^>]*>([\s\S]*?)</strong>",
            item_markup,
            flags=re.IGNORECASE,
        )
        paragraph_match = re.search(
            r"<p\b[^>]*>([\s\S]*?)</p>", item_markup, flags=re.IGNORECASE
        )
        title_source = (
            strong_match.group(1)
            if strong_match
            else paragraph_match.group(1)
            if paragraph_match
            else ""
        )
        title = _html_to_plain_text(title_source)
        if not title:
            continue

        body_markup = item_markup
        if strong_match:
            body_markup = re.sub(
                r"<p\b[^>]*>\s*<strong\b[^>]*>[\s\S]*?</strong>\s*</p>",
                "",
                body_markup,
                count=1,
                flags=re.IGNORECASE,
            )
        elif paragraph_match:
            body_markup = body_markup.replace(paragraph_match.group(0), "", 1)
        recommendations[index] = (
            f"<h3>Recommendation {index}. {html.escape(title)}</h3>\n"
            f"{body_markup.strip()}"
        ).strip()
    return recommendations


def _coerce_first_heading_level(markup: str, level: int) -> str:
    if level < 1 or level > 6:
        return markup
    if not HTML_HEADING_PATTERN.search(markup):
        return markup
    coerced = re.sub(
        r"<h[1-6](\b[^>]*)>",
        rf"<h{level}\1>",
        markup,
        count=1,
        flags=re.IGNORECASE,
    )
    return re.sub(r"</h[1-6]>", f"</h{level}>", coerced, count=1, flags=re.IGNORECASE)


def _replace_rich_section_text_preserving_fields(
    template_section: dict[str, Any],
    replacement_markup: str,
) -> str:
    replacement = _strip_rich_field_spans(replacement_markup)
    replacement = _coerce_first_heading_level(
        replacement, int(template_section.get("heading_level") or 0)
    ).strip()
    if not replacement:
        return str(template_section["raw"])

    field_match = RICH_DOCUMENT_FIELD_PATTERN.search(str(template_section["raw"]))
    if not field_match:
        return replacement
    field_suffix = str(template_section["raw"])[field_match.start() :].lstrip()
    return f"{replacement}\n{field_suffix}"


def _sync_rich_document_template_from_summary(
    template: str | None,
    summary_html: str,
) -> str | None:
    if not _is_rich_fillable_document_template(template):
        return None

    template_body = _strip_document_template_prefix(template)
    template_sections = _split_html_heading_sections(template_body)
    if not template_sections:
        return None

    summary_body = _sanitize_llm_summary_html(summary_html)
    source_sections = _split_html_heading_sections(summary_body)
    if not source_sections:
        return None

    source_recommendations: dict[int, str] = {}
    source_conclusion: str | None = None
    intro_parts: list[str] = []
    seen_recommendation = False

    for section in source_sections:
        heading_text = str(section.get("heading_text") or "")
        rec_number = _recommendation_heading_number(heading_text)
        if rec_number is not None:
            seen_recommendation = True
            source_recommendations[rec_number] = str(section["raw"])
            continue
        if _is_recommendation_wrapper_heading(heading_text):
            list_recommendations = _extract_recommendation_list_sections(
                str(section["raw"])
            )
            if list_recommendations:
                seen_recommendation = True
                source_recommendations.update(list_recommendations)
                continue
        if "conclusion" in heading_text.casefold():
            source_conclusion = str(section["raw"])
            continue
        if (
            not seen_recommendation
            and not _is_survey_control_heading(heading_text)
            and (
                not _is_recommendation_wrapper_heading(heading_text)
                or _section_body_plain_text(section)
            )
        ):
            intro_parts.append(str(section["raw"]))

    intro_markup = "\n".join(intro_parts).strip()
    if not intro_markup and not source_recommendations and not source_conclusion:
        return None

    changed = False
    intro_applied = False
    next_sections: list[str] = []
    for index, section in enumerate(template_sections):
        heading_text = str(section.get("heading_text") or "")
        rec_number = _recommendation_heading_number(heading_text)
        next_raw = str(section["raw"])

        if rec_number is not None and rec_number in source_recommendations:
            next_raw = _replace_rich_section_text_preserving_fields(
                section, source_recommendations[rec_number]
            )
        elif "conclusion" in heading_text.casefold() and source_conclusion:
            next_raw = _replace_rich_section_text_preserving_fields(
                section, source_conclusion
            )
        elif (
            index == 0
            and intro_markup
            and not intro_applied
            and not _is_survey_control_heading(heading_text)
        ):
            next_raw = _replace_rich_section_text_preserving_fields(
                section, intro_markup
            )
            intro_applied = True

        if next_raw != section["raw"]:
            changed = True
        next_sections.append(next_raw)

    if not changed:
        return None

    next_body = "\n".join(next_sections)
    return _normalize_document_template(
        f"{RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX}\n{next_body}"
    )


def _parse_bool_attr(value: str | None) -> bool:
    return (value or "").strip().lower() == "true"


def _parse_rich_document_field_attrs(template: str) -> list[dict[str, Any]]:
    body = _strip_document_template_prefix(template)
    seen: set[str] = set()
    derived: list[dict[str, Any]] = []

    for match in RICH_DOCUMENT_FIELD_PATTERN.finditer(body):
        tag_markup = match.group(0)
        attrs = {
            attr_match.group("name"): html.unescape(attr_match.group("value"))
            for attr_match in re.finditer(
                r'(?P<name>data-symphonia-[a-z-]+)=(["\'])(?P<value>.*?)\2',
                tag_markup,
                flags=re.IGNORECASE | re.DOTALL,
            )
        }
        label = attrs.get("data-symphonia-field-label", "").strip()
        if not label:
            continue
        normalized_key = label.casefold()
        if normalized_key in seen:
            continue
        seen.add(normalized_key)

        field_type = attrs.get("data-symphonia-field-type", "long").strip().lower()
        input_type = attrs.get("data-symphonia-input-type", "textarea").strip().lower()
        if field_type not in {
            "short",
            "long",
            "single_select",
            "multi_select",
            "slider",
            "likert",
        }:
            continue
        if input_type not in {
            "text",
            "textarea",
            "single_select",
            "multi_select",
            "slider",
            "likert",
        }:
            input_type = (
                "text"
                if field_type == "short"
                else "textarea"
                if field_type == "long"
                else field_type
            )

        options: list[str] | None = None
        raw_options = attrs.get("data-symphonia-options")
        if raw_options:
            try:
                parsed = json.loads(raw_options)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                options = [str(item).strip() for item in parsed if str(item).strip()]

        def parse_int_attr(name: str) -> int | None:
            raw = attrs.get(name)
            if raw is None or raw == "":
                return None
            try:
                return int(raw)
            except ValueError:
                return None

        rows = parse_int_attr("data-symphonia-rows") or (
            1 if field_type == "short" else 6
        )
        min_value = parse_int_attr("data-symphonia-min-value")
        max_value = parse_int_attr("data-symphonia-max-value")
        min_label = attrs.get("data-symphonia-min-label") or None
        mid_label = attrs.get("data-symphonia-mid-label") or None
        max_label = attrs.get("data-symphonia-max-label") or None
        allow_unsure = _parse_bool_attr(attrs.get("data-symphonia-allow-unsure"))
        question_id = attrs.get("data-symphonia-question-id") or None
        conditional_question_id = (
            attrs.get("data-symphonia-conditional-question-id") or None
        )
        conditional_option = attrs.get("data-symphonia-conditional-option") or None

        if field_type in {"single_select", "multi_select"} and not options:
            options = ["Option 1", "Option 2"]
        if field_type == "slider":
            min_value = 0 if min_value is None else min_value
            max_value = 10 if max_value is None else max_value
            min_label = min_label or str(min_value)
            max_label = max_label or str(max_value)
        if field_type == "likert" and (not options or len(options) < 2):
            options = [
                "Unimportant",
                "Somewhat important",
                "Moderately important",
                "Very important",
                "Essential",
            ]

        derived.append(
            QuestionConfig(
                label=label,
                requireEvidence=False,
                requireCounterarguments=False,
                requireConfidence=False,
                questionId=question_id,
                optional=_parse_bool_attr(attrs.get("data-symphonia-optional")),
                conditionalOnQuestionId=conditional_question_id,
                conditionalOnOption=conditional_option,
                inputType=input_type,
                options=options,
                minValue=min_value,
                maxValue=max_value,
                minLabel=min_label,
                midLabel=mid_label,
                maxLabel=max_label,
                allowUnsure=allow_unsure,
                fieldType=field_type,
                rows=rows,
                placeholder=(
                    attrs.get("data-symphonia-placeholder") or f"Enter {label.lower()}"
                ),
            ).model_dump()
        )
    return derived


def _html_to_plain_text(value: str) -> str:
    text = re.sub(r"<style[\s\S]*?</style>", " ", value, flags=re.IGNORECASE)
    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.IGNORECASE)
    text = re.sub(
        r"</(p|div|li|h1|h2|h3|h4|h5|h6|tr)>", "\n", text, flags=re.IGNORECASE
    )
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _public_join_form_by_code(db: Session, raw_code: str) -> FormModel | None:
    form = (
        db.query(FormModel)
        .filter(
            FormModel.join_code == raw_code,
            FormModel.allow_join,
            FormModel.allow_public_responses,
        )
        .first()
    )
    if form:
        return form

    normalized = normalize_join_code(raw_code)
    if not normalized:
        return None

    all_forms = (
        db.query(FormModel)
        .filter(FormModel.allow_join, FormModel.allow_public_responses)
        .all()
    )
    for candidate in all_forms:
        if normalize_join_code(candidate.join_code) == normalized:
            return candidate
    return None


def _get_active_round_for_form(db: Session, form_id: int) -> RoundModel | None:
    return (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active)
        .first()
    )


def _get_user_form_unlock(
    db: Session, *, form_id: int, user_id: int
) -> UserFormUnlock | None:
    return (
        db.query(UserFormUnlock)
        .filter(UserFormUnlock.form_id == form_id, UserFormUnlock.user_id == user_id)
        .first()
    )


def _user_has_completed_consent(
    form: FormModel, user: User, unlock: UserFormUnlock | None
) -> bool:
    if not _consent_required(form):
        return True
    if (
        user.role
        in (
            UserRole.FACILITATOR.value,
            UserRole.PLATFORM_ADMIN.value,
        )
        and form.owner_id == user.id
    ):
        return True
    return bool(unlock and unlock.consent_given)


def _ensure_user_consent_for_form(
    db: Session, form: FormModel, user: User
) -> UserFormUnlock | None:
    unlock = _get_user_form_unlock(db, form_id=form.id, user_id=user.id)
    if not _user_has_completed_consent(form, user, unlock):
        raise HTTPException(
            status_code=403,
            detail="Please complete the consent step before continuing.",
        )
    return unlock


def _serialize_public_settings(form: FormModel) -> dict[str, Any]:
    return {
        "allow_public_responses": bool(form.allow_public_responses),
        "public_require_consent": _consent_required(form),
        "public_consent_text": (_consent_text(form)),
        "public_require_upload": False,
        "public_upload_prompt": "",
    }


def _consent_required(form: FormModel) -> bool:
    return bool(getattr(form, "require_consent", False) or form.public_require_consent)


def _consent_text(form: FormModel) -> str:
    text_value = (
        getattr(form, "consent_text", None)
        or form.public_consent_text
        or DEFAULT_PUBLIC_CONSENT_TEXT
    )
    stripped = text_value.strip() if text_value else ""
    return stripped or DEFAULT_PUBLIC_CONSENT_TEXT


def _consent_document(form: FormModel) -> str | None:
    document_value = getattr(form, "consent_document", None)
    if not document_value:
        return None
    stripped = document_value.strip()
    return stripped or None


def _serialize_consent_settings(
    form: FormModel, *, consent_completed: bool = False
) -> dict[str, Any]:
    return {
        "consent_required": _consent_required(form),
        "consent_text": _consent_text(form),
        "consent_document": _consent_document(form),
        "consent_completed": consent_completed or not _consent_required(form),
    }


def _guest_user_email(name: str, token: str) -> str:
    safe_name = re.sub(r"\s+", " ", name).strip() or "Guest participant"
    safe_name = safe_name[:80]
    return f"Guest: {safe_name} [{token[:8]}]"


def _safe_upload_filename(filename: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._")
    return cleaned or "upload.bin"


def _normalize_document_template(template: str | None) -> str | None:
    if template is None:
        return None
    if _is_editable_document_template(template):
        body = _strip_document_template_prefix(template)
        cleaned = f"{EDITABLE_DOCUMENT_TEMPLATE_PREFIX}\n{body}".strip()
    elif _is_rich_fillable_document_template(template):
        body = _strip_document_template_prefix(template)
        cleaned = f"{RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX}\n{body}".strip()
    elif RICH_DOCUMENT_FIELD_PATTERN.search(template):
        cleaned = (
            f"{RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX}\n{template.strip()}".strip()
        )
    else:
        cleaned = template.replace("\r\n", "\n").replace("\r", "\n").strip()
    return cleaned or None


def _build_document_questions(template: str) -> list[dict[str, object]]:
    if _is_editable_document_template(template):
        return [
            QuestionConfig(
                label="Document response",
                requireEvidence=False,
                requireCounterarguments=False,
                requireConfidence=False,
                optional=False,
                fieldType="document",
                inputType="textarea",
                rows=12,
                placeholder="Edit the shared document here",
            ).model_dump()
        ]

    if _is_rich_fillable_document_template(template):
        return _parse_rich_document_field_attrs(template)

    seen: set[str] = set()
    derived: list[dict[str, object]] = []
    for match in DOCUMENT_PLACEHOLDER_PATTERN.finditer(template):
        raw_token = match.group(1).strip()
        token_parts = [part.strip() for part in raw_token.split(":")]
        field_type = "long"
        optional = False
        rows = 4
        label_parts: list[str] = []
        options: list[str] | None = None
        min_value: int | None = None
        max_value: int | None = None
        min_label: str | None = None
        mid_label: str | None = None
        max_label: str | None = None
        allow_unsure = False
        for part in token_parts:
            normalized = part.lower()
            if not label_parts and normalized in {
                "short",
                "long",
                "single_select",
                "multi_select",
                "slider",
                "likert",
            }:
                field_type = normalized
                rows = 1 if normalized == "short" else 6
                continue
            if not label_parts and normalized == "optional":
                optional = True
                continue
            label_parts.append(part)
        combined_label = ":".join(label_parts).strip() or raw_token
        segments = [
            segment.strip() for segment in combined_label.split("|") if segment.strip()
        ]
        label = segments[0] if segments else combined_label
        if field_type in {"single_select", "multi_select"}:
            options = segments[1:] or ["Option 1", "Option 2"]
        elif field_type == "slider":
            min_value = (
                int(segments[1]) if len(segments) > 1 and segments[1].isdigit() else 0
            )
            max_value = (
                int(segments[2]) if len(segments) > 2 and segments[2].isdigit() else 10
            )
            min_label = segments[3] if len(segments) > 3 else str(min_value)
            mid_label = segments[4] if len(segments) > 4 else None
            max_label = segments[5] if len(segments) > 5 else str(max_value)
        elif field_type == "likert":
            options = segments[1:]
            if options and options[-1].casefold() == "unsure":
                allow_unsure = True
                options = options[:-1]
            if not options or len(options) < 2:
                options = [
                    "Unimportant",
                    "Somewhat important",
                    "Moderately important",
                    "Very important",
                    "Essential",
                ]
        normalized_key = label.casefold()
        if normalized_key in seen:
            continue
        seen.add(normalized_key)
        input_type = (
            "text"
            if field_type == "short"
            else "textarea"
            if field_type == "long"
            else field_type
        )
        derived.append(
            QuestionConfig(
                label=label,
                requireEvidence=False,
                requireCounterarguments=False,
                requireConfidence=False,
                optional=optional,
                inputType=input_type,
                options=options,
                minValue=min_value,
                maxValue=max_value,
                minLabel=min_label,
                midLabel=mid_label,
                maxLabel=max_label,
                allowUnsure=allow_unsure,
                fieldType=field_type,
                rows=rows,
                placeholder=f"Enter {label.lower()}",
            ).model_dump()
        )
    return derived


def _validate_document_template(template: str | None) -> list[str | dict[str, object]]:
    if not template:
        return []

    normalized_questions = _build_document_questions(template)
    if _is_editable_document_template(template):
        editable_body = _html_to_plain_text(_strip_document_template_prefix(template))
        if not editable_body.strip():
            raise HTTPException(
                status_code=400,
                detail="Editable document templates must include some document content",
            )
        return normalized_questions

    if _is_rich_fillable_document_template(template):
        rich_body = _strip_document_template_prefix(template)
        if not _html_to_plain_text(rich_body).strip():
            raise HTTPException(
                status_code=400,
                detail="Fillable document templates must include some document content",
            )
        if not normalized_questions:
            raise HTTPException(
                status_code=400,
                detail="Fillable document templates must include at least one field",
            )
        return normalized_questions

    if not normalized_questions:
        raise HTTPException(
            status_code=400,
            detail="Document templates must include at least one {{placeholder}}",
        )
    return normalized_questions


def _question_preserve_signature(question: Any) -> dict[str, Any]:
    if isinstance(question, QuestionConfig):
        question = question.model_dump()
    if isinstance(question, str):
        return {
            "label": question.strip(),
            "questionId": None,
            "inputType": None,
            "fieldType": None,
            "optional": False,
        }
    if not isinstance(question, dict):
        return {
            "label": str(question).strip(),
            "questionId": None,
            "inputType": None,
            "fieldType": None,
            "optional": False,
        }
    return {
        "label": str(
            question.get("label")
            or question.get("text")
            or question.get("question")
            or ""
        ).strip(),
        "questionId": question.get("questionId"),
        "inputType": question.get("inputType"),
        "fieldType": question.get("fieldType"),
        "optional": bool(question.get("optional", False)),
        "options": question.get("options"),
        "minValue": question.get("minValue"),
        "maxValue": question.get("maxValue"),
    }


def _questions_match_document_template(
    questions: list[str | QuestionConfig],
    template_questions: list[str | dict[str, object]],
) -> bool:
    payload_signature = [
        _question_preserve_signature(question) for question in questions
    ]
    template_signature = [
        _question_preserve_signature(question) for question in template_questions
    ]
    return payload_signature == template_signature


def _resolve_update_document_template(
    current_template: str | None,
    payload: FormUpdate,
) -> str | None:
    next_template = _normalize_document_template(payload.document_template)
    if next_template is not None or not current_template:
        return next_template

    # The edit form can submit a null/blank document_template while still
    # sending the derived questions from the existing template. Treat that as a
    # stale/partial edit payload and preserve the rich template; otherwise an
    # unrelated save can collapse a paginated document survey into a flat list.
    try:
        existing_template_questions = _validate_document_template(current_template)
    except HTTPException:
        return next_template
    if _questions_match_document_template(
        payload.questions, existing_template_questions
    ):
        return current_template
    return next_template


def _extract_text_from_docx_bytes(blob: bytes) -> str:
    def _extract_paragraph_fragments(paragraph: ET.Element) -> list[str]:
        pieces: list[str] = []
        for node in paragraph.iter():
            tag = node.tag.rsplit("}", 1)[-1]
            if tag == "t":
                pieces.append(node.text or "")
            elif tag in {"br", "cr"}:
                pieces.append("\n")
            elif tag == "tab":
                pieces.append("\t")

        text = "".join(pieces)
        if "\n" not in text:
            return [text.strip()]

        fragments = [fragment.strip() for fragment in text.splitlines()]
        return fragments if any(fragments) else [""]

    try:
        with zipfile.ZipFile(BytesIO(blob)) as archive:
            document_xml = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise HTTPException(status_code=400, detail="Invalid .docx file") from exc

    root = ET.fromstring(document_xml)
    body = root.find("w:body", WORDPROCESSINGML_NS)
    if body is None:
        return ""

    lines: list[str] = []
    for child in body:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            lines.extend(_extract_paragraph_fragments(child))
        elif tag == "tbl":
            for row in child.findall(".//w:tr", WORDPROCESSINGML_NS):
                cells = []
                for cell in row.findall("./w:tc", WORDPROCESSINGML_NS):
                    cell_text = " ".join(
                        fragment
                        for paragraph in cell.findall("./w:p", WORDPROCESSINGML_NS)
                        for fragment in _extract_paragraph_fragments(paragraph)
                        if fragment
                    ).strip()
                    cells.append(cell_text)
                if any(cells):
                    lines.append(" | ".join(cells))

    cleaned_lines: list[str] = []
    previous_blank = False
    for line in lines:
        blank = not line
        if blank and previous_blank:
            continue
        cleaned_lines.append(line)
        previous_blank = blank
    return "\n".join(cleaned_lines).strip()


def _slugify_document_field_key(value: str, fallback: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or fallback


def _coerce_ai_import_questions(
    payload: Any,
) -> tuple[str | None, list[str], list[QuestionConfig]]:
    if not isinstance(payload, dict):
        return None, [], []

    title = payload.get("documentTitle")
    document_title = str(title).strip() if isinstance(title, str) else None

    intro_paragraphs: list[str] = []
    raw_intro = payload.get("introParagraphs")
    if isinstance(raw_intro, list):
        intro_paragraphs = [
            str(item).strip() for item in raw_intro if str(item).strip()
        ][:12]

    questions: list[QuestionConfig] = []
    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list):
        return document_title, intro_paragraphs, questions

    seen_ids: set[str] = set()
    valid_input_types = {
        "text",
        "textarea",
        "single_select",
        "multi_select",
        "slider",
        "likert",
    }

    for index, item in enumerate(raw_questions, start=1):
        if not isinstance(item, dict):
            continue

        label = str(item.get("label", "")).strip()
        if not label:
            continue

        input_type = str(item.get("inputType", "textarea")).strip().lower()
        if input_type not in valid_input_types:
            input_type = "textarea"

        options = item.get("options")
        parsed_options = None
        if isinstance(options, list):
            parsed_options = [
                str(option).strip() for option in options if str(option).strip()
            ]
            if not parsed_options:
                parsed_options = None

        if input_type in {"single_select", "multi_select"} and (
            not parsed_options or len(parsed_options) < 2
        ):
            continue

        if input_type == "likert" and (not parsed_options or len(parsed_options) < 2):
            parsed_options = [
                "Strongly disagree",
                "Disagree",
                "Neither agree nor disagree",
                "Agree",
                "Strongly agree",
            ]

        question_id = str(item.get("questionId", "")).strip() or f"Q{index}"
        if question_id in seen_ids:
            question_id = f"{question_id}_{index}"
        seen_ids.add(question_id)

        section_title = item.get("sectionTitle")
        help_text = item.get("helpText")
        conditional_question_id = item.get("conditionalOnQuestionId")
        conditional_option = item.get("conditionalOnOption")

        def parse_int(name: str) -> int | None:
            raw = item.get(name)
            if raw is None or raw == "":
                return None
            try:
                return int(raw)
            except (TypeError, ValueError):
                return None

        min_value = parse_int("minValue")
        max_value = parse_int("maxValue")
        max_selections = parse_int("maxSelections")
        if input_type == "slider":
            min_value = 0 if min_value is None else min_value
            max_value = 10 if max_value is None else max_value
        if (
            input_type == "multi_select"
            and max_selections is not None
            and max_selections < 1
        ):
            max_selections = None

        question = QuestionConfig(
            label=label,
            requireEvidence=False,
            requireCounterarguments=False,
            requireConfidence=False,
            questionId=question_id,
            sectionTitle=str(section_title).strip()
            if isinstance(section_title, str) and section_title.strip()
            else None,
            helpText=str(help_text).strip()
            if isinstance(help_text, str) and help_text.strip()
            else None,
            optional=bool(item.get("optional", False)),
            conditionalOnQuestionId=(
                str(conditional_question_id).strip()
                if isinstance(conditional_question_id, str)
                and str(conditional_question_id).strip()
                else None
            ),
            conditionalOnOption=(
                str(conditional_option).strip()
                if isinstance(conditional_option, str)
                and str(conditional_option).strip()
                else None
            ),
            inputType=input_type,
            options=parsed_options,
            allowUnsure=bool(item.get("allowUnsure", False))
            if input_type == "likert"
            else None,
            maxSelections=max_selections if input_type == "multi_select" else None,
            minValue=min_value if input_type == "slider" else None,
            maxValue=max_value if input_type == "slider" else None,
            minLabel=(
                str(item.get("minLabel")).strip()
                if input_type == "slider"
                and isinstance(item.get("minLabel"), str)
                and str(item.get("minLabel")).strip()
                else None
            ),
            midLabel=(
                str(item.get("midLabel")).strip()
                if input_type == "slider"
                and isinstance(item.get("midLabel"), str)
                and str(item.get("midLabel")).strip()
                else None
            ),
            maxLabel=(
                str(item.get("maxLabel")).strip()
                if input_type == "slider"
                and isinstance(item.get("maxLabel"), str)
                and str(item.get("maxLabel")).strip()
                else None
            ),
            importedFromQuestionnaire=True,
            fieldType="short"
            if input_type == "text"
            else "long"
            if input_type == "textarea"
            else input_type,
            rows=1 if input_type == "text" else 4 if input_type == "textarea" else None,
            placeholder=(
                str(item.get("placeholder")).strip()
                if isinstance(item.get("placeholder"), str)
                and str(item.get("placeholder")).strip()
                else "Write a short response"
                if input_type == "text"
                else "Write your response here"
                if input_type == "textarea"
                else None
            ),
        )
        questions.append(question)

    return document_title, intro_paragraphs, questions


def _serialize_rich_document_field_html(
    question: QuestionConfig,
    *,
    fallback_index: int,
) -> str:
    field_key = _slugify_document_field_key(
        question.questionId or question.label, f"field-{fallback_index}"
    )
    field_type = question.fieldType or (
        "short"
        if question.inputType == "text"
        else "long"
        if question.inputType == "textarea"
        else question.inputType or "long"
    )
    input_type = question.inputType or (
        "text"
        if field_type == "short"
        else "textarea"
        if field_type == "long"
        else field_type
    )

    attributes: dict[str, str] = {
        "data-symphonia-field-key": field_key,
        "data-symphonia-question-id": question.questionId or field_key,
        "data-symphonia-field-label": question.label,
        "data-symphonia-show-label": "false",
        "data-symphonia-field-type": field_type,
        "data-symphonia-input-type": input_type,
        "data-symphonia-optional": "true" if question.optional else "false",
        "data-symphonia-rows": str(question.rows or (1 if input_type == "text" else 4)),
        "data-symphonia-placeholder": question.placeholder
        or (
            "Write a short response"
            if input_type == "text"
            else "Write your response here"
        ),
    }

    if question.options:
        attributes["data-symphonia-options"] = json.dumps(
            question.options, ensure_ascii=False
        )
    if question.maxSelections is not None:
        attributes["data-symphonia-max-selections"] = str(question.maxSelections)
    if question.minValue is not None:
        attributes["data-symphonia-min-value"] = str(question.minValue)
    if question.maxValue is not None:
        attributes["data-symphonia-max-value"] = str(question.maxValue)
    if question.minLabel:
        attributes["data-symphonia-min-label"] = question.minLabel
    if question.midLabel:
        attributes["data-symphonia-mid-label"] = question.midLabel
    if question.maxLabel:
        attributes["data-symphonia-max-label"] = question.maxLabel
    if question.allowUnsure:
        attributes["data-symphonia-allow-unsure"] = "true"
    if question.conditionalOnQuestionId:
        attributes["data-symphonia-conditional-question-id"] = (
            question.conditionalOnQuestionId
        )
    if question.conditionalOnOption:
        attributes["data-symphonia-conditional-option"] = question.conditionalOnOption

    serialized_attrs = " ".join(
        f'{key}="{html.escape(value, quote=True)}"' for key, value in attributes.items()
    )
    return f"<span {serialized_attrs}></span>"


def _build_llm_fillable_document_template(
    *,
    document_title: str | None,
    intro_paragraphs: list[str],
    questions: list[QuestionConfig],
) -> str:
    if not questions:
        raise HTTPException(
            status_code=422,
            detail="The AI import could not identify any usable fillable fields in that document.",
        )

    parts: list[str] = []
    if document_title and not re.match(
        r"^round\s+\d+\s*:", document_title, re.IGNORECASE
    ):
        parts.append(f"<h1>{html.escape(document_title)}</h1>")

    for paragraph in intro_paragraphs:
        parts.append(
            f'<p style="font-size: 1rem; line-height: 1.8; color: #32455f;">{html.escape(paragraph)}</p>'
        )

    current_section: str | None = None

    for index, question in enumerate(questions, start=1):
        if question.sectionTitle and question.sectionTitle != current_section:
            current_section = question.sectionTitle
            parts.append(
                f'<h2 style="margin-top: 1.4rem;">{html.escape(question.sectionTitle)}</h2>'
            )

        help_bits: list[str] = []
        if question.helpText:
            help_bits.append(question.helpText)
        if question.inputType == "multi_select" and question.maxSelections:
            help_bits.append(f"Select up to {question.maxSelections}.")

        field_html = _serialize_rich_document_field_html(question, fallback_index=index)
        question_id_label = question.questionId or f"Question {index}"
        help_html = (
            f'<div style="margin-top: 0.7rem; font-size: 0.84rem; line-height: 1.55; color: #58708a;">{html.escape(" ".join(help_bits))}</div>'
            if help_bits
            else ""
        )

        parts.append(
            f"""
<div style="margin: 0 0 1rem; padding: 1rem 1rem 1.05rem; border-radius: 1.15rem; border: 1px solid #dbe4ef; background: rgba(255,255,255,0.84);">
  <div style="margin-bottom: 0.55rem; font-size: 0.76rem; letter-spacing: 0.08em; text-transform: uppercase; color: #6a7b90;">{html.escape(question_id_label)}</div>
  <div style="margin-bottom: 0.75rem; font-size: 1rem; line-height: 1.65; font-weight: 600; color: #16263e;">{html.escape(question.label)}</div>
  <div>{field_html}</div>
  {help_html}
</div>
""".strip()
        )

    body = "".join(parts).strip() or "<p></p>"
    return f"{RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX}\n{body}"


def _extract_fillable_template_with_llm(blob: bytes, db: Session) -> str:
    extracted_text = _extract_text_from_docx_bytes(blob)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="The uploaded .docx did not contain readable text for AI conversion.",
        )

    openai_client = get_openai_client()
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="AI-assisted document import is not configured. Please add an OpenRouter API key in Settings.",
        )

    prompt = f"""You are converting a consultation questionnaire extracted from a Word document into a structured fillable survey schema.

Return ONLY valid JSON with this exact shape:
{{
  "documentTitle": "optional title",
  "introParagraphs": ["optional introductory paragraph"],
  "questions": [
    {{
      "questionId": "Q1",
      "label": "Question text",
      "sectionTitle": "Optional section title",
      "inputType": "text|textarea|single_select|multi_select|slider|likert",
      "options": ["Option 1", "Option 2"],
      "maxSelections": 3,
      "optional": false,
      "minValue": 0,
      "maxValue": 10,
      "minLabel": "Low label",
      "midLabel": "Mid label",
      "maxLabel": "High label",
      "allowUnsure": false,
      "helpText": "Only include concise routing or instruction text when necessary",
      "conditionalOnQuestionId": "Q1",
      "conditionalOnOption": "Other"
    }}
  ]
}}

Rules:
- Preserve the order of the source document.
- Convert only actual answerable questions into schema items.
- Use `single_select` when exactly one option should be chosen.
- Use `multi_select` when multiple options are allowed, especially when the source says "select up to N".
- Use `slider` for explicit 0-10 scales.
- Use `likert` for explicit agree/disagree or importance scales with named points.
- Use `text` only for very short follow-ups like "Other: please specify"; otherwise use `textarea`.
- If the source includes "Other", create a separate conditional short-text question for the specify prompt.
- Keep section titles when they are explicit.
- Do not invent questions that are not supported by the source.
- Do not return markdown fences or commentary.

Source document text:
{extracted_text}
"""

    resolved_model = _resolve_synthesis_model(db)

    def _call_import_model(*, use_response_format: bool) -> str:
        request_kwargs: dict[str, Any] = {
            "model": resolved_model,
            "max_tokens": 8192,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You convert questionnaire documents into precise structured survey schemas. "
                        "Be conservative, preserve ordering, and return valid JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
        if use_response_format:
            request_kwargs["response_format"] = {"type": "json_object"}
        completion = openai_client.chat.completions.create(**request_kwargs)
        return completion.choices[0].message.content or "{}"

    try:
        try:
            raw_content = _call_import_model(use_response_format=True)
        except Exception as structured_exc:
            logger.warning(
                "AI import structured-output attempt failed for model %s; retrying without response_format: %s",
                resolved_model,
                structured_exc,
            )
            raw_content = _call_import_model(use_response_format=False)

        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            parsed = json.loads(match.group(0)) if match else {}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"AI-assisted document import failed: {exc}"
        )

    document_title, intro_paragraphs, questions = _coerce_ai_import_questions(parsed)
    return _build_llm_fillable_document_template(
        document_title=document_title,
        intro_paragraphs=intro_paragraphs,
        questions=questions,
    )


def _render_word_run_to_html(run: ET.Element) -> str:
    chunks: list[str] = []
    for child in run:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "t":
            chunks.append(html.escape(child.text or ""))
        elif tag in {"br", "cr"}:
            chunks.append("<br>")
        elif tag == "tab":
            chunks.append("&emsp;")

    content = "".join(chunks)
    if not content:
        return ""

    properties = run.find("w:rPr", WORDPROCESSINGML_NS)
    if properties is None:
        return content

    if properties.find("w:b", WORDPROCESSINGML_NS) is not None:
        content = f"<strong>{content}</strong>"
    if properties.find("w:i", WORDPROCESSINGML_NS) is not None:
        content = f"<em>{content}</em>"
    if properties.find("w:u", WORDPROCESSINGML_NS) is not None:
        content = f"<u>{content}</u>"
    return content


def _render_word_paragraph_to_html(paragraph: ET.Element) -> str:
    runs = paragraph.findall("./w:r", WORDPROCESSINGML_NS)
    if not runs:
        return "<p></p>"

    content = "".join(_render_word_run_to_html(run) for run in runs).strip()
    if not content:
        return "<p></p>"

    style = paragraph.find("./w:pPr/w:pStyle", WORDPROCESSINGML_NS)
    style_value = (
        style.get(f"{{{WORDPROCESSINGML_NS['w']}}}val", "") if style is not None else ""
    )
    style_key = style_value.lower()

    if style_key.startswith("heading1") or style_key == "title":
        return f"<h1>{content}</h1>"
    if style_key.startswith("heading2") or style_key == "subtitle":
        return f"<h2>{content}</h2>"
    if style_key.startswith("heading3"):
        return f"<h3>{content}</h3>"
    return f"<p>{content}</p>"


def _render_word_table_to_html(table: ET.Element) -> str:
    rows_html: list[str] = []
    for row in table.findall("./w:tr", WORDPROCESSINGML_NS):
        cells_html: list[str] = []
        for cell in row.findall("./w:tc", WORDPROCESSINGML_NS):
            paragraphs = [
                _render_word_paragraph_to_html(paragraph)
                for paragraph in cell.findall("./w:p", WORDPROCESSINGML_NS)
            ]
            cell_content = "".join(paragraphs).strip() or "<p></p>"
            cells_html.append(f"<td>{cell_content}</td>")
        if cells_html:
            rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
    return f"<table><tbody>{''.join(rows_html)}</tbody></table>" if rows_html else ""


def _extract_editable_document_from_docx_bytes(blob: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(blob)) as archive:
            document_xml = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise HTTPException(status_code=400, detail="Invalid .docx file") from exc

    root = ET.fromstring(document_xml)
    body = root.find("w:body", WORDPROCESSINGML_NS)
    if body is None:
        return EDITABLE_DOCUMENT_TEMPLATE_PREFIX

    parts: list[str] = []
    for child in body:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            parts.append(_render_word_paragraph_to_html(child))
        elif tag == "tbl":
            table_html = _render_word_table_to_html(child)
            if table_html:
                parts.append(table_html)

    content = "".join(parts).strip() or "<p></p>"
    return f"{EDITABLE_DOCUMENT_TEMPLATE_PREFIX}\n{content}"


def normalize_form_questions(
    questions: list[str | QuestionConfig],
) -> list[str | dict[str, object]]:
    normalized: list[str | dict[str, object]] = []
    for question in questions:
        if isinstance(question, QuestionConfig):
            normalized.append(question.model_dump())
        else:
            normalized.append(question)
    return normalized


# ---------------------------------------------------------------------------
# User-scoped form management (any authenticated user)
# ---------------------------------------------------------------------------


class UserFormCreate(BaseModel):
    title: str
    description: str | None = None
    questions: list[str | QuestionConfig] = []
    document_template: str | None = None
    allow_join: bool = True
    allow_public_responses: bool = False
    show_own_response_to_participants: bool = False
    require_consent: bool = False
    consent_text: str | None = None
    consent_document: str | None = None
    public_require_consent: bool = False
    public_consent_text: str | None = None
    public_require_upload: bool = False
    public_upload_prompt: str | None = None


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
    document_template = _normalize_document_template(payload.document_template)
    public_consent_text = (
        payload.public_consent_text.strip() if payload.public_consent_text else None
    )
    consent_text = payload.consent_text.strip() if payload.consent_text else None
    consent_document = (
        payload.consent_document.strip() if payload.consent_document else None
    )
    normalized_questions = (
        _validate_document_template(document_template)
        if document_template
        else normalize_form_questions(payload.questions)
    )

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
        questions=normalized_questions,
        document_template=document_template,
        allow_join=payload.allow_join,
        allow_public_responses=payload.allow_public_responses,
        show_own_response_to_participants=payload.show_own_response_to_participants,
        require_consent=payload.require_consent or payload.public_require_consent,
        consent_text=consent_text or public_consent_text,
        consent_document=consent_document,
        public_require_consent=False,
        public_consent_text=None,
        public_require_upload=False,
        public_upload_prompt=None,
        join_code=code,
        owner_id=user.id,
    )
    db.add(form)
    db.flush()
    first_round = RoundModel(
        form_id=form.id, round_number=1, is_active=True, questions=normalized_questions
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
        "show_own_response_to_participants": form.show_own_response_to_participants,
        **_serialize_public_settings(form),
        **_serialize_consent_settings(form),
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
    document_template = _resolve_update_document_template(f.document_template, payload)
    public_consent_text = (
        payload.public_consent_text.strip() if payload.public_consent_text else None
    )
    consent_text = payload.consent_text.strip() if payload.consent_text else None
    consent_document = (
        payload.consent_document.strip() if payload.consent_document else None
    )
    normalized_questions = (
        _validate_document_template(document_template)
        if document_template
        else normalize_form_questions(payload.questions)
    )
    f.title = payload.title
    f.questions = normalized_questions
    f.document_template = document_template
    f.allow_public_responses = payload.allow_public_responses
    f.require_consent = payload.require_consent or payload.public_require_consent
    f.consent_text = consent_text or public_consent_text
    f.consent_document = consent_document
    f.public_require_consent = False
    f.public_consent_text = None
    f.public_require_upload = False
    f.public_upload_prompt = None
    active_round = (
        db.query(RoundModel)
        .filter(RoundModel.form_id == form_id, RoundModel.is_active == True)
        .first()
    )
    if active_round:
        active_round.questions = normalized_questions
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
                "document_template": f.document_template,
                "allow_join": f.allow_join,
                "show_own_response_to_participants": f.show_own_response_to_participants,
                **_serialize_public_settings(f),
                **_serialize_consent_settings(f),
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
        return {"message": "Form already unlocked.", "form_id": form.id}

    # Create a new unlock record
    new_unlock = UserFormUnlock(user_id=user.id, form_id=form.id)
    db.add(new_unlock)
    db.commit()

    return {"message": "Form unlocked successfully.", "form_id": form.id}


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

    unlock = _get_user_form_unlock(db, form_id=form_id, user_id=user.id)

    return {
        "id": f.id,
        "title": f.title,
        "questions": f.questions,
        "document_template": f.document_template,
        "allow_join": f.allow_join,
        "show_own_response_to_participants": f.show_own_response_to_participants,
        **_serialize_public_settings(f),
        **_serialize_consent_settings(
            f, consent_completed=_user_has_completed_consent(f, user, unlock)
        ),
        "join_code": f.join_code,
        "expert_labels": f.expert_labels,
    }


@router.patch(
    "/forms/{form_id}/participant_visibility",
    tags=["Forms"],
    summary="Update participant synthesis visibility settings",
)
@limiter.limit(CRUD_LIMIT)
def update_participant_visibility(
    form_id: int,
    payload: ParticipantVisibilityPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    assert_form_owner_or_facilitator(form, user)

    form.show_own_response_to_participants = payload.show_own_response_to_participants
    audit_log(
        db,
        user=user,
        action="update_participant_visibility",
        resource_type="form",
        resource_id=form_id,
        detail={
            "show_own_response_to_participants": form.show_own_response_to_participants
        },
        request=request,
    )
    db.commit()
    return {
        "form_id": form.id,
        "show_own_response_to_participants": form.show_own_response_to_participants,
    }


class ConsentAcceptancePayload(BaseModel):
    accepted: bool = True


@router.post(
    "/forms/{form_id}/consent",
    tags=["Forms"],
    summary="Accept the consent step for a form",
)
@limiter.limit(CRUD_LIMIT)
def accept_form_consent(
    form_id: int,
    request: Request,
    payload: ConsentAcceptancePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if not _consent_required(form):
        return {"ok": True, "consent_completed": True}
    if not payload.accepted:
        raise HTTPException(status_code=400, detail="Please confirm consent first.")

    unlock = _get_user_form_unlock(db, form_id=form_id, user_id=user.id)
    if not unlock:
        unlock = UserFormUnlock(user_id=user.id, form_id=form_id)
        db.add(unlock)
    unlock.consent_given = True
    unlock.consented_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "consent_completed": True}


class PublicSessionDraftPayload(BaseModel):
    participant_name: str
    answers: dict[str, Any]


def _get_public_session(
    db: Session,
    session_token: str,
) -> PublicFormSession:
    session = (
        db.query(PublicFormSession)
        .filter(PublicFormSession.session_token == session_token)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Public form session not found")
    return session


@router.get(
    "/public/forms/{join_code}",
    tags=["Forms"],
    summary="Get public form details by join code",
    description="Return public form metadata and gate requirements for a share link.",
)
@limiter.limit(READ_LIMIT)
def get_public_form(
    request: Request,
    join_code: str,
    db: Session = Depends(get_db),
):
    form = _public_join_form_by_code(db, join_code.strip())
    if not form:
        raise HTTPException(status_code=404, detail="Public form not found")

    active_round = _get_active_round_for_form(db, form.id)
    if not active_round:
        raise HTTPException(
            status_code=400, detail="This form is not accepting responses right now"
        )

    previous_round = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form.id,
            RoundModel.round_number == max(1, active_round.round_number - 1),
        )
        .first()
        if active_round.round_number > 1
        else None
    )

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "questions": active_round.questions or form.questions,
        "document_template": form.document_template,
        "join_code": form.join_code,
        "previous_round_synthesis": previous_round.synthesis if previous_round else "",
        **_serialize_public_settings(form),
        **_serialize_consent_settings(form),
    }


@router.post(
    "/public/forms/{join_code}/start",
    tags=["Forms"],
    summary="Start a public form session",
    description="Create a guest response session for a public share link, optionally capturing upload and consent first.",
)
@limiter.limit(CRUD_LIMIT)
async def start_public_form_session(
    request: Request,
    join_code: str,
    participant_name: str = Form(...),
    consent_given: bool = Form(False),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    form = _public_join_form_by_code(db, join_code.strip())
    if not form:
        raise HTTPException(status_code=404, detail="Public form not found")

    active_round = _get_active_round_for_form(db, form.id)
    if not active_round:
        raise HTTPException(
            status_code=400, detail="This form is not accepting responses right now"
        )

    name = participant_name.strip()
    if not name:
        raise HTTPException(
            status_code=400, detail="Please enter your name before continuing."
        )

    if _consent_required(form) and not consent_given:
        raise HTTPException(
            status_code=400, detail="Please confirm consent before continuing."
        )

    upload_filename = None
    upload_path = None

    session_token = secrets.token_urlsafe(24)
    user = User(
        email=_guest_user_email(name, session_token),
        hashed_password=get_password_hash(secrets.token_urlsafe(24)),
        role=UserRole.EXPERT.value,
        is_public_guest=True,
    )
    db.add(user)
    db.flush()

    if file:
        original_filename = file.filename or "upload.bin"
        upload_filename = _safe_upload_filename(original_filename)
        PUBLIC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        suffix = Path(upload_filename).suffix or ".bin"
        destination = PUBLIC_UPLOAD_DIR / f"{session_token}{suffix}"
        with destination.open("wb") as fh:
            fh.write(await file.read())
        upload_path = str(destination)

    session = PublicFormSession(
        form_id=form.id,
        user_id=user.id,
        round_id=active_round.id,
        session_token=session_token,
        participant_name=name,
        consent_given=consent_given,
        upload_filename=upload_filename,
        upload_path=upload_path,
    )
    db.add(session)
    db.commit()

    return {
        "session_token": session.session_token,
        "form_id": form.id,
        "title": form.title,
    }


@router.get(
    "/public/forms/session/{session_token}",
    tags=["Forms"],
    summary="Get a public form session",
    description="Return form metadata and any saved draft for a guest response session.",
)
@limiter.limit(READ_LIMIT)
def get_public_form_session(
    request: Request,
    session_token: str,
    db: Session = Depends(get_db),
):
    session = _get_public_session(db, session_token)
    form = db.query(FormModel).filter(FormModel.id == session.form_id).first()
    active_round = _get_active_round_for_form(db, session.form_id)
    if not form or not active_round or active_round.id != session.round_id:
        raise HTTPException(
            status_code=400, detail="This public form session is no longer active."
        )

    previous_round = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form.id,
            RoundModel.round_number == max(1, active_round.round_number - 1),
        )
        .first()
        if active_round.round_number > 1
        else None
    )
    draft = (
        db.query(Draft)
        .filter(
            Draft.user_id == session.user_id,
            Draft.form_id == form.id,
            Draft.round_id == active_round.id,
        )
        .first()
    )
    submitted = (
        db.query(Response)
        .filter(
            Response.user_id == session.user_id, Response.round_id == active_round.id
        )
        .first()
        is not None
    )

    return {
        "session_token": session.session_token,
        "participant_name": session.participant_name,
        "submitted": submitted or session.submitted_at is not None,
        "upload_filename": session.upload_filename,
        "form": {
            "id": form.id,
            "title": form.title,
            "description": form.description,
            "questions": active_round.questions or form.questions,
            "document_template": form.document_template,
            "join_code": form.join_code,
            "previous_round_synthesis": previous_round.synthesis
            if previous_round
            else "",
            **_serialize_public_settings(form),
            **_serialize_consent_settings(
                form, consent_completed=bool(session.consent_given)
            ),
        },
        "draft": {
            "answers": draft.answers,
            "updated_at": draft.updated_at.isoformat()
            if draft and draft.updated_at
            else None,
        }
        if draft
        else None,
    }


@router.put(
    "/public/forms/session/{session_token}/draft",
    tags=["Responses"],
    summary="Save a public draft",
    description="Save or update a guest participant draft for a public form session.",
)
@limiter.limit(CRUD_LIMIT)
def save_public_form_draft(
    request: Request,
    session_token: str,
    payload: PublicSessionDraftPayload,
    db: Session = Depends(get_db),
):
    session = _get_public_session(db, session_token)
    if session.submitted_at:
        raise HTTPException(
            status_code=400, detail="This response has already been submitted."
        )

    form = db.query(FormModel).filter(FormModel.id == session.form_id).first()
    active_round = _get_active_round_for_form(db, session.form_id)
    if not form or not active_round or active_round.id != session.round_id:
        raise HTTPException(
            status_code=400, detail="This public form session is no longer active."
        )
    if _consent_required(form) and not session.consent_given:
        raise HTTPException(
            status_code=403,
            detail="Please complete the consent step before continuing.",
        )

    name = payload.participant_name.strip()
    if not name:
        raise HTTPException(
            status_code=400, detail="Please enter your name before continuing."
        )

    session.participant_name = name
    if session.user:
        session.user.email = _guest_user_email(name, session.session_token)

    draft = (
        db.query(Draft)
        .filter(
            Draft.user_id == session.user_id,
            Draft.form_id == form.id,
            Draft.round_id == active_round.id,
        )
        .first()
    )
    if draft:
        draft.answers = payload.answers
        draft.updated_at = datetime.now(timezone.utc)
    else:
        draft = Draft(
            user_id=session.user_id,
            form_id=form.id,
            round_id=active_round.id,
            answers=payload.answers,
        )
        db.add(draft)

    db.commit()
    return {"ok": True}


@router.post(
    "/public/forms/session/{session_token}/submit",
    tags=["Responses"],
    summary="Submit a public response",
    description="Submit a guest participant response for a public form session.",
)
@limiter.limit(CRUD_LIMIT)
def submit_public_form_response(
    request: Request,
    session_token: str,
    payload: PublicSessionDraftPayload,
    db: Session = Depends(get_db),
):
    session = _get_public_session(db, session_token)
    if session.submitted_at:
        raise HTTPException(
            status_code=400, detail="This response has already been submitted."
        )

    form = db.query(FormModel).filter(FormModel.id == session.form_id).first()
    active_round = _get_active_round_for_form(db, session.form_id)
    if not form or not active_round or active_round.id != session.round_id:
        raise HTTPException(
            status_code=400, detail="This public form session is no longer active."
        )
    if _consent_required(form) and not session.consent_given:
        raise HTTPException(
            status_code=403,
            detail="Please complete the consent step before continuing.",
        )

    name = payload.participant_name.strip()
    if not name:
        raise HTTPException(
            status_code=400, detail="Please enter your name before submitting."
        )

    validation_error = _validate_required_answers(
        active_round.questions, payload.answers
    )
    if validation_error:
        raise HTTPException(status_code=400, detail=validation_error)

    session.participant_name = name
    session.submitted_at = datetime.now(timezone.utc)
    if session.user:
        session.user.email = _guest_user_email(name, session.session_token)

    existing_response = (
        db.query(Response)
        .filter(
            Response.user_id == session.user_id, Response.round_id == active_round.id
        )
        .first()
    )
    if existing_response:
        db.delete(existing_response)
        db.flush()

    db.add(
        Response(
            form_id=form.id,
            user_id=session.user_id,
            round_id=active_round.id,
            answers=payload.answers,
        )
    )
    db.add(
        ArchivedResponse(
            form_id=form.id,
            user_id=session.user_id,
            email=name,
            answers=payload.answers,
            round_id=active_round.id,
        )
    )

    db.query(Draft).filter(
        Draft.user_id == session.user_id,
        Draft.form_id == form.id,
        Draft.round_id == active_round.id,
    ).delete()

    db.commit()
    return {"ok": True}


@router.post(
    "/forms/document-template/extract",
    tags=["Forms"],
    summary="Extract a document template from a Word file",
    description=(
        "Upload a .docx file and return either a plain-text fillable template or "
        "an editable document template, depending on the selected mode."
    ),
)
@limiter.limit(CRUD_LIMIT)
async def extract_document_template(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("fillable"),
    assist: str = Form("standard"),
    db: Session = Depends(get_db),
    user: User = Depends(require_facilitator),
):
    normalized_mode = "fillable" if mode == "fillable-rich" else mode
    if normalized_mode not in {"fillable", "editable"}:
        raise HTTPException(
            status_code=400, detail="Unsupported document template mode"
        )

    filename = (file.filename or "").lower()
    if not filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Please upload a .docx file")

    blob = await file.read()
    if assist == "llm_fillable" and normalized_mode == "fillable":
        extracted = _extract_fillable_template_with_llm(blob, db)
    else:
        extracted = (
            _extract_editable_document_from_docx_bytes(blob)
            if normalized_mode == "editable"
            else _extract_text_from_docx_bytes(blob)
        )
    return {
        "template": extracted,
        "placeholder_count": len(_build_document_questions(extracted)),
        "mode": "editable" if _is_editable_document_template(extracted) else "fillable",
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
    questions: list[Any] | None = None
    context_settings: dict[str, Any] | None = None


def _survey_answer_selections(answer: Any, input_type: str) -> list[str]:
    position = _extract_answer_position(answer)
    if isinstance(answer, dict) and isinstance(answer.get("selectedOptions"), list):
        values = [
            str(item).strip() for item in answer["selectedOptions"] if str(item).strip()
        ]
        if values:
            return values
    if not position:
        return []
    if input_type == "multi_select":
        return [item.strip() for item in re.split(r"\n|,", position) if item.strip()]
    return [position.strip()]


def _survey_question_options(question: Any) -> list[str]:
    if isinstance(question, dict) and isinstance(question.get("options"), list):
        return [str(item).strip() for item in question["options"] if str(item).strip()]
    return []


def _build_previous_round_statistics(
    db: Session, round_obj: RoundModel | None
) -> dict[str, Any] | None:
    if not round_obj:
        return None
    questions = round_obj.questions or []
    if not isinstance(questions, list):
        return None
    responses = (
        db.query(Response)
        .filter(Response.round_id == round_obj.id)
        .order_by(Response.created_at.asc())
        .all()
    )
    if not responses:
        return {
            "round_number": round_obj.round_number,
            "response_count": 0,
            "items": [],
        }

    items: list[dict[str, Any]] = []
    for index, question in enumerate(questions):
        input_type = question.get("inputType", "") if isinstance(question, dict) else ""
        selectable = input_type in {"slider", "likert", "single_select", "multi_select"}
        if not selectable:
            continue
        q_key = f"q{index + 1}"
        question_id = (
            question.get("questionId")
            if isinstance(question, dict)
            and isinstance(question.get("questionId"), str)
            else None
        )
        keys = [q_key] + ([question_id] if question_id else [])
        selections: list[str] = []
        for response in responses:
            answers = response.answers or {}
            answer_key = next((key for key in keys if key in answers), None)
            if answer_key:
                selections.extend(
                    _survey_answer_selections(answers.get(answer_key), input_type)
                )
        if not selections:
            continue

        options = _survey_question_options(question)
        labels = options + [item for item in selections if item not in options]
        if not labels:
            labels = list(dict.fromkeys(selections))
        distribution = []
        for label_index, label in enumerate(dict.fromkeys(labels), 1):
            count = selections.count(label)
            distribution.append(
                {
                    "label": label,
                    "count": count,
                    "percent": round((count / len(selections)) * 100)
                    if selections
                    else 0,
                    "scaleIndex": label_index,
                }
            )

        items.append(
            {
                "key": question_id or q_key,
                "label": _question_export_label(question, f"Question {index + 1}"),
                "dimension_label": question.get("sectionTitle")
                if isinstance(question, dict)
                else None,
                "count": len(selections),
                "distribution": distribution,
            }
        )

    return {
        "round_number": round_obj.round_number,
        "response_count": len(responses),
        "items": items,
    }


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

    form = db.query(FormModel).filter(FormModel.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    prev = (
        db.query(RoundModel)
        .filter(
            RoundModel.form_id == form_id,
            RoundModel.round_number == active.round_number - 1,
        )
        .first()
    )

    previous_round_synthesis = prev.synthesis if prev else ""
    previous_round_own_response = None
    if prev and form.show_own_response_to_participants:
        response = _get_user_response_for_round(db, round_id=prev.id, user_id=user.id)
        if response:
            previous_round_own_response = response.answers

    return {
        "id": active.id,
        "round_number": active.round_number,
        "questions": active.questions or [],
        "context_settings": active.context_settings or {},
        "previous_round_synthesis": previous_round_synthesis,
        "previous_round_statistics": _build_previous_round_statistics(db, prev),
        "show_own_response_to_participants": form.show_own_response_to_participants,
        "previous_round_own_response": previous_round_own_response,
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
        context_settings=payload.context_settings if payload else None,
        synthesis=previous_synthesis,
    )
    db.add(new)
    db.commit()
    db.refresh(new)

    return {"id": new.id, "round_number": new.round_number, "questions": new.questions}


@router.patch(
    "/forms/{form_id}/rounds/{round_id}",
    tags=["Rounds"],
    summary="Update round setup",
    description="Update a round's participant questions and optional intro/context settings. Admin-only.",
)
@limiter.limit(CRUD_LIMIT)
def update_round_setup(
    request: Request,
    form_id: int,
    round_id: int,
    payload: RoundConfig,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    if payload.questions is not None:
        round_obj.questions = payload.questions
    if payload.context_settings is not None:
        round_obj.context_settings = payload.context_settings
    db.commit()
    db.refresh(round_obj)
    return {
        "id": round_obj.id,
        "round_number": round_obj.round_number,
        "questions": round_obj.questions or [],
        "context_settings": round_obj.context_settings or {},
    }


@router.post(
    "/forms/{form_id}/rounds/{round_id}/activate",
    tags=["Rounds"],
    summary="Set active round",
    description="Make an existing round the live participant round. Admin-only.",
)
@limiter.limit(CRUD_LIMIT)
def activate_round(
    request: Request,
    form_id: int,
    round_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    round_obj = (
        db.query(RoundModel)
        .filter(RoundModel.id == round_id, RoundModel.form_id == form_id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    db.query(RoundModel).filter(RoundModel.form_id == form_id).update(
        {"is_active": False}
    )
    round_obj.is_active = True
    db.commit()
    db.refresh(round_obj)
    return {
        "id": round_obj.id,
        "round_number": round_obj.round_number,
        "is_active": round_obj.is_active,
        "questions": round_obj.questions or [],
        "context_settings": round_obj.context_settings or {},
    }


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
        draft_count = db.query(Draft).filter(Draft.round_id == r.id).count()
        result.append(
            {
                "id": r.id,
                "round_number": r.round_number,
                "synthesis": r.synthesis,
                "synthesis_json": r.synthesis_json,
                "is_active": r.is_active,
                "questions": r.questions or [],
                "context_settings": r.context_settings or {},
                "convergence_score": r.convergence_score,
                "response_count": response_count,
                "draft_count": draft_count,
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
    users = db.query(User).filter(User.is_public_guest == False).order_by(User.id).all()
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
