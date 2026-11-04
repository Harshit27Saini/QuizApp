import json
import httpx
from typing import Dict, Any
from app.services.ai.base import BaseAIProvider
from app.core.config import settings
from app.core.errors import AIProviderError


class GeminiProvider(BaseAIProvider):
    """
    Google AI Studio Gemini Flash provider.
    Uses active gemini-3.5-flash model with native structured JSON output.
    """

    PRIMARY_MODEL = "gemini-3.5-flash"
    FALLBACK_MODELS = ["gemini-3-flash-preview"]

    def __init__(self, api_key: str = ""):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key:
            raise AIProviderError("GEMINI_API_KEY is not configured in backend/.env")

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": 0.2
            }
        }

        # Generous timeout: 15s connect, 90s read (to allow large structured JSON generation)
        timeout = httpx.Timeout(connect=15.0, read=90.0, write=20.0, pool=15.0)
        models_to_try = [self.PRIMARY_MODEL] + self.FALLBACK_MODELS
        last_error = "Unknown error"

        async with httpx.AsyncClient(timeout=timeout) as client:
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                try:
                    response = await client.post(url, headers=headers, params=params, json=payload)
                except httpx.TimeoutException:
                    last_error = f"Connection to Gemini ({model_name}) timed out after 90 seconds. Try reducing question count or section size."
                    continue
                except httpx.RequestError as e:
                    detail = str(e) or type(e).__name__
                    last_error = f"Network connection error to Gemini ({model_name}): {detail}"
                    continue

                if response.status_code == 429:
                    raise AIProviderError("Gemini API rate limit reached. Please wait a few seconds and try again.")

                if response.status_code == 200:
                    try:
                        result = response.json()
                        candidates = result.get("candidates", [])
                        if not candidates:
                            continue
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        return json.loads(raw_text)
                    except (KeyError, json.JSONDecodeError) as e:
                        last_error = f"Failed to parse JSON response: {str(e)}"
                        continue
                else:
                    last_error = f"HTTP {response.status_code}: {response.text}"

        raise AIProviderError(f"Gemini API generation failed across models: {last_error}")
