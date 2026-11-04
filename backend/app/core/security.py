from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.core.config import settings

DEV_USER: Dict[str, Any] = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "dev@recall.local",
    "display_name": "Recall Founder",
    "xp": 120
}


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extracts and validates user identity from the Firebase Auth ID Bearer token.
    In local development / mock mode (when Firebase credentials are not set),
    it allows seamless offline development using DEV_USER or X-User-Id.
    """
    # 1. Dev / Mock mode fallback when no Firebase credentials or in development
    if not settings.FIREBASE_PROJECT_ID and not settings.FIREBASE_CREDENTIALS_PATH:
        user_id = x_user_id or DEV_USER["id"]
        return {
            "id": user_id,
            "email": DEV_USER["email"],
            "display_name": DEV_USER["display_name"],
            "xp": DEV_USER["xp"]
        }

    # 2. Production / configured Firebase Auth token verification
    if not authorization or not authorization.startswith("Bearer "):
        if settings.ENVIRONMENT == "development":
            return DEV_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected 'Bearer <firebase_token>'."
        )

    token = authorization.split(" ")[1]

    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth

        decoded_token = fb_auth.verify_id_token(token)
        return {
            "id": decoded_token.get("uid"),
            "email": decoded_token.get("email", ""),
            "display_name": decoded_token.get("name") or decoded_token.get("email", "").split("@")[0],
            "xp": 0
        }
    except Exception as e:
        if settings.ENVIRONMENT == "development":
            return DEV_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase authentication token: {str(e)}"
        )
