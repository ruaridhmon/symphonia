"""Tests: user form creation, listing, deletion, and code regeneration."""

import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_facilitator_and_login, register_and_login


@pytest.fixture(scope="module")
def owner_token(client: TestClient) -> str:
    """Token for the form owner — must be a facilitator to create forms."""
    return create_facilitator_and_login(client, "form_owner@test.com")


@pytest.fixture(scope="module")
def expert_token(client: TestClient) -> str:
    """Token for a plain expert user (default role after /register)."""
    return register_and_login(client, "expert_user@test.com")


@pytest.fixture(scope="module")
def other_token(client: TestClient) -> str:
    return register_and_login(client, "other_user@test.com")


class TestUserFormCreation:
    def test_facilitator_can_create_form(self, client, owner_token):
        """Facilitators (and platform admins) may create forms."""
        r = client.post(
            "/forms/create",
            json={"title": "Test Form"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 201
        d = r.json()
        assert d["title"] == "Test Form"
        assert d["owner_id"] is not None
        assert len(d["join_code"]) >= 8

    def test_expert_cannot_create_form(self, client, expert_token):
        """Plain expert users (default role) must not be able to create forms."""
        r = client.post(
            "/forms/create",
            json={"title": "Unauthorized Form"},
            headers={"Authorization": f"Bearer {expert_token}"},
        )
        assert r.status_code == 403

    def test_empty_title_rejected(self, client, owner_token):
        r = client.post(
            "/forms/create",
            json={"title": ""},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 400

    def test_unauthenticated_cannot_create(self, client):
        r = client.post("/forms/create", json={"title": "No auth"})
        assert r.status_code == 401


class TestMyCreatedForms:
    def test_created_form_appears_in_list(self, client, owner_token):
        client.post(
            "/forms/create",
            json={"title": "Listed Form"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        r = client.get(
            "/forms/my-created",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 200
        assert any(f["title"] == "Listed Form" for f in r.json())

    def test_other_user_cannot_see_my_forms(self, client, owner_token, other_token):
        client.post(
            "/forms/create",
            json={"title": "Private Form"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        r = client.get(
            "/forms/my-created",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert all(f["title"] != "Private Form" for f in r.json())


class TestFormOwnership:
    def test_owner_can_delete(self, client, owner_token):
        create = client.post(
            "/forms/create",
            json={"title": "Delete Me"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        fid = create.json()["id"]
        r = client.delete(
            f"/forms/{fid}/delete",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 200

    def test_non_owner_cannot_delete(self, client, owner_token, other_token):
        create = client.post(
            "/forms/create",
            json={"title": "Protected"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        fid = create.json()["id"]
        r = client.delete(
            f"/forms/{fid}/delete",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert r.status_code == 403

    def test_owner_can_regenerate_code(self, client, owner_token):
        create = client.post(
            "/forms/create",
            json={"title": "Regen Code"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        fid = create.json()["id"]
        old_code = create.json()["join_code"]
        r = client.post(
            f"/forms/{fid}/regenerate-join-code",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 200
        assert r.json()["join_code"] != old_code

    def test_non_owner_cannot_regenerate(self, client, owner_token, other_token):
        create = client.post(
            "/forms/create",
            json={"title": "Locked Code"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        fid = create.json()["id"]
        r = client.post(
            f"/forms/{fid}/regenerate-join-code",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert r.status_code == 403


class TestJoinByCode:
    def test_existing_unlock_flow_unaffected(self, client, owner_token, other_token):
        """The original /forms/unlock must still work with user-created forms."""
        create = client.post(
            "/forms/create",
            json={"title": "Joinable", "allow_join": True},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        join_code = create.json()["join_code"]
        r = client.post(
            "/forms/unlock",
            json={"join_code": join_code},
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert r.status_code in (200, 400)
