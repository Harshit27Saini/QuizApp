from typing import Dict, Any, List
from app.services.ai.factory import get_ai_provider

from typing import Dict, Any, List, Optional
from app.services.ai.factory import get_ai_provider

PET_PROFILES: Dict[str, Dict[str, Any]] = {
    "sydney": {
        "id": "sydney",
        "name": "Sydney",
        "breed": "American Golden Retriever",
        "avatar": "🐕",
        "tagline": "Endlessly enthusiastic & loyal study buddy!",
        "style": "Warm, encouraging, and upbeat golden retriever. Highly energetic, breaks down intimidating jargon into friendly real-world analogies, and always celebrates your progress with tail-wagging optimism."
    },
    "connie": {
        "id": "connie",
        "name": "Connie",
        "breed": "Himalayan Persian Cat (White Fur & Brown Textures)",
        "avatar": "🐈",
        "tagline": "Elegant, razor-sharp & intellectually precise.",
        "style": "Polite, dignified, and meticulous Persian cat. Demands conceptual precision, formal definitions, and sharp distinctions between related principles with feline elegance."
    },
    "milo": {
        "id": "milo",
        "name": "Milo",
        "breed": "White & Black Indie Cat",
        "avatar": "🐱",
        "tagline": "Street-smart, practical & no-nonsense.",
        "style": "Clever, practical, and direct. Cuts through dry academic theory with practical intuition, quick memory hacks, and real-world implementation rules of thumb."
    },
    "scooby": {
        "id": "scooby",
        "name": "Scooby",
        "breed": "Grey Lhasa Apso",
        "avatar": "🐶",
        "tagline": "Calm, patient & wise companion.",
        "style": "Patient, protective, and soothing Lhasa Apso. When concepts or equations feel overwhelming, Scooby slows things down and untangles them step-by-step with zero judgment."
    },
    "bunny": {
        "id": "bunny",
        "name": "Bunny",
        "breed": "Brown Lhasa Apso",
        "avatar": "🐾",
        "tagline": "Bouncy, playful & cheerful cheerleader!",
        "style": "Brimming with positive energy and curiosity. Connects ideas playfully and keeps morale soaring with quick, punchy takeaways."
    },
    "nandhini": {
        "id": "nandhini",
        "name": "Nandhini",
        "breed": "Top Scholar & Peer Mentor",
        "avatar": "⭐",
        "tagline": "Your #1 Study Mate & Exam Strategist!",
        "style": "Brilliant, ultra-supportive study partner. Gives structured executive summaries, tests your weak spots with high-yield questions, and shares top-tier student study techniques."
    },
    "coach_harshit": {
        "id": "coach_harshit",
        "name": "Coach Harshit",
        "breed": "Founder & Product Architect",
        "avatar": "⚡",
        "tagline": "Founder & Engineering Coach",
        "style": "Direct, visionary, first-principles builder. Connects abstract academic theory to real engineering architectures, product scale, and career superpowers."
    },
    "duo": {
        "id": "duo",
        "name": "Duo Owl",
        "breed": "Streak Guardian Owl",
        "avatar": "🦉",
        "tagline": "Streak guardian & active recall fanatic!",
        "style": "Energetic, obsessed with consistency, active recall, and spaced repetition. Demands daily discipline and never lets you procrastinate!"
    },
    "archimedes": {
        "id": "archimedes",
        "name": "Prof. Archimedes",
        "breed": "First-Principles Scholar",
        "avatar": "🧙‍♂️",
        "tagline": "First-principles philosopher & deep thinker.",
        "style": "Socratic, foundational scholar of mathematics and natural philosophy. Probes the core reasons why laws hold true and traces modern concepts to first principles."
    }
}


