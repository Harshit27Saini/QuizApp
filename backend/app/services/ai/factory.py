from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.groq import GroqProvider
from app.core.config import settings


def get_ai_provider() -> BaseAIProvider:
    """
    Factory function returning the active AI provider based on AI_PROVIDER environment variable.
    Priority:
    1. If AI_PROVIDER == 'groq' and GROQ_API_KEY is present -> GroqProvider (14,400 free requests/day)
    2. If AI_PROVIDER == 'gemini' and GEMINI_API_KEY is present -> GeminiProvider (with auto-rotation & fallback)
    3. If neither -> MockAIProvider (zero credential offline generation)
    """
    provider_name = settings.AI_PROVIDER.lower().strip()

    if "groq" in provider_name:
        if settings.GROQ_API_KEY:
            return GroqProvider(settings.GROQ_API_KEY)
        return MockAIProvider()

    if "gemini" in provider_name:
        if settings.GEMINI_API_KEY:
            return GeminiProvider(settings.GEMINI_API_KEY)
        return MockAIProvider()

    # Default to Mock provider
    return MockAIProvider()

