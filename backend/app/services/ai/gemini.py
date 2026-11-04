import json
import httpx
from typing import Dict, Any
from app.services.ai.base import BaseAIProvider
from app.core.config import settings
from app.core.errors import AIProviderError


class GeminiProvider(BaseAIProvider):
    """
    Google AI Studio Gemini Flash provider.
    Free tier: 15 RPM, 1M TPM, 1,500 RPD.
    Supports constrained JSON output via generationConfig.
    """

    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

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

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                response = await client.post(self.API_URL, headers=headers, params=params, json=payload)
            except httpx.RequestError as e:
                raise AIProviderError(f"Network error connecting to Gemini API: {str(e)}")

        if response.status_code == 429:
            raise AIProviderError("Gemini API rate limit exceeded. Please wait a few seconds and try again.")
        if response.status_code != 200:
            raise AIProviderError(f"Gemini API returned error HTTP {response.status_code}: {response.text}")

        try:
            result = response.json()
            candidates = result.get("candidates", [])
            if not candidates:
                raise AIProviderError("Gemini returned empty candidates.")
            
            raw_text = candidates[0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(raw_text)
            return parsed_json
        except (KeyError, json.JSONDecodeError) as e:
            raise AIProviderError(f"Failed to parse structured JSON from Gemini response: {str(e)}")
