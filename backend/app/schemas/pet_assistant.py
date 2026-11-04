from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PetMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class PetChatRequest(BaseModel):
    pet_id: str = Field(..., description="sydney | connie | milo | scooby | bunny")
    user_message: str = Field(..., min_length=1, description="Learner's question or request")
    current_topic: Optional[str] = Field(None, description="Topic/title of current study material")
    context_text: Optional[str] = Field(None, description="Current substantive study text or question")
    chat_history: Optional[List[PetMessage]] = Field(default_factory=list, description="Recent conversation turns")


class PetChatResponse(BaseModel):
    pet_id: str
    pet_name: str
    reply: str
    suggested_followups: List[str] = Field(default_factory=list)

