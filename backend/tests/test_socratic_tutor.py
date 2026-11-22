import pytest
from app.services.socratic.tutor import generate_socratic_teaching


@pytest.mark.asyncio
async def test_generate_socratic_teaching_mock():
    res = await generate_socratic_teaching(
        document_title="Lecture_04_Control_Systems.pdf",
        page_number=3,
        page_text="Nyquist stability criterion determines the stability of a closed-loop feedback system. It relates the frequency response of the open-loop transfer function to the number of poles in the right-half s-plane.",
        pet_id="sydney"
    )

    assert res.page_number == 3
    assert res.pet_id == "sydney"
    assert res.pet_name == "Sydney"
    assert len(res.slide_title) > 0
    assert len(res.core_principle) > 10
    assert len(res.socratic_question) > 5
    assert len(res.options) >= 2


@pytest.mark.asyncio
async def test_socratic_evaluation():
    res = await generate_socratic_teaching(
        document_title="Biology_101.pdf",
        page_number=1,
        page_text="Mitochondria are double-membrane-bound organelles found in most eukaryotic organisms. They generate most of the cell's supply of adenosine triphosphate (ATP).",
        pet_id="connie",
        user_response="They produce ATP which powers cellular activities.",
        previous_question="What is the primary function of mitochondria in eukaryotic cells?"
    )

    assert res.evaluation is not None
    assert res.is_correct is not None
    assert res.xp_awarded > 0
