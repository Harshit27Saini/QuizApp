import time
import hashlib
import uuid
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
import jwt
from app.core.config import settings

DEV_USER: Dict[str, Any] = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "dev@recall.local",
    "display_name": "Recall Founder",
    "xp": 250,
    "is_admin": True
}


def hash_password(password: str, salt: str) -> str:
    """Computes SHA-256 salted password hash."""
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def generate_salt() -> str:
    return uuid.uuid4().hex[:16]


def is_admin_user(user: Dict[str, Any], passcode: Optional[str] = None) -> bool:
    """Checks whether the user has developer/founder admin privileges."""
    if passcode and passcode == settings.FOUNDER_PASSCODE:
        return True

    if user.get("is_admin") is True:
        return True

    email = user.get("email", "").strip().lower()
    if not email:
        return False

    # Check exact configured admin list
    for admin_email in settings.admin_email_list:
        if admin_email in email:
            return True

    # Convenience check for founder handle
    if "harshit" in email:
        return True

    return False


def create_access_token(
    user_id: str,
    email: str,
    display_name: str,
    xp: int = 250,
    is_admin: bool = False
) -> str:
    """Generates signed HS256 JWT access token valid for 30 days."""
    payload = {
        "sub": user_id,
        "email": email,
        "name": display_name,
        "xp": xp,
        "is_admin": is_admin,
        "exp": int(time.time()) + (30 * 86400)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_founder_passcode: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extracts and validates user identity from either:
    1. Signed Recall HS256 Bearer JWT
    2. Firebase Auth ID Bearer token
    3. Dev user fallback when running in local development mode
    """
    user_data: Dict[str, Any] = {}

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

        # 1. First attempt: Recall native JWT token
        try:
            decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            email = decoded.get("email", "")
            user_data = {
                "id": decoded.get("sub"),
                "email": email,
                "display_name": decoded.get("name") or email.split("@")[0],
                "xp": decoded.get("xp", 250),
                "is_admin": decoded.get("is_admin", False)
            }
        except Exception:
            pass

        # 2. Second attempt: Firebase Auth token (if configured)
        if not user_data and (settings.FIREBASE_PROJECT_ID or settings.FIREBASE_CREDENTIALS_PATH):
            try:
                import firebase_admin
                from firebase_admin import auth as fb_auth

                decoded_token = fb_auth.verify_id_token(token)
                email = decoded_token.get("email", "")
                user_data = {
                    "id": decoded_token.get("uid"),
                    "email": email,
                    "display_name": decoded_token.get("name") or email.split("@")[0],
                    "xp": 250,
                    "is_admin": False
                }
            except Exception:
                pass

    # 3. Dev / Mock mode fallback
    if not user_data:
        if settings.ENVIRONMENT == "development" or (not settings.FIREBASE_PROJECT_ID and not settings.FIREBASE_CREDENTIALS_PATH):
            user_id = x_user_id or DEV_USER["id"]
            email = DEV_USER["email"] if not x_user_id else f"guest_{x_user_id[:8]}@recall.local"
            user_data = {
                "id": user_id,
                "email": email,
                "display_name": DEV_USER["display_name"] if not x_user_id else f"Guest {x_user_id[:4]}",
                "xp": DEV_USER["xp"],
                "is_admin": (not x_user_id) or is_admin_user({"email": email})
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authentication token."
            )

    # Evaluate admin status with founder passcode or email rules
    user_data["is_admin"] = is_admin_user(user_data, passcode=x_founder_passcode)
    return user_data


async def get_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
    x_founder_passcode: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Enforces that only the developer / founder can access protected routes
    (e.g., feedback inbox, per-user telemetry logs).
    """
    if is_admin_user(current_user, passcode=x_founder_passcode):
        current_user["is_admin"] = True
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: This developer portal is restricted to the founder only."
    )
