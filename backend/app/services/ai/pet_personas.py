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

    # Fallback response if mock or offline
    if provider.__class__.__name__ == "MockAIProvider":
        if pet_id == "sydney":
            reply = f"*Happy tail wag!* You're making awesome progress on {current_topic or 'this topic'}! Think of this like balancing on three legs—the feedback loop constantly corrects errors to keep the system stable. You've got this!"
        elif pet_id == "connie":
            reply = f"*Gentle, dignified purr.* Let us be rigorous regarding {current_topic or 'this mechanism'}. Notice the exact relationship between the input state and the output response—the distinction lies in how disturbances are attenuated."
        elif pet_id == "milo":
            reply = f"*Alert ear perk!* Here's the street-smart trick for {current_topic or 'this concept'}: ignore the scary terminology. In practice, all it means is you monitor output, calculate the difference, and adjust power. Simple as that."
        elif pet_id == "scooby":
            reply = f"*Resting chin calmly on your knee.* Take a breath. Let's break down {current_topic or 'this section'} together. First, we identify what we are measuring, then we look at what changes over time."
        else: # bunny
            reply = f"*Bouncing happily!* Wow, this part of {current_topic or 'the lesson'} is super interesting! Once you see how the components connect, everything falls into place like clockwork!"

        return {
            "pet_id": pet["id"],
            "pet_name": pet["name"],
            "reply": reply,
            "suggested_followups": [
                f"🐾 Break down the formula/steps",
                f"🐾 Give an intuitive real-world example",
                f"🐾 What's the most common exam trap here?"
            ]
        }

    try:
        reply = await provider.generate_text(
            system_instruction=system_prompt,
            user_prompt=full_prompt
        )
        return {
            "pet_id": pet["id"],
            "pet_name": pet["name"],
            "reply": reply.strip(),
            "suggested_followups": [
                f"🐾 Can you explain that with an example?",
                f"🐾 What should I watch out for in exams?",
                f"🐾 Why does this mechanism work this way?"
            ]
        }
    except Exception:
        # Graceful fallback to persona message if network hiccups
        return {
            "pet_id": pet["id"],
            "pet_name": pet["name"],
            "reply": f"*Nudges your hand gently.* Based on {current_topic or 'your study material'}, this concept focuses on how the core principles and relationships govern the outcome. Let's review the key definition together!",
            "suggested_followups": [
                "🐾 Explain with an analogy",
                "🐾 Show the step-by-step breakdown"
            ]
        }
