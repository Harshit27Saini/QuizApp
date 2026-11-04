from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.quiz import QuestionPublic, QuestionOption


class PathNodeQuestion(BaseModel):
    id: str
    prompt: str
    options: List[QuestionOption]
    correct_answers: List[str]
    explanation: str


class PathNode(BaseModel):
    id: str
    path_id: str
    unit_index: int
    title: str
    concept_summary: str
    key_takeaways: List[str]
    source_page: Optional[int] = None
    questions: List[PathNodeQuestion]
    is_completed: bool = False
    is_locked: bool = True
    score: Optional[float] = None
    xp_reward: int = 25


class LearningPathResponse(BaseModel):
    id: str
    user_id: str
    collection_id: str
    document_id: str
    title: str
    total_units: int
    completed_units: int
    created_at: datetime
    nodes: List[PathNode]


class PathNodeCompleteRequest(BaseModel):
    answers: List[Dict[str, Any]]  # [{"question_id": "...", "selected_options": ["a"]}]
    time_spent_seconds: int = 0
