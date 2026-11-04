from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CollectionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)


class CollectionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

