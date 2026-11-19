from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.database import db

router = APIRouter(prefix="/groups", tags=["Groups"])


class CreateGroupPayload(BaseModel):
    name: str
    emoji: str = "🔥"


class InvitePayload(BaseModel):
    email: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: CreateGroupPayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new study group."""
    group = await db.create_group(
        owner_id=current_user["id"],
        owner_email=current_user["email"],
        owner_name=current_user.get("display_name", current_user["email"].split("@")[0]),
        name=payload.name.strip(),
        emoji=payload.emoji
    )
    return {"success": True, "group": group, **group}


@router.get("/", response_model=List[Dict[str, Any]])
async def list_my_groups(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all groups the current user is a member of."""
    return await db.list_user_groups(current_user["id"], current_user["email"])


@router.get("/{group_id}", response_model=Dict[str, Any])
async def get_group(
    group_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a group with its member list."""
    group = await db.get_group(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    members = await db.list_group_members(group_id)
    is_member = any(
        m.get("user_id") == current_user["id"] or m.get("email") == current_user["email"]
        for m in members
    )
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group.")

    return {**group, "members": members}


@router.post("/{group_id}/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    group_id: str,
    payload: InvitePayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Invite a user to the group by email (owner only)."""
    group = await db.get_group(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    if group["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group owner can invite members.")

    clean_email = payload.email.strip().lower()
    if clean_email == current_user["email"].strip().lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already the owner of this group.")

    # Check if already a member
    members = await db.list_group_members(group_id)
    if any(m.get("email", "").lower() == clean_email for m in members):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this group.")

    # Resolve user info if they exist
    all_users = await db.list_users()
    matched_user = next((u for u in all_users if u.get("email", "").strip().lower() == clean_email), None)
    invited_name = matched_user.get("display_name", clean_email.split("@")[0]) if matched_user else clean_email.split("@")[0]
    invited_id = matched_user["id"] if matched_user else f"pending_{clean_email}"

    member = await db.add_group_member(
        group_id=group_id,
        user_id=invited_id,
        email=clean_email,
        name=invited_name,
        role="member"
    )
    return {"success": True, "member": member}


@router.delete("/{group_id}/members/{user_id}")
async def kick_member(
    group_id: str,
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove a member from the group (owner only)."""
    group = await db.get_group(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    if group["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group owner can remove members.")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot remove themselves.")

    removed = await db.remove_group_member(group_id, user_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this group.")
    return {"success": True}


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a group (owner only)."""
    group = await db.get_group(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    if group["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group owner can delete the group.")

    await db.delete_group(group_id)
    return {"success": True}
