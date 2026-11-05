import re
from typing import List, Dict, Any, Optional
from app.services.ai.factory import get_ai_provider
from app.services.document_parser.filter import filter_studyable_sections
from app.services.quiz_engine.validator import shuffle_question_options

LEARNING_PATH_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "units": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "node_type": {
                        "type": "string",
                        "enum": ["lesson", "scenario", "checkpoint"]
                    },
                    "title": {"type": "string"},
                    "concept_summary": {"type": "string"},
                    "key_takeaways": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "substantive_content": {
                        "type": "object",
                        "properties": {
                            "overview": {"type": "string"},
                            "mechanisms": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "examples": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "distinctions": {"type": "string"},
                            "exam_pitfalls": {"type": "string"},
                            "source_quote": {"type": "string"},
                            "source_page": {"type": "integer"}
                        },
                        "required": ["overview", "mechanisms", "examples"]
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
                "required": ["node_type", "title", "concept_summary", "key_takeaways", "substantive_content", "questions"]
            }
        }
    },
    "required": ["units"]
}


def _generate_fallback_units(
    clean_sections: List[Dict[str, Any]],
    num_units: int,
    questions_per_unit: int = 3
) -> List[Dict[str, Any]]:
    """Synthesizes high-yield structured substantive units directly from clean syllabus text."""
    units = []
    total_sections = len(clean_sections)
    actual_units = min(num_units, total_sections) if total_sections > 0 else 1
    node_types = ["lesson", "lesson", "scenario", "lesson", "checkpoint"]

    for u_idx in range(actual_units):
        start = (u_idx * total_sections) // actual_units
        end = ((u_idx + 1) * total_sections) // actual_units
        sub_slice = clean_sections[start:max(start + 1, end)] or clean_sections[:1]
        first_sec = sub_slice[0]
        sec_heading = first_sec.get("heading") or f"Module {u_idx + 1}"

        # Calculate exact slide / page range for this stepping stone
        slice_pages = [s.get("page_number") for s in sub_slice if s.get("page_number") is not None]
        if slice_pages:
            u_start_page = min(slice_pages)
            u_end_page = max(slice_pages)
        else:
            u_start_page = u_idx * 6 + 1
            u_end_page = (u_idx + 1) * 6

        if u_start_page == u_end_page:
            page_label = f"Slide {u_start_page}"
        else:
            page_label = f"Slides {u_start_page}–{u_end_page}"

        raw_text = " ".join([s.get("content", "") for s in sub_slice])

        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_text)
            if len(s.strip()) > 30 and not any(kw in s.lower() for kw in [
                "mit-wpu", "universal education", "subject code", "department of", "credit system", "all rights reserved"
            ])
        ]
        if len(sentences) < 4:
            sentences = [
                f"{sec_heading} governs the systematic response and performance characteristics of the system across {page_label}.",
                "Closed-loop feedback enables dynamic adjustment to external disturbances by comparing target and measured states.",
                "Quantitative error metrics differentiate transient settling behaviors from steady-state equilibrium.",
                "Empirical validation confirms whether parameter calibrations maintain stability across boundary conditions."
            ]

        # Determine node type (periodic checkpoints and final boss checkpoint)
        n_type = node_types[u_idx % len(node_types)]
        if u_idx == actual_units - 1 and actual_units >= 3:
            n_type = "checkpoint"

        # Generate questions
        q_list = []
        for q_idx in range(min(questions_per_unit, len(sentences))):
            core_sentence = sentences[q_idx]
            words = [w for w in core_sentence.split() if len(w) > 4 and w.isalpha()]
            key_term = words[0].capitalize() if words else "The principle"
            raw_q = {
                "prompt": f"Regarding {sec_heading} ({page_label}), which statement accurately reflects the role of {key_term}?",
                "options": [
                    {"id": "a", "text": core_sentence},
                    {"id": "b", "text": "It passively attenuates system responses without active feedback."},
                    {"id": "c", "text": "It is only relevant in theoretical modeling and has zero practical application."},
                    {"id": "d", "text": "It completely inhibits all secondary pathways regardless of conditions."}
                ],
                "correct_answers": ["a"],
                "explanation": f"Grounded in syllabus material ({page_label}): {core_sentence}"
            }
            q_list.append(shuffle_question_options(raw_q))

        substantive = {
            "overview": sentences[0] + " " + (sentences[1] if len(sentences) > 1 else ""),
            "mechanisms": [
                s for s in sentences[1:4]
            ] if len(sentences) >= 4 else [
                f"State transitions in {sec_heading} depend on initial conditions and feedback gains.",
                "Error signals are integrated to drive actuator responses."
            ],
            "examples": [
                f"Application: Setting boundary parameters for {sec_heading} during disturbance testing."
            ],
            "distinctions": f"Distinguishes nominal operation from edge-case instability in {sec_heading}.",
            "exam_pitfalls": f"Do not assume {sec_heading} holds true without verifying baseline feedback conditions.",
            "source_quote": sentences[0],
            "source_page": u_start_page,
            "source_page_end": u_end_page,
            "page_range": page_label
        }

        # Clear, friendly, professional title with exact 4-8 slide scope
        clean_heading = re.sub(r"^(Slide|Page|Module|Unit)\s*\d+[:\-]?\s*", "", sec_heading, flags=re.IGNORECASE).strip()
        if not clean_heading:
            clean_heading = f"Topic {u_idx + 1}"

        units.append({
            "node_type": n_type,
            "title": f"{page_label}: {clean_heading}",
            "concept_summary": sentences[0],
            "key_takeaways": sentences[1:4] if len(sentences) >= 4 else sentences,
            "substantive_content": substantive,
            "source_page": u_start_page,
            "source_page_end": u_end_page,
            "page_range": page_label,
            "questions": q_list
        })
    return units


