import re
from typing import List, Dict, Any
from app.services.ai.factory import get_ai_provider
from app.services.document_parser.filter import filter_studyable_sections
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
    Automatically filters out cover pages, institutional boilerplate, and tables of contents.
    """
    if not sections:
        raise RecallException("Cannot generate flashcards: No document sections provided.")

    # Filter out title pages, institutional quotes, and Table of Contents
    clean_sections = filter_studyable_sections(sections)

    context_chunks = []
    for s in clean_sections[:15]:
        heading = s.get("heading") or "Academic Topic"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:2000]
        context_chunks.append(f"[Topic: {heading} - Page {page}]\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = (
        "You are an academic examination author for Recall. "
        "Your task is to transform substantive syllabus material into concise, high-yield study flashcards.\n"
        "Rules:\n"
        "1. Focus 100% on academic concepts, definitions, mechanisms, and models. "
        "IGNORE any university administrative info, course codes, table of contents, or founder messages.\n"
        "2. Front side: A clear concept name, mechanism question, or key principle.\n"
        "3. Back side: An authoritative, clear explanation grounded in the text.\n"
        "4. Provide an exact 'source_quote' from the uploaded text supporting the concept.\n"
        "5. Assign 1-2 relevant subject tags.\n"
        f"6. Generate exactly {count} flashcards."
    )

    user_prompt = f"Target Flashcard Count: {count}\n\nCURRICULUM MATERIAL:\n{full_context}"

    provider = get_ai_provider()

    # If mock provider is active, extract substantive concepts directly from academic sentences
    if provider.__class__.__name__ == "MockAIProvider":
        raw_text = " ".join([s.get("content", "") for s in clean_sections])
        # Find sentences that contain substantive academic definitions or relationships
        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_text)
            if len(s.strip()) > 40 and not any(kw in s.lower() for kw in [
                "subject code", "department of", "mit-wpu", "universal education",
                "credit system", "table of contents", "index sr", "all rights reserved"
            ])
        ]
        if not sentences:
            sentences = [
                "Conflict analysis examines the root causes, stakeholders, and dynamics of interpersonal and organizational disputes.",
                "Functional conflict supports organizational goals and improves performance, whereas dysfunctional conflict hinders progress.",
                "Conflict resolution focuses on addressing underlying grievances through negotiation, mediation, and consensus-building.",
                "Non-violent communication emphasizes empathetic listening and expressing feelings and needs without assigning blame."
            ]

        cards = []
        for idx, sentence in enumerate(sentences[:count]):
            # Try to identify an academic topic
            clean_s = sentence.replace("\n", " ").strip()
            words = [w for w in clean_s.split() if len(w) > 4 and w.isalpha()]
            concept = words[0].capitalize() if words else f"Concept {idx + 1}"
            cards.append({
                "front": f"What is the role and definition of {concept} in this context?",
                "back": clean_s,
                "source_page": clean_sections[0].get("page_number", 1) if clean_sections else 1,
                "source_quote": clean_s,
                "tags": [concept, "Core Curriculum"]
            })
        return cards

    # For Gemini or hosted LLM providers
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
