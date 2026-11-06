import json
import httpx
from typing import Dict, Any, List
from app.services.ai.base import BaseAIProvider
from app.core.config import settings
from app.core.errors import AIProviderError


class GroqProvider(BaseAIProvider):
    """
    Groq Cloud Provider (Free Tier: 14,400 requests/day, 30 RPM).
    Ultra-fast inference with LLaMA 3.3 70B and LLaMA 3.1 8B.
    """

    MODELS_IN_PRIORITY: List[str] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768"
    ]

    def __init__(self, api_key: str = ""):
        self.api_key = api_key or settings.GROQ_API_KEY
        if not self.api_key:
            raise AIProviderError("GROQ_API_KEY is not configured in backend/.env")

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        schema_prompt = (
            f"{system_instruction}\n\n"
            f"IMPORTANT: You MUST respond with a valid JSON object matching this schema:\n"
            f"{json.dumps(response_schema, indent=2)}\n"
            f"Do not include any Markdown ticks or explanatory text outside the JSON."
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        timeout = httpx.Timeout(connect=10.0, read=60.0, write=15.0, pool=10.0)
        last_error = "Unknown error"

        async with httpx.AsyncClient(timeout=timeout) as client:
            for model_name in self.MODELS_IN_PRIORITY:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": schema_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }

                try:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                except httpx.TimeoutException:
                    last_error = f"Groq ({model_name}) timed out after 60s."
                    continue
                except httpx.RequestError as e:
                    last_error = f"Groq ({model_name}) network error: {str(e)}"
                    continue

                if response.status_code == 429:
                    last_error = f"Groq model {model_name} rate limit reached."
                    continue

                if response.status_code == 200:
                    try:
                        result = response.json()
                        raw_content = result["choices"][0]["message"]["content"]
                        return json.loads(raw_content)
                    except (KeyError, json.JSONDecodeError) as e:
                        last_error = f"Failed to parse Groq response as JSON: {str(e)}"
                        continue
                else:
                    last_error = f"Groq HTTP {response.status_code}: {response.text}"

        print(f"[Recall AI] Groq generation failed ({last_error}). Falling back to local offline provider.")
        from app.services.ai.mock_provider import MockAIProvider
        mock = MockAIProvider()
        return await mock.generate_structured_json(system_instruction, user_prompt, response_schema)
