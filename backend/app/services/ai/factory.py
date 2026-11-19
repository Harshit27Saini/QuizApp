from typing import Dict, Any
from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.groq import GroqProvider
from app.core.config import settings


class FastHybridProvider(BaseAIProvider):
    """
    High-Performance Hybrid AI Provider.
    1. Tries Groq first (lightning-fast 1-2s inference with Qwen 27B / GPT-OSS 120B).
    2. Falls back to Gemini Flash (with 12s timeout).
    3. Falls back to MockAIProvider if network is down or quota exhausted.
    """

    def __init__(self):
        self.groq = GroqProvider(settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
        self.gemini = GeminiProvider(settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
        self.mock = MockAIProvider()

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        if self.groq:
            try:
                return await self.groq.generate_structured_json(system_instruction, user_prompt, response_schema)
            except Exception as e:
                print(f"[Recall AI] Groq fast-tier failed: {e}. Falling back to Gemini.")

        if self.gemini:
            try:
                return await self.gemini.generate_structured_json(system_instruction, user_prompt, response_schema)
            except Exception as e:
                print(f"[Recall AI] Gemini fallback failed: {e}. Falling back to local offline provider.")

        return await self.mock.generate_structured_json(system_instruction, user_prompt, response_schema)


def get_ai_provider() -> BaseAIProvider:
    """
    Factory function returning the optimal AI provider.
    Priority:
    - If AI_PROVIDER == 'mock' -> MockAIProvider
    - If GROQ_API_KEY is present -> FastHybridProvider (ultra-fast 1-2s generation with Gemini fallback)
    - If GEMINI_API_KEY is present -> GeminiProvider
    - Fallback -> MockAIProvider
    """
    provider_name = settings.AI_PROVIDER.lower().strip()

    if provider_name == "mock":
        return MockAIProvider()

    if settings.GROQ_API_KEY:
        return FastHybridProvider()

    if settings.GEMINI_API_KEY:
        return GeminiProvider(settings.GEMINI_API_KEY)

    return MockAIProvider()
