from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user, hash_password, generate_salt, create_access_token
from app.core.database import db

router = APIRouter(prefix="/auth", tags=["Authentication & User Profiles"])


class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignUpRequest):
    """Registers a new learner account with email, password, and display name."""
    existing = await db.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    salt = generate_salt()
    pw_hash = hash_password(payload.password, salt)
    display_name = payload.display_name or payload.email.split("@")[0]

    user = await db.create_user(
        email=payload.email,
        password_hash=pw_hash,
        salt=salt,
        display_name=display_name
    )

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        display_name=user["display_name"],
        xp=user["xp"]
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "xp": user["xp"],
            "streak": user["streak"],
            "cheerleader": user["cheerleader"]
        }
    }


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """Authenticates user with email and password, returning a 30-day access token."""
    user = await db.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    expected_hash = hash_password(payload.password, user["salt"])
    if expected_hash != user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        display_name=user["display_name"],
        xp=user.get("xp", 250)
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "xp": user.get("xp", 250),
            "streak": user.get("streak", 1),
            "cheerleader": user.get("cheerleader", "founder")
        }
    }


@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated user's profile and learning statistics."""
    return current_user
