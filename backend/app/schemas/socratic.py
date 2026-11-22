from typing import List, Optional
from pydantic import BaseModel, Field


class SocraticOption(BaseModel):
    id: str
    text: str


class SocraticTeachRequest(BaseModel):
    page_number: int = Field(1, ge=1, description="1-based page or slide number")
    pet_id: str = Field("sydney", description="Companion persona identifier")
    user_response: Optional[str] = Field(None, description="Student's answer to the previous question")
    previous_question: Optional[str] = Field(None, description="Previous question being answered")


class SocraticTeachResponse(BaseModel):
    page_number: int
    pet_id: str
    pet_name: str
    avatar: str
    slide_title: str
    core_principle: str
    intuitive_analogy: str
    socratic_question: str
    options: List[SocraticOption] = Field(default_factory=list)
    correct_option_id: Optional[str] = None
    evaluation: Optional[str] = None
    is_correct: Optional[bool] = None
    xp_awarded: int = 0
