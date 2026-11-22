from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PetMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class PetChatRequest(BaseModel):
    pet_id: str = Field(..., description="sydney | connie | milo | scooby | bunny | nandhini | coach_harshit | duo | archimedes")
    user_message: str = Field(..., min_length=1, description="Learner's question or request")
    current_topic: Optional[str] = Field(None, description="Topic/title of current study material")
    context_text: Optional[str] = Field(None, description="Current substantive study text or question")
    chat_history: Optional[List[PetMessage]] = Field(default_factory=list, description="Recent conversation turns")
    collection_id: Optional[str] = Field(None, description="Active collection id if chatting in collection scope")
    document_id: Optional[str] = Field(None, description="Active document id if chatting in document scope")
    preset: Optional[str] = Field(None, description="Optional preset key (e.g. summary, quiz_me, explain_simple, exam_traps, formulas, study_plan)")


class PetChatResponse(BaseModel):
    pet_id: str
    pet_name: str
    reply: str
    suggested_followups: List[str] = Field(default_factory=list)

