from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.quiz import QuestionOption


class SubstantiveContent(BaseModel):
    overview: str = Field(..., description="Comprehensive conceptual breakdown and theory")
    mechanisms: List[str] = Field(default_factory=list, description="Core equations, rules, or operational mechanisms")
    examples: List[str] = Field(default_factory=list, description="Real-world engineering, clinical, or test scenarios")
    distinctions: Optional[str] = Field(None, description="Critical contrasts between related concepts")
    exam_pitfalls: Optional[str] = Field(None, description="Common misconceptions and examination traps")
    source_quote: Optional[str] = Field(None, description="Direct text citation from uploaded document")
    source_page: Optional[int] = Field(None, description="Page or slide number")


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
    node_type: str = Field(default="lesson", description="lesson | scenario | checkpoint")
    title: str
    concept_summary: str
    key_takeaways: List[str]
    substantive_content: Optional[SubstantiveContent] = None
    source_page: Optional[int] = None
    questions: List[PathNodeQuestion]
    is_completed: bool = False
    is_locked: bool = True
    score: Optional[float] = None
    xp_reward: int = 25


class LearningPathGenerateRequest(BaseModel):
    document_id: str
    page_start: Optional[int] = Field(None, description="Sandbox starting page/slide (1-indexed)")
    page_end: Optional[int] = Field(None, description="Sandbox ending page/slide")
    section_ids: Optional[List[str]] = Field(None, description="Specific parsed section IDs to study")
    lesson_depth: str = Field(default="standard", description="sprint | standard | deep_dive")
    force_regenerate: bool = Field(default=False, description="Whether to overwrite existing path with new sandbox range")


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
