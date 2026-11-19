import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_submit_quiz_attempt_guest_to_auth():
    guest_headers = {"X-User-Id": "guest_abc123xyz"}

    # 1. Create a collection and document as guest
    coll_resp = client.post(
        "/api/v1/collections",
        headers=guest_headers,
        json={"title": "Test Guest Collection", "description": "Exam Prep"}
    )
    assert coll_resp.status_code == 201
    coll_id = coll_resp.json()["id"]

    files = {
        "file": ("notes.txt", io.BytesIO(b"# Mitosis\nCell division produces two identical daughter cells.\n"), "text/plain")
    }
    doc_resp = client.post(
        f"/api/v1/collections/{coll_id}/documents",
        headers=guest_headers,
        files=files
    )
    assert doc_resp.status_code == 201
    doc_id = doc_resp.json()["id"]

    # 2. Generate a quiz as guest
    create_quiz_resp = client.post(
        "/api/v1/quizzes/generate",
        headers=guest_headers,
        json={
            "collection_id": coll_id,
            "document_ids": [doc_id],
            "title": "Guest Biology Test",
            "mode": "EXAMINATION",
            "difficulty": "medium",
            "question_count": 2,
            "question_types": ["MCQ"]
        }
    )
    assert create_quiz_resp.status_code == 201
    quiz_data = create_quiz_resp.json()
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]
    assert len(questions) > 0

    # 3. Submit the quiz attempt as an authenticated user (different user ID)
    auth_headers = {"X-User-Id": "auth_user_9999"}
    q0 = questions[0]
    first_opt = q0["options"][0]["id"]

    submit_resp = client.post(
        "/api/v1/attempts/submit",
        headers=auth_headers,
        json={
            "quiz_id": quiz_id,
            "time_taken_seconds": 45,
            "answers": [
                {
                    "question_id": q0["id"],
                    "selected_options": [first_opt],
                    "time_spent_seconds": 15
                }
            ]
        }
    )
    assert submit_resp.status_code == 201
    result = submit_resp.json()
    assert result["quiz_id"] == quiz_id
    assert result["user_id"] == "auth_user_9999"
    assert "score" in result
    assert "total_questions" in result
    assert "question_results" in result
    assert len(result["question_results"]) > 0


def test_submit_quiz_attempt_not_found():
    resp = client.post(
        "/api/v1/attempts/submit",
        json={
            "quiz_id": "non-existent-quiz-id",
            "time_taken_seconds": 10,
            "answers": []
        }
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()
