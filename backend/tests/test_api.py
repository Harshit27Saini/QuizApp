import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_full_learning_flow_e2e():
    # 1. Create a study collection
    coll_resp = client.post(
        "/api/v1/collections",
        json={"title": "Neuroscience 101", "description": "Brain structures and function."}
    )
    assert coll_resp.status_code == 201
    coll_data = coll_resp.json()
    coll_id = coll_data["id"]
    assert coll_data["title"] == "Neuroscience 101"

    # 2. Upload a study document (plain text for simplicity)
    doc_content = (
        "# Neurons and Synapses\n"
        "Neurons communicate via electrical and chemical signals across synapses.\n\n"
        "# Neurotransmitters\n"
        "Dopamine and serotonin are critical monoamine neurotransmitters."
    )
    files = {
        "file": ("neuro.txt", io.BytesIO(doc_content.encode("utf-8")), "text/plain")
    }
    upload_resp = client.post(
        f"/api/v1/collections/{coll_id}/documents",
        files=files
    )
    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    doc_id = doc_data["id"]
    assert len(doc_data["sections"]) == 2
    assert doc_data["sections"][0]["heading"] == "Neurons and Synapses"

    # 3. Document Preview
    preview_resp = client.get(f"/api/v1/documents/{doc_id}")
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["id"] == doc_id
    assert len(preview_data["sections"]) == 2

    # 4. Generate Quiz
    gen_resp = client.post(
        "/api/v1/quizzes/generate",
        json={
            "collection_id": coll_id,
            "document_ids": [doc_id],
            "mode": "STRICT",
            "difficulty": "medium",
            "question_count": 2
        }
    )
    assert gen_resp.status_code == 201
    quiz_data = gen_resp.json()
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]
    assert len(questions) == 2

    # Verify answers are NOT leaked to the active quiz taker!
    assert "correct_answers" not in questions[0]
    assert "explanation" not in questions[0]

    # 5. Submit Quiz Attempt
    q1 = questions[0]
    q2 = questions[1]
    submit_payload = {
        "quiz_id": quiz_id,
        "time_taken_seconds": 45,
        "answers": [
            {"question_id": q1["id"], "selected_options": ["a"], "time_spent_seconds": 20},
            {"question_id": q2["id"], "selected_options": ["z"], "time_spent_seconds": 25}  # deliberate incorrect
        ]
    }
    submit_resp = client.post("/api/v1/attempts/submit", json=submit_payload)
    assert submit_resp.status_code == 201
    result_data = submit_resp.json()
    attempt_id = result_data["id"]
    assert result_data["total_questions"] == 2
    assert "xp_earned" in result_data
    assert len(result_data["question_results"]) == 2

    # Check that feedback includes full explanations and quotes on result screen
    assert "explanation" in result_data["question_results"][0]["question"]
    assert "source_quote" in result_data["question_results"][0]["question"]

    # 6. Retry Questions (Should return questions answered incorrectly)
    retry_resp = client.get(f"/api/v1/attempts/{attempt_id}/retry-questions")
    assert retry_resp.status_code == 200
    retry_questions = retry_resp.json()
    assert any(q["id"] == q2["id"] for q in retry_questions)
