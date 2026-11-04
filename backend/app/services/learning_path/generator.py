import re
from typing import List, Dict, Any
from app.services.ai.factory import get_ai_provider
from app.services.document_parser.filter import filter_studyable_sections
from app.services.quiz_engine.validator import shuffle_question_options
from app.core.errors import RecallException

LEARNING_PATH_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "units": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "concept_summary": {"type": "string"},
                    "key_takeaways": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "source_page": {"type": "integer"},
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
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
                                "explanation": {"type": "string"}
                            },
                            "required": ["prompt", "options", "correct_answers", "explanation"]
                        }
                    }
                },
                "required": ["title", "concept_summary", "key_takeaways", "questions"]
            }
        }
    },
    "required": ["units"]
}


def _generate_fallback_units(clean_sections: List[Dict[str, Any]], num_units: int) -> List[Dict[str, Any]]:
    """Synthesizes high-yield structured units directly from clean syllabus text."""
    units = []
    chunk_size = max(1, len(clean_sections) // num_units)
    for u_idx in range(num_units):
        sub_slice = clean_sections[u_idx * chunk_size : (u_idx + 1) * chunk_size] or clean_sections[:1]
        first_sec = sub_slice[0]
        sec_heading = first_sec.get("heading") or f"Module {u_idx + 1}"
        raw_text = " ".join([s.get("content", "") for s in sub_slice])
        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_text)
            if len(s.strip()) > 30 and not any(kw in s.lower() for kw in [
                "mit-wpu", "universal education", "subject code", "department of", "credit system"
            ])
        ]
        if len(sentences) < 3:
            sentences = [
                f"{sec_heading} explores the foundational mechanisms and interactions governing the topic.",
                "Systematic evaluation enables learners to distinguish functional processes from dysfunctional disruptions.",
                "Effective intervention addresses root causes through structured analysis and collaborative problem-solving."
            ]

        q_list = []
        for q_idx in range(min(3, len(sentences))):
            core_sentence = sentences[q_idx]
            words = [w for w in core_sentence.split() if len(w) > 4 and w.isalpha()]
            key_term = words[0].capitalize() if words else "The principle"
            raw_q = {
                "prompt": f"Regarding {sec_heading}, which statement accurately reflects the role of {key_term}?",
                "options": [
                    {"id": "a", "text": core_sentence},
                    {"id": "b", "text": "It passively attenuates system responses without active feedback."},
                    {"id": "c", "text": "It is only relevant in theoretical modeling and has zero practical application."},
                    {"id": "d", "text": "It completely inhibits all secondary pathways regardless of conditions."}
                ],
                "correct_answers": ["a"],
                "explanation": f"Grounded in unit material: {core_sentence}"
            }
            # Shuffle options so correct answer is uniformly distributed
            q_list.append(shuffle_question_options(raw_q))

        units.append({
            "title": f"Unit {u_idx + 1}: {sec_heading}",
            "concept_summary": sentences[0],
            "key_takeaways": sentences[1:4] if len(sentences) >= 4 else sentences,
            "source_page": first_sec.get("page_number", 1),
            "questions": q_list
        })
    return units


async def generate_document_learning_path(
    sections: List[Dict[str, Any]],
    doc_title: str
) -> List[Dict[str, Any]]:
    """
    Analyzes document sections and synthesizes a progressive, multi-unit Duolingo-style
    learning curriculum. Each unit contains a bite-sized concept lesson and 3 mini-quiz questions.
    """
    clean_sections = filter_studyable_sections(sections)
    if not clean_sections:
        clean_sections = sections

    # Partition sections into 3 to 5 logical clusters
    total_sections = len(clean_sections)
    num_units = min(5, max(3, (total_sections + 2) // 3))

    context_chunks = []
    for s in clean_sections[:12]:
        heading = s.get("heading") or "Topic"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:1200]
        context_chunks.append(f"[Topic: {heading} - Page {page}]\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = f"""You are the master curriculum architect for Recall, a personalized learning platform.
Your task is to transform this academic document into a progressive, gamified {num_units}-unit learning path (like Duolingo).

For each unit:
1. Title: Engaging, clear academic unit name (e.g. "Unit 1: Fundamentals of Conflict Dynamics").
2. Concept Summary: A concise 2-3 sentence overview that a student can read in 60 seconds.
3. Key Takeaways: 3-4 bullet points highlighting the most essential principles or definitions.
4. Questions: Exactly 3 high-yield active-recall questions specifically testing this unit.
   - 4 options ('a', 'b', 'c', 'd') per question.
   - Plausible academic distractors.
   - Clear explanations.
"""

    user_prompt = f"DOCUMENT TITLE: {doc_title}\nTARGET UNITS: {num_units}\n\nCURRICULUM CONTENT:\n{full_context}"

    provider = get_ai_provider()

    # If mock provider
    if provider.__class__.__name__ == "MockAIProvider":
        return _generate_fallback_units(clean_sections, num_units)

    # For Gemini or hosted LLM provider with auto-fallback
    try:
        raw_payload = await provider.generate_structured_json(
            system_instruction=system_instruction,
            user_prompt=user_prompt,
            response_schema=LEARNING_PATH_JSON_SCHEMA
        )
        raw_units = raw_payload.get("units", [])
        validated_units = []
        for u in raw_units:
            q_list = []
            for q in u.get("questions", []):
                q_list.append(shuffle_question_options(q))
            validated_units.append({
                "title": u.get("title", "Learning Unit"),
                "concept_summary": u.get("concept_summary", ""),
                "key_takeaways": u.get("key_takeaways", []),
                "source_page": u.get("source_page", 1),
                "questions": q_list
            })
        return validated_units if validated_units else _generate_fallback_units(clean_sections, num_units)
    except Exception:
        # Fall back cleanly to high-yield local curriculum clustering if API hiccups
        return _generate_fallback_units(clean_sections, num_units)
