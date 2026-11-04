from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt
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
    Extracts and validates user identity from the Supabase JWT Bearer token.
    In local development / mock mode (when Supabase credentials are not set),
    it allows seamless local development using a default dev user or X-User-Id.
    """
    # 1. Dev / Mock mode fallback when no Supabase secret is configured
    if not settings.SUPABASE_JWT_SECRET and not settings.SUPABASE_URL:
        user_id = x_user_id or DEV_USER["id"]
        return {
            "id": user_id,
            "email": DEV_USER["email"],
            "display_name": DEV_USER["display_name"],
            "xp": DEV_USER["xp"]
        }

    # 2. Production / configured Supabase JWT verification
    if not authorization or not authorization.startswith("Bearer "):
        # If in dev environment, still permit fallback if no token provided
        if settings.ENVIRONMENT == "development":
            return DEV_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected 'Bearer <token>'."
        )

    token = authorization.split(" ")[1]

    try:
        # Supabase JWTs are signed with the project JWT secret using HS256
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "display_name": payload.get("user_metadata", {}).get("full_name") or payload.get("email", "").split("@")[0],
            "xp": 0
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired."
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