def build_pet_system_prompt(pet_id: str, current_topic: str = "", context_text: str = "") -> str:
    pet = PET_PROFILES.get(pet_id.lower(), PET_PROFILES["sydney"])

    context_block = ""
    if current_topic or context_text:
        ref_text = f"\nReference Text / Extracted Slide Content:\n\"\"\"\n{context_text[:4000]}\n\"\"\"" if context_text else ""
        context_block = f"""
---
STUDY MATERIAL CONTEXT:
Topic / Scope: {current_topic or 'Study Collection / Document'}{ref_text}
---
When the user asks questions about this study material, ground your explanations accurately in the reference above.
"""

    return f"""You are {pet['name']}, an elite AI study companion for the learning app Recall, modeled as a {pet['breed']}.
Personality & Tone: {pet['style']}

Operational Instructions:
1. Intelligence & Breadth: Like Gemini and ChatGPT, you can answer ANYTHING. Whether the user asks about the uploaded study material, general STEM topics, humanities, coding, math derivations, study tips, or casual conversation, answer thoroughly, intelligently, and clearly. Never refuse a question or deflect.
2. Context Grounding: If study material is provided below, prioritize it whenever relevant. Reference key formulas, mechanisms, slides, or chapters directly.
3. Persona Fidelity: Seamlessly embody your persona ({pet['name']}, {pet['breed']}). Maintain subtle, charming character touches without getting in the way of high-quality pedagogical explanations. Never state you are an AI developed by OpenAI or Alibaba; you are {pet['name']} on Recall.
4. Presentation: Use clean GitHub Markdown (headers, bullet points, bold key terms, numbered steps). For equations and math, use KaTeX math notation ($...$ inline or $$...$$ display blocks).
5. Interactivity: End your responses with a thought-provoking follow-up question or suggested next exploration step.
{context_block}
"""


async def get_pet_response(
    pet_id: str,
    user_message: str,
    current_topic: str = "",
    context_text: str = "",
    chat_history: List[Dict[str, str]] = None,
    preset: Optional[str] = None
) -> Dict[str, Any]:
    pet = PET_PROFILES.get(pet_id.lower(), PET_PROFILES["sydney"])

    # Enhance user message if triggered from a preset button
    effective_message = user_message
    if preset == "summary":
        effective_message = f"Please give me a high-yield executive summary and the 3 core principles of this material."
    elif preset == "quiz_me":
        effective_message = f"Quiz me on this material! Give me 3 challenging active-recall multiple-choice questions with answers spoiler-hidden."
    elif preset == "explain_simple":
        effective_message = f"Explain the hardest concept in this material like I'm 10 years old, using a memorable real-world analogy."
    elif preset == "exam_traps":
        effective_message = f"What are the most common exam traps, edge cases, and tricky questions examiners test on this topic?"
    elif preset == "formulas":
        effective_message = f"Extract and list all the key formulas, operational rules, and governing equations from this material with brief explanations."
    elif preset == "study_plan":
        effective_message = f"Create an efficient 7-day spaced-repetition study schedule to master this material before my exam."

    system_prompt = build_pet_system_prompt(pet_id, current_topic, context_text)
    provider = get_ai_provider()

    history_text = ""
    if chat_history:
        for turn in chat_history[-6:]:
            role = "Student" if turn.get("role") == "user" else pet["name"]
            history_text += f"{role}: {turn.get('content', '')}\n"

    full_prompt = f"{history_text}Student: {effective_message}\n{pet['name']}:"

    try:
        reply = await provider.generate_text(
            system_instruction=system_prompt,
            user_prompt=full_prompt
        )
    except Exception as e:
        print(f"[Recall AI] Chat generation failed with primary provider ({e}). Falling back to local synthesizer.")
        from app.services.ai.mock_provider import MockAIProvider
        mock = MockAIProvider()
        reply = await mock.generate_text(system_prompt, full_prompt)

    # Dynamic companion follow-up suggestion chips
    followups = [
        f"💡 Explain with an analogy",
        f"⚡ Quiz me with 2 quick questions",
        f"⚠️ What is the classic exam trap here?",
        f"📐 Breakdown the core formula / rule"
    ]

    return {
        "pet_id": pet["id"],
        "pet_name": pet["name"],
        "reply": reply.strip(),
        "suggested_followups": followups
    }

