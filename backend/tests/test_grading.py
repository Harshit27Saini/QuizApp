from app.services.grading.scorer import evaluate_question, score_attempt


def test_mcq_evaluation():
    q = {
        "id": "q1",
        "question_type": "MCQ",
        "correct_answers": ["b"]
    }
    # Correct answer
    is_correct, score = evaluate_question(q, ["b"])
    assert is_correct is True
    assert score == 1.0

    # Wrong answer
    is_correct, score = evaluate_question(q, ["a"])
    assert is_correct is False
    assert score == 0.0


def test_msq_evaluation():
    q = {
        "id": "q2",
        "question_type": "MSQ",
        "correct_answers": ["a", "c"]
    }
    # Exactly all correct options selected
    is_correct, score = evaluate_question(q, ["a", "c"])
    assert is_correct is True
    assert score == 1.0

    # Incomplete selection
    is_correct, score = evaluate_question(q, ["a"])
    assert is_correct is False
    assert score == 0.0

    # Extra wrong option selected
    is_correct, score = evaluate_question(q, ["a", "c", "d"])
    assert is_correct is False
    assert score == 0.0


def test_score_attempt_breakdown():
    questions = [
        {"id": "q1", "question_type": "MCQ", "correct_answers": ["a"]},
        {"id": "q2", "question_type": "MCQ", "correct_answers": ["b"]},
    ]
    user_answers = [
        {"question_id": "q1", "selected_options": ["a"], "time_spent_seconds": 12},
        {"question_id": "q2", "selected_options": ["c"], "time_spent_seconds": 20},
    ]

    result = score_attempt(questions, user_answers)
    assert result["total_questions"] == 2
    assert result["correct_count"] == 1
    assert result["score"] == 50.0
    assert result["xp_earned"] == (1 * 10) + 15
    assert len(result["question_results"]) == 2
    assert result["question_results"][0]["is_correct"] is True
    assert result["question_results"][1]["is_correct"] is False
