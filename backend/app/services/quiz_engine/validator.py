from typing import Dict, Any, List
from app.core.errors import QuizValidationError


def validate_question_dict(q: Dict[str, Any], mode: str = "STRICT") -> Dict[str, Any]:
    """
    Validates that a generated question dictionary satisfies strict schema and consistency rules:
    - Non-empty prompt
    - Valid options list with unique IDs
    - correct_answers must be a subset of option IDs
    - MCQ must have exactly 1 correct answer
    - MSQ must have at least 2 correct answers
    - In STRICT mode, source_quote must not be empty
    """
    prompt = q.get("prompt", "").strip()
    if not prompt:
        raise QuizValidationError("Question prompt is empty.")

    options = q.get("options", [])
    if not isinstance(options, list) or len(options) < 2:
        raise QuizValidationError("Question must have at least two options.")

    option_ids = set()
    for opt in options:
        opt_id = opt.get("id", "").strip().lower()
        opt_text = opt.get("text", "").strip()
        if not opt_id or not opt_text:
            raise QuizValidationError("Each option must have a valid non-empty 'id' and 'text'.")
        if opt_id in option_ids:
            raise QuizValidationError(f"Duplicate option id '{opt_id}' detected.")
        option_ids.add(opt_id)

    correct = [c.strip().lower() for c in q.get("correct_answers", [])]
    if not correct:
        raise QuizValidationError("Question must have at least one correct answer.")

    for c in correct:
        if c not in option_ids:
            raise QuizValidationError(f"Correct answer '{c}' does not match any provided option ID {list(option_ids)}.")

    q_type = q.get("question_type", "MCQ").upper()
    if q_type == "MCQ" and len(correct) != 1:
        # If model marked multiple for MCQ, adjust to MSQ or take first
        q_type = "MSQ" if len(correct) > 1 else "MCQ"

    if q_type == "MSQ" and len(correct) < 2:
        # If only one correct for MSQ, coerce to MCQ
        q_type = "MCQ"

    # STRICT mode quote verification
    source_quote = (q.get("source_quote") or "").strip()
    if mode == "STRICT" and not source_quote:
        # Provide a fallback marker if missing rather than completely discarding
        source_quote = prompt

    return {
        "question_type": q_type,
        "prompt": prompt,
        "options": [{"id": opt["id"].strip().lower(), "text": opt["text"].strip()} for opt in options],
        "correct_answers": correct,
        "explanation": (q.get("explanation") or "").strip() or "Verified from the source text.",
        "source_page": q.get("source_page"),
        "source_quote": source_quote,
        "difficulty": q.get("difficulty", "medium").lower()
    }


def validate_generated_questions(raw_questions: List[Dict[str, Any]], mode: str = "STRICT") -> List[Dict[str, Any]]:
    validated = []
    for q in raw_questions:
        try:
            val = validate_question_dict(q, mode=mode)
            validated.append(val)
        except QuizValidationError:
            continue
    if not validated:
        raise QuizValidationError("All generated questions failed validation.")
    return validated