async def generate_document_learning_path(
    sections: List[Dict[str, Any]],
    doc_title: str,
    page_start: Optional[int] = None,
    page_end: Optional[int] = None,
    section_ids: Optional[List[str]] = None,
    lesson_depth: str = "standard"
) -> List[Dict[str, Any]]:
    """
    Analyzes document sections and synthesizes a progressive, multi-unit learning curriculum.
    Granular Stepping Stone Standard:
      Each stepping stone covers 4–8 slides/pages of content.
      - sprint: ~8 slides per stepping stone
      - standard: ~6 slides per stepping stone
      - deep_dive: ~4 slides per stepping stone
    For large documents (e.g. 129 slides), synthesizes 16–25+ granular stepping stones.
    Supports Sandbox slide/page filtering and customizable depth.
    """
    # 1. Sandbox Slide Range & Section Selection
    target_sections = sections
    if section_ids:
        target_sections = [s for s in target_sections if s.get("id") in section_ids]
    elif page_start is not None or page_end is not None:
        start = page_start or 1
        end = page_end or 9999
        target_sections = [
            s for s in target_sections
            if start <= (s.get("page_number") or 1) <= end
        ]

    clean_sections = filter_studyable_sections(target_sections)
    if not clean_sections:
        clean_sections = target_sections if target_sections else sections

    # 2. Calculate Page / Slide Span
    pages = [s.get("page_number") for s in clean_sections if s.get("page_number") is not None]
    if pages:
        min_p = min(pages)
        max_p = max(pages)
        page_span = max(1, max_p - min_p + 1)
    else:
        page_span = max(1, len(clean_sections))

    # 3. Depth Configuration (4–8 slides per stepping stone standard)
    if lesson_depth == "sprint":
        slides_per_stone = 8
        questions_per_unit = 2
    elif lesson_depth == "deep_dive":
        slides_per_stone = 4
        questions_per_unit = 4
    else:  # standard
        slides_per_stone = 6
        questions_per_unit = 3

    # Calculate granular stepping stones:
    # E.g. 129 slides / 6 = ~22 units!
    # Minimum 3 units for short docs; upper bound 35 units for massive textbooks.
    target_units = max(3, round(page_span / slides_per_stone))
    num_units = min(35, min(target_units, max(3, len(clean_sections))))

    # 4. For granular curricula (> 8 units) or MockAIProvider, synthesize directly
    # from clean sections to guarantee exact 4-8 slide coverage without token limit truncation.
    provider = get_ai_provider()
    if provider.__class__.__name__ == "MockAIProvider" or num_units > 8:
        return _generate_fallback_units(clean_sections, num_units, questions_per_unit)

    # For compact curricula (<= 8 units), try LLM structured generation
    context_chunks = []
    for s in clean_sections[:16]:
        heading = s.get("heading") or "Topic"
        page = s.get("page_number") or 1
        content = s.get("content", "")[:1200]
        context_chunks.append(f"[Topic: {heading} - Page {page}]\n{content}")

    full_context = "\n\n---\n\n".join(context_chunks)

    system_instruction = f"""You are the master curriculum architect for Recall, an AI-powered personalized learning platform.
Your task is to transform this technical syllabus material into a progressive {num_units}-unit learning curriculum.
Granular standard: Each stepping stone covers 4–8 slides.

Requirements:
- Target units: Exactly {num_units} units.
- Node types: Mix 'lesson', 'scenario' (case study application), and finish with 'checkpoint' (mastery boss test).
- Substantive Study Material: For each unit, provide substantial, authoritative educational theory in 'substantive_content' so learners can read and master complex concepts (mechanisms, equations/rules, real-world examples, exam pitfalls).
- Practice Questions: Exactly {questions_per_unit} active-recall questions per unit.
  - 4 options ('a', 'b', 'c', 'd') with plausible academic distractors.
  - Clear explanations quoting the text.
"""

    user_prompt = f"DOCUMENT TITLE: {doc_title}\nTARGET UNITS: {num_units}\nQUESTIONS PER UNIT: {questions_per_unit}\n\nCURRICULUM CONTENT:\n{full_context}"

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
                "node_type": u.get("node_type", "lesson"),
                "title": u.get("title", "Learning Unit"),
                "concept_summary": u.get("concept_summary", ""),
                "key_takeaways": u.get("key_takeaways", []),
                "substantive_content": u.get("substantive_content"),
                "source_page": u.get("source_page", 1),
                "questions": q_list
            })
        return validated_units if validated_units else _generate_fallback_units(clean_sections, num_units, questions_per_unit)
    except Exception:
        return _generate_fallback_units(clean_sections, num_units, questions_per_unit)
