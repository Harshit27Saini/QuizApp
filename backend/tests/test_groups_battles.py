"""
Tests for Groups & Battles backend.
Uses pytest + FastAPI TestClient with an isolated in-memory DB.
"""
import os
import pytest

# Force test environment before any app imports
os.environ["PYTEST_CURRENT_TEST"] = "1"

from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Minimal stub for get_current_user so we don't need real JWTs
# ---------------------------------------------------------------------------
USER_A = {"id": "user-a-001", "email": "alice@example.com", "display_name": "Alice"}
USER_B = {"id": "user-b-002", "email": "bob@example.com", "display_name": "Bob"}


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    """Ensure FastAPI dependency_overrides are cleared after every test to avoid leaking into other test modules."""
    yield
    from app.main import app
    app.dependency_overrides.clear()


def _make_app(current_user=USER_A):
    """Return a TestClient with get_current_user overridden to current_user."""
    from app.core import database as db_module
    # Fresh isolated InMemoryDB for each test
    fresh_db = db_module.InMemoryDB()
    db_module.memory_db = fresh_db

    # Also give the Repository a fresh view
    from app.core.database import Repository
    repo = Repository()
    repo.supabase = None
    db_module.db = repo

    from app.main import app
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app)


# ---------------------------------------------------------------------------
# GROUPS tests
# ---------------------------------------------------------------------------

