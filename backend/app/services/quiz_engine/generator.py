from typing import List, Dict, Any
from app.services.ai.factory import get_ai_provider
from app.services.quiz_engine.validator import validate_generated_questions
from app.services.document_parser.filter import filter_studyable_sections
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
    mode: str = "EXAMINATION",
    difficulty: str = "medium",
    count: int = 5,
    allowed_types: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Orchestrates prompt creation, LLM invocation via BaseAIProvider, and strict validation.
    Generates authentic, high-yield academic exam questions.
    Filters out front-matter, title pages, indices, and university vision statements.
    """
    if not sections:
        raise QuizValidationError("Cannot generate quiz: No document content provided.")

    allowed_types = allowed_types or ["MCQ", "MSQ"]
    clean_sections = filter_studyable_sections(sections)

    # Build context from clean sections
    context_chunks = []
    for s in clean_sections[:15]:
        heading = s.get("heading") or "Core Topic"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:2500]
        context_chunks.append(f"[Topic: {heading} - Page {page}]\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = f"""You are a senior university professor and competitive examination author for Recall.
Your goal is to write realistic, high-yield exam questions that test real domain mastery.

CRITICAL RULES:
1. BAN META-LANGUAGE:
   - NEVER write "According to the passage", "As stated in the text", "The document discusses", or "Which of the following is mentioned".
   - The question must read like a real standardized board/university exam question evaluating domain knowledge.

2. ACADEMIC SUBSTANCE ONLY:
   - NEVER test administrative text, university names, author prefaces, course codes, or tables of contents.
   - Focus exclusively on academic definitions, mechanisms, causality, and theoretical models.

3. QUESTION TYPES TO TARGET:
   - Mechanism & Function: "What is the primary role of X in Y process?"
   - Causality & Consequences: "What occurs when X is inhibited/modified?"
   - Comparative Analysis: "How does X differ from Y?"
   - Problem-solving & Application: "Given scenario X, which outcome is expected?"
   - Mode: {mode}.

4. PLAUSIBLE, HIGH-QUALITY DISTRACTORS:
   - Distractors MUST be plausible terms/mechanisms from the same academic domain that test common student misconceptions.
   - NEVER use throwaway/joke options, meta-commentary, or obvious giveaways like "None of the above" or "The author does not say".
   - All 4 options must be similar in length and tone.

5. SPECIFICATIONS:
   - Target difficulty: {difficulty}.
   - Generate exactly {count} questions.
   - Allowed types: {', '.join(allowed_types)}.
   - For MCQ: exactly 1 correct answer. For MSQ: 2 or more correct answers.
   - Provide an exact 'source_quote' from the material that justifies the correct answer.
   - Write clear explanations explaining WHY the correct option is right and why the distractors are wrong.
"""

    user_prompt = f"TARGET QUESTION COUNT: {count}\nDIFFICULTY: {difficulty}\nMODE: {mode}\n\nCURRICULUM MATERIAL:\n{full_context}"

    provider = get_ai_provider()
    raw_payload = await provider.generate_structured_json(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        response_schema=QUESTION_JSON_SCHEMA
    )

    raw_questions = raw_payload.get("questions", [])
    validated = validate_generated_questions(raw_questions, mode=mode)
    return validated[:count]
