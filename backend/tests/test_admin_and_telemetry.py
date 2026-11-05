import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


def test_claim_founder_passcode(client):
    # Wrong passcode
    bad_res = client.post("/api/v1/auth/claim-founder", json={"passcode": "wrong-secret"})
    assert bad_res.status_code == 401

    # Correct passcode
    good_res = client.post("/api/v1/auth/claim-founder", json={"passcode": "recall-founder-2026"})
    assert good_res.status_code == 200
    data = good_res.json()
    assert data["success"] is True
    assert data["is_admin"] is True
    assert "token" in data


def test_feedback_restricted_to_admin(client):
    # Create non-admin token
    tester_token = create_access_token(
        user_id="tester-123",
        email="student@university.edu",
        display_name="Student Tester",
        is_admin=False
    )

    # Submitting feedback is allowed for playtesters
    submit_res = client.post(
        "/api/v1/feedback/",
        headers={"Authorization": f"Bearer {tester_token}"},
        json={
            "type": "bug",
            "message": "Found a test issue",
            "url": "https://quiz-app.vercel.app/learn"
        }
    )
    assert submit_res.status_code == 201

    # Reading feedback is forbidden for non-admin
    forbidden_res = client.get(
        "/api/v1/feedback/",
        headers={"Authorization": f"Bearer {tester_token}"}
    )
    assert forbidden_res.status_code == 403

    # Admin access using founder passcode header
    admin_res = client.get(
        "/api/v1/feedback/",
        headers={
            "Authorization": f"Bearer {tester_token}",
            "X-Founder-Passcode": "recall-founder-2026"
        }
    )
    assert admin_res.status_code == 200
    assert isinstance(admin_res.json(), list)


def test_telemetry_flow(client):
    # Anonymous or tester user logging telemetry
    log_res = client.post(
        "/api/v1/telemetry/log",
        json={
            "event_type": "PAGE_VIEW",
            "path": "/quiz/123",
            "payload": {"difficulty": "intermediate"},
            "device_info": {"screen": "390x844"}
        }
    )
    assert log_res.status_code == 201
    assert log_res.json()["success"] is True

    # Reading telemetry is forbidden for general testers
    guest_token = create_access_token("guest-99", "guest@school.org", "Guest", is_admin=False)
    denied_res = client.get(
        "/api/v1/telemetry/logs",
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert denied_res.status_code == 403

    # Reading telemetry allowed for admin
    founder_token = create_access_token("admin-1", "dev@recall.local", "Harshit Dev", is_admin=True)
    allowed_res = client.get(
        "/api/v1/telemetry/logs",
        headers={"Authorization": f"Bearer {founder_token}"}
    )
    assert allowed_res.status_code == 200
    logs = allowed_res.json()
    assert isinstance(logs, list)
    assert any(l["event_type"] == "PAGE_VIEW" for l in logs)
