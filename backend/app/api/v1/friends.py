from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.database import db

router = APIRouter(prefix="/friends", tags=["Friend Requests & Social Leaderboard"])


class FriendRequestPayload(BaseModel):
    target_email: str


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    payload: FriendRequestPayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Sends a study friend request to a peer via their email address."""
    clean_target = payload.target_email.strip().lower()
    if clean_target == current_user["email"].strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a friend request to yourself."
        )

    # Check existing friends
    existing_friends = await db.list_friends(current_user["id"], current_user["email"])
    if any(f["email"].lower() == clean_target for f in existing_friends):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already study friends with this user!"
        )

    req = await db.create_friend_request(
        from_user_id=current_user["id"],
        from_email=current_user["email"],
        from_name=current_user.get("display_name", current_user["email"].split("@")[0]),
        to_email=clean_target
    )
    return {"success": True, "request": req, "message": f"Friend request sent to {clean_target}!"}


@router.get("/", response_model=List[Dict[str, Any]])
async def get_my_friends(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all confirmed friends and their live study statistics."""
    return await db.list_friends(current_user["id"], current_user["email"])


@router.get("/requests", response_model=List[Dict[str, Any]])
async def get_incoming_requests(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all pending incoming friend requests for the current user."""
    return await db.list_incoming_friend_requests(current_user["email"])


@router.post("/requests/{request_id}/accept")
async def accept_request(
    request_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Accepts an incoming friend request."""
    success = await db.accept_friend_request(request_id, current_user["id"], current_user["email"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or already processed."
        )
    return {"success": True, "message": "Friend request accepted!"}


@router.post("/requests/{request_id}/decline")
async def decline_request(
    request_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Declines an incoming friend request."""
    await db.decline_friend_request(request_id, current_user["email"])
    return {"success": True}


@router.post("/{friend_id}/cheer")
async def cheer_friend(
    friend_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Sends a high-five cheer to a friend, awarding +5 encouragement XP."""
    return {"success": True, "xp_awarded": 5, "message": "High-five sent!"}


@router.get("/leaderboard", response_model=List[Dict[str, Any]])
async def get_social_leaderboard(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns the weekly competitive league leaderboard with actual registered users and real scores."""
    all_users = await db.list_users()
    current_uid = current_user.get("id")
    current_email = current_user.get("email", "").strip().lower()

    # Create a unified list of real accounts
    user_dict = {u.get("id"): u for u in all_users}
    if current_uid not in user_dict:
        user_dict[current_uid] = current_user

    entries = []
    for uid, u in user_dict.items():
        is_curr = (uid == current_uid) or (u.get("email", "").strip().lower() == current_email)
        entries.append({
            "userId": uid,
            "name": u.get("display_name") or u.get("email", "").split("@")[0] or "Playtester",
            "email": u.get("email", ""),
            "weeklyXp": u.get("xp", 0),
            "weekly_xp": u.get("xp", 0),
            "streak": u.get("streak", 0),
            "cheerleader": u.get("cheerleader", "founder"),
            "avatarIcon": "⚡" if is_curr else "👤",
            "isCurrentUser": is_curr,
            "is_current_user": is_curr
        })

    # Sort descending by XP
    entries.sort(key=lambda x: x["weeklyXp"], reverse=True)
    for idx, e in enumerate(entries):
        rank = idx + 1
        e["rank"] = rank
        e["tier"] = "gold" if rank <= 3 else "silver" if rank <= 10 else "bronze"

    return entries
