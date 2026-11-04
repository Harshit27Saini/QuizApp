from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user
from app.core.database import db
from app.core.errors import not_found_error
from app.schemas.collection import CollectionCreate, CollectionResponse

router = APIRouter(prefix="/collections", tags=["Study Collections"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Creates a new study collection (subject/topic workspace)."""
    return await db.create_collection(
        user_id=current_user["id"],
        title=payload.title,
        description=payload.description
    )


@router.get("", response_model=List[CollectionResponse])
async def list_collections(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists all study collections owned by the authenticated user."""
    return await db.list_collections(user_id=current_user["id"])


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves a specific collection by ID."""
    coll = await db.get_collection(collection_id=collection_id, user_id=current_user["id"])
    if not coll:
        raise not_found_error("Collection", collection_id)
    return coll


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes a study collection and its associated documents."""
    deleted = await db.delete_collection(collection_id=collection_id, user_id=current_user["id"])
    if not deleted:
        raise not_found_error("Collection", collection_id)
    return None

