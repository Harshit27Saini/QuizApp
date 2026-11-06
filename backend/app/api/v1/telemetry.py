from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from app.core.security import get_current_user, get_admin_user
from app.core.database import db

router = APIRouter(prefix="/telemetry", tags=["Playtester Dev Telemetry & Logs"])


class TelemetryEventCreate(BaseModel):
    event_type: str
    path: str
    payload: Optional[Dict[str, Any]] = None
    device_info: Optional[Dict[str, Any]] = None


class TelemetryLogResponse(BaseModel):
    success: bool
    log_id: Optional[str] = None


@router.post("/log", response_model=TelemetryLogResponse, status_code=status.HTTP_201_CREATED)
async def record_telemetry(
    payload: TelemetryEventCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Records an anonymous or authenticated playtester activity/error event.
    Safe, non-blocking ingestion for developer diagnostics.
    """
    try:
        user_id = current_user.get("id", "anonymous")
        user_email = current_user.get("email", "anonymous@recall.local")
        user_name = current_user.get("display_name", "Playtester")

        item = await db.create_telemetry_log(
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            event_type=payload.event_type.upper(),
            path=payload.path,
            payload=payload.payload,
            device_info=payload.device_info
        )
        return {"success": True, "log_id": item["id"]}
    except Exception:
        # Never break frontend experience due to telemetry failure
        return {"success": False, "log_id": None}


@router.get("/logs", response_model=List[Dict[str, Any]])
async def list_telemetry_logs(
    limit: int = Query(250, ge=1, le=1000),
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    admin_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Retrieves chronological activity and error logs from playtesters.
    RESTRICTED: Developer & Founder only.
    """
    return await db.list_telemetry_logs(
        limit=limit,
        user_id=user_id,
        event_type=event_type
    )


@router.delete("/logs")
async def clear_telemetry_logs(
    admin_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Purges stored telemetry logs.
    RESTRICTED: Developer & Founder only.
    """
    await db.clear_telemetry_logs()
    return {"success": True}


@router.get("/storage")
async def get_storage_stats(
    admin_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Returns live storage and upload diagnostics for founder to monitor disk usage.
    RESTRICTED: Developer & Founder only.
    """
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    upload_dir = os.path.join(base_dir, "uploads")
    
    total_bytes = 0
    file_count = 0
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            fp = os.path.join(upload_dir, f)
            if os.path.isfile(fp):
                file_count += 1
                total_bytes += os.path.getsize(fp)

    return {
        "upload_dir_exists": os.path.exists(upload_dir),
        "files_on_disk": file_count,
        "total_storage_bytes": total_bytes,
        "total_storage_mb": round(total_bytes / (1024 * 1024), 2),
        "max_upload_size_mb": 25,
        "dedup_algorithm": "SHA-256 Content Hashing"
    }


