"""
Lightweight audit logging for admin actions.

Usage in routes:
    from .audit import audit_log
    audit_log(db, user=user, action="create_form", resource_type="form",
              resource_id=form.id, detail={"title": form.title}, request=request)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog, User


def audit_log(
    db: Session,
    *,
    user: User,
    action: str,
    resource_type: str | None = None,
    resource_id: int | None = None,
    detail: dict[str, Any] | None = None,
    request: Request | None = None,
    acting_role: str | None = None,
) -> AuditLog:
    """Write one audit row and flush (but don't commit — let the caller's
    transaction handle that)."""
    ip = None
    if request:
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)

    # Auto-populate acting_role from user if not explicitly provided
    role = acting_role or getattr(user, "role", None)

    entry = AuditLog(
        timestamp=datetime.now(timezone.utc),
        user_id=user.id,
        user_email=user.email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip,
        acting_role=role,
    )
    db.add(entry)
    db.flush()
    return entry
