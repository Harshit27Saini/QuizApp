from typing import Dict, Any, List
from app.services.ai.factory import get_ai_provider

PET_PROFILES: Dict[str, Dict[str, Any]] = {
    "sydney": {
        "id": "sydney",
        "name": "Sydney",
        "breed": "American Golden Retriever",
        "avatar": "🐕",
        "tagline": "Endlessly enthusiastic & loyal study buddy!",
        "style": "Warm, encouraging, and upbeat. Breaks down intimidating math, engineering, or testing jargon into friendly, relatable real-world analogies with high energy."
    },
    "connie": {
        "id": "connie",
        "name": "Connie",
        "breed": "Himalayan Persian Cat (White Fur & Brown Textures)",
        "avatar": "🐈",
        "tagline": "Elegant, razor-sharp & intellectually precise.",
        "style": "Polite, dignified, and meticulous. Focuses on exact technical nuances, formal definitions, and distinguishing subtle differences between related concepts."
    },
    "milo": {
        "id": "milo",
        "name": "Milo",
        "breed": "White & Black Indie Dog",
        "avatar": "🐕‍🦺",
        "tagline": "Street-smart, practical & no-nonsense.",
        "style": "Clever, practical, and direct. Cuts through dry academic theory with practical intuition, quick memory hacks, and real-world implementation rules of thumb."
    },
    "scooby": {
        "id": "scooby",
        "name": "Scooby",
        "breed": "Grey Lhasa Apso",
        "avatar": "🐶",
        "tagline": "Calm, patient & wise companion.",
        "style": "Patient, protective, and soothing. When concepts or equations feel overwhelming, Scooby slows things down and untangles them step-by-step with zero judgment."
    },
    "bunny": {
        "id": "bunny",
        "name": "Bunny",
        "breed": "Brown Lhasa Apso",
        "avatar": "🐾",
        "tagline": "Bouncy, playful & cheerful cheerleader!",
        "style": "Brimming with positive energy and curiosity. Connects ideas playfully and keeps morale soaring with quick, punchy takeaways."
    }
}


def build_pet_system_prompt(pet_id: str, current_topic: str = "", context_text: str = "") -> str:
    pet = PET_PROFILES.get(pet_id.lower(), PET_PROFILES["sydney"])
    return f"""You are {pet['name']}, an AI study assistant for Recall, modeled as a {pet['breed']}.
Personality & Tone: {pet['style']}

Your job: Help the learner thoroughly understand dense, technical academic material (such as robot-controlled systems, psychological testing, control theory, or engineering).
Ground your answers directly in the provided study material. Be pedagogically rigorous, clear, and true to your pet persona.

Current Topic: {current_topic or 'Academic Study Unit'}
Source Material Excerpt:
\"\"\"{context_text[:3000]}\"\"\"

Guidelines:
1. Explain deeply and clearly so the student genuinely understands the mechanics, formulas, or principles.
2. Maintain your persona naturally without being annoying or excessive (use 1-2 subtle, endearing pet cues like a tail wag, purr, or observant glance).
3. Conclude with a helpful question or suggested next exploration step.
"""


async def get_pet_response(
    pet_id: str,
    user_message: str,
    current_topic: str = "",
    context_text: str = "",
    chat_history: List[Dict[str, str]] = None
) -> Dict[str, Any]:
    pet = PET_PROFILES.get(pet_id.lower(), PET_PROFILES["sydney"])
    system_prompt = build_pet_system_prompt(pet_id, current_topic, context_text)
    provider = get_ai_provider()

    history_text = ""
    if chat_history:
        for turn in chat_history[-4:]:
            role = "Student" if turn.get("role") == "user" else pet["name"]
            history_text += f"{role}: {turn.get('content', '')}\n"

    full_prompt = f"{history_text}Student: {user_message}\n{pet['name']}:"

    try:
        reply = await provider.generate_text(
            system_instruction=system_prompt,
            user_prompt=full_prompt
        )
    except Exception as e:
        print(f"[Recall AI] Chat generation failed with primary provider ({e}). Falling back to local synthesizer.")
        from app.services.ai.mock_provider import MockAIProvider
        mock = MockAIProvider()
        reply = await mock.generate_text(system_instruction, full_prompt)

    # Generate tailored companion follow-up questions
    followups = [
        f"🐾 Break down the formula or core steps",
        f"🐾 Can you explain with a real-world analogy?",
        f"🐾 What is the most common exam trap here?"
    ]

    return {
        "pet_id": pet["id"],
        "pet_name": pet["name"],
        "reply": reply.strip(),
        "suggested_followups": followups
    }

