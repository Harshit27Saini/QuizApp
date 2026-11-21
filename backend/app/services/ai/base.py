from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseAIProvider(ABC):
    """
    Abstract interface for AI generation vendors.
    Decouples quiz generation and interactive chat tutoring from specific vendors (Gemini, Groq, Ollama, Mock).
    """

    @abstractmethod
    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a prompt against the model and returns a guaranteed structured JSON dict.
        Raises AIProviderError on failure or invalid format.
        """
        pass

    @abstractmethod
    async def generate_text(
        self,
        system_instruction: str,
        user_prompt: str
    ) -> str:
        """
        Executes a prompt against the model and returns a plain text response (for conversational chat, explanations, tutoring).
        Raises AIProviderError on failure.
        """
        pass

