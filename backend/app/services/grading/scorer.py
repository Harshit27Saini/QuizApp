from typing import List, Dict, Any, Tuple


def evaluate_question(
    question: Dict[str, Any],
    selected_options: List[str]
) -> Tuple[bool, float]:
    """
    Evaluates a user's submitted options against correct answers deterministically.
    Returns (is_correct, score_fraction).
    """
    correct_answers = set(str(c).strip().lower() for c in question.get("correct_answers", []))
    selected = set(str(s).strip().lower() for s in selected_options)

    if not selected:
        return False, 0.0

    q_type = question.get("question_type", "MCQ").upper()

    if q_type == "MCQ":
        # Exactly one selection must match the correct option
        is_correct = (selected == correct_answers)
        return is_correct, 1.0 if is_correct else 0.0

    if q_type == "MSQ":
        # Multi-select: all correct options must be selected with no extraneous incorrect ones
        is_correct = (selected == correct_answers)
        return is_correct, 1.0 if is_correct else 0.0

    return False, 0.0


def score_attempt(
    questions: List[Dict[str, Any]],
    user_answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Scores an entire quiz attempt and formats the evaluation breakdown.
    """
    question_map = {q["id"]: q for q in questions}
    evaluated_results = []
    total_correct = 0

    for ans in user_answers:
        q_id = ans.get("question_id")
        q = question_map.get(q_id)
        if not q:
            continue

        selected = ans.get("selected_options", [])
        is_correct, frac = evaluate_question(q, selected)
        if is_correct:
            total_correct += 1

        evaluated_results.append({
            "question": q,
            "selected_options": selected,
            "is_correct": is_correct,
            "time_spent_seconds": ans.get("time_spent_seconds", 0)
        })

    total_q = max(1, len(questions))
    percentage = round((total_correct / total_q) * 100.0, 2)
    
    # Duolingo-inspired XP reward: 10 XP per correct question + 15 XP completion bonus
    xp_earned = (total_correct * 10) + (15 if total_correct > 0 else 5)

    return {
        "score": percentage,
        "total_questions": len(questions),
        "correct_count": total_correct,
        "xp_earned": xp_earned,
        "question_results": evaluated_results
    }
