from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from app.core.security import get_current_user, get_admin_user
from app.core.database import db

router = APIRouter(prefix="/feedback", tags=["Playtester Bug Reports & Feedback"])


class FeedbackCreateRequest(BaseModel):
    type: str  # 'bug', 'idea', 'ux'
    message: str
    url: str
    browser_info: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submits a playtest bug report or feature feedback from any tester device."""
    item = await db.create_feedback(
        user_id=current_user.get("id", "anonymous"),
        email=current_user.get("email", "anonymous@recall.local"),
        display_name=current_user.get("display_name", "Playtester"),
        feedback_type=payload.type,
        message=payload.message,
        url=payload.url,
        browser_info=payload.browser_info
    )
    return {"success": True, "feedback": item}


@router.get("/", response_model=List[Dict[str, Any]])
async def list_all_feedback(
    admin_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Returns all playtest feedback and bug reports chronologically.
    RESTRICTED: Developer & Founder only.
    """
    return await db.list_feedback()


@router.delete("/{feedback_id}")
async def resolve_feedback(
    feedback_id: str,
    admin_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Marks a bug report as resolved / deleted.
    RESTRICTED: Developer & Founder only.
    """
    await db.delete_feedback(feedback_id)
    return {"success": True}
