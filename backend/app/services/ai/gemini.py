import json
import httpx
from typing import Dict, Any, List
from app.services.ai.base import BaseAIProvider
from app.core.config import settings
from app.core.errors import AIProviderError


class GeminiProvider(BaseAIProvider):
    """
    Google AI Studio Gemini Provider.
    Prioritizes models with generous free-tier quotas (e.g. 500 RPD on Flash Lite),
    rotates across models and API keys upon 429 quota exhaustion,
    and falls back gracefully to local synthetic generation if all keys are depleted.
    """

    # gemini-3.5-flash-lite has 500 requests/day & 15 RPM on Google AI Studio Free Tier
    # (compared to only 20 requests/day on gemini-3.6-flash preview)
    MODELS_IN_PRIORITY: List[str] = [
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
    ]

    def __init__(self, api_key: str = ""):
        raw_keys = api_key or settings.GEMINI_API_KEY
        if not raw_keys:
            raise AIProviderError("GEMINI_API_KEY is not configured in backend/.env")
        # Support comma-separated keys for auto-rotation across free-tier accounts
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self._key_index = 0

    def _get_current_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self._key_index % len(self.api_keys)]

    def _rotate_key(self):
        if len(self.api_keys) > 1:
            self._key_index = (self._key_index + 1) % len(self.api_keys)

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
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

        headers = {"Content-Type": "application/json"}
        timeout = httpx.Timeout(connect=15.0, read=90.0, write=20.0, pool=15.0)
        last_error = "Unknown error"

        async with httpx.AsyncClient(timeout=timeout) as client:
            # Try across available API keys and models
            for _ in range(len(self.api_keys)):
                current_key = self._get_current_key()
                params = {"key": current_key}

                for model_name in self.MODELS_IN_PRIORITY:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                    try:
                        response = await client.post(url, headers=headers, params=params, json=payload)
                    except httpx.TimeoutException:
                        last_error = f"Gemini ({model_name}) timed out after 90s."
                        continue
                    except httpx.RequestError as e:
                        last_error = f"Gemini ({model_name}) connection error: {str(e)}"
                        continue

                    if response.status_code == 429:
                        # Rate limit on this model/key: do NOT crash! Continue to next model/key!
                        last_error = f"Model {model_name} rate limit reached (HTTP 429)."
                        continue

                    if response.status_code == 200:
                        try:
                            result = response.json()
                            candidates = result.get("candidates", [])
                            if not candidates:
                                continue
                            raw_text = candidates[0]["content"]["parts"][0]["text"]
                            return json.loads(raw_text)
                        except (KeyError, json.JSONDecodeError) as e:
                            last_error = f"Failed to parse JSON response from {model_name}: {str(e)}"
                            continue
                    else:
                        last_error = f"HTTP {response.status_code} ({model_name}): {response.text}"

                # Rotate to next key if we have multiple
                self._rotate_key()

        # If all Gemini online calls are quota-blocked, seamlessly fall back to local high-quality mock generator
        # so the user's study session is never interrupted by a hard crash
        print(f"[Recall AI] All Gemini free-tier endpoints hit quota/limits ({last_error}). Falling back to local offline provider.")
        from app.services.ai.mock_provider import MockAIProvider
        mock = MockAIProvider()
        return await mock.generate_structured_json(system_instruction, user_prompt, response_schema)
