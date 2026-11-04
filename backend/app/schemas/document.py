from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DocumentSectionResponse(BaseModel):
    id: str
    document_id: str
    section_index: int
    page_number: Optional[int] = None
    heading: Optional[str] = ""
    content: str
    token_estimate: Optional[int] = 0
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    collection_id: str
    user_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    storage_path: str
    total_pages: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime


class DocumentDetailResponse(DocumentResponse):
    sections: List[DocumentSectionResponse] = []
