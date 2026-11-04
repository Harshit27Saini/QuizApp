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

    if provider_name == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiProvider(settings.GEMINI_API_KEY)
        # Fall back to mock if key not yet entered
        return MockAIProvider()

    # Default to Mock provider
    return MockAIProvider()
