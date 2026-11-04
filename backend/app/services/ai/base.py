from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseAIProvider(ABC):
    """
    Abstract interface for AI generation vendors.
    Decouples quiz generation from specific vendors (Gemini, Groq, Ollama, Mock).
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
