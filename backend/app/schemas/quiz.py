from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class QuestionOption(BaseModel):
    id: str  # e.g. "a", "b", "c", "d"
    text: str


class QuestionBase(BaseModel):
    question_type: Literal["MCQ", "MSQ"] = "MCQ"
    prompt: str
    options: List[QuestionOption]
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class QuestionPublic(QuestionBase):
    """Question object served to the user during the active quiz session (no answers leaked)."""
    id: str
    quiz_id: str
    source_page: Optional[int] = None


class QuestionDetail(QuestionPublic):
    """Complete question object with correct answers, explanations, and quotes (for results & review)."""
    correct_answers: List[str]
    explanation: str
    source_document_id: Optional[str] = None
    source_quote: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    collection_id: Optional[str] = None
    document_ids: List[str] = Field(..., min_length=1)
    title: Optional[str] = None
    mode: Literal["STRICT", "CONCEPTUAL"] = "STRICT"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_count: int = Field(5, ge=1, le=20)
    question_types: List[Literal["MCQ", "MSQ"]] = ["MCQ", "MSQ"]


class QuizResponse(BaseModel):
    id: str
    user_id: str
    collection_id: Optional[str] = None
    title: str
    mode: str
    difficulty: str
    created_at: datetime
    questions: Optional[List[QuestionPublic]] = None
