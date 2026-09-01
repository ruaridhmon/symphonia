from fastapi.testclient import TestClient

from core.auth import get_password_hash
from core.models import User
from core.routes import _resolve_synthesis_model
from tests.conftest import TestingSessionLocal


def test_demo_login_is_hidden_outside_dev(
    client: TestClient,
    monkeypatch,
):
    monkeypatch.delenv("K_SERVICE", raising=False)
    response = client.post("/dev/demo-login")
    assert response.status_code == 404


def test_demo_login_issues_test_session_on_dev(
    client: TestClient,
    monkeypatch,
):
    monkeypatch.setenv("K_SERVICE", "symphonia-dev")
    db = TestingSessionLocal()
    if not db.query(User).filter(User.email == "test@test").first():
        db.add(
            User(
                email="test@test",
                hashed_password=get_password_hash("unused-demo-password"),
                role="platform_admin",
            )
        )
        db.commit()
    db.close()

    response = client.post("/dev/demo-login")

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "test@test"
    assert payload["is_admin"] is True
    assert payload["access_token"]
    assert payload["csrf_token"]


def test_dev_uses_fast_synthesis_default_but_honours_explicit_choice(monkeypatch):
    monkeypatch.setenv("K_SERVICE", "symphonia-dev")
    db = TestingSessionLocal()
    try:
        assert (
            _resolve_synthesis_model(db)
            == "google/gemini-2.5-flash-lite"
        )
        assert (
            _resolve_synthesis_model(db, "anthropic/claude-sonnet-5")
            == "anthropic/claude-sonnet-5"
        )
    finally:
        db.close()
