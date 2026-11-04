import pytest
from app.services.quiz_engine.validator import validate_question_dict, validate_generated_questions, shuffle_question_options
from app.services.quiz_engine.generator import generate_quiz_questions
from app.core.errors import QuizValidationError


def test_validate_valid_mcq():
    q = {
        "question_type": "MCQ",
        "prompt": "What is the primary function of mitochondria?",
        "options": [
            {"id": "a", "text": "Cellular respiration and ATP generation"},
            {"id": "b", "text": "Protein degradation"},
            {"id": "c", "text": "DNA replication only"},
            {"id": "d", "text": "Lipid synthesis"}
        ],
        "correct_answers": ["a"],
        "explanation": "Mitochondria produce ATP through oxidative phosphorylation.",
        "source_page": 4,
        "source_quote": "Mitochondria are known as the powerhouses of the cell.",
        "difficulty": "medium"
    }
    validated = validate_question_dict(q, mode="STRICT")
    assert validated["question_type"] == "MCQ"
    assert len(validated["correct_answers"]) == 1
    assert len(validated["options"]) == 4

    # Verify that the option marked correct actually holds the correct text
    correct_id = validated["correct_answers"][0]
    matched_option = next(opt for opt in validated["options"] if opt["id"] == correct_id)
    assert matched_option["text"] == "Cellular respiration and ATP generation"


def test_validate_valid_msq():
    q = {
        "question_type": "MSQ",
        "prompt": "Which of the following are pillars of OOP?",
        "options": [
            {"id": "a", "text": "Encapsulation"},
            {"id": "b", "text": "Polymorphism"},
            {"id": "c", "text": "Monads"},
            {"id": "d", "text": "Inheritance"}
        ],
        "correct_answers": ["a", "b", "d"],
        "explanation": "OOP pillars include Encapsulation, Polymorphism, and Inheritance.",
        "source_page": 2,
        "source_quote": "The key concepts are encapsulation, inheritance, and polymorphism.",
        "difficulty": "medium"
    }
    validated = validate_question_dict(q, mode="STRICT")
    assert validated["question_type"] == "MSQ"
    assert len(validated["correct_answers"]) == 3

    # Verify that all 3 correct options correspond to the actual correct texts
    correct_ids = set(validated["correct_answers"])
    matched_texts = {opt["text"] for opt in validated["options"] if opt["id"] in correct_ids}
    assert matched_texts == {"Encapsulation", "Polymorphism", "Inheritance"}


def test_shuffle_options_distributes_correctly():
    q = {
        "options": [
            {"id": "a", "text": "Correct Option"},
            {"id": "b", "text": "Distractor 1"},
            {"id": "c", "text": "Distractor 2"},
            {"id": "d", "text": "Distractor 3"}
        ],
        "correct_answers": ["a"]
    }
    shuffled = shuffle_question_options(q)
    correct_id = shuffled["correct_answers"][0]
    matched_opt = next(opt for opt in shuffled["options"] if opt["id"] == correct_id)
    assert matched_opt["text"] == "Correct Option"


def test_invalid_option_id_raises():
    q = {
        "prompt": "Sample Question?",
        "options": [
            {"id": "a", "text": "Option 1"},
            {"id": "b", "text": "Option 2"}
        ],
        "correct_answers": ["z"],
        "explanation": "Test explanation",
        "source_quote": "Quote"
    }
    with pytest.raises(QuizValidationError):
        validate_question_dict(q, mode="STRICT")


@pytest.mark.asyncio
async def test_generate_quiz_questions_with_mock():
    mock_sections = [
        {
            "section_index": 0,
            "page_number": 1,
            "heading": "Active Recall Theory",
            "content": "Active recall is a learning strategy that focuses on retrieving information from memory without looking at notes. It produces significantly stronger neural pathways."
        }
    ]
    questions = await generate_quiz_questions(
        sections=mock_sections,
        mode="STRICT",
        difficulty="medium",
        count=2
    )
    assert len(questions) == 2
    assert questions[0]["question_type"] in ["MCQ", "MSQ"]
    assert len(questions[0]["options"]) >= 2
    assert questions[0]["source_quote"] != ""
