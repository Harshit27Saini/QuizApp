from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.gemini import GeminiProvider
from app.core.config import settings


def get_ai_provider() -> BaseAIProvider:
    """
    Factory function returning the active AI provider based on AI_PROVIDER environment variable.
    Defaults safely to MockAIProvider if no credentials or provider is set to 'mock'.
    """
    provider_name = settings.AI_PROVIDER.lower().strip()

    if "gemini" in provider_name:
        if settings.GEMINI_API_KEY:
            return GeminiProvider(settings.GEMINI_API_KEY)
        return MockAIProvider()

    if "groq" in provider_name:
        return MockAIProvider()

    # Default to Mock provider
    return MockAIProvider()

