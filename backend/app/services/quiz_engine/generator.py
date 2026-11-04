from typing import List, Dict, Any
from app.services.ai.factory import get_ai_provider
from app.services.quiz_engine.validator import validate_generated_questions
from app.core.errors import QuizValidationError


QUESTION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question_type": {"type": "string", "enum": ["MCQ", "MSQ"]},
                    "prompt": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "text": {"type": "string"}
                            },
                            "required": ["id", "text"]
                        }
                    },
                    "correct_answers": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "explanation": {"type": "string"},
                    "source_page": {"type": "integer"},
                    "source_quote": {"type": "string"},
                    "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]}
                },
                "required": ["question_type", "prompt", "options", "correct_answers", "explanation", "source_quote"]
            }
        }
    },
    "required": ["questions"]
}


async def generate_quiz_questions(
    sections: List[Dict[str, Any]],
    mode: str = "STRICT",
    difficulty: str = "medium",
    count: int = 5,
    allowed_types: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Orchestrates prompt creation, LLM invocation via BaseAIProvider, and strict validation.
    """
    if not sections:
        raise QuizValidationError("Cannot generate quiz: No document content provided.")

    allowed_types = allowed_types or ["MCQ", "MSQ"]

    # Build context from sections
    context_chunks = []
    for s in sections[:15]:  # limit to top 15 sections to keep prompt concise
        heading = s.get("heading") or "Untitled Section"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:2000]
        context_chunks.append(f"[Section {s.get('section_index', 0)} - Page {page}] {heading}\nContent:\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = (
        "You are the examination and assessment engine for Recall, a high-rigor learning platform. "
        "Your task is to generate active-recall assessment questions strictly grounded in the provided document material.\n"
        "Rules:\n"
        f"1. Mode: {mode}. "
        + ("For STRICT mode: Every single question must be directly verifiable in the text. You must provide an exact 'source_quote' from the text." if mode == "STRICT" else "For CONCEPTUAL mode: Test comprehension, relationships, and synthesis of concepts in the text.") + "\n"
        f"2. Difficulty level: {difficulty}.\n"
        f"3. Generate exactly {count} questions.\n"
        f"4. Supported question types: {', '.join(allowed_types)}. For MCQ: exactly 1 correct answer. For MSQ: 2 or more correct answers.\n"
        "5. Each question must provide 4 distinct options with ids 'a', 'b', 'c', 'd'.\n"
        "6. Do not include ungrounded external facts or hallucinated information."
    )

    user_prompt = f"Target Question Count: {count}\nDifficulty: {difficulty}\n\nDOCUMENT MATERIAL:\n{full_context}"

    provider = get_ai_provider()
    raw_payload = await provider.generate_structured_json(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        response_schema=QUESTION_JSON_SCHEMA
    )

    raw_questions = raw_payload.get("questions", [])
    validated = validate_generated_questions(raw_questions, mode=mode)
    return validated[:count]