class TestGroups:
    def setup_method(self):
        self.client = _make_app(USER_A)

    def test_create_group(self):
        resp = self.client.post("/api/v1/groups/", json={"name": "Study Crew", "emoji": "🔥"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["group"]["name"] == "Study Crew"
        assert data["group"]["emoji"] == "🔥"
        assert data["group"]["owner_id"] == USER_A["id"]

    def test_list_groups_includes_owned(self):
        self.client.post("/api/v1/groups/", json={"name": "Alpha", "emoji": "⚡"})
        resp = self.client.get("/api/v1/groups/")
        assert resp.status_code == 200
        groups = resp.json()
        assert len(groups) >= 1
        assert any(g["name"] == "Alpha" for g in groups)

    def test_get_group_detail(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Beta", "emoji": "🧠"})
        group_id = create_resp.json()["group"]["id"]

        resp = self.client.get(f"/api/v1/groups/{group_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == group_id
        assert "members" in data
        # Owner should be in members
        assert any(m["user_id"] == USER_A["id"] for m in data["members"])

    def test_get_group_not_found(self):
        resp = self.client.get("/api/v1/groups/nonexistent-id")
        assert resp.status_code == 404

    def test_invite_member(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Gamma", "emoji": "📚"})
        group_id = create_resp.json()["group"]["id"]

        resp = self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": "bob@example.com"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["member"]["email"] == "bob@example.com"
        assert data["member"]["role"] == "member"

    def test_invite_duplicate_raises(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Delta", "emoji": "🎯"})
        group_id = create_resp.json()["group"]["id"]

        self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": "bob@example.com"})
        resp2 = self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": "bob@example.com"})
        assert resp2.status_code == 400

    def test_invite_self_raises(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Epsilon", "emoji": "🏆"})
        group_id = create_resp.json()["group"]["id"]

        resp = self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": USER_A["email"]})
        assert resp.status_code == 400

    def test_delete_group(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "ToDelete", "emoji": "💡"})
        group_id = create_resp.json()["group"]["id"]

        resp = self.client.delete(f"/api/v1/groups/{group_id}")
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Group should be gone
        get_resp = self.client.get(f"/api/v1/groups/{group_id}")
        assert get_resp.status_code == 404

    def test_kick_member(self):
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Zeta", "emoji": "🌊"})
        group_id = create_resp.json()["group"]["id"]

        # Invite Bob
        invite_resp = self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": USER_B["email"]})
        bob_user_id = invite_resp.json()["member"]["user_id"]

        resp = self.client.delete(f"/api/v1/groups/{group_id}/members/{bob_user_id}")
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_non_owner_cannot_delete(self):
        # Create as Alice
        create_resp = self.client.post("/api/v1/groups/", json={"name": "Eta", "emoji": "🔥"})
        group_id = create_resp.json()["group"]["id"]

        # Invite Bob so he is a member (and therefore can see the group)
        self.client.post(f"/api/v1/groups/{group_id}/invite", json={"email": USER_B["email"]})

        # Try to delete as Bob — Bob is a member but not the owner
        from app.core import database as db_module
        from app.main import app
        from app.core.security import get_current_user
        app.dependency_overrides[get_current_user] = lambda: USER_B
        bob_client = TestClient(app)
        resp = bob_client.delete(f"/api/v1/groups/{group_id}")
        # Restore to Alice
        app.dependency_overrides[get_current_user] = lambda: USER_A
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# BATTLES tests
# ---------------------------------------------------------------------------

class TestBattles:
    def setup_method(self):
        self.client = _make_app(USER_A)
        # Create a group and get its id
        resp = self.client.post("/api/v1/groups/", json={"name": "Battle Group", "emoji": "⚡"})
        self.group_id = resp.json()["group"]["id"]

    def test_create_battle(self):
        resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "marathon"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["battle"]["mode"] == "marathon"
        assert data["battle"]["group_id"] == self.group_id
        assert data["battle"]["status"] == "waiting"

    def test_create_battle_invalid_mode(self):
        resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "invalid_mode"})
        assert resp.status_code == 400

    def test_create_battle_nonexistent_group(self):
        resp = self.client.post("/api/v1/battles/", json={"group_id": "ghost-id", "mode": "1v1"})
        assert resp.status_code == 404

    def test_join_battle(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "1v1"})
        battle_id = create_resp.json()["battle"]["id"]

        resp = self.client.post(f"/api/v1/battles/{battle_id}/join")
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["entry"]["user_id"] == USER_A["id"]

    def test_join_battle_twice_raises(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "1v1"})
        battle_id = create_resp.json()["battle"]["id"]

        self.client.post(f"/api/v1/battles/{battle_id}/join")
        resp2 = self.client.post(f"/api/v1/battles/{battle_id}/join")
        assert resp2.status_code == 400

    def test_submit_score(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "marathon"})
        battle_id = create_resp.json()["battle"]["id"]

        self.client.post(f"/api/v1/battles/{battle_id}/join")
        resp = self.client.post(
            f"/api/v1/battles/{battle_id}/submit",
            json={"score": 85.0, "accuracy": 90.0, "time_taken_seconds": 120}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["entry"]["score"] == 85.0
        assert data["xp_earned"] >= 10  # At least participation XP

    def test_submit_score_without_joining_raises(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "marathon"})
        battle_id = create_resp.json()["battle"]["id"]

        resp = self.client.post(
            f"/api/v1/battles/{battle_id}/submit",
            json={"score": 80.0, "accuracy": 80.0, "time_taken_seconds": 60}
        )
        assert resp.status_code == 400

    def test_perfect_score_awards_bonus_xp(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "marathon"})
        battle_id = create_resp.json()["battle"]["id"]

        self.client.post(f"/api/v1/battles/{battle_id}/join")
        resp = self.client.post(
            f"/api/v1/battles/{battle_id}/submit",
            json={"score": 100.0, "accuracy": 100.0, "time_taken_seconds": 60}
        )
        assert resp.status_code == 200
        # Participation(10) + Perfect(20) + possible win = at least 30
        assert resp.json()["xp_earned"] >= 30

    def test_get_battle_with_scores(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "1v1"})
        battle_id = create_resp.json()["battle"]["id"]

        self.client.post(f"/api/v1/battles/{battle_id}/join")
        self.client.post(
            f"/api/v1/battles/{battle_id}/submit",
            json={"score": 75.0, "accuracy": 75.0, "time_taken_seconds": 90}
        )

        resp = self.client.get(f"/api/v1/battles/{battle_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == battle_id
        assert "scores" in data
        assert len(data["scores"]) == 1
        assert data["scores"][0]["score"] == 75.0

    def test_list_group_battles(self):
        self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "marathon"})
        self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "sudden_death"})

        resp = self.client.get(f"/api/v1/battles/group/{self.group_id}")
        assert resp.status_code == 200
        battles = resp.json()
        assert len(battles) == 2
        modes = {b["mode"] for b in battles}
        assert "marathon" in modes
        assert "sudden_death" in modes

    def test_1v1_win_awards_xp(self):
        create_resp = self.client.post("/api/v1/battles/", json={"group_id": self.group_id, "mode": "1v1"})
        battle_id = create_resp.json()["battle"]["id"]

        self.client.post(f"/api/v1/battles/{battle_id}/join")
        resp = self.client.post(
            f"/api/v1/battles/{battle_id}/submit",
            json={"score": 100.0, "accuracy": 95.0, "time_taken_seconds": 60}
        )
        assert resp.status_code == 200
        # Participation(10) + Win 1v1(50) + perfect bonus possible
        assert resp.json()["xp_earned"] >= 60
