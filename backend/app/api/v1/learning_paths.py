from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.security import get_current_user
from app.core.database import db
from app.core.errors import not_found_error, bad_request_error
from app.services.learning_path.generator import generate_document_learning_path
from app.schemas.learning_path import LearningPathResponse, PathNodeCompleteRequest

router = APIRouter(prefix="/learning-paths", tags=["Duolingo-style Learning Paths"])


@router.post("/generate", response_model=LearningPathResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_learning_path(
    document_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyzes an uploaded document and structures it into a progressive, multi-unit
    curriculum with bite-sized lessons and mini-quizzes (Duolingo style).
    If a path already exists for this document, returns the existing path and user progress.
    """
    doc = await db.get_document(document_id, current_user["id"])
    if not doc:
        raise not_found_error("Document", document_id)

    # 1. Check if path already exists for this user and document
    existing_path = await db.get_document_learning_path(document_id, current_user["id"])
    if existing_path:
        return existing_path

    # 2. Extract sections
    sections = await db.get_document_sections(document_id)
    if not sections:
        raise bad_request_error("Document has no parsed text sections.")

    # 3. Generate structured units with bite-sized lessons & mini-quizzes
    units = await generate_document_learning_path(sections, doc_title=doc["filename"])

    # 4. Persist learning path
    path = await db.create_learning_path(
        user_id=current_user["id"],
        collection_id=doc["collection_id"],
        document_id=document_id,
        title=f"Path: {doc['filename']}",
        raw_units=units
    )

    return path


@router.get("/{path_id}", response_model=LearningPathResponse)
async def get_path(
    path_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves a learning path and its progressive node states (completed, active, locked)."""
    path = await db.get_learning_path(path_id, current_user["id"])
    if not path:
        raise not_found_error("Learning Path", path_id)
    return path


@router.get("/documents/{document_id}/current", response_model=Optional[LearningPathResponse])
async def get_path_for_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fetches existing learning path for a document, if already generated."""
    return await db.get_document_learning_path(document_id, current_user["id"])


@router.post("/{path_id}/nodes/{node_id}/complete", response_model=Dict[str, Any])
async def complete_unit_node(
    path_id: str,
    node_id: str,
    payload: PathNodeCompleteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Evaluates unit mini-quiz answers. If passing (>= 66%), marks unit completed,
    unlocks the next stepping stone node along the path, and awards XP!
    """
    path = await db.get_learning_path(path_id, current_user["id"])
    if not path:
        raise not_found_error("Learning Path", path_id)

    target_node = next((n for n in path["nodes"] if n["id"] == node_id), None)
    if not target_node:
        raise not_found_error("Unit Node", node_id)

    # Evaluate answers
    user_answers = {a["question_id"]: set(str(s).lower() for s in a.get("selected_options", [])) for a in payload.answers}
    correct_count = 0
    questions = target_node["questions"]

    for q in questions:
        q_id = q["id"]
        correct_set = set(str(c).lower() for c in q["correct_answers"])
        if user_answers.get(q_id) == correct_set:
            correct_count += 1

    total_q = max(1, len(questions))
    score = round((correct_count / total_q) * 100.0, 1)
    passed = (correct_count >= 2) or (total_q <= 1 and correct_count >= 1)

    updated_path = None
    if passed:
        updated_path = await db.complete_path_node(
            path_id=path_id,
            node_id=node_id,
            user_id=current_user["id"],
            score=score
        )

    return {
        "passed": passed,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_q,
        "xp_awarded": 25 if passed else 5,
        "path": updated_path or path
    }
