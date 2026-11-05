from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class FlashcardItem(BaseModel):
    id: str
    deck_id: str
    front: str  # Concept, Term, or Question
    back: str   # Definition, Explanation, or Formula
    source_page: Optional[int] = None
    source_quote: Optional[str] = None
    tags: List[str] = []
    mastered: bool = False
    created_at: datetime


class FlashcardDeckResponse(BaseModel):
    id: str
    user_id: str
    collection_id: str
    title: str
    document_ids: List[str]
    created_at: datetime
    cards: Optional[List[FlashcardItem]] = None


class FlashcardGenerateRequest(BaseModel):
    collection_id: str
    document_ids: List[str] = Field(..., min_length=1)
    title: Optional[str] = None
    card_count: Optional[int] = Field(8, ge=1, le=50)
    start_slide: Optional[int] = None
    end_slide: Optional[int] = None

