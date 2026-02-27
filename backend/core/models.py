from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    String,
    Boolean,
    JSON,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
from .db import Base


class UserRole(str, PyEnum):
    EXPERT = "expert"
    FACILITATOR = "facilitator"
    PLATFORM_ADMIN = "platform_admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        String(20),
        nullable=False,
        default=UserRole.EXPERT.value,
        server_default="expert",
    )
    has_submitted_feedback = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    responses = relationship("Response", back_populates="user")
    feedback_entries = relationship("Feedback", back_populates="user")
    archived_responses = relationship("ArchivedResponse", back_populates="user")
    unlocked_forms = relationship(
        "UserFormUnlock", back_populates="user", cascade="all, delete-orphan"
    )
    owned_forms = relationship(
        "FormModel", foreign_keys="[FormModel.owner_id]", back_populates="owner"
    )


class UserFormUnlock(Base):
    __tablename__ = "user_form_unlocks"
    __table_args__ = (UniqueConstraint("user_id", "form_id", name="uq_user_form"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    form_role = Column(
        String(20), nullable=False, default="expert", server_default="expert"
    )
    joined_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", back_populates="unlocked_forms")
    form = relationship("FormModel", back_populates="unlocked_by_users")


class FormModel(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    questions = Column(JSON, nullable=False)
    allow_join = Column(Boolean, default=True)
    join_code = Column(String, unique=True, nullable=False)

    expert_labels = Column(
        JSON, nullable=True
    )  # {"preset": "temporal"|"custom"|"default"|"methodological"|"stakeholder", "custom_labels": {1: "Label", ...}}
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    rounds = relationship(
        "RoundModel", back_populates="form", cascade="all, delete-orphan"
    )
    responses = relationship(
        "Response", back_populates="form", cascade="all, delete-orphan"
    )
    archived_responses = relationship(
        "ArchivedResponse", back_populates="form", cascade="all, delete-orphan"
    )
    unlocked_by_users = relationship(
        "UserFormUnlock", back_populates="form", cascade="all, delete-orphan"
    )
    invite_codes = relationship(
        "InviteCode", back_populates="form", cascade="all, delete-orphan"
    )
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_forms")


class RoundModel(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    synthesis = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    questions = Column(JSON, nullable=True)

    # Committee synthesis fields
    synthesis_json = Column(JSON, nullable=True)
    provenance = Column(JSON, nullable=True)
    flow_mode = Column(String, nullable=True, default="human_only")
    convergence_score = Column(Float, nullable=True)

    form = relationship("FormModel", back_populates="rounds")
    responses = relationship("Response", back_populates="round")
    archived_responses = relationship("ArchivedResponse", back_populates="round")
    follow_ups = relationship(
        "FollowUp", back_populates="round", cascade="all, delete-orphan"
    )


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    answers = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    version = Column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="responses")
    form = relationship("FormModel", back_populates="responses")
    round = relationship("RoundModel", back_populates="responses")


class ArchivedResponse(Base):
    __tablename__ = "archived_responses"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String, nullable=True)
    answers = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=True)

    user = relationship("User", back_populates="archived_responses")
    form = relationship("FormModel", back_populates="archived_responses")
    round = relationship("RoundModel", back_populates="archived_responses")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    accuracy = Column(Text)
    influence = Column(Text)
    further_thoughts = Column(Text)
    usability = Column(Text)
    summary = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="feedback_entries")


class FollowUp(Base):
    """A follow-up question posted during a Delphi round.

    Can be authored by a human expert or by the AI synthesis engine.
    """

    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    author_type = Column(String, nullable=False)  # "human" | "ai"
    author_id = Column(Integer, nullable=True)  # user.id if human, None if ai
    question = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    round = relationship("RoundModel", back_populates="follow_ups")
    responses = relationship(
        "FollowUpResponse", back_populates="follow_up", cascade="all, delete-orphan"
    )


class FollowUpResponse(Base):
    """A response to a follow-up question."""

    __tablename__ = "follow_up_responses"

    id = Column(Integer, primary_key=True, index=True)
    follow_up_id = Column(Integer, ForeignKey("follow_ups.id"), nullable=False)
    author_type = Column(String, nullable=False)  # "human" | "ai"
    author_id = Column(Integer, nullable=True)  # user.id if human, None if ai
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    follow_up = relationship("FollowUp", back_populates="responses")


class SynthesisVersion(Base):
    """A versioned snapshot of synthesis output for a round.

    Allows regeneration with version tracking, comparison, and rollback.
    The ``is_active`` flag marks which version is currently published to experts.
    """

    __tablename__ = "synthesis_versions"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    version = Column(Integer, nullable=False)  # 1, 2, 3…
    synthesis = Column(Text, nullable=True)
    synthesis_json = Column(JSON, nullable=True)
    model_used = Column(String, nullable=True)
    strategy = Column(String, nullable=True)  # "simple", "committee", "ttd"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=False)  # Which version is currently published

    round = relationship("RoundModel", backref="synthesis_versions")


class Draft(Base):
    """Server-side auto-save of in-progress expert responses.

    One draft per user per form (always for the active round).
    Replaced on every save, deleted on successful submit.
    """

    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # Same shape as Response.answers
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")
    form = relationship("FormModel")
    round = relationship("RoundModel")


class SynthesisComment(Base):
    """A threaded comment on a specific section of a synthesis output."""

    __tablename__ = "synthesis_comments"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    section_type = Column(
        String, nullable=False
    )  # "agreement", "disagreement", "nuance", "emergence", "general"
    section_index = Column(
        Integer, nullable=True
    )  # index within that section type (e.g., agreement #2)
    parent_id = Column(
        Integer, ForeignKey("synthesis_comments.id"), nullable=True
    )  # for threading
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    round = relationship("RoundModel", backref="synthesis_comments")
    author = relationship("User")
    replies = relationship(
        "SynthesisComment",
        backref=backref("parent", remote_side=[id]),
        cascade="all, delete-orphan",
    )


class InviteCode(Base):
    """A join code associated with a specific form.

    Supports expiry, max uses, soft deactivation, and form_role assignment.
    Backfilled from FormModel.join_code in Phase 2 migration.
    """

    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(
        Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False
    )
    code = Column(String(20), unique=True, nullable=False, index=True)
    form_role = Column(
        String(20), nullable=False, default="expert", server_default="expert"
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    use_count = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    label = Column(String(100), nullable=True)

    form = relationship("FormModel", back_populates="invite_codes")
    creator = relationship("User")


class AuditLog(Base):
    """Immutable audit trail for admin actions (Gov readiness requirement).

    Every state-changing admin action writes one row: who did what, to which
    resource, and when.  The ``detail`` JSON column captures action-specific
    context (e.g. old vs new values for edits).
    """

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_email = Column(String, nullable=False)  # denormalised for fast reads
    action = Column(
        String, nullable=False, index=True
    )  # e.g. "create_form", "generate_synthesis", "send_email"
    resource_type = Column(String, nullable=True)  # "form", "round", "user", "email"
    resource_id = Column(Integer, nullable=True)  # PK of affected resource
    detail = Column(JSON, nullable=True)  # action-specific context
    ip_address = Column(String, nullable=True)
    acting_role = Column(String(20), nullable=True)

    user = relationship("User")


class Setting(Base):
    """Global app settings stored as key-value pairs."""

    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
