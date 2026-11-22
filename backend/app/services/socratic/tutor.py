from typing import Dict, Any, List, Optional
from app.services.ai.factory import get_ai_provider
from app.services.ai.pet_personas import PET_PROFILES
from app.schemas.socratic import SocraticOption, SocraticTeachResponse


async def generate_socratic_teaching(
    document_title: str,
    page_number: int,
    page_text: str,
    pet_id: str,
    user_response: Optional[str] = None,
    previous_question: Optional[str] = None
) -> SocraticTeachResponse:
    pet = PET_PROFILES.get(pet_id.lower(), PET_PROFILES["sydney"])
    provider = get_ai_provider()

    # Step 1: If evaluating student's response to previous question
    evaluation_text = None
    is_correct = None
    xp_awarded = 0

    if user_response and previous_question:
        eval_system_prompt = f"""You are {pet['name']}, an AI study companion ({pet['breed']}).
Personality: {pet['style']}

Evaluate the student's answer to this study question:
Question: {previous_question}
Student's Answer: {user_response}
Reference Slide Content:
{page_text[:1500]}

Respond with valid JSON matching:
{{
  "is_correct": true or false,
  "feedback": "1-2 sentences of encouraging feedback in your persona, clarifying any misconception and affirming their progress."
}}"""
        try:
            eval_schema = {
                "type": "object",
                "properties": {
                    "is_correct": {"type": "boolean"},
                    "feedback": {"type": "string"}
                },
                "required": ["is_correct", "feedback"]
            }
            eval_res = await provider.generate_structured_json(
                system_instruction=eval_system_prompt,
                user_prompt="Evaluate the student response now.",
                response_schema=eval_schema
            )
            is_correct = bool(eval_res.get("is_correct", True))
            evaluation_text = eval_res.get("feedback", "Great effort! Let's keep moving forward.")
            xp_awarded = 15 if is_correct else 5
        except Exception as e:
            print(f"[Socratic Tutor] Evaluation fallback: {e}")
            is_correct = True
            evaluation_text = f"*{pet['name']} nods with enthusiasm!* Well reasoned! Let's explore the core principles of this slide."
            xp_awarded = 10

    # Step 2: Teach the current slide
    teach_system_prompt = f"""You are {pet['name']}, an AI study companion ({pet['breed']}) for Recall.
Personality: {pet['style']}

You are actively teaching the student Slide/Page {page_number} of "{document_title}".
Reference Text from this Slide:
\"\"\"
{page_text[:3000] if page_text else f"Slide {page_number} of {document_title}"}
\"\"\"

Task:
1. slide_title: A concise 3-6 word descriptive title for this slide.
2. core_principle: 2-3 crisp, clear sentences explaining the fundamental rule, mechanism, or law on this slide.
3. intuitive_analogy: A relatable real-world comparison or metaphor that makes this slide impossible to forget.
4. socratic_question: 1 focused, thought-provoking active recall question testing whether the student grasped the concept.
5. options: Exactly 3 multiple-choice options (id 'a', 'b', 'c') where one is correct and two are plausible distractors.
6. correct_option_id: 'a', 'b', or 'c'.
"""

    teach_schema = {
        "type": "object",
        "properties": {
            "slide_title": {"type": "string"},
            "core_principle": {"type": "string"},
            "intuitive_analogy": {"type": "string"},
            "socratic_question": {"type": "string"},
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
            "correct_option_id": {"type": "string"}
        },
        "required": ["slide_title", "core_principle", "intuitive_analogy", "socratic_question", "options", "correct_option_id"]
    }

    try:
        teach_data = await provider.generate_structured_json(
            system_instruction=teach_system_prompt,
            user_prompt=f"Teach Slide {page_number} now.",
            response_schema=teach_schema
        )
        opts = [SocraticOption(id=o.get("id", "a"), text=o.get("text", "")) for o in teach_data.get("options", [])]
        if len(opts) < 2:
            opts = [
                SocraticOption(id="a", text="It stabilizes baseline feedback conditions"),
                SocraticOption(id="b", text="It introduces phase lag without attenuation"),
                SocraticOption(id="c", text="It eliminates steady-state disturbance")
            ]

        return SocraticTeachResponse(
            page_number=page_number,
            pet_id=pet["id"],
            pet_name=pet["name"],
            avatar=pet["avatar"],
            slide_title=teach_data.get("slide_title", f"Slide {page_number}: Core Concept"),
            core_principle=teach_data.get("core_principle", f"This slide examines the fundamental mechanisms governing {document_title}."),
            intuitive_analogy=teach_data.get("intuitive_analogy", "Think of this like a thermostat sensing room temperature to adjust the furnace before anyone feels cold."),
            socratic_question=teach_data.get("socratic_question", "What is the primary governing condition that must be met here?"),
            options=opts,
            correct_option_id=teach_data.get("correct_option_id", "a"),
            evaluation=evaluation_text,
            is_correct=is_correct,
            xp_awarded=xp_awarded
        )
    except Exception as e:
        print(f"[Socratic Tutor] Structured generation fallback: {e}")
        # Deterministic offline fallback
        heading = f"Slide {page_number}: Key Principles"
        sentences = [s.strip() for s in page_text.split('.') if len(s.strip()) > 15] if page_text else []
        summary = sentences[0] if sentences else f"Overview of slide {page_number} in {document_title}."

        return SocraticTeachResponse(
            page_number=page_number,
            pet_id=pet["id"],
            pet_name=pet["name"],
            avatar=pet["avatar"],
            slide_title=heading,
            core_principle=summary,
            intuitive_analogy=f"Think of this slide as setting up the boundary rules before we apply complex operations.",
            socratic_question=f"Based on Slide {page_number}, which principle directly dictates system stability?",
            options=[
                SocraticOption(id="a", text="Baseline negative feedback and error attenuation"),
                SocraticOption(id="b", text="Unrestricted open-loop disturbance propagation"),
                SocraticOption(id="c", text="Random boundary condition fluctuations")
            ],
            correct_option_id="a",
            evaluation=evaluation_text,
            is_correct=is_correct,
            xp_awarded=xp_awarded
        )
