import pytest
from app.services.ai.pet_personas import PET_PROFILES, get_pet_response, build_pet_system_prompt


def test_pet_profiles_exist():
    expected_pets = ["sydney", "connie", "milo", "scooby", "bunny", "nandhini", "coach_harshit", "duo", "archimedes"]
    for p_id in expected_pets:
        assert p_id in PET_PROFILES
        pet = PET_PROFILES[p_id]
        assert "name" in pet
        assert "breed" in pet
        assert "avatar" in pet
        assert "style" in pet


def test_pet_system_prompt_structure():
    prompt = build_pet_system_prompt(
        pet_id="sydney",
        current_topic="PID Controllers in Robotics",
        context_text="Closed-loop controllers continuously compute error values..."
    )
    assert "Sydney" in prompt
    assert "PID Controllers in Robotics" in prompt
    assert "Closed-loop controllers" in prompt


@pytest.mark.asyncio
async def test_pet_presets_execution():
    for preset_key in ["summary", "quiz_me", "explain_simple", "exam_traps", "formulas", "study_plan"]:
        res = await get_pet_response(
            pet_id="nandhini",
            user_message="",
            current_topic="Fourier Transform Analysis",
            context_text="The Fourier transform decomposes functions depending on space or time into functions depending on spatial frequency or temporal frequency.",
            preset=preset_key
        )
        assert res["pet_id"] == "nandhini"
        assert len(res["reply"]) > 20
        assert len(res["suggested_followups"]) >= 2


@pytest.mark.asyncio
async def test_pet_response_mock_mode():
    res = await get_pet_response(
        pet_id="connie",
        user_message="Why does negative feedback stabilize the robot arm?",
        current_topic="Feedback Loops",
        context_text="Negative feedback reduces oscillations by opposing disturbances."
    )
    assert res["pet_id"] == "connie"
    assert res["pet_name"] == "Connie"
    assert len(res["reply"]) > 20
    assert len(res["suggested_followups"]) >= 1


@pytest.mark.asyncio
async def test_all_five_pets_respond():
    for p_id in ["sydney", "connie", "milo", "scooby", "bunny"]:
        res = await get_pet_response(
            pet_id=p_id,
            user_message="Help me understand this formula.",
            current_topic="Psychometrics - Reliability"
        )
        assert res["pet_id"] == p_id
        assert len(res["reply"]) > 15


@pytest.mark.asyncio
async def test_ai_provider_generate_text_contract():
    from app.services.ai.factory import get_ai_provider
    from app.services.ai.mock_provider import MockAIProvider

    mock = MockAIProvider()
    reply = await mock.generate_text(
        system_instruction="You are a tutor. Current Topic: Spaced Repetition",
        user_prompt="Student: How does spaced repetition fight forgetting?\nTutor:"
    )
    assert isinstance(reply, str)
    assert len(reply) > 30

    provider = get_ai_provider()
    assert hasattr(provider, "generate_text")
    live_reply = await provider.generate_text(
        system_instruction="You are Sydney. Current Topic: Cognitive Science",
        user_prompt="Student: What is active recall?\nSydney:"
    )
    assert isinstance(live_reply, str)
    assert len(live_reply) > 20

