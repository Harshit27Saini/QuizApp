import time
import hashlib
import uuid
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt
from app.core.config import settings

DEV_USER: Dict[str, Any] = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "dev@recall.local",
    "display_name": "Recall Founder",
    "xp": 250
}


def hash_password(password: str, salt: str) -> str:
    """Computes SHA-256 salted password hash."""
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def generate_salt() -> str:
    return uuid.uuid4().hex[:16]


def create_access_token(user_id: str, email: str, display_name: str, xp: int = 250) -> str:
    """Generates signed HS256 JWT access token valid for 30 days."""
    payload = {
        "sub": user_id,
        "email": email,
        "name": display_name,
        "xp": xp,
        "exp": int(time.time()) + (30 * 86400)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extracts and validates user identity from either:
    1. Signed Recall HS256 Bearer JWT
    2. Firebase Auth ID Bearer token
    3. Dev user fallback when running in local development mode
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

        # 1. First attempt: Recall native JWT token
        try:
            decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            return {
                "id": decoded.get("sub"),
                "email": decoded.get("email", ""),
                "display_name": decoded.get("name") or decoded.get("email", "").split("@")[0],
                "xp": decoded.get("xp", 250)
            }
        except Exception:
            pass

        # 2. Second attempt: Firebase Auth token (if configured)
        if settings.FIREBASE_PROJECT_ID or settings.FIREBASE_CREDENTIALS_PATH:
            try:
                import firebase_admin
                from firebase_admin import auth as fb_auth

                decoded_token = fb_auth.verify_id_token(token)
                return {
                    "id": decoded_token.get("uid"),
                    "email": decoded_token.get("email", ""),
                    "display_name": decoded_token.get("name") or decoded_token.get("email", "").split("@")[0],
                    "xp": 250
                }
            except Exception:
                pass

    # 3. Dev / Mock mode fallback
    if settings.ENVIRONMENT == "development" or (not settings.FIREBASE_PROJECT_ID and not settings.FIREBASE_CREDENTIALS_PATH):
        user_id = x_user_id or DEV_USER["id"]
        return {
            "id": user_id,
            "email": DEV_USER["email"],
            "display_name": DEV_USER["display_name"],
            "xp": DEV_USER["xp"]
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication token."
    )
