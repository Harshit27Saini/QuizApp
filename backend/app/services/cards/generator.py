import re
from typing import List, Dict, Any
from app.services.ai.factory import get_ai_provider
from app.core.errors import RecallException

FLASHCARD_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "front": {"type": "string"},
                    "back": {"type": "string"},
                    "source_page": {"type": "integer"},
                    "source_quote": {"type": "string"},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["front", "back", "source_quote"]
            }
        }
    },
    "required": ["cards"]
}


async def generate_flashcards(
    sections: List[Dict[str, Any]],
    count: int = 8
) -> List[Dict[str, Any]]:
    """
    Extracts core concepts, definitions, formulas, and principles from document
    sections and generates high-impact active recall study flashcards.
    """
    if not sections:
        raise RecallException("Cannot generate flashcards: No document sections provided.")

    context_chunks = []
    for s in sections[:15]:
        heading = s.get("heading") or "Untitled Section"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:2000]
        context_chunks.append(f"[Section {s.get('section_index', 0)} - Page {page}] {heading}\nContent:\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = (
        "You are the active-recall pedagogical engine for Recall. "
        "Your task is to transform dense learning materials into concise, high-yield study flashcards.\n"
        "Rules:\n"
        "1. Front side: Must contain a clear concept name, key term, mechanism question, or formula prompt.\n"
        "2. Back side: Must provide an authoritative, clear explanation or definition grounded in the text.\n"
        "3. Provide an exact 'source_quote' from the uploaded text supporting the concept.\n"
        "4. Assign 1-2 relevant subject tags.\n"
        f"5. Generate exactly {count} flashcards."
    )

    user_prompt = f"Target Flashcard Count: {count}\n\nDOCUMENT MATERIAL:\n{full_context}"

    provider = get_ai_provider()

    # If mock provider is active, extract realistic concepts directly from sentences
    if provider.__class__.__name__ == "MockAIProvider":
        raw_text = " ".join([s.get("content", "") for s in sections])
        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_text)
            if len(s.strip()) > 30 and not s.strip().startswith("[")
        ]
        if not sentences:
            sentences = [
                "Active recall is the practice of retrieving information from memory without looking at notes.",
                "Spaced repetition algorithms schedule reviews at optimal intervals before forgetting occurs.",
                "Cognitive load theory explains how working memory limitations impact learning efficiency."
            ]
        cards = []
        for idx, sentence in enumerate(sentences[:count]):
            words = [w for w in sentence.split() if len(w) > 4]
            concept = words[0].capitalize() if words else f"Concept {idx + 1}"
            cards.append({
                "front": f"What is {concept} and how does it function?",
                "back": sentence,
                "source_page": sections[0].get("page_number", 1) if sections else 1,
                "source_quote": sentence,
                "tags": [concept, "Core Concept"]
            })
        return cards

    # For Gemini or other hosted LLM providers
    raw_payload = await provider.generate_structured_json(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        response_schema=FLASHCARD_JSON_SCHEMA
    )

    raw_cards = raw_payload.get("cards", [])
    valid_cards = []
    for c in raw_cards:
        front = c.get("front", "").strip()
        back = c.get("back", "").strip()
        if front and back:
            valid_cards.append({
                "front": front,
                "back": back,
                "source_page": c.get("source_page"),
                "source_quote": c.get("source_quote") or back,
                "tags": c.get("tags", [])
            })

    return valid_cards[:count]
