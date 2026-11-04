from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.quiz import QuestionDetail


class QuestionAnswerSubmission(BaseModel):
    question_id: str
    selected_options: List[str]  # e.g. ["a"] or ["a", "c"]
    time_spent_seconds: int = 0


class AttemptSubmitRequest(BaseModel):
    quiz_id: str
    time_taken_seconds: int = Field(0, ge=0)
    answers: List[QuestionAnswerSubmission]
    is_retry: bool = False
    parent_attempt_id: Optional[str] = None


class EvaluatedQuestionResult(BaseModel):
    question: QuestionDetail
    selected_options: List[str]
    is_correct: bool
    time_spent_seconds: int


class AttemptResultResponse(BaseModel):
    id: str
    quiz_id: str
    user_id: str
    is_retry: bool
    parent_attempt_id: Optional[str] = None
    score: float
    total_questions: int
    correct_count: int
    time_taken_seconds: int
    xp_earned: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    question_results: List[EvaluatedQuestionResult]
