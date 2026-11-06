from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import (
    get_current_user,
    hash_password,
    generate_salt,
    create_access_token,
    is_admin_user
)
from app.core.database import db

router = APIRouter(prefix="/auth", tags=["Authentication & User Profiles"])


class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    email: str
    display_name: Optional[str] = None
    credential: Optional[str] = None
    avatar_url: Optional[str] = None


class ClaimFounderRequest(BaseModel):
    passcode: str


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


class ClaimFounderResponse(BaseModel):
    success: bool
    is_admin: bool
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
    is_admin = is_admin_user({"email": payload.email})

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
        xp=user["xp"],
        is_admin=is_admin
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "xp": user["xp"],
            "streak": user["streak"],
            "cheerleader": user["cheerleader"],
            "is_admin": is_admin
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

    is_admin = is_admin_user(user)

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        display_name=user["display_name"],
        xp=user.get("xp", 0),
        is_admin=is_admin
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "xp": user.get("xp", 0),
            "streak": user.get("streak", 0),
            "cheerleader": user.get("cheerleader", "sydney"),
            "is_admin": is_admin
        }
    }


@router.post("/google", response_model=AuthResponse)
async def google_login(payload: GoogleAuthRequest):
    """
    Authenticates or signs up a learner via Google Identity.
    Automatically assigns founder/admin role if the email matches harshit27saini@gmail.com.
    """
    clean_email = payload.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid Google account email address is required."
        )

    user = await db.get_user_by_email(clean_email)
    display_name = payload.display_name or clean_email.split("@")[0]
    is_admin = is_admin_user({"email": clean_email})

    if not user:
        salt = generate_salt()
        import uuid
        pw_hash = hash_password(uuid.uuid4().hex, salt)
        user = await db.create_user(
            email=clean_email,
            password_hash=pw_hash,
            salt=salt,
            display_name=display_name
        )

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        display_name=user.get("display_name") or display_name,
        xp=user.get("xp", 0),
        is_admin=is_admin
    )

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user.get("display_name") or display_name,
            "xp": user.get("xp", 0),
            "streak": user.get("streak", 0),
            "cheerleader": user.get("cheerleader", "sydney"),
            "is_admin": is_admin
        }
    }



@router.post("/claim-founder", response_model=ClaimFounderResponse)
async def claim_founder(payload: ClaimFounderRequest):
    """
    Allows the developer to authenticate with the founder passcode
    from any device (mobile, laptop) and receive an authorized admin token.
    """
    if payload.passcode.strip() != settings.FOUNDER_PASSCODE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect founder passcode."
        )

    token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000001",
        email="dev@recall.local",
        display_name="Recall Founder",
        xp=999,
        is_admin=True
    )

    return {
        "success": True,
        "is_admin": True,
        "token": token,
        "user": {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "dev@recall.local",
            "display_name": "Recall Founder",
            "xp": 999,
            "streak": 7,
            "cheerleader": "founder",
            "is_admin": True
        }
    }


@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated user's profile and learning statistics."""
    return current_user
