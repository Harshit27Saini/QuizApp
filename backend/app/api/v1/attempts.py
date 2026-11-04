from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user
from app.core.database import db
from app.core.errors import not_found_error, bad_request_error
from app.services.grading.scorer import score_attempt
from app.schemas.attempt import AttemptSubmitRequest, AttemptResultResponse, EvaluatedQuestionResult
from app.schemas.quiz import QuestionDetail, QuestionPublic

router = APIRouter(prefix="/attempts", tags=["Quiz Attempts & Grading"])


@router.post("/submit", response_model=AttemptResultResponse, status_code=status.HTTP_201_CREATED)
async def submit_quiz_attempt(
    payload: AttemptSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits student answers, calculates deterministic score, updates attempt records,
    and returns comprehensive feedback with correct answers, explanations, and source quotes.
    """
    quiz = await db.get_quiz(payload.quiz_id, current_user["id"])
    if not quiz:
        raise not_found_error("Quiz", payload.quiz_id)

    questions = await db.get_quiz_questions(payload.quiz_id)
    if not questions:
        raise bad_request_error("No questions found for this quiz.")

    # Convert incoming submissions to dicts
    user_answers = [a.model_dump() for a in payload.answers]

    # Deterministic scoring
    scoring_result = score_attempt(questions, user_answers)

    # Create attempt record
    attempt_record = await db.create_attempt(
        quiz_id=payload.quiz_id,
        user_id=current_user["id"],
        total_questions=scoring_result["total_questions"],
        is_retry=payload.is_retry,
        parent_attempt_id=payload.parent_attempt_id
    )

    # Complete attempt & store question responses
    completed_attempt = await db.complete_attempt(
        attempt_id=attempt_record["id"],
        user_id=current_user["id"],
        score=scoring_result["score"],
        correct_count=scoring_result["correct_count"],
        time_taken_seconds=payload.time_taken_seconds,
        responses=[
            {
                "question_id": r["question"]["id"],
                "selected_options": r["selected_options"],
                "is_correct": r["is_correct"],
                "time_spent_seconds": r["time_spent_seconds"]
            }
            for r in scoring_result["question_results"]
        ]
    )

    return {
        **completed_attempt,
        "xp_earned": scoring_result["xp_earned"],
        "question_results": scoring_result["question_results"]
    }


@router.get("/{attempt_id}", response_model=AttemptResultResponse)
async def get_attempt_result(
    attempt_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves full evaluation and performance analytics for a past attempt."""
    attempt = await db.get_attempt(attempt_id, current_user["id"])
    if not attempt:
        raise not_found_error("Attempt", attempt_id)

    questions = await db.get_quiz_questions(attempt["quiz_id"])
    q_map = {q["id"]: q for q in questions}

    responses = await db.get_attempt_responses(attempt_id)
    question_results = []
    for r in responses:
        q = q_map.get(r["question_id"])
        if q:
            question_results.append({
                "question": q,
                "selected_options": r["selected_options"],
                "is_correct": r["is_correct"],
                "time_spent_seconds": r.get("time_spent_seconds", 0)
            })

    xp_earned = (attempt.get("correct_count", 0) * 10) + 15

    return {
        **attempt,
        "xp_earned": xp_earned,
        "question_results": question_results
    }


@router.get("/{attempt_id}/retry-questions", response_model=List[QuestionPublic])
async def get_retry_questions(
    attempt_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns only the questions that the user answered incorrectly during a past attempt,
    enabling a targeted 'Retry Mistakes' remediation quiz session.
    """
    attempt = await db.get_attempt(attempt_id, current_user["id"])
    if not attempt:
        raise not_found_error("Attempt", attempt_id)

    responses = await db.get_attempt_responses(attempt_id)
    incorrect_q_ids = set(r["question_id"] for r in responses if not r["is_correct"])

    questions = await db.get_quiz_questions(attempt["quiz_id"])
    retry_questions = [
        QuestionPublic(
            id=q["id"],
            quiz_id=q["quiz_id"],
            question_type=q["question_type"],
            prompt=q["prompt"],
            options=q["options"],
            difficulty=q["difficulty"],
            source_page=q.get("source_page")
        )
        for q in questions if q["id"] in incorrect_q_ids
    ]

    return retry_questions


@router.get("", response_model=List[Dict[str, Any]])
async def list_user_attempts(
    quiz_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists past quiz attempts for history tracking."""
    return await db.list_attempts(user_id=current_user["id"], quiz_id=quiz_id)

