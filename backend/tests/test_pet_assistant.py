import pytest
from app.services.ai.pet_personas import PET_PROFILES, get_pet_response, build_pet_system_prompt


def test_pet_profiles_exist():
    expected_pets = ["sydney", "connie", "milo", "scooby", "bunny"]
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
