"""
Shared fixtures for Symphonia E2E tests.

Provides an in-memory SQLite database, FastAPI TestClient with dependency
overrides, and pre-authenticated admin/participant tokens.
"""
from __future__ import annotations

import json
import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

# Force mock synthesis mode BEFORE any app imports
os.environ["SYNTHESIS_MODE"] = "mock"
# Disable rate limiting in tests to avoid 429s
os.environ["RATE_LIMIT_ENABLED"] = "false"

from core.auth import get_db, get_password_hash
from core.db import Base
from core.models import User

# ---------------------------------------------------------------------------
# Engine / session factory (in-memory SQLite, shared cache so multiple
# connections see the same data within a single test)
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite:///file::memory:?cache=shared"

_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable WAL-style foreign keys for SQLite
@event.listens_for(_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=_engine
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def test_db():
    """Create all tables, yield the engine, then drop everything."""
    Base.metadata.create_all(bind=_engine)
    yield _engine
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture(scope="module")
def client(test_db) -> Generator[TestClient, None, None]:
    """
    TestClient wired to the real FastAPI app but with the DB dependency
    swapped for our in-memory SQLite.

    Also seeds the two admin users that main.py normally creates at
    module level.
    """
    from main import app

    app.dependency_overrides[get_db] = _override_get_db

    # Seed admin users (mirrors main.py startup logic)
    db = TestingSessionLocal()
    for email in ("antreas@axiotic.ai", "samuel@axiotic.ai"):
        if not db.query(User).filter(User.email == email).first():
            db.add(
                User(
                    email=email,
                    hashed_password=get_password_hash("test123"),
                    is_admin=True,
                    role="platform_admin",
                )
            )
    db.commit()
    db.close()

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Auth helper fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def admin_token(client: TestClient) -> str:
    """Login as admin and return the bearer token."""
    resp = client.post(
        "/login",
        data={"username": "antreas@axiotic.ai", "password": "test123"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


def register_and_login(
    client: TestClient, email: str, password: str = "pass1234"
) -> str:
    """Register a user (if needed) and return a bearer token."""
    client.post("/register", data={"email": email, "password": password})
    resp = client.post(
        "/login", data={"username": email, "password": password}
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def participant_token(client: TestClient) -> str:
    """Register + login a non-admin participant."""
    return register_and_login(client, "participant1@test.com")


@pytest.fixture(scope="module")
def participant_headers(participant_token: str) -> dict:
    return {"Authorization": f"Bearer {participant_token}"}


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------


def create_form(
    client: TestClient,
    headers: dict,
    title: str = "Test Form",
    questions: list | None = None,
    join_code: str = "ABCD1234",
) -> dict:
    """Create a form and return the response JSON."""
    if questions is None:
        questions = ["Question 1?", "Question 2?"]
    resp = client.post(
        "/create_form",
        json={
            "title": title,
            "questions": questions,
            "allow_join": True,
            "join_code": join_code,
        },
        headers=headers,
    )
    assert resp.status_code == 200, f"create_form failed: {resp.text}"
    return resp.json()


def submit_response(
    client: TestClient,
    headers: dict,
    form_id: int,
    answers: dict,
) -> dict:
    """Submit a response and return the response JSON."""
    resp = client.post(
        "/submit",
        data={"form_id": str(form_id), "answers": json.dumps(answers)},
        headers=headers,
    )
    assert resp.status_code == 200, f"submit failed: {resp.text}"
    return resp.json()
